/**
 * ML Service Client
 * Axios wrapper for FastAPI ML service
 * Handles all communication with the ML microservice
 */

import axios, { AxiosInstance } from "axios";
import {
  EmbedRequest,
  EmbedResponse,
  SimilarityRequest,
  SimilarityResponse,
  EmbeddingSimilarityRequest,
  EmbeddingSimilarityResponse,
  SearchRequest,
  SearchResponse,
  IndexAddRequest,
  IndexAddResponse,
  MLServiceHealth,
  SearchResult,
} from "./ml.types";

class MLClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = "http://localhost:8000") {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 30000, // 30s timeout for ML operations
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request/response logging
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error("[ML Service Error]", {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });
        throw error;
      },
    );
  }

  /**
   * Health check - verify ML service is running
   */
  async health(): Promise<MLServiceHealth> {
    try {
      const response = await this.client.get<MLServiceHealth>("/health");
      return response.data;
    } catch (error) {
      console.error("ML service health check failed");
      throw new Error("ML service unavailable");
    }
  }

  /**
   * Embed a single text/book
   * Returns 384-dimensional vector
   */
  async embed(text: string): Promise<number[]> {
    try {
      const request: EmbedRequest = { text };
      const response = await this.client.post<EmbedResponse>("/embed", request);
      return response.data.embedding;
    } catch (error) {
      console.error("Embed error", error);
      throw new Error("Failed to embed text");
    }
  }

  /**
   * Compute similarity score between two texts
   * Returns score between 0 and 1
   */
  async similarity(textA: string, textB: string): Promise<number> {
    try {
      const request: SimilarityRequest = {
        text_a: textA,
        text_b: textB,
      };
      const response = await this.client.post<SimilarityResponse>(
        "/similarity",
        request,
      );
      console.log(response.data);
      return response.data.similarity;
    } catch (error) {
      console.error("Similarity error", error);
      throw new Error("Failed to compute similarity");
    }
  }

  /**
   * Compare two pre-computed embeddings directly
   * More efficient than re-embedding text
   * Used for book-to-book comparison with stored embeddings
   */
  async compareEmbeddings(
    embeddingA: number[],
    embeddingB: number[],
  ): Promise<{ similarity: number; interpretation: string }> {
    try {
      const request = {
        embedding_a: embeddingA,
        embedding_b: embeddingB,
      };
      const response = await this.client.post<EmbeddingSimilarityResponse>(
        "/similarity/embeddings",
        request,
      );
      console.log(
        `[ML Client] Embedding similarity: ${response.data.similarity.toFixed(4)}`,
      );
      return response.data;
    } catch (error) {
      console.error("Embedding similarity error", error);
      throw new Error("Failed to compare embeddings");
    }
  }

  /**
   * Add book to FAISS index
   * Called after embedding to enable similarity search
   */
  async indexAdd(
    bookId: string,
    text: string,
    metadata?: Record<string, any>,
  ): Promise<boolean> {
    try {
      const request: IndexAddRequest = {
        book_id: bookId,
        text,
        metadata,
      };
      const response = await this.client.post<IndexAddResponse>(
        "/index/add",
        request,
      );
      return response.data.success;
    } catch (error) {
      console.error("Index add error", error);
      throw new Error("Failed to add book to index");
    }
  }

  /**
   * Search for similar books in FAISS index
   * Returns k most similar books with scores
   */
  async search(queryText: string, k: number = 5): Promise<SearchResult[]> {
    try {
      const request: SearchRequest = {
        query_text: queryText,
        k,
      };
      const response = await this.client.post<SearchResponse>(
        "/search",
        request,
      );
      return response.data.results;
    } catch (error) {
      console.error("Search error", error);
      throw new Error("Failed to search similar books");
    }
  }

  /**
   * Get the base URL of the ML service
   */
  getBaseURL(): string {
    return this.baseURL;
  }
}

// Singleton instance
export const mlClient = new MLClient(
  process.env.ML_SERVICE_URL || "http://localhost:8000",
);

export { MLClient };

// Re-export types for convenience
export type {
  EmbedRequest,
  EmbedResponse,
  SimilarityRequest,
  SimilarityResponse,
  EmbeddingSimilarityRequest,
  EmbeddingSimilarityResponse,
  SearchRequest,
  SearchResponse,
  IndexAddRequest,
  IndexAddResponse,
  MLServiceHealth,
  SearchResult,
} from "./ml.types";
