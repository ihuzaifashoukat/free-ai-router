// src/compat/response-normalizer.ts — Harmonize provider responses into OpenAI format
import type { ProviderDef } from '../providers/types.js';

/**
 * Standard OpenAI ChatCompletion format
 */
export interface ChatCompletion {
    id: string;
    object: 'chat.completion';
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string | null;
            [key: string]: unknown;
        };
        finish_reason: string;
        logprobs?: unknown | null;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    /** Internal router tracking metrics */
    _router?: {
        provider: string;
        model: string;
        latencyMs?: number;
        attempt?: number;
        keyIndex?: number;
    };
}

/**
 * Standard OpenAI Streaming Chunk format
 */
export interface ChatCompletionChunk {
    id: string;
    object: 'chat.completion.chunk';
    created: number;
    model: string;
    choices: Array<{
        index: number;
        delta: {
            role?: string;
            content?: string | null;
            [key: string]: unknown;
        };
        finish_reason: string | null;
        logprobs?: unknown | null;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    } | null;
    _router?: ChatCompletion['_router'];
}

/**
 * Normalizes a raw JSON response body from any provider into the OpenAI standard format.
 * 
 * @param rawResponse - The parsed JSON body returned by the HTTP fetch
 * @param provider - The provider that handled the request
 * @param actualModelId - The internal model logic used by the router
 * @returns An OpenAI-compatible ChatCompletion object
 */
export function normalizeResponse(
    rawResponse: any,
    provider: ProviderDef,
    actualModelId: string
): ChatCompletion {
    // Basic extraction
    const id = rawResponse.id || `chatcmpl-${Date.now()}`;
    const created = rawResponse.created || Math.floor(Date.now() / 1000);

    // Some providers return different choices structures, but most adhere fairly well to OpenAI's schema
    const choices = Array.isArray(rawResponse.choices) ? rawResponse.choices.map((choice: any, index: number) => {
        // Handle varying message object shapes (e.g. Anthropic, though we don't have it here)
        const role = choice.message?.role || 'assistant';
        const content = choice.message?.content || null;

        return {
            index: choice.index ?? index,
            message: { ...choice.message, role, content },
            finish_reason: choice.finish_reason || 'stop',
            logprobs: choice.logprobs || null,
        };
    }) : [];

    // Usage stats extraction
    let usage = undefined;
    if (rawResponse.usage) {
        usage = {
            prompt_tokens: rawResponse.usage.prompt_tokens || 0,
            completion_tokens: rawResponse.usage.completion_tokens || 0,
            total_tokens: rawResponse.usage.total_tokens || 0,
        };
    }

    return {
        id,
        object: 'chat.completion',
        created,
        model: actualModelId, // Use the resolved model injected by router instead of user's requested magic string
        choices,
        usage,
        _router: {
            provider: provider.id,
            model: actualModelId,
        }
    };
}

/**
 * Normalizes a streaming chunk.
 * 
 * @param rawChunk - The parsed JSON chunk from the stream
 * @param provider - The provider
 * @param actualModelId - The internal model
 * @returns An OpenAI-compatible ChatCompletionChunk
 */
export function normalizeStreamChunk(
    rawChunk: any,
    provider: ProviderDef,
    actualModelId: string
): ChatCompletionChunk {
    const id = rawChunk.id || `chatcmpl-${Date.now()}`;
    const created = rawChunk.created || Math.floor(Date.now() / 1000);

    const choices = Array.isArray(rawChunk.choices) ? rawChunk.choices.map((choice: any, index: number) => {
        const delta = choice.delta || {};
        return {
            index: choice.index ?? index,
            delta: { ...delta },
            finish_reason: choice.finish_reason || null,
            logprobs: choice.logprobs || null,
        };
    }) : [];

    let usage = null;
    if (rawChunk.usage) {
        usage = {
            prompt_tokens: rawChunk.usage.prompt_tokens || 0,
            completion_tokens: rawChunk.usage.completion_tokens || 0,
            total_tokens: rawChunk.usage.total_tokens || 0,
        };
    }

    return {
        id,
        object: 'chat.completion.chunk',
        created,
        model: actualModelId,
        choices,
        usage,
        _router: {
            provider: provider.id,
            model: actualModelId,
        }
    };
}
