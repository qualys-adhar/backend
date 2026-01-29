/**
 * Book Controller
 *
 * HTTP request handlers for book-related endpoints.
 */

import { Request, Response, NextFunction } from "express";
import { bookService } from "./book.service";
import { mlService } from "../ml/ml.service";

export class BookController {
  /**
   * Create a new book
   * POST /api/books
   */
  async createBook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
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
        uploadedBy: (req as any).user?.id, // Assuming auth middleware
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get book by ID
   * GET /api/books/:id
   */
  async getBook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const book = await bookService.getBookById(id as string);

      if (!book) {
        res.status(404).json({ error: "Book not found" });
        return;
      }

      res.json({ book });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all books with pagination
   * GET /api/books
   */
  async getBooks(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const genre = req.query.genre as string;
      const mlProcessed =
        req.query.mlProcessed === "true"
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search books
   * GET /api/books/search
   */
  async searchBooks(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const query = req.query.q as string;

      if (!query) {
        res.status(400).json({ error: 'Query parameter "q" is required' });
        return;
      }

      const books = await bookService.searchBooks(query);

      res.json({ books, count: books.length });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update book
   * PATCH /api/books/:id
   */
  async updateBook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const book = await bookService.updateBook(id as string, updates);

      if (!book) {
        res.status(404).json({ error: "Book not found" });
        return;
      }

      res.json({ book });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete book
   * DELETE /api/books/:id
   */
  async deleteBook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      await bookService.deleteBook(id as string);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get ML processing stats
   * GET /api/books/stats/ml
   */
  async getMLStats(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const stats = await bookService.getMLStats();
      res.json({ stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reprocess book for ML
   * POST /api/books/:id/reprocess
   */
  async reprocessBook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;

      const book = await bookService.getBookById(id as string);
      if (!book) {
        res.status(404).json({ error: "Book not found" });
        return;
      }

      // Start reprocessing
      bookService
        .processBookForML(id as string)
        .catch((err) => console.error("[API] Reprocessing failed:", err));

      res.status(202).json({
        message: "Book reprocessing started",
        bookId: id,
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const bookController = new BookController();
