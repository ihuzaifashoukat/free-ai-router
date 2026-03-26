import { describe, it, expect } from 'vitest';
import { buildRequest, buildRequestWithPassthrough } from '../../../src/request/builder';
import type { ProviderDef } from '../../../src/providers/types';

describe('Request Builder', () => {
    const mockProvider: ProviderDef = {
        id: 'test',
        name: 'Test',
        baseUrl: 'https://api.test.com/v1',
        apiKeyEnvVars: ['TEST_KEY'],
        rateLimits: {},
        specialHeaders: { 'X-Custom': '123' }
    };

    const cloudflareProvider: ProviderDef = {
        id: 'cf',
        name: 'Cloudflare',
        baseUrl: 'https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/run',
        apiKeyEnvVars: ['CF_KEY'],
        requiresAccountId: true,
        rateLimits: {}
    };

    it('builds standard request correctly', () => {
        const req = buildRequest(mockProvider, { model: 'm1', messages: [{ role: 'user', content: 'hi' }] }, 'secret123');
        expect(req.method).toBe('POST');
        expect(req.url).toBe('https://api.test.com/v1');
        expect(req.headers['Authorization']).toBe('Bearer secret123');
        expect(req.headers['X-Custom']).toBe('123');

        const body = JSON.parse(req.body);
        expect(body.model).toBe('m1');
        expect(body.messages[0].content).toBe('hi');
        expect(body.temperature).toBeUndefined();
    });

    it('replaces account ID for cloudflare', () => {
        const req = buildRequest(cloudflareProvider, { model: 'm1', messages: [] }, 'key', 'acc123');
        expect(req.url).toBe('https://api.cloudflare.com/client/v4/accounts/acc123/ai/run');
    });

    it('injects stream_options when streaming', () => {
        const req = buildRequest(mockProvider, { model: 'm1', messages: [], stream: true }, 'key');
        const body = JSON.parse(req.body);
        expect(body.stream).toBe(true);
        expect(body.stream_options).toEqual({ include_usage: true });
    });

    it('buildRequestWithPassthrough forwards unknown properties efficiently', () => {
        const req = buildRequestWithPassthrough(mockProvider, {
            model: 'm1',
            messages: [],
            temperature: 0.5,
            custom_provider_flag: true,
            another_flag: 'tester'
        }, 'key');

        const body = JSON.parse(req.body);
        expect(body.temperature).toBe(0.5);
        expect(body.custom_provider_flag).toBe(true);
        expect(body.another_flag).toBe('tester');
    });
});
