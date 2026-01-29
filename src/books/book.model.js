/**
 * Book Model
 *
 * MongoDB schema for book documents.
 * Includes ML-related fields for embeddings and processing status.
 */
import mongoose, { Schema } from "mongoose";
const BookSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    author: {
        type: String,
        required: true,
        trim: true,
    },
    genre: {
        type: String,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    text: {
        type: String,
        required: true,
    },
    s3Key: {
        type: String,
        trim: true,
    },
    // ML fields
    embedding: {
        type: [Number],
        select: false, // Don't return by default (large array)
    },
    mlProcessed: {
        type: Boolean,
        default: false,
        index: true,
    },
    mlProcessedAt: {
        type: Date,
    },
    mlError: {
        type: String,
    },
    // Metadata
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
}, {
    timestamps: true,
});
// Indexes for common queries
BookSchema.index({ title: "text", author: "text" });
BookSchema.index({ genre: 1 });
BookSchema.index({ mlProcessed: 1 });
BookSchema.index({ createdAt: -1 });
export const BookModel = mongoose.model("Book", BookSchema);
