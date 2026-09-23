// Shared LLM proxy core — used by BOTH deployments:
//  - LAN:    server/_core/llmProxy.ts (Express handlers) imports from here
//  - Vercel: api/llm.ts (serverless functions) imports from here
// Same-origin LLM proxy: the browser sends provider kind + its API key + the
// request body; the server forwards to a FIXED allowlist of online providers.
// The key is never stored server-side — it passes through this request only.
// This exists because (a) OpenAI blocks browser CORS, and (b) Gemini's native
// API is not OpenAI-compatible, so it needs translating.

export type Upstream = {
  base: string;
  chatPath: string;
  modelsPath: string;
  auth: (apiKey: string) => Record<string, string>;
  gemini?: boolean;
};

export const UPSTREAMS: Record<string, Upstream> = {
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

/**
 * For OpenRouter, only return free models. OpenRouter marks free models with
 * a `:free` or `-free` suffix on the model id (e.g. "google/gemini-2.0-flash:free").
 */
export function filterOpenRouterFreeModels(raw: unknown): unknown | null {
  if (!Array.isArray(raw) || !raw.length) return raw;
  const free = raw.filter((m) => {
    if (typeof m === "string") return m.endsWith(":free") || m.endsWith("-free");
    if (m && typeof m === "object") {
      const rec = m as Record<string, unknown>;
      const id = String(rec.id ?? rec.name ?? "");
      return id.endsWith(":free") || id.endsWith("-free");
    }
    return false;
  });
  return free.length ? free : raw;
}

export function resolveProvider(provider: string): Upstream | null {
  const key = provider.trim().toLowerCase();
  if (key === "mistral") return UPSTREAMS.mistral;
  if (key === "openrouter") return UPSTREAMS.openrouter;
  if (key === "openai") return UPSTREAMS.openai;
  if (key === "gemini" || key === "google gemini") return UPSTREAMS.gemini;
  return null;
}

export function providerLabel(provider: string) {
  const key = provider.trim().toLowerCase();
  if (key === "gemini" || key === "google gemini") return "Gemini";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export // Translate an OpenAI chat/completions body to Gemini generateContent.
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
