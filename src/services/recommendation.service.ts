/**
 * Recommendation Service
 * Business logic for book recommendations using ML service
 */

import { Book } from "../db/book.model";
import { mlClient, SearchResult } from "../ml/ml.client";

export interface Recommendation extends BookWithMetadata {
  similarity: number; // Score from 0 to 1
}

interface BookWithMetadata {
  _id: string;
  title: string;
  author: string;
  genre?: string;
  s3Key: string;
}

/**
 * Get book recommendations based on query text
 * Can be used with book excerpt, description, or similar book text
 */
export async function getRecommendations(
  queryText: string,
  k: number = 5,
): Promise<Recommendation[]> {
  try {
    console.log(
      `[RecommendationService] Getting ${k} recommendations for query...`,
    );

    // Search in FAISS index
    const searchResults = await mlClient.search(queryText, k);

    if (searchResults.length === 0) {
      console.log("[RecommendationService] No recommendations found");
      return [];
    }

    // Fetch book metadata from MongoDB
    const bookIds = searchResults.map((r) => r.book_id);
    const books = await Book.find({ _id: { $in: bookIds } }).lean();

    // Create a map for quick lookup
    const booksMap = new Map<string, BookWithMetadata>();
    books.forEach((book: any) => {
      booksMap.set(book._id.toString(), {
        _id: book._id.toString(),
        title: book.title,
        author: book.author,
        genre: book.genre,
        s3Key: book.s3Key,
      });
    });

    // Combine search results with metadata
    const recommendations: Recommendation[] = searchResults
      .map((result: SearchResult) => {
        const book = booksMap.get(result.book_id);
        return book
          ? {
              ...book,
              similarity: result.score,
            }
          : null;
      })
      .filter((rec): rec is Recommendation => rec !== null);

    console.log(
      `[RecommendationService] Returning ${recommendations.length} recommendations`,
    );
    return recommendations;
  } catch (error) {
    console.error(
      "[RecommendationService] Failed to get recommendations:",
      error,
    );
    throw new Error("Failed to get recommendations");
  }
}

/**
 * Get recommendations for a specific book
 * Uses the book's full text to find similar books
 */
export async function getBookRecommendations(
  bookId: string,
  k: number = 5,
  excludeBook: boolean = true,
): Promise<Recommendation[]> {
  try {
    console.log(
      `[RecommendationService] Getting recommendations for book ${bookId}...`,
    );

    // Fetch book text
    const book = await Book.findById(bookId).select("s3Key");
    if (!book) {
      throw new Error("Book not found");
    }

    // In a real scenario, you'd fetch the actual text from S3
    // For now, we'll use a placeholder - implement as needed
    // const bookText = await fetchBookTextFromS3(book.s3Key);

    // For now, return error indicating need for full text
    throw new Error("Full book text retrieval not yet implemented");
  } catch (error) {
    console.error(
      `[RecommendationService] Failed to get book recommendations for ${bookId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Compare similarity between two books
 * Useful for analytics and debugging
 */
export async function compareSimilarity(
  bookIdA: string,
  bookIdB: string,
): Promise<{ similarity: number; bookA: string; bookB: string }> {
  try {
    console.log(
      `[RecommendationService] Comparing similarity between ${bookIdA} and ${bookIdB}...`,
    );

    // In real implementation, fetch texts and compare
    // This is a placeholder for the actual logic
    throw new Error("Full book text retrieval not yet implemented");
  } catch (error) {
    console.error(
      "[RecommendationService] Failed to compare similarity:",
      error,
    );
    throw error;
  }
}

/**
 * Batch get recommendations for multiple book texts
 * Useful for bulk recommendation generation
 */
export async function getBatchRecommendations(
  bookTexts: Array<{ id: string; text: string }>,
  k: number = 5,
): Promise<Map<string, Recommendation[]>> {
  try {
    console.log(
      `[RecommendationService] Getting batch recommendations for ${bookTexts.length} books...`,
    );

    const results = new Map<string, Recommendation[]>();

    for (const { id, text } of bookTexts) {
      try {
        const recommendations = await getRecommendations(text, k);
        results.set(id, recommendations);
      } catch (error) {
        console.error(`[RecommendationService] Failed for book ${id}:`, error);
        results.set(id, []);
      }
    }

    return results;
  } catch (error) {
    console.error("[RecommendationService] Batch operation failed:", error);
    throw new Error("Batch recommendations failed");
  }
}

/**
 * Filter recommendations by threshold
 * Only return books with similarity above threshold
 */
export function filterByThreshold(
  recommendations: Recommendation[],
  threshold: number = 0.6,
): Recommendation[] {
  return recommendations.filter((rec) => rec.similarity >= threshold);
}

/**
 * Sort recommendations by similarity (descending)
 */
export function sortBySimilarity(
  recommendations: Recommendation[],
): Recommendation[] {
  return [...recommendations].sort((a, b) => b.similarity - a.similarity);
}
