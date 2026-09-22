// Online LLM client for Pana's Lantern.
// All calls go through THIS APP'S same-origin server proxy (/api/llm/*),
// which forwards to a fixed allowlist of online providers (Mistral,
// OpenRouter, OpenAI, Gemini). The API key is stored only in this browser
// and passes through the proxy per-request; it is never persisted server-side.

// Base URL from Vite (e.g. "/lantern/") so fetches resolve behind the
// App Hub path-prefix proxy instead of hitting the dashboard root.
const API_BASE: string = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";

export type LocalMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LocalProvider = {
  kind: string; // ProviderKind from shared/providerConfig (e.g. "OpenRouter")
  endpoint: string; // display only; the proxy is authoritative
  apiKey?: string;
  model: string;
};

export type LocalJsonSchema = {
  name: string;
  strict?: boolean;
  schema: Record<string, unknown>;
};

export type LocalResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: LocalJsonSchema };

function providerSlug(kind: string): string {
  const key = kind.trim().toLowerCase();
  if (key === "google gemini" || key === "gemini") return "gemini";
  if (key === "openrouter") return "openrouter";
  if (key === "openai") return "openai";
  if (key === "mistral") return "mistral";
  return key;
}

export async function callLocalLLM(opts: {
  provider: LocalProvider;
  messages: LocalMessage[];
  maxTokens?: number;
  responseFormat?: LocalResponseFormat;
  signal?: AbortSignal;
}): Promise<string> {
  const { provider, messages, maxTokens = 2200, responseFormat, signal } = opts;

  const body: Record<string, unknown> = {
    messages,
    max_tokens: maxTokens,
  };
  if (responseFormat && responseFormat.type !== "text") {
    body.response_format = responseFormat;
  }

  const res = await fetch(`${API_BASE}api/llm/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      provider: providerSlug(provider.kind),
      apiKey: provider.apiKey ?? "",
      model: provider.model,
      body,
    }),
    signal,
  });

  if (!res.ok) {
    let detail = "";
    try {
      const parsed = (await res.json()) as { error?: string };
      detail = parsed.error ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(
      `Model request failed (${res.status})${detail ? `: ${detail}` : ""}`
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("The model returned an empty response.");
  }
  return content;
}

export async function discoverLocalModels(kind: string, apiKey?: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}api/llm/models?provider=${encodeURIComponent(providerSlug(kind))}`, {
    headers: apiKey && apiKey.trim() ? { authorization: `Bearer ${apiKey.trim()}` } : {},
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const parsed = (await res.json()) as { error?: string };
      detail = parsed.error ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(
      res.status === 401 || res.status === 403
        ? `That key was not accepted. ${detail}`
        : `Provider check failed (${res.status})${detail ? `: ${detail}` : ""}`
    );
  }

  const data = (await res.json()) as { data?: unknown[]; models?: unknown[] } | unknown[];
  const asRecord = (data && typeof data === "object" && !Array.isArray(data)) ? data as { data?: unknown[]; models?: unknown[] } : null;
  const arr: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray(asRecord?.data)
      ? asRecord.data
      : Array.isArray(asRecord?.models)
        ? asRecord.models
        : [];

  const models = arr
    .map((m) => {
      if (typeof m === "string") return m;
      if (typeof m === "object" && m) {
        const rec = m as Record<string, unknown>;
        // Gemini /models returns { models: [{ name: "models/gemini-...", ... }] }
        if (typeof rec.name === "string" && rec.name.startsWith("models/")) {
          return rec.name.slice("models/".length);
        }
        return String(rec.id ?? rec.name ?? "");
      }
      return "";
    })
    .filter(Boolean);

  return Array.from(new Set(models)).sort().slice(0, 200) as string[];
}
