import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../config/s3";
import { extractTextFromBuffer } from "../pdf/pdfExtractor";
import {
  analyzePage,
  getTopWords,
  resetFrequency,
} from "../analytics/wordFrequency";
import { Book } from "../db/book.model";

export async function analyzeBookFromUpload(
  file: File,
  title: string,
  author: string,
  topN: number,
  onProgress?: (progress: number) => void,
) {
  // Check if book already exists (deduplication)
  const existingBook = await Book.findOne({ title, author });
  if (existingBook && existingBook.topWords?.length) {
    console.log(
      `📚 Book "${title}" by ${author} already analyzed. Returning cached results.`,
    );
    return existingBook;
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const key = `books/${Date.now()}-${file.name}`;

  // Upload to S3
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: "application/pdf",
    }),
  );

  // Analyze PDF page-by-page with progress tracking and collect full text
  resetFrequency();
  let processedPages = 0;
  let fullText = "";

  await extractTextFromBuffer(buffer, async (pageText) => {
    analyzePage(pageText);
    fullText += " " + pageText;
    processedPages++;
    const progress = Math.round((processedPages / 100) * 100); // Rough estimate
    onProgress?.(progress);
  });

  const result = getTopWords(topN);
  const totalWords = result.reduce((sum, item) => sum + item.count, 0);

  // Save to MongoDB with upsert to handle race conditions
  const book = await Book.findOneAndUpdate(
    { title, author },
    {
      title,
      author,
      s3Key: key,
      topWords: result,
      totalWords: totalWords,
      analysisProgress: 100,
    },
    { upsert: true, new: true },
  );

  let embeddings = null;

  // Automatically send to ML service for embedding (fire and forget with error handling)
  try {
    console.log("fullText", fullText, "title", title, "author", author);
    embeddings = await embedBookAutomatically(
      book._id.toString(),
      fullText,
      title,
      author,
    );
  } catch (error) {
    console.error(
      `⚠️ Failed to automatically embed book "${title}":`,
      (error as Error).message,
    );
    // Don't throw - the book is already saved, embedding will be retried later if needed
  }

  if (embeddings) {
    console.log(`✅ Book "${title}" embeddings:`, embeddings);

    book.embedding = embeddings.embedding;
    await book.save();
  }

  return book;
}

async function embedBookAutomatically(
  bookId: string,
  text: string,
  title: string,
  author: string,
) {
  const mlServiceUrl = process.env.ML_SERVICE_URL || "http://ml-service:8000";
  const embedUrl = `${mlServiceUrl}/embed`;

  console.log(`🔄 Attempting to send book to ML service at: ${embedUrl}`);

  try {
    const response = await fetch(embedUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bookId,
        text: text.substring(0, 10000), // Limit text size for API
        title,
        author,
      }),
    });

    console.log("Embedded response from ml:", response);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ML Service returned ${response.status}: ${errorText || response.statusText}`,
      );
    }

    const result = await response.json();
    console.log("json embedded result:", result);
    console.log(
      `✅ Book "${title}" (ID: ${bookId}) automatically indexed in ML service`,
    );
    return result;
  } catch (error) {
    console.error(
      `❌ ML embedding error for "${title}":`,
      (error as Error).message,
    );
    throw error;
  }
}

export async function listBooks(page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;
  const books = await Book.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  const total = await Book.countDocuments();

  return {
    books,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getBook(id: string) {
  return Book.findById(id);
}

export async function getSignedDownloadUrl(s3Key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: s3Key,
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
  return url;
}
//   resetFrequency();
//   await extractTextFromBuffer(buffer, async (pageText) => {
//     analyzePage(pageText);
//   });

//   const result = getTopWords(topN);

//   const book = await Book.create({
//     title,
//     author,
//     s3Key: key,
//     topWords: result,
//   });

//   return book;
// }
