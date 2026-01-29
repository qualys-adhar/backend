/**
 * ML Service Business Logic
 *
 * High-level service class that wraps ML API calls.
 * Provides clean interface for the rest of the application.
 */
import { mlClient } from "./ml.client";
export class MLService {
    /**
     * Generate embedding vector for book text
     *
     * @param text - Full book text
     * @param chunkSize - Words per chunk (default: 600)
     * @param overlap - Overlapping words (default: 100)
     * @returns 384-dimensional embedding vector
     */
    async embedBook(text, chunkSize = 600, overlap = 100) {
        try {
            const response = await mlClient.post("/embed", {
                text,
                chunk_size: chunkSize,
                overlap,
            });
            console.log(`[ML] Generated embedding (dim: ${response.data.dimension})`);
            return response.data.embedding;
        }
        catch (error) {
            console.error("[ML] Failed to embed book:", error);
            throw new Error("Embedding service unavailable");
        }
    }
    /**
     * Add book to FAISS search index
     *
     * @param bookId - Unique book identifier
     * @param text - Book text
     * @param metadata - Book metadata (title, author, genre, etc.)
     */
    async addToIndex(bookId, text, metadata) {
        try {
            const response = await mlClient.post("/index/add", {
                book_id: bookId,
                text,
                metadata,
            });
            console.log(`[ML] Book ${bookId} added to index (size: ${response.data.index_size})`);
            return response.data;
        }
        catch (error) {
            console.error("[ML] Failed to add book to index:", error);
            throw new Error("Failed to add book to search index");
        }
    }
    /**
     * Search for similar books using FAISS
     *
     * @param queryText - Query book text
     * @param k - Number of results to return (default: 5)
     * @param excludeId - Book ID to exclude from results (default: none)
     * @returns Array of similar books with scores
     */
    async searchSimilar(queryText, k = 5, excludeId) {
        try {
            const response = await mlClient.post("/search", {
                query_text: queryText,
                k,
                exclude_id: excludeId,
            });
            console.log(`[ML] Found ${response.data.results.length} similar books`);
            return response.data.results;
        }
        catch (error) {
            console.error("[ML] Failed to search similar books:", error);
            throw new Error("Search service unavailable");
        }
    }
    /**
     * Compute similarity score between two books
     *
     * @param textA - First book text
     * @param textB - Second book text
     * @returns Similarity score between -1 and 1
     */
    async computeSimilarity(textA, textB) {
        try {
            const response = await mlClient.post("/similarity", {
                text_a: textA,
                text_b: textB,
            });
            console.log(`[ML] Similarity: ${response.data.similarity.toFixed(4)} (${response.data.interpretation})`);
            return response.data;
        }
        catch (error) {
            console.error("[ML] Failed to compute similarity:", error);
            throw new Error("Similarity service unavailable");
        }
    }
    /**
     * Save current FAISS index to disk
     */
    async saveIndex() {
        try {
            await mlClient.post("/index/save");
            console.log("[ML] Index saved successfully");
        }
        catch (error) {
            console.error("[ML] Failed to save index:", error);
            throw new Error("Failed to save search index");
        }
    }
    /**
     * Get FAISS index statistics
     *
     * @returns Index size, embedding dimension, and metric
     */
    async getIndexStats() {
        try {
            const response = await mlClient.get("/index/stats");
            return response.data;
        }
        catch (error) {
            console.error("[ML] Failed to get index stats:", error);
            throw new Error("Failed to retrieve index statistics");
        }
    }
    /**
     * Check ML service health
     *
     * @returns true if service is healthy, false otherwise
     */
    async healthCheck() {
        try {
            const response = await mlClient.get("/");
            const isHealthy = response.data.status === "running" && response.data.model_loaded;
            if (isHealthy) {
                console.log(`[ML] Service healthy (index size: ${response.data.index_size})`);
            }
            else {
                console.warn("[ML] Service unhealthy:", response.data);
            }
            return isHealthy;
        }
        catch (error) {
            console.error("[ML] Health check failed:", error);
            return false;
        }
    }
    /**
     * Get detailed health information
     */
    async getHealthDetails() {
        try {
            const response = await mlClient.get("/");
            return response.data;
        }
        catch (error) {
            console.error("[ML] Failed to get health details:", error);
            return null;
        }
    }
}
// Export singleton instance
export const mlService = new MLService();
