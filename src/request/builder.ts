// src/request/builder.ts — Provider-specific HTTP request construction
import type { ProviderDef } from '../providers/types.js';

/** Constructed HTTP request ready for fetch() */
export interface BuiltRequest {
    /** Full URL to send the request to */
    url: string;
    /** HTTP method */
    method: 'POST';
    /** Request headers */
    headers: Record<string, string>;
    /** Serialized JSON body */
    body: string;
}

/** Parameters for chat completion (subset used by request builder) */
export interface ChatRequestParams {
    /** Model ID to use */
    model: string;
    /** Chat messages */
    messages: Array<{ role: string; content: unknown;[k: string]: unknown }>;
    /** Enable streaming */
    stream?: boolean;
    /** Max tokens to generate */
    max_tokens?: number;
    /** Temperature (0-2) */
    temperature?: number;
    /** Top-p nucleus sampling */
    top_p?: number;
    /** Stop sequences */
    stop?: string | string[];
    /** Tool/function definitions */
    tools?: unknown[];
    /** Tool choice strategy */
    tool_choice?: unknown;
    /** Frequency penalty */
    frequency_penalty?: number;
    /** Presence penalty */
    presence_penalty?: number;
    /** Number of completions to generate */
    n?: number;
    /** Additional provider-specific fields (pass-through) */
    [key: string]: unknown;
}

/**
 * Build a provider-specific HTTP request for chat completions.
 * Handles URL construction, auth headers, special headers, and body serialization.
 *
 * @param provider - Provider definition with endpoint and header config
 * @param params - Chat completion parameters
 * @param apiKey - API key for authorization
 * @param accountId - Optional account ID (Cloudflare only)
 * @returns BuiltRequest ready for fetch()
 */
export function buildRequest(
    provider: ProviderDef,
    params: ChatRequestParams,
    apiKey: string,
    accountId?: string,
): BuiltRequest {
    // Resolve URL — substitute account ID for Cloudflare
    let url = provider.baseUrl;
    if (provider.requiresAccountId && accountId) {
        url = url.replace('{CF_ACCOUNT_ID}', accountId);
    }

    // Build headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
    };

    // Add provider-specific headers (e.g. OpenRouter HTTP-Referer, X-Title)
    if (provider.specialHeaders) {
        for (const [key, value] of Object.entries(provider.specialHeaders)) {
            headers[key] = value;
        }
    }

    // Build body — only include defined fields to minimize payload
    const body: Record<string, unknown> = {
        model: params.model,
        messages: params.messages,
    };

    // Optional fields — only add if explicitly set
    if (params.stream !== undefined) body['stream'] = params.stream;
    if (params.max_tokens !== undefined) body['max_tokens'] = params.max_tokens;
    if (params.temperature !== undefined) body['temperature'] = params.temperature;
    if (params.top_p !== undefined) body['top_p'] = params.top_p;
    if (params.stop !== undefined) body['stop'] = params.stop;
    if (params.tools !== undefined) body['tools'] = params.tools;
    if (params.tool_choice !== undefined) body['tool_choice'] = params.tool_choice;
    if (params.frequency_penalty !== undefined) body['frequency_penalty'] = params.frequency_penalty;
    if (params.presence_penalty !== undefined) body['presence_penalty'] = params.presence_penalty;
    if (params.n !== undefined) body['n'] = params.n;

    // Stream options for providers that support usage in streaming mode
    if (params.stream) {
        body['stream_options'] = { include_usage: true };
    }

    return {
        url,
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    };
}



/**
 * Build a request with pass-through of unknown fields.
 * Optimizes payload generation without stringify/parse roundtrips.
 *
 * @param provider - Provider definition
 * @param params - Chat completion parameters (may contain extra fields)
 * @param apiKey - API key
 * @param accountId - Optional account ID
 * @returns BuiltRequest with extra fields in body
 */
export function buildRequestWithPassthrough(
    provider: ProviderDef,
    params: ChatRequestParams,
    apiKey: string,
    accountId?: string,
): BuiltRequest {
    // 1. URL resolution
    let url = provider.baseUrl;
    if (provider.requiresAccountId && accountId) {
        url = url.replace('{CF_ACCOUNT_ID}', accountId);
    }

    // 2. Headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
    };
    if (provider.specialHeaders) {
        for (const [key, value] of Object.entries(provider.specialHeaders)) {
            headers[key] = value;
        }
    }

    // 3. Body Construction
    const body: Record<string, unknown> = {
        model: params.model,
        messages: params.messages,
    };

    // Forward all params (known and unknown) efficiently
    for (const [key, value] of Object.entries(params)) {
        if (key !== 'model' && key !== 'messages' && value !== undefined) {
            body[key] = value;
        }
    }

    // Stream options override
    if (params.stream) {
        body['stream_options'] = { include_usage: true };
    }

    return {
        url,
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    };
}
