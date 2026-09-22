// Same-origin proxy for web research. The browser cannot call DuckDuckGo
// directly (CORS), so the client hits /api/research?q=... and this server
// performs the search + page fetch. Shared logic lives in researchCore.ts
// (also used by the Vercel serverless functions).
import type { Request, Response } from "express";
import { researchWeb } from "./researchCore";

export async function handleResearch(req: Request, res: Response) {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  try {
    const result = await researchWeb(q);
    res.json(result);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "research failed" });
  }
}
