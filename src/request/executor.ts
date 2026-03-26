// src/request/executor.ts — Fetch wrapper with strict timeouts and abort controls

/**
 * Options for executing a fetch request
 */
export interface FetchOptions extends RequestInit {
    /** Timeout in milliseconds */
    timeoutMs?: number;
}

/**
 * Custom error thrown when a request times out
 */
export class TimeoutError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TimeoutError';
    }
}

/**
 * Executes a fetch request with an enforced timeout using AbortController.
 * Ensures that timers are cleared properly even if the request succeeds or fails early.
 *
 * @param url - The URL to fetch
 * @param options - Fetch options including timeoutMs
 * @returns The native fetch Response object
 * @throws TimeoutError if the request exceeds timeoutMs
 * @throws Any native fetch errors (e.g., DNS resolution failure)
 */
export async function executeFetch(url: string, options: FetchOptions): Promise<Response> {
    const { timeoutMs = 30000, ...fetchOptions } = options;

    const controller = new AbortController();
    const timer = setTimeout(() => {
        controller.abort(new TimeoutError(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    // Merge any incoming signal with our timeout signal
    if (fetchOptions.signal) {
        fetchOptions.signal.addEventListener('abort', () => {
            controller.abort(fetchOptions.signal?.reason);
        });
    }

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        });
        return response;
    } catch (error) {
        // If aborted due to timeout, throw our TimeoutError directly
        if (error instanceof Error && error.name === 'AbortError' && controller.signal.reason) {
            throw controller.signal.reason;
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}
