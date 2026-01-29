/**
 * Book Service
 *
 * Business logic for book operations including ML processing.
 */

import { BookModel, IBook } from "./book.model";
import { mlService } from "../ml/ml.service";
import { retryWithBackoff, isRetryableError } from "../utils/retry";

export class BookService {
  /**
   * Create a new book
   */
  async createBook(data: {
    title: string;
    author: string;
    genre?: string;
    description?: string;
    text: string;
    uploadedBy?: string;
  }): Promise<IBook> {
    const book = await BookModel.create({
      ...data,
      mlProcessed: false,
    });

    console.log(`[Book] Created book ${book._id}: ${book.title}`);
    return book;
  }

  /**
   * Get book by ID
   */
  async getBookById(
    id: string,
    includeEmbedding: boolean = false,
  ): Promise<IBook | null> {
    const query = BookModel.findById(id);

    if (includeEmbedding) {
      query.select("+embedding");
    }

    return query.exec();
  }

  /**
   * Get all books with pagination
   */
  async getBooks(
    options: {
      page?: number;
      limit?: number;
      genre?: string;
      mlProcessed?: boolean;
    } = {},
  ): Promise<{
    books: IBook[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, genre, mlProcessed } = options;

    const filter: any = {};
    if (genre) filter.genre = genre;
    if (mlProcessed !== undefined) filter.mlProcessed = mlProcessed;

    const skip = (page - 1) * limit;

    const [books, total] = await Promise.all([
      BookModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      BookModel.countDocuments(filter),
    ]);

    return {
      books,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Search books by title or author
   */
  async searchBooks(query: string): Promise<IBook[]> {
    return BookModel.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } },
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(20)
      .exec();
  }

  /**
   * Process book for ML (embedding + indexing)
   * This should run asynchronously in production (job queue)
   */
  async processBookForML(bookId: string): Promise<void> {
    try {
      const book = await this.getBookById(bookId);
      if (!book) {
        throw new Error(`Book ${bookId} not found`);
      }

      console.log(`[Book] Processing ${bookId} for ML...`);

      // Step 1: Generate embedding with retry logic
      console.log(`[Book] Generating embedding...`);
      const embedding = await retryWithBackoff(
        () => mlService.embedBook(book.text),
        {
          maxRetries: 3,
          onRetry: (attempt, error) => {
            console.warn(`[Book] Embedding retry ${attempt}: ${error.message}`);
          },
        },
      );

      // Step 2: Save embedding to MongoDB
      await BookModel.updateOne(
        { _id: bookId },
        {
          embedding,
          mlProcessed: true,
          mlProcessedAt: new Date(),
          $unset: { mlError: 1 }, // Clear any previous errors
        },
      );
      console.log(`[Book] Embedding saved to DB`);

      // Step 3: Add to FAISS search index
      console.log(`[Book] Adding to search index...`);
      await retryWithBackoff(
        () =>
          mlService.addToIndex(bookId, book.text, {
            title: book.title,
            author: book.author,
            genre: book.genre,
          }),
        {
          maxRetries: 3,
        },
      );

      console.log(`[Book] ✓ Book ${bookId} processed successfully`);
    } catch (error) {
      console.error(`[Book] ML processing failed for ${bookId}:`, error);

      // Mark as failed in DB
      await BookModel.updateOne(
        { _id: bookId },
        {
          mlProcessed: false,
          mlError: (error as Error).message,
        },
      );

      throw error;
    }
  }

  /**
   * Reprocess failed books
   */
  async reprocessFailedBooks(): Promise<void> {
    const failedBooks = await BookModel.find({
      mlProcessed: false,
      mlError: { $exists: true },
    }).limit(10);

    console.log(`[Book] Found ${failedBooks.length} failed books to reprocess`);

    for (const book of failedBooks) {
      try {
        await this.processBookForML(book._id.toString());
      } catch (error) {
        console.error(`[Book] Reprocessing failed for ${book._id}`);
      }
    }
  }

  /**
   * Update book
   */
  async updateBook(id: string, updates: Partial<IBook>): Promise<IBook | null> {
    return BookModel.findByIdAndUpdate(id, { $set: updates }, { new: true });
  }

  /**
   * Delete book
   */
  async deleteBook(id: string): Promise<void> {
    await BookModel.findByIdAndDelete(id);
    console.log(`[Book] Deleted book ${id}`);
  }

  /**
   * Get ML processing statistics
   */
  async getMLStats(): Promise<{
    total: number;
    processed: number;
    failed: number;
    pending: number;
  }> {
    const [total, processed, failed] = await Promise.all([
      BookModel.countDocuments(),
      BookModel.countDocuments({ mlProcessed: true }),
      BookModel.countDocuments({
        mlProcessed: false,
        mlError: { $exists: true },
      }),
    ]);

    return {
      total,
      processed,
      failed,
      pending: total - processed - failed,
    };
  }
}

// Export singleton instance
export const bookService = new BookService();
