// Same-origin LLM proxy: the browser sends provider kind + its API key +
// the request body; this server forwards to a FIXED allowlist of online
// providers. The key is never stored server-side — it passes through this
// request only. This exists because (a) OpenAI blocks browser CORS, and
// (b) Gemini's native API is not OpenAI-compatible, so it needs translating.
import type { Request, Response } from "express";

type Upstream = {
  base: string;
  chatPath: string;
  modelsPath: string;
  auth: (apiKey: string) => Record<string, string>;
  gemini?: boolean;
};

const UPSTREAMS: Record<string, Upstream> = {
  mistral: {
    base: "https://api.mistral.ai/v1",
    chatPath: "/chat/completions",
    modelsPath: "/models",
    auth: (key) => ({ authorization: `Bearer ${key}` }),
  },
  openrouter: {
    base: "https://openrouter.ai/api/v1",
    chatPath: "/chat/completions",
    modelsPath: "/models",
    auth: (key) => ({ authorization: `Bearer ${key}` }),
  },
  openai: {
    base: "https://api.openai.com/v1",
    chatPath: "/chat/completions",
    modelsPath: "/models",
    auth: (key) => ({ authorization: `Bearer ${key}` }),
  },
  gemini: {
    base: "https://generativelanguage.googleapis.com/v1beta",
    chatPath: "", // unused — translated per-model below
    modelsPath: "/models",
    auth: () => ({}), // key goes in the URL for Gemini
    gemini: true,
  },
};

function resolveProvider(provider: string): Upstream | null {
  const key = provider.trim().toLowerCase();
  if (key === "mistral") return UPSTREAMS.mistral;
  if (key === "openrouter") return UPSTREAMS.openrouter;
  if (key === "openai") return UPSTREAMS.openai;
  if (key === "gemini" || key === "google gemini") return UPSTREAMS.gemini;
  return null;
}

function badRequest(res: Response, message: string) {
  res.status(400).json({ error: message });
}

async function forwardJson(res: Response, url: string, init: RequestInit, providerLabel: string, normalize?: (raw: unknown) => unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const upstream = await fetch(url, { ...init, signal: controller.signal });
    const text = await upstream.text();
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: `${providerLabel} returned ${upstream.status}: ${text.slice(0, 400)}`,
      });
      return;
    }
    if (normalize) {
      try {
        const normalized = normalize(JSON.parse(text));
        res.status(200).type("application/json").send(JSON.stringify(normalized));
        return;
      } catch {
        // fall through: send raw text if normalization fails
      }
    }
    res.status(200).type("application/json").send(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    res.status(502).json({ error: `${providerLabel} request failed: ${message}` });
  } finally {
    clearTimeout(timer);
  }
}

// POST /api/llm/chat  { provider, apiKey, model, body }
// body is the OpenAI-shaped chat/completions payload (messages, max_tokens,
// response_format). For Gemini it is translated to generateContent form.
export async function handleLlmChat(req: Request, res: Response) {
  const { provider, apiKey, model, body } = (req.body ?? {}) as {
    provider?: string;
    apiKey?: string;
    model?: string;
    body?: Record<string, unknown>;
  };
  const upstream = resolveProvider(provider ?? "");
  if (!upstream) return badRequest(res, "Unknown provider. Use mistral, openrouter, openai or gemini.");
  if (!apiKey || !apiKey.trim()) return badRequest(res, "Missing API key.");
  if (!model || !model.trim()) return badRequest(res, "Missing model.");
  if (!body || typeof body !== "object") return badRequest(res, "Missing request body.");

  const modelId = model.trim();

  if (upstream.gemini) {
    const geminiBody = toGeminiChat(body, modelId);
    const url = `${upstream.base}/models/${encodeURIComponent(modelId)}:generateContent`;
    return forwardJson(res, url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey.trim() },
      body: JSON.stringify(geminiBody),
    }, "Gemini", normalizeGeminiResponse);
  }

  const payload = { ...body, model: modelId };
  return forwardJson(res, `${upstream.base}${upstream.chatPath}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...upstream.auth(apiKey.trim()) },
    body: JSON.stringify(payload),
  }, providerLabel(provider ?? ""));
}

// GET /api/llm/models?provider=X (key passed via Authorization header)
export async function handleLlmModels(req: Request, res: Response) {
  const provider = String(req.query.provider ?? "");
  const apiKey = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
  const upstream = resolveProvider(provider);
  if (!upstream) return badRequest(res, "Unknown provider. Use mistral, openrouter, openai or gemini.");
  if (!apiKey) return badRequest(res, "Missing API key.");

  const url = `${upstream.base}${upstream.modelsPath}`;
  return forwardJson(res, url, {
    method: "GET",
    headers: { ...upstream.auth(apiKey) },
  }, providerLabel(provider));
}

function providerLabel(provider: string) {
  const key = provider.trim().toLowerCase();
  if (key === "gemini" || key === "google gemini") return "Gemini";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// Translate an OpenAI chat/completions body to Gemini generateContent.
function toGeminiChat(body: Record<string, unknown>, _model: string) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const systemText = messages
    .filter((m) => (m as { role?: string }).role === "system")
    .map((m) => String((m as { content?: string }).content ?? ""))
    .join("\n\n");
  const contents = messages
    .filter((m) => {
      const role = (m as { role?: string }).role;
      return role === "user" || role === "assistant";
    })
    .map((m) => {
      const role = (m as { role?: string }).role === "assistant" ? "model" : "user";
      return { role, parts: [{ text: String((m as { content?: string }).content ?? "") }] };
    });

  const out: Record<string, unknown> = { contents };
  if (systemText) out.systemInstruction = { parts: [{ text: systemText }] };

  // response_format json_schema -> Gemini responseSchema + responseMimeType
  const responseFormat = body.response_format as
    | { type?: string; json_schema?: { schema?: Record<string, unknown> } }
    | undefined;
  if (responseFormat?.type === "json_schema" && responseFormat.json_schema?.schema) {
    out.generationConfig = {
      responseMimeType: "application/json",
      responseSchema: responseFormat.json_schema.schema,
      ...(typeof body.max_tokens === "number" ? { maxOutputTokens: body.max_tokens } : {}),
    };
  } else if (responseFormat?.type === "json_object") {
    out.generationConfig = {
      responseMimeType: "application/json",
      ...(typeof body.max_tokens === "number" ? { maxOutputTokens: body.max_tokens } : {}),
    };
  } else if (typeof body.max_tokens === "number") {
    out.generationConfig = { maxOutputTokens: body.max_tokens };
  }
  return out;
}

// Normalize a Gemini generateContent response back to OpenAI shape so the
// browser client needs no special-casing.
export function normalizeGeminiResponse(raw: unknown): {
  choices: Array<{ message: { content: string } }>;
} {
  const data = raw as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  return { choices: [{ message: { content: text } }] };
}
