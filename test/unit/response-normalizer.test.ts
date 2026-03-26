import { describe, it, expect } from 'vitest';
import { normalizeResponse, normalizeStreamChunk } from '../../src/compat/response-normalizer.js';
import type { ProviderDef } from '../../src/providers/types.js';

describe('Response Normalizer', () => {
    const mockProvider: ProviderDef = {
        id: 'mock-provider',
        name: 'Mock',
        baseUrl: 'http://mock',
        apiKeyEnvVars: [],
        rateLimits: { rpm: 60 }
    };

    it('normalizes groq response format', () => {
        const groqResponse = {
            id: 'groq-123',
            created: 1234567,
            model: 'llama-wrong',
            choices: [{
                index: 0,
                message: { role: 'assistant', content: 'hello' },
                finish_reason: 'stop'
            }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        };

        const result = normalizeResponse(groqResponse, mockProvider, 'llama-3.3-70b-versatile');

        expect(result.id).toBe('groq-123');
        expect(result.model).toBe('llama-3.3-70b-versatile'); // Overrides requested model
        expect(result.choices[0]?.message.content).toBe('hello');
        expect(result._router?.provider).toBe('mock-provider');
    });

    it('normalizes nvidia response format', () => {
        const nvidiaResponse = {
            id: 'nvidia-123',
            choices: [{
                index: 0,
                message: { role: 'assistant', content: 'nvidia hi' },
                finish_reason: 'stop'
            }],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
        };

        const result = normalizeResponse(nvidiaResponse, mockProvider, 'nvidia-model');
        expect(result.choices[0]?.message.content).toBe('nvidia hi');
    });

    it('normalizes openrouter response format', () => {
        const orResponse = {
            id: 'or-123',
            choices: [{
                message: { role: 'assistant', content: 'or hi' }
            }]
        };

        const result = normalizeResponse(orResponse, mockProvider, 'or-model');
        expect(result.choices[0]?.message.content).toBe('or hi');
        expect(result.choices[0]?.finish_reason).toBe('stop'); // Defaults to stop
    });

    it('preserves usage tokens', () => {
        const response = {
            usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
        };

        const result = normalizeResponse(response, mockProvider, 'model');
        expect(result.usage?.prompt_tokens).toBe(100);
        expect(result.usage?.completion_tokens).toBe(50);
        expect(result.usage?.total_tokens).toBe(150);
    });

    it('adds _router metadata', () => {
        const response = {};
        const result = normalizeResponse(response, mockProvider, 'my-model');
        expect(result._router).toBeDefined();
        expect(result._router?.provider).toBe('mock-provider');
        expect(result._router?.model).toBe('my-model');
    });
});
