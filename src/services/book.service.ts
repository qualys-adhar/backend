/**
 * Book Service
 * Business logic for book operations including ML integration
 */

import { Book } from "../db/book.model";
import { mlClient } from "../ml/ml.client";

export interface BookWithSimilarity {
  _id: string;
  title: string;
  author: string;
  genre?: string;
  similarity?: number;
}

/**
 * Embed a book and save embedding to database
 * Called after PDF text extraction
 */
export async function embedBook(
  bookId: string,
  bookText: string,
): Promise<number[]> {
  try {
    console.log(`[BookService] Embedding book ${bookId}...`);

    // Call ML service to get embedding
    const embedding = await mlClient.embed(bookText);

    // Save embedding to MongoDB
    await Book.updateOne({ _id: bookId }, { embedding });

    console.log(`[BookService] Book ${bookId} embedded successfully`);
    return embedding;
  } catch (error) {
    console.error(`[BookService] Failed to embed book ${bookId}:`, error);
    throw new Error("Failed to embed book");
  }
}

/**
 * Add book to FAISS index for similarity search
 * Should be called after successful embedding
 */
export async function indexBook(
  bookId: string,
  bookText: string,
  metadata?: { title?: string; author?: string; genre?: string },
): Promise<boolean> {
  try {
    console.log(`[BookService] Indexing book ${bookId}...`);

    // Add to FAISS index
    const success = await mlClient.indexAdd(bookId, bookText, metadata);

    if (success) {
      // Update MongoDB with index timestamp
      await Book.updateOne({ _id: bookId }, { indexedAt: new Date() });
      console.log(`[BookService] Book ${bookId} indexed successfully`);
    }

    return success;
  } catch (error) {
    console.error(`[BookService] Failed to index book ${bookId}:`, error);
    throw new Error("Failed to index book");
  }
}

/**
 * Embed and index a book in one operation
 * Complete ML integration flow
 */
export async function embedAndIndexBook(
  bookId: string,
  bookText: string,
  title: string,
  author: string,
  genre?: string,
): Promise<{ embedding: number[]; indexed: boolean }> {
  try {
    console.log(`[BookService] Starting embed and index for book ${bookId}...`);

    // Step 1: Embed
    const embedding = await embedBook(bookId, bookText);

    // Step 2: Index
    const indexed = await indexBook(bookId, bookText, {
      title,
      author,
      genre,
    });

    return { embedding, indexed };
  } catch (error) {
    console.error(
      `[BookService] Failed to embed and index book ${bookId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Get book embedding from database
 */
export async function getBookEmbedding(
  bookId: string,
): Promise<number[] | null> {
  try {
    const book = await Book.findById(bookId).select("embedding");
    return book?.embedding || null;
  } catch (error) {
    console.error(
      `[BookService] Failed to get embedding for book ${bookId}:`,
      error,
    );
    return null;
  }
}

/**
 * Check if book is indexed
 */
export async function isBookIndexed(bookId: string): Promise<boolean> {
  try {
    const book = await Book.findById(bookId).select("indexedAt");
    return !!book?.indexedAt;
  } catch (error) {
    console.error(
      `[BookService] Failed to check index status for book ${bookId}:`,
      error,
    );
    return false;
  }
}

/**
 * Get book metadata for ML service
 */
export async function getBookMetadata(bookId: string): Promise<{
  title?: string;
  author?: string;
  genre?: string;
} | null> {
  try {
    const book = await Book.findById(bookId).select("title author genre");
    return book
      ? {
          title: book.title,
          author: book.author,
          genre: book.genre ?? undefined,
        }
      : null;
  } catch (error) {
    console.error(
      `[BookService] Failed to get metadata for book ${bookId}:`,
      error,
    );
    return null;
  }
}
