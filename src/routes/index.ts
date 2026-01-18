import { Hono } from "hono";
import { analyzeRoute } from "./analyze.route";

export function registerRoutes(app: Hono) {
  app.route("/analyze", analyzeRoute);
}
