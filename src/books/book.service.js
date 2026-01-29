/**
 * Book Service
 *
 * Business logic for book operations including ML processing.
 */
import { BookModel } from "./book.model";
import { mlService } from "../ml/ml.service";
import { retryWithBackoff } from "../utils/retry";
export class BookService {
    /**
     * Create a new book
     */
    async createBook(data) {
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
    async getBookById(id, includeEmbedding = false) {
        const query = BookModel.findById(id);
        if (includeEmbedding) {
            query.select("+embedding");
        }
        return query.exec();
    }
    /**
     * Get all books with pagination
     */
    async getBooks(options = {}) {
        const { page = 1, limit = 20, genre, mlProcessed } = options;
        const filter = {};
        if (genre)
            filter.genre = genre;
        if (mlProcessed !== undefined)
            filter.mlProcessed = mlProcessed;
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
    async searchBooks(query) {
        return BookModel.find({ $text: { $search: query } }, { score: { $meta: "textScore" } })
            .sort({ score: { $meta: "textScore" } })
            .limit(20)
            .exec();
    }
    /**
     * Process book for ML (embedding + indexing)
     * This should run asynchronously in production (job queue)
     */
    async processBookForML(bookId) {
        try {
            const book = await this.getBookById(bookId);
            if (!book) {
                throw new Error(`Book ${bookId} not found`);
            }
            console.log(`[Book] Processing ${bookId} for ML...`);
            // Step 1: Generate embedding with retry logic
            console.log(`[Book] Generating embedding...`);
            const embedding = await retryWithBackoff(() => mlService.embedBook(book.text), {
                maxRetries: 3,
                onRetry: (attempt, error) => {
                    console.warn(`[Book] Embedding retry ${attempt}: ${error.message}`);
                },
            });
            // Step 2: Save embedding to MongoDB
            await BookModel.updateOne({ _id: bookId }, {
                embedding,
                mlProcessed: true,
                mlProcessedAt: new Date(),
                $unset: { mlError: 1 }, // Clear any previous errors
            });
            console.log(`[Book] Embedding saved to DB`);
            // Step 3: Add to FAISS search index
            console.log(`[Book] Adding to search index...`);
            await retryWithBackoff(() => mlService.addToIndex(bookId, book.text, {
                title: book.title,
                author: book.author,
                genre: book.genre,
            }), {
                maxRetries: 3,
            });
            console.log(`[Book] ✓ Book ${bookId} processed successfully`);
        }
        catch (error) {
            console.error(`[Book] ML processing failed for ${bookId}:`, error);
            // Mark as failed in DB
            await BookModel.updateOne({ _id: bookId }, {
                mlProcessed: false,
                mlError: error.message,
            });
            throw error;
        }
    }
    /**
     * Reprocess failed books
     */
    async reprocessFailedBooks() {
        const failedBooks = await BookModel.find({
            mlProcessed: false,
            mlError: { $exists: true },
        }).limit(10);
        console.log(`[Book] Found ${failedBooks.length} failed books to reprocess`);
        for (const book of failedBooks) {
            try {
                await this.processBookForML(book._id);
            }
            catch (error) {
                console.error(`[Book] Reprocessing failed for ${book._id}`);
            }
        }
    }
    /**
     * Update book
     */
    async updateBook(id, updates) {
        return BookModel.findByIdAndUpdate(id, { $set: updates }, { new: true });
    }
    /**
     * Delete book
     */
    async deleteBook(id) {
        await BookModel.findByIdAndDelete(id);
        console.log(`[Book] Deleted book ${id}`);
    }
    /**
     * Get ML processing statistics
     */
    async getMLStats() {
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
