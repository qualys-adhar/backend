/**
 * ML Service Type Definitions
 * Contracts between Node.js backend and FastAPI ML service
 */

export interface EmbedRequest {
  text: string;
}

export interface EmbedResponse {
  embedding: number[];
}

export interface SimilarityRequest {
  text_a: string;
  text_b: string;
}

export interface SimilarityResponse {
  similarity: number;
  interpretation: string;
}

export interface EmbeddingSimilarityRequest {
  embedding_a: number[];
  embedding_b: number[];
}

export interface EmbeddingSimilarityResponse {
  similarity: number;
  interpretation: string;
}

export interface SearchResult {
  book_id: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface SearchRequest {
  query_text: string;
  k: number;
}

export interface SearchResponse {
  results: SearchResult[];
}

export interface IndexAddRequest {
  book_id: string;
  text: string;
  metadata?: Record<string, any>;
}

export interface IndexAddResponse {
  success: boolean;
  message: string;
}

export interface MLServiceHealth {
  status: string;
  version?: string;
}

// Type aliases for backward compatibility
export type AddBookRequest = IndexAddRequest;
export type AddBookResponse = IndexAddResponse;
export type HealthResponse = MLServiceHealth;
export type IndexStats = {
  total_vectors: number;
  dimension: number;
  index_type: string;
};
