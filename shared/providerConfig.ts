export const providerKinds = [
  "Mistral",
  "OpenRouter",
  "OpenAI",
  "Google Gemini",
] as const;

export type ProviderKind = (typeof providerKinds)[number];

// Online providers only. The browser never calls these directly — requests
// go through this app's own server proxy (see server/_core/llmProxy.ts),
// which holds the fixed allowlist of upstreams.
export const providerDefaults: Record<ProviderKind, { endpoint: string; note: string }> = {
  "Mistral": { endpoint: "https://api.mistral.ai/v1", note: "api.mistral.ai — La Plateforme API key" },
  "OpenRouter": { endpoint: "https://openrouter.ai/api/v1", note: "openrouter.ai — one key, many models" },
  "OpenAI": { endpoint: "https://api.openai.com/v1", note: "api.openai.com — platform API key" },
  "Google Gemini": { endpoint: "https://generativelanguage.googleapis.com/v1beta", note: "Google AI Studio API key" },
};

export function defaultEndpointForProvider(kind: ProviderKind) {
  return providerDefaults[kind].endpoint;
}
