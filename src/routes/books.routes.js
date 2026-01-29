import { Hono } from "hono";
import { listBooks, getBook, getSignedDownloadUrl, } from "../controllers/analyze.controller";
import { mlClient } from "../ml/ml.client";
import { Book } from "../db/book.model";
const router = new Hono();
// GET /books - List all analyzed books with pagination
router.get("/", async (c) => {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const result = await listBooks(page, limit);
    return c.json(result);
});
// GET /books/:id - Get a specific book by ID
router.get("/:id", async (c) => {
    const id = c.req.param("id");
    const book = await getBook(id);
    if (!book) {
        return c.json({ error: "Book not found" }, 404);
    }
    return c.json(book);
});
// GET /books/:id/download - Get signed S3 URL for PDF download
router.get("/:id/download", async (c) => {
    const id = c.req.param("id");
    const book = await getBook(id);
    if (!book || !book.s3Key) {
        return c.json({ error: "Book or S3 file not found" }, 404);
    }
    const downloadUrl = await getSignedDownloadUrl(book.s3Key);
    return c.json({ url: downloadUrl, expiresIn: 3600 });
});
// GET /books/:id/details - Get book details with similar books
router.get("/:id/details", async (c) => {
    try {
        const id = c.req.param("id");
        const page = parseInt(c.req.query("page") || "1");
        const limit = parseInt(c.req.query("limit") || "10");
        // Fetch the main book
        const book = await Book.findById(id);
        if (!book) {
            return c.json({ error: "Book not found" }, 404);
        }
        // Check if book has embedding
        if (!book.embedding || book.embedding.length === 0) {
            return c.json({
                book: {
                    _id: book._id.toString(),
                    title: book.title,
                    author: book.author,
                    topWords: book.topWords,
                    totalWords: book.totalWords,
                    s3Key: book.s3Key,
                    uploadedAt: book.createdAt,
                    embedding: book.embedding,
                    genre: book.genre,
                },
                similarBooks: [],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 0,
                    totalPages: 0,
                },
                message: "Book does not have an embedding yet. Similarity comparison unavailable.",
            });
        }
        console.log(`[Backend] Finding similar books for: "${book.title}"`);
        // Fetch all other books with embeddings
        const otherBooks = await Book.find({
            _id: { $ne: id },
            embedding: { $exists: true, $ne: null, $not: { $size: 0 } },
        });
        console.log(`[Backend] Found ${otherBooks.length} books to compare`);
        // Compute similarity for all books
        const similarityPromises = otherBooks.map(async (otherBook) => {
            try {
                const result = await mlClient.compareEmbeddings(book.embedding, otherBook.embedding);
                return {
                    book_id: otherBook._id.toString(),
                    title: otherBook.title,
                    author: otherBook.author,
                    totalWords: otherBook.totalWords,
                    topWords: otherBook.topWords?.slice(0, 3) || [],
                    similarity_score: result.similarity,
                    interpretation: result.interpretation,
                };
            }
            catch (error) {
                console.error(`Failed to compare with ${otherBook.title}:`, error);
                return null;
            }
        });
        const similarities = (await Promise.all(similarityPromises))
            .filter((s) => s !== null)
            .sort((a, b) => b.similarity_score - a.similarity_score);
        // Paginate results
        const total = similarities.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedResults = similarities.slice(startIndex, endIndex);
        return c.json({
            book: {
                _id: book._id.toString(),
                title: book.title,
                author: book.author,
                topWords: book.topWords,
                totalWords: book.totalWords,
                s3Key: book.s3Key,
                uploadedAt: book.createdAt,
                embedding: book.embedding,
                genre: book.genre,
            },
            similarBooks: paginatedResults,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        });
    }
    catch (error) {
        console.error("[Backend Error] Book details fetch failed:", error);
        return c.json({
            error: "Failed to fetch book details",
            details: error.message,
        }, 500);
    }
});
// POST /books/similarity - Compare two books by their embeddings
router.post("/similarity", async (c) => {
    try {
        const body = await c.req.json();
        const { book_id_1, book_id_2 } = body;
        // Validate input
        if (!book_id_1 || !book_id_2) {
            return c.json({ error: "Both book_id_1 and book_id_2 are required" }, 400);
        }
        // Fetch both books from MongoDB
        const [book1, book2] = await Promise.all([
            Book.findById(book_id_1),
            Book.findById(book_id_2),
        ]);
        // Check if books exist
        if (!book1) {
            return c.json({ error: `Book with ID ${book_id_1} not found` }, 404);
        }
        if (!book2) {
            return c.json({ error: `Book with ID ${book_id_2} not found` }, 404);
        }
        // Check if both books have embeddings
        if (!book1.embedding || book1.embedding.length === 0) {
            return c.json({
                error: `Book "${book1.title}" does not have an embedding yet. Please wait for analysis to complete.`,
            }, 400);
        }
        if (!book2.embedding || book2.embedding.length === 0) {
            return c.json({
                error: `Book "${book2.title}" does not have an embedding yet. Please wait for analysis to complete.`,
            }, 400);
        }
        console.log(`[Backend] Comparing books: "${book1.title}" vs "${book2.title}"`);
        // Call ML service to compute similarity using pre-computed embeddings
        const similarityResult = await mlClient.compareEmbeddings(book1.embedding, book2.embedding);
        console.log(`[Backend] Similarity score: ${similarityResult.similarity.toFixed(4)}`);
        // Return comprehensive response
        return c.json({
            success: true,
            book1: {
                id: book1._id.toString(),
                title: book1.title,
                author: book1.author,
                totalWords: book1.totalWords,
            },
            book2: {
                id: book2._id.toString(),
                title: book2.title,
                author: book2.author,
                totalWords: book2.totalWords,
            },
            similarity_score: similarityResult.similarity,
            similarity_percentage: (similarityResult.similarity * 100).toFixed(2),
            interpretation: similarityResult.interpretation,
        });
    }
    catch (error) {
        console.error("[Backend Error] Book similarity comparison failed:", error);
        return c.json({
            error: "Failed to compare books",
            details: error.message,
        }, 500);
    }
});
export default router;
