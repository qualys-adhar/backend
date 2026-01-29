/**
 * Book Controller
 *
 * HTTP request handlers for book-related endpoints.
 */
import { bookService } from "./book.service";
export class BookController {
    /**
     * Create a new book
     * POST /api/books
     */
    async createBook(req, res, next) {
        try {
            const { title, author, genre, description, text } = req.body;
            // Validation
            if (!title || !author || !text) {
                res.status(400).json({
                    error: "Missing required fields: title, author, text",
                });
                return;
            }
            // Create book
            const book = await bookService.createBook({
                title,
                author,
                genre,
                description,
                text,
                uploadedBy: req.user?.id, // Assuming auth middleware
            });
            // Start ML processing in background (don't wait)
            bookService.processBookForML(book._id.toString()).catch((err) => {
                console.error("[API] Background ML processing failed:", err);
            });
            // Return immediately with 202 Accepted
            res.status(202).json({
                message: "Book uploaded successfully",
                bookId: book._id,
                status: "processing",
                book: {
                    id: book._id,
                    title: book.title,
                    author: book.author,
                    genre: book.genre,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get book by ID
     * GET /api/books/:id
     */
    async getBook(req, res, next) {
        try {
            const { id } = req.params;
            const book = await bookService.getBookById(id);
            if (!book) {
                res.status(404).json({ error: "Book not found" });
                return;
            }
            res.json({ book });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get all books with pagination
     * GET /api/books
     */
    async getBooks(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const genre = req.query.genre;
            const mlProcessed = req.query.mlProcessed === "true"
                ? true
                : req.query.mlProcessed === "false"
                    ? false
                    : undefined;
            const result = await bookService.getBooks({
                page,
                limit,
                genre,
                mlProcessed,
            });
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Search books
     * GET /api/books/search
     */
    async searchBooks(req, res, next) {
        try {
            const query = req.query.q;
            if (!query) {
                res.status(400).json({ error: 'Query parameter "q" is required' });
                return;
            }
            const books = await bookService.searchBooks(query);
            res.json({ books, count: books.length });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Update book
     * PATCH /api/books/:id
     */
    async updateBook(req, res, next) {
        try {
            const { id } = req.params;
            const updates = req.body;
            const book = await bookService.updateBook(id, updates);
            if (!book) {
                res.status(404).json({ error: "Book not found" });
                return;
            }
            res.json({ book });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Delete book
     * DELETE /api/books/:id
     */
    async deleteBook(req, res, next) {
        try {
            const { id } = req.params;
            await bookService.deleteBook(id);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get ML processing stats
     * GET /api/books/stats/ml
     */
    async getMLStats(req, res, next) {
        try {
            const stats = await bookService.getMLStats();
            res.json({ stats });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Reprocess book for ML
     * POST /api/books/:id/reprocess
     */
    async reprocessBook(req, res, next) {
        try {
            const { id } = req.params;
            const book = await bookService.getBookById(id);
            if (!book) {
                res.status(404).json({ error: "Book not found" });
                return;
            }
            // Start reprocessing
            bookService
                .processBookForML(id)
                .catch((err) => console.error("[API] Reprocessing failed:", err));
            res.status(202).json({
                message: "Book reprocessing started",
                bookId: id,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
// Export singleton instance
export const bookController = new BookController();
