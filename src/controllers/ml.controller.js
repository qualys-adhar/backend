/**
 * ML Controllers
 * Handles ML service endpoints for embedding and recommendations
 */
import { embedAndIndexBook, } from "../services/book.service";
import { getRecommendations, filterByThreshold, sortBySimilarity, } from "../services/recommendation.service";
import { Book } from "../db/book.model";
import { mlClient } from "../ml/ml.client";
/**
 * Embed and index a book after PDF text extraction
 * Called as part of book upload workflow
 *
 * Request body:
 * {
 *   "bookId": "book_123",
 *   "text": "Full extracted book text",
 *   "title": "Book Title",
 *   "author": "Author Name",
 *   "genre": "Fiction" (optional)
 * }
 */
export async function embedBookHandler(bookId, text, title, author, genre) {
    try {
        console.log(`[MLController] Embedding book ${bookId}...`);
        const result = await embedAndIndexBook(bookId, text, title, author, genre);
        return {
            success: true,
            bookId,
            embedding_dimension: result.embedding.length,
            indexed: result.indexed,
            message: "Book embedded and indexed successfully",
        };
    }
    catch (error) {
        console.error(`[MLController] Embedding failed for ${bookId}:`, error);
        throw error;
    }
}
/**
 * Get book recommendations
 * Query text can be:
 * - Book excerpt
 * - Description
 * - Another book's text
 * - User-provided text
 *
 * Request body:
 * {
 *   "query_text": "Book text to find similar books for",
 *   "k": 5,
 *   "threshold": 0.6 (optional, filter by similarity)
 * }
 */
export async function recommendationsHandler(queryText, k = 5, threshold) {
    try {
        console.log(`[MLController] Getting ${k} recommendations...`);
        // Get recommendations from FAISS
        let recommendations = await getRecommendations(queryText, k);
        // Apply threshold filter if provided
        if (threshold !== undefined) {
            recommendations = filterByThreshold(recommendations, threshold);
        }
        // Sort by similarity
        recommendations = sortBySimilarity(recommendations);
        return {
            success: true,
            count: recommendations.length,
            recommendations,
        };
    }
    catch (error) {
        console.error("[MLController] Recommendations failed:", error);
        throw error;
    }
}
/**
 * Check ML service health
 */
export async function healthCheckHandler() {
    try {
        const health = await mlClient.health();
        return {
            status: "ok",
            ml_service: health,
            timestamp: new Date().toISOString(),
        };
    }
    catch (error) {
        console.error("[MLController] Health check failed:", error);
        throw new Error("ML service unavailable");
    }
}
/**
 * Get similarity score between two texts
 * Useful for:
 * - Analytics
 * - Debug
 * - A/B testing recommendations
 *
 * Request body:
 * {
 *   "text_a": "First book text",
 *   "text_b": "Second book text"
 * }
 */
export async function similarityHandler(textA, textB) {
    try {
        console.log("[MLController] Computing similarity...");
        const score = await mlClient.similarity(textA, textB);
        return {
            success: true,
            similarity: score,
            interpretation: score > 0.7
                ? "Very similar"
                : score > 0.5
                    ? "Similar"
                    : score > 0.3
                        ? "Somewhat similar"
                        : "Not similar",
        };
    }
    catch (error) {
        console.error("[MLController] Similarity check failed:", error);
        throw error;
    }
}
/**
 * Compare two pre-computed embeddings
 * Used for book-to-book comparison without re-embedding
 * More efficient when embeddings are already stored
 *
 * Request body:
 * {
 *   "embedding_a": [0.123, 0.456, ...],  // 384-dim array
 *   "embedding_b": [0.789, 0.012, ...]   // 384-dim array
 * }
 */
export async function compareEmbeddingsHandler(embeddingA, embeddingB) {
    try {
        console.log("[MLController] Comparing pre-computed embeddings...");
        // Validate embeddings
        if (!Array.isArray(embeddingA) || !Array.isArray(embeddingB)) {
            throw new Error("Embeddings must be arrays");
        }
        if (embeddingA.length !== 384 || embeddingB.length !== 384) {
            throw new Error(`Embeddings must be 384-dimensional (got ${embeddingA.length} and ${embeddingB.length})`);
        }
        const result = await mlClient.compareEmbeddings(embeddingA, embeddingB);
        return {
            success: true,
            similarity: result.similarity,
            interpretation: result.interpretation,
        };
    }
    catch (error) {
        console.error("[MLController] Embedding comparison failed:", error);
        throw error;
    }
}
/**
 * Get book embedding statistics
 * Shows how many books are indexed
 */
export async function indexStatsHandler() {
    try {
        const totalBooks = await Book.countDocuments();
        const indexedBooks = await Book.countDocuments({
            indexedAt: { $ne: null },
        });
        const withEmbeddings = await Book.countDocuments({
            embedding: { $ne: null },
        });
        return {
            total_books: totalBooks,
            indexed_books: indexedBooks,
            with_embeddings: withEmbeddings,
            indexing_progress: totalBooks > 0 ? (indexedBooks / totalBooks) * 100 : 0,
        };
    }
    catch (error) {
        console.error("[MLController] Stats retrieval failed:", error);
        throw error;
    }
}
