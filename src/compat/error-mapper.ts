// src/compat/error-mapper.ts — HTTP exceptions and mapping to OpenAI style errors

/**
 * Base custom error for the free-ai-router library
 */
export class FreeRouterError extends Error {
    /** Additional metadata injected by the router */
    public metadata?: Record<string, unknown>;

    constructor(message: string, metadata?: Record<string, unknown>) {
        super(message);
        this.name = 'FreeRouterError';
        this.metadata = metadata;
    }
}

/**
 * Thrown when every configured provider is unavailable
 */
export class NoAvailableModelError extends FreeRouterError {
    constructor(diagnosticMessage: string) {
        super(`No free models available. ${diagnosticMessage}`);
        this.name = 'NoAvailableModelError';
    }
}

/**
 * Thrown when a specific provider has exhausted all defined API keys
 */
export class AllKeysExhaustedError extends FreeRouterError {
    constructor(diagnosticMessage: string) {
        super(`All API keys exhausted. ${diagnosticMessage}`);
        this.name = 'AllKeysExhaustedError';
    }
}

/**
 * Standard Rate Limit Error (mimicking OpenAI's 429 Error)
 */
export class RateLimitError extends FreeRouterError {
    constructor(message: string) {
        super(message);
        this.name = 'RateLimitError';
    }
}

/**
 * Base error from a provider call (usually a 4xx or 5xx)
 */
export class ProviderError extends FreeRouterError {
    public status?: number;
    public providerId: string;

    constructor(message: string, statusCode: number, providerId: string) {
        super(`${providerId} API error (${statusCode}): ${message}`);
        this.name = 'APIError'; // Matches OpenAI SDK error format
        this.status = statusCode; // Maps to OpenAI's .status
        this.providerId = providerId;
    }
}

/**
 * Maps a raw fetch response failure (status >= 400) to a highly descriptive FreeRouterError.
 * 
 * @param response - The failed fetch Response object
 * @param providerId - The provider ID
 * @param errorMessage - Body error message or generic string
 * @returns An instantiated Error derived from FreeRouterError
 */
export function mapHttpError(response: Response, providerId: string, errorMessage: string): FreeRouterError {
    const status = response.status;

    if (status === 429) {
        return new RateLimitError(`${providerId} hit rate limits: ${errorMessage}`);
    }

    if (status === 401 || status === 403) {
        return new ProviderError(`Authentication failed: ${errorMessage}`, status, providerId);
    }

    if (status >= 500) {
        return new ProviderError(`Server error from provider: ${errorMessage}`, status, providerId);
    }

    // Generic default for 4xx and undefined limits
    return new ProviderError(`Provider request failed: ${errorMessage}`, status, providerId);
}
