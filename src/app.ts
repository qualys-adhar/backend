import { Hono } from "hono";
import { cors } from "hono/cors";
import { registerRoutes } from "./routes";
import { analyzeRoute } from "./routes/analyze.route";
import booksRoute from "./routes/books.routes";
import mlRoutes from "./routes/ml.routes";

const app = new Hono();

// CORS middleware
app.use("/*", cors());

app.get("/", (c) => {
  return c.json({
    message: "Book Analytics API with ML Service",
    version: "2.0.0",
    endpoints: {
      analyze: "POST /analyze",
      listBooks: "GET /books",
      getBook: "GET /books/:id",
      downloadBook: "GET /books/:id/download",
      ml_embed: "POST /ml/embed",
      ml_recommend: "POST /ml/recommend",
      ml_similarity: "POST /ml/similarity",
      ml_stats: "GET /ml/stats",
      ml_health: "POST /ml/health",
    },
  });
});

registerRoutes(app);
app.route("/analyze", analyzeRoute);
app.route("/books", booksRoute);
app.route("/ml", mlRoutes);

export { app };
export default app;
