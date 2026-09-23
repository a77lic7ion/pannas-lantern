// Same-origin LLM proxy: the browser sends provider kind + its API key +
// the request body; this server forwards to a FIXED allowlist of online
// providers. The key is never stored server-side — it passes through this
// request only. Shared logic lives in llmProxyCore.ts (also used by Vercel).
import type { Request, Response } from "express";
import { resolveProvider, providerLabel, toGeminiChat, normalizeGeminiResponse, filterOpenRouterFreeModels } from "./llmProxyCore";

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

  const isOpenRouter = provider.trim().toLowerCase() === "openrouter";
  const normalize = isOpenRouter ? filterOpenRouterFreeModels : undefined;

  const url = `${upstream.base}${upstream.modelsPath}`;
  return forwardJson(res, url, {
    method: "GET",
    headers: { ...upstream.auth(apiKey) },
  }, providerLabel(provider), normalize);
}
