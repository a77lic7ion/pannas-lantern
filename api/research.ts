// Vercel serverless entry: /api/research
// Reuses the same research core as the LAN Express server, so behaviour is
// identical on both deployments. See server/_core/researchProxy.ts.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { researchWeb } from "../server/_core/researchCore";

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
