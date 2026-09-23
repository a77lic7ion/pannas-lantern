// Vercel serverless entry: /api/llm/chat and /api/llm/models
// SELF-CONTAINED by design: Vercel's builder cannot reliably bundle imports
// from outside the api/ directory, so this file inlines the provider
// allowlist and Gemini translation. Same logic as
// server/_core/llmProxyCore.ts — keep the two in sync when editing.
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS not needed (same-origin), but harmless and future-proof.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const path = (req.url ?? "").split("?")[0];
  const isChat = path.endsWith("/chat");
  const isModels = path.endsWith("/models");

  if (!isChat && !isModels) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (isChat) {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Use POST for /api/llm/chat" });
      return;
    }
    const { provider, apiKey, model, body } = req.body ?? {};
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
    }, providerLabel(provider ?? ""), undefined);
  }

  // isModels
  if (req.method !== "GET") {
    res.status(405).json({ error: "Use GET for /api/llm/models" });
    return;
  }
  const provider = String(req.query.provider ?? "");
  const apiKey = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
  const upstream = resolveProvider(provider);
  if (!upstream) return badRequest(res, "Unknown provider. Use mistral, openrouter, openai or gemini.");
  if (!apiKey) return badRequest(res, "Missing API key.");
  const isOpenRouter = provider.trim().toLowerCase() === "openrouter";
  const normalize = isOpenRouter ? filterOpenRouterFreeModels : undefined;
  const url = `${upstream.base}${upstream.modelsPath}`;
  return forwardJson(res, url, {
    method: "GET",
    headers: { ...upstream.auth(apiKey) },
  }, providerLabel(provider), normalize);
}

function badRequest(res: VercelResponse, message: string) {
  res.status(400).json({ error: message });
}

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
    chatPath: "",
    modelsPath: "/models",
    auth: () => ({}),
    gemini: true,
  },
};

function filterOpenRouterFreeModels(raw: unknown): unknown | null {
  if (!Array.isArray(raw) || !raw.length) return raw;
  const free = raw.filter((m) => {
    if (!m || typeof m !== "object") return false;
    const rec = m as Record<string, unknown>;
    const pricing = rec.pricing as Record<string, unknown> | undefined;
    if (!pricing || typeof pricing !== "object") return false;
    const prompt = Number(pricing.prompt ?? pricing.prompt_tokens ?? 0);
    const completion = Number(pricing.completion ?? pricing.completion_tokens ?? 0);
    return prompt === 0 && completion === 0;
  });
  return free.length ? free : raw;
}

function resolveProvider(provider: string): Upstream | null {
  const key = provider.trim().toLowerCase();
  if (key === "mistral") return UPSTREAMS.mistral;
  if (key === "openrouter") return UPSTREAMS.openrouter;
  if (key === "openai") return UPSTREAMS.openai;
  if (key === "gemini" || key === "google gemini") return UPSTREAMS.gemini;
  return null;
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

// Normalize a Gemini generateContent response back to OpenAI shape.
function normalizeGeminiResponse(raw: unknown): {
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


async function forwardJson(
  res: VercelResponse,
  url: string,
  init: RequestInit,
  providerLabel2: string,
  normalize?: (raw: unknown) => unknown,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const upstream = await fetch(url, { ...init, signal: controller.signal });
    const text = await upstream.text();
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: `${providerLabel2} returned ${upstream.status}: ${text.slice(0, 400)}`,
      });
      return;
    }
    if (normalize) {
      try {
        const normalized = normalize(JSON.parse(text));
        // Vercel's VercelResponse doesn't chain .type() like Express — use setHeader.
        res.status(200).setHeader("Content-Type", "application/json");
        res.send(JSON.stringify(normalized));
        return;
      } catch {
        // fall through: send raw text if normalization fails
      }
    }
    res.status(200).setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    res.status(502).json({ error: `${providerLabel2} request failed: ${message}` });
  } finally {
    clearTimeout(timer);
  }
}
