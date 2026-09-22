# Pana's Lantern — Local Edition

A fully **local-first** rewrite of the Manus-exported Pana's Lantern app.

- **No Supabase.** No cloud database, no auth, no OAuth.
- **Local LLMs only.** The Lantern calls whichever OpenAI-compatible model
  endpoint you configure in **Settings › Assistant providers** — directly
  from your browser. Defaults to `http://localhost:11434/v1` (Ollama).
- **Browser-persistent.** All notes, notebooks, writing, wellbeing records,
  Soul.md, and your model connection live in the browser's `localStorage`.
  Clearing site data removes them.

## What was removed from the original
- Manus cloud OAuth login (`sdk.ts`, `oauth.ts`)
- Supabase client + status checks + schema
- The server-side LLM call to `forge.manus.im` (now runs in the browser)
- `drizzle` / `mysql2` DB layer, `@aws-sdk`, `@supabase/supabase-js`, `jose`, `axios`
- Vercel/Manus runtime plugins and debug collector

## What the server still does
A thin Express host that:
1. Serves the built SPA (`dist/public`).
2. Exposes `GET /api/research?q=...` — a same-origin proxy for web research
   (the browser can't call DuckDuckGo directly due to CORS). No auth, no storage.
3. A `/api/trpc` endpoint with a `system.health` check.

That's it. In dev mode (`npm run dev`) Vite serves the client with HMR and the
same Express server handles `/api/*`.

## Prerequisites
- Node 22+ and npm
- A local OpenAI-compatible model server, e.g. Ollama:
  - `ollama pull llama3.1` (or any model you like)
  - `ollama serve` (listens on `http://localhost:11434`)
  - If the browser is on a different machine than Ollama, set
    `OLLAMA_ORIGINS=*` so Ollama accepts cross-origin requests, and use the
    LAN IP in Settings (e.g. `http://192.168.1.x:11434/v1`).

## Run (production)
```bash
npm install
npm run build
npm start
# open http://localhost:3000
```

## Run (development, with hot reload)
```bash
npm install
npm run dev
# open http://localhost:3000
```

## Connect a model
1. Open the app → **Settings** (gear) → **Assistant providers** → **Add provider**.
2. Provider: **Local OpenAI-compatible** (default).
3. Endpoint: `http://localhost:11434/v1` (or your LAN/remote `/v1`).
4. API key: leave blank for Ollama; fill in for OpenRouter/etc. if required.
5. Click **Fetch models & test**, pick a model, **Save connection**.
6. The Lantern now uses that model. Chat from any page via **Ask the Lantern**.

## Notes
- The API key is stored only in this browser's `localStorage` and is sent
  solely to the endpoint you configured.
- Web research is optional (checkbox in the chat panel) and goes through the
  local `/api/research` proxy — nothing leaves your machine except the search
  request to DuckDuckGo.
