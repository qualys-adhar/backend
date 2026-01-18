/**
 * Retry Utility
 *
 * Implements exponential backoff retry logic for failed operations.
 * Useful for handling transient ML service failures.
 */

import { config } from "../config/env";

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @returns Result of successful function call
 * @throws Error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = config.ml.retries,
    initialDelay = config.ml.retryDelay,
    maxDelay = 30000, // 30 seconds max
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        console.error(`[Retry] All ${maxRetries} attempts failed`);
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay,
      );

      console.warn(
        `[Retry] Attempt ${attempt}/${maxRetries} failed: ${lastError.message}. ` +
          `Retrying in ${delay}ms...`,
      );

      // Call optional retry callback
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry only on specific error types
 */
export async function retryOnCondition<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: Error) => boolean,
  options: RetryOptions = {},
): Promise<T> {
  return retryWithBackoff(async () => {
    try {
      return await fn();
    } catch (error) {
      if (!shouldRetry(error as Error)) {
        throw error; // Don't retry, propagate error
      }
      throw error; // Retry
    }
  }, options);
}

/**
 * Check if error is retryable (network/timeout errors)
 */
export function isRetryableError(error: Error): boolean {
  const retryableMessages = [
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ENOTFOUND",
    "ECONNRESET",
    "timeout",
    "network",
  ];

  const message = error.message.toLowerCase();
  return retryableMessages.some((msg) => message.includes(msg));
}
