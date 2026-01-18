import { Hono } from "hono";
import { analyzeBookFromUpload } from "../controllers/analyze.controller";

export const analyzeRoute = new Hono();

analyzeRoute.post("/", async (c) => {
  const body = await c.req.parseBody();

  const file = body["file"] as File;
  const title = body["title"] as string;
  const author = body["author"] as string;
  const topN = Number(body["topN"] || 10);

  if (!file || !title || !author) {
    return c.json({ error: "file, title, author required" }, 400);
  }

  const book = await analyzeBookFromUpload(file, title, author, topN);
  return c.json({ success: true, book });
});
