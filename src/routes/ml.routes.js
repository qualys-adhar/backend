/**
 * ML Routes
 * ML service integration endpoints
 */
import { Hono } from "hono";
import { embedBookHandler, recommendationsHandler, healthCheckHandler, similarityHandler, compareEmbeddingsHandler, indexStatsHandler, } from "../controllers/ml.controller";
const router = new Hono();
/**
 * POST /ml/health - Check ML service status
 * Simple health check for ML service connectivity
 */
router.get("/health", async (c) => {
    try {
        const result = await healthCheckHandler();
        return c.json(result);
    }
    catch (error) {
        return c.json({
            error: "ML service unavailable",
            message: error.message,
        }, 503);
    }
});
/**
 * POST /ml/embed - Embed and index a book
 * Called after PDF text extraction in book upload workflow
 *
 * Request body:
 * {
 *   "bookId": "mongo_id",
 *   "text": "Full book text",
 *   "title": "Book Title",
 *   "author": "Author Name",
 *   "genre": "Fiction" (optional)
 * }
 */
router.post("/embed", async (c) => {
    try {
        const body = (await c.req.json());
        const { bookId, text, title, author, genre } = body;
        if (!bookId || !text || !title || !author) {
            return c.json({ error: "Missing required fields: bookId, text, title, author" }, 400);
        }
        const result = await embedBookHandler(bookId, text, title, author, genre);
        return c.json(result);
    }
    catch (error) {
        return c.json({
            error: "Embedding failed",
            message: error.message,
        }, 500);
    }
});
/**
 * POST /ml/recommend - Get book recommendations
 * Finds similar books for a given text
 *
 * Request body:
 * {
 *   "query_text": "Text to find similar books for",
 *   "k": 5,
 *   "threshold": 0.6 (optional)
 * }
 */
router.post("/recommend", async (c) => {
    try {
        const body = (await c.req.json());
        const { query_text, k = 5, threshold } = body;
        if (!query_text) {
            return c.json({ error: "Missing required field: query_text" }, 400);
        }
        const result = await recommendationsHandler(query_text, k, threshold);
        return c.json(result);
    }
    catch (error) {
        return c.json({
            error: "Recommendation failed",
            message: error.message,
        }, 500);
    }
});
/**
 * POST /ml/similarity - Compute similarity between two texts
 * Returns score between 0 and 1
 *
 * Request body:
 * {
 *   "text_a": "First text",
 *   "text_b": "Second text"
 * }
 */
router.post("/similarity", async (c) => {
    try {
        const body = (await c.req.json());
        const { text_a, text_b } = body;
        if (!text_a || !text_b) {
            return c.json({ error: "Missing required fields: text_a, text_b" }, 400);
        }
        const result = await similarityHandler(text_a, text_b);
        return c.json(result);
    }
    catch (error) {
        return c.json({
            error: "Similarity check failed",
            message: error.message,
        }, 500);
    }
});
/**
 * POST /ml/similarity/embeddings - Compare two pre-computed embeddings
 * More efficient than /ml/similarity when embeddings are already stored
 * Used for book-to-book comparison
 *
 * Request body:
 * {
 *   "embedding_a": [0.123, 0.456, ...],  // 384-dimensional array
 *   "embedding_b": [0.789, 0.012, ...]   // 384-dimensional array
 * }
 */
router.post("/similarity/embeddings", async (c) => {
    try {
        const body = (await c.req.json());
        const { embedding_a, embedding_b } = body;
        if (!embedding_a || !embedding_b) {
            return c.json({ error: "Missing required fields: embedding_a, embedding_b" }, 400);
        }
        if (!Array.isArray(embedding_a) || !Array.isArray(embedding_b)) {
            return c.json({ error: "Embeddings must be arrays" }, 400);
        }
        const result = await compareEmbeddingsHandler(embedding_a, embedding_b);
        return c.json(result);
    }
    catch (error) {
        return c.json({
            error: "Embedding comparison failed",
            message: error.message,
        }, 500);
    }
});
/**
 * GET /ml/stats - Get indexing statistics
 * Shows progress of book indexing
 */
router.get("/stats", async (c) => {
    try {
        const result = await indexStatsHandler();
        return c.json(result);
    }
    catch (error) {
        return c.json({
            error: "Stats retrieval failed",
            message: error.message,
        }, 500);
    }
});
export default router;
