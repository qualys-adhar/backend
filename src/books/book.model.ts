/**
 * Book Model
 *
 * MongoDB schema for book documents.
 * Includes ML-related fields for embeddings and processing status.
 */

import mongoose, { Schema, Document } from "mongoose";

export interface IBook extends Document {
  _id: string;
  title: string;
  author: string;
  genre?: string;
  description?: string;
  text: string;
  s3Key?: string;

  // ML-related fields
  embedding?: number[];
  mlProcessed: boolean;
  mlProcessedAt?: Date;
  mlError?: string;

  // Metadata
  uploadedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookSchema = new Schema<IBook>(
  {
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
  },
  {
    timestamps: true,
  },
);

// Indexes for common queries
BookSchema.index({ title: "text", author: "text" });
BookSchema.index({ genre: 1 });
BookSchema.index({ mlProcessed: 1 });
BookSchema.index({ createdAt: -1 });

export const BookModel = mongoose.model<IBook>("Book", BookSchema);
