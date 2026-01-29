/**
 * ML Service Business Logic
 *
 * High-level service class that wraps ML API calls.
 * Provides clean interface for the rest of the application.
 */

import { mlClient } from "./ml.client";
import {
  EmbedRequest,
  EmbedResponse,
  SearchRequest,
  SearchResponse,
  SearchResult,
  SimilarityRequest,
  SimilarityResponse,
  AddBookRequest,
  AddBookResponse,
  HealthResponse,
  IndexStats,
} from "./ml.types";

export class MLService {
  /**
   * Generate embedding vector for book text
   *
   * @param text - Full book text
   * @param chunkSize - Words per chunk (default: 600)
   * @param overlap - Overlapping words (default: 100)
   * @returns 384-dimensional embedding vector
   */
  async embedBook(
    text: string,
    chunkSize: number = 600,
    overlap: number = 100,
  ): Promise<number[]> {
    try {
      const response = await mlClient.post<EmbedResponse>("/embed", {
        text,
        chunk_size: chunkSize,
        overlap,
      } as EmbedRequest);

      console.log(
        `[ML] Generated embedding (${response.data.embedding.length} dimensions)`,
      );
      return response.data.embedding;
    } catch (error) {
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
  async addToIndex(
    bookId: string,
    text: string,
    metadata?: any,
  ): Promise<AddBookResponse> {
    try {
      const response = await mlClient.post<AddBookResponse>("/index/add", {
        book_id: bookId,
        text,
        metadata,
      } as AddBookRequest);

      console.log(`[ML] Book ${bookId} added to index successfully`);
      return response.data;
    } catch (error) {
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
  async searchSimilar(
    queryText: string,
    k: number = 5,
    excludeId?: string,
  ): Promise<SearchResult[]> {
    try {
      const response = await mlClient.post<SearchResponse>("/search", {
        query_text: queryText,
        k,
        exclude_id: excludeId,
      } as SearchRequest);

      console.log(`[ML] Found ${response.data.results.length} similar books`);
      return response.data.results;
    } catch (error) {
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
  async computeSimilarity(
    textA: string,
    textB: string,
  ): Promise<SimilarityResponse> {
    try {
      const response = await mlClient.post<SimilarityResponse>("/similarity", {
        text_a: textA,
        text_b: textB,
      } as SimilarityRequest);

      console.log(
        `[ML] Similarity: ${response.data.similarity.toFixed(4)} (${response.data.interpretation})`,
      );
      return response.data;
    } catch (error) {
      console.error("[ML] Failed to compute similarity:", error);
      throw new Error("Similarity service unavailable");
    }
  }

  /**
   * Save current FAISS index to disk
   */
  async saveIndex(): Promise<void> {
    try {
      await mlClient.post("/index/save");
      console.log("[ML] Index saved successfully");
    } catch (error) {
      console.error("[ML] Failed to save index:", error);
      throw new Error("Failed to save search index");
    }
  }

  /**
   * Get FAISS index statistics
   *
   * @returns Index size, embedding dimension, and metric
   */
  async getIndexStats(): Promise<IndexStats> {
    try {
      const response = await mlClient.get<IndexStats>("/index/stats");
      return response.data;
    } catch (error) {
      console.error("[ML] Failed to get index stats:", error);
      throw new Error("Failed to retrieve index statistics");
    }
  }

  /**
   * Check ML service health
   *
   * @returns true if service is healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await mlClient.get<HealthResponse>("/");
      const isHealthy = response.data.status === "running";

      if (isHealthy) {
        console.log(`[ML] Service healthy`);
      } else {
        console.warn("[ML] Service unhealthy:", response.data);
      }

      return isHealthy;
    } catch (error) {
      console.error("[ML] Health check failed:", error);
      return false;
    }
  }

  /**
   * Get detailed health information
   */
  async getHealthDetails(): Promise<HealthResponse | null> {
    try {
      const response = await mlClient.get<HealthResponse>("/");
      return response.data;
    } catch (error) {
      console.error("[ML] Failed to get health details:", error);
      return null;
    }
  }
}

// Export singleton instance
export const mlService = new MLService();
