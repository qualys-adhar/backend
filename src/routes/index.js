import { analyzeRoute } from "./analyze.route";
export function registerRoutes(app) {
    app.route("/analyze", analyzeRoute);
}
