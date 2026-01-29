import mongoose from "mongoose";
const BookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    s3Key: { type: String, required: true },
    topWords: [
        {
            word: String,
            count: Number,
        },
    ],
    totalWords: { type: Number, default: 0 },
    analysisProgress: { type: Number, default: 0, min: 0, max: 100 },
    // ML Service integration fields
    embedding: { type: [Number], default: null }, // 384-dimensional vector
    genre: { type: String, default: null }, // Optional genre for metadata
    indexedAt: { type: Date, default: null }, // When book was indexed in FAISS
    createdAt: {
        type: Date,
        default: Date.now,
    },
});
// Unique index on (title, author) to prevent duplicate analysis
BookSchema.index({ title: 1, author: 1 }, { unique: true });
// Index on embedding for faster searches
BookSchema.index({ indexedAt: 1 });
export const Book = mongoose.model("Book", BookSchema);
