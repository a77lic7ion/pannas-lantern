// Vercel serverless entry: /api/llm/chat and /api/llm/models
// Reuses the same proxy cores as the LAN Express server, so behaviour is
// identical on both deployments. See server/_core/llmProxy.ts.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  resolveProvider,
  providerLabel,
  toGeminiChat,
  normalizeGeminiResponse,
} from "../server/_core/llmProxyCore";

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
  const url = `${upstream.base}${upstream.modelsPath}`;
  return forwardJson(res, url, {
    method: "GET",
    headers: { ...upstream.auth(apiKey) },
  }, providerLabel(provider));
}

function badRequest(res: VercelResponse, message: string) {
  res.status(400).json({ error: message });
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
        res.status(200).type("application/json").send(JSON.stringify(normalized));
        return;
      } catch {
        // fall through to raw passthrough
      }
    }
    res.status(200).type("application/json").send(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    res.status(502).json({ error: `${providerLabel2} request failed: ${message}` });
  } finally {
    clearTimeout(timer);
  }
}
