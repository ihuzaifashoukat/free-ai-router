// src/request/retry.ts — Exponential backoff and retry logic

/**
 * Configuration for the retry mechanism
 */
export interface RetryConfig {
    /** Maximum number of retry attempts */
    maxRetries: number;
    /** Base delay in milliseconds */
    retryDelay: number;
    /** Optional logger function */
    logger?: (msg: string) => void;
}

/**
 * Retries an asynchronous operation with exponential backoff and jitter.
 *
 * It only retries if the provided `shouldRetry` predicate returns true.
 * Delay formula: delay * (2 ^ attempt) + random(0, delay)
 *
 * @param operation - The async function to execute
 * @param shouldRetry - Predicate determining if an error or result warrants a retry
 * @param config - Retry configuration (maxRetries, retryDelay)
 * @returns The result of the operation
 * @throws The last error encountered if all retries are exhausted
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    shouldRetry: (error: unknown) => boolean,
    config: RetryConfig,
): Promise<T> {
    const { maxRetries, retryDelay, logger } = config;
    let attempt = 0;

    while (true) {
        try {
            return await operation();
        } catch (error) {
            if (attempt >= maxRetries || !shouldRetry(error)) {
                throw error;
            }

            // Calculate backoff: Base * 2^attempt + Jitter (0 to Base)
            const exponentialBackoff = retryDelay * Math.pow(2, attempt);
            const jitter = Math.random() * retryDelay;
            const waitTime = exponentialBackoff + jitter;

            if (logger) {
                const errMsg = error instanceof Error ? error.message : String(error);
                logger(`Attempt ${attempt + 1}/${maxRetries} failed: ${errMsg}. Retrying in ${Math.round(waitTime)}ms...`);
            }

            await new Promise((resolve) => setTimeout(resolve, waitTime));
            attempt++;
        }
    }
}
