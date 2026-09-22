// Vercel serverless entry: /api/research
// SELF-CONTAINED by design: Vercel's builder cannot reliably bundle imports
// from outside the api/ directory, so this file inlines the research logic.
// Same logic as server/_core/researchCore.ts — keep the two in sync.
import type { VercelRequest, VercelResponse } from "@vercel/node";

const MAX_RESULTS = 5;
const MAX_PAGE_BYTES = 180_000;
const MAX_TEXT_CHARS = 24_000;
const FETCH_TIMEOUT_MS = 10_000;

type ResearchSource = { title: string; url: string; excerpt: string };

export function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

export function safeUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (!(url.protocol === "http:" || url.protocol === "https:")) return null;
  if (url.username || url.password || isPrivateHost(url.hostname)) return null;
  if (url.port && !["80", "443"].includes(url.port)) return null;
  return url;
}

export async function fetchText(url: URL, depth = 0): Promise<{ text: string; finalUrl: string; error: string }> {
  if (depth > 3) return { text: "", finalUrl: url.toString(), error: "redirect-limit" };
  const response = await fetch(url, {
    redirect: "manual",
    headers: { "user-agent": "PanasLanternResearch/1.0" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    const next = location ? safeUrl(new URL(location, url).toString()) : null;
    if (!next) return { text: "", finalUrl: url.toString(), error: "redirect-blocked" };
    return fetchText(next, depth + 1);
  }
  if (!response.ok) return { text: "", finalUrl: url.toString(), error: `http-${response.status}` };
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_PAGE_BYTES) return { text: "", finalUrl: url.toString(), error: "page-too-large" };
  const raw = await response.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_PAGE_BYTES) return { text: "", finalUrl: url.toString(), error: "page-too-large" };
  const title = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const body = raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return { text: `${title.replace(/\s+/g, " ").trim()}\n${body}`.slice(0, MAX_TEXT_CHARS), finalUrl: url.toString(), error: "" };
}

export function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function researchWeb(query: string): Promise<{ sources: ResearchSource[]; note: string }> {
  const cleanQuery = query.trim().slice(0, 300);
  if (!cleanQuery) return { sources: [], note: "No research question was supplied." };
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
  const response = await fetch(searchUrl, {
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Search returned ${response.status}.`);
  const html = await response.text();
  const results: Array<{ title: string; url: string; excerpt: string }> = [];
  const pattern =
    /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) && results.length < MAX_RESULTS) {
    const rawUrl = decodeHtml(match[1]);
    let candidateUrl = rawUrl;
    try {
      const wrapped = new URL(rawUrl, searchUrl);
      candidateUrl = wrapped.searchParams.get("uddg") || wrapped.toString();
    } catch {
      /* ignore malformed result links */
    }
    const url = safeUrl(candidateUrl)?.toString();
    if (!url) continue;
    results.push({
      title: decodeHtml(match[2].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim(),
      url,
      excerpt: decodeHtml(match[3].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim(),
    });
  }
  const sources: ResearchSource[] = [];
  for (const result of results.slice(0, 3)) {
    try {
      const page = await fetchText(new URL(result.url));
      sources.push({ title: result.title || result.url, url: page.finalUrl, excerpt: page.text || result.excerpt });
    } catch {
      sources.push(result);
    }
  }
  return {
    sources,
    note: sources.length
      ? "Public web sources were retrieved and supplied to the assistant as untrusted reference text."
      : "No readable public sources were found.",
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  try {
    const result = await researchWeb(q);
    res.status(200).json(result);
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "research failed",
    });
  }
}
