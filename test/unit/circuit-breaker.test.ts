import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CircuitBreaker } from '../../src/health/circuit-breaker.js';

describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
        // Threshold: 3 failures, Reset: 1000ms
        circuitBreaker = new CircuitBreaker(3, 1000);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('starts in CLOSED state and is available', () => {
        expect(circuitBreaker.getState('groq')).toBe('CLOSED');
        expect(circuitBreaker.isAvailable('groq')).toBe(true);
    });

    it('opens after threshold failures', () => {
        circuitBreaker.recordFailure('groq');
        circuitBreaker.recordFailure('groq');
        expect(circuitBreaker.getState('groq')).toBe('CLOSED');
        expect(circuitBreaker.isAvailable('groq')).toBe(true);

        circuitBreaker.recordFailure('groq'); // 3rd failure
        expect(circuitBreaker.getState('groq')).toBe('OPEN');
        expect(circuitBreaker.isAvailable('groq')).toBe(false);
    });

    it('transitions OPEN -> HALF_OPEN after reset time', () => {
        circuitBreaker.recordFailure('groq');
        circuitBreaker.recordFailure('groq');
        circuitBreaker.recordFailure('groq'); // OPEN

        expect(circuitBreaker.isAvailable('groq')).toBe(false);

        // Advance time partially
        vi.advanceTimersByTime(500);
        expect(circuitBreaker.isAvailable('groq')).toBe(false);
        expect(circuitBreaker.getState('groq')).toBe('OPEN');

        // Advance past resetMs
        vi.advanceTimersByTime(501);
        expect(circuitBreaker.isAvailable('groq')).toBe(true); // Should allow test request
        expect(circuitBreaker.getState('groq')).toBe('HALF_OPEN');
    });

    it('closes on success in HALF_OPEN', () => {
        circuitBreaker.recordFailure('groq');
        circuitBreaker.recordFailure('groq');
        circuitBreaker.recordFailure('groq'); // OPEN

        vi.advanceTimersByTime(1001); // HALF_OPEN
        expect(circuitBreaker.isAvailable('groq')).toBe(true);

        circuitBreaker.recordSuccess('groq');
        expect(circuitBreaker.getState('groq')).toBe('CLOSED');

        // A failure now shouldn't trip it immediately again
        circuitBreaker.recordFailure('groq');
        expect(circuitBreaker.getState('groq')).toBe('CLOSED');
    });

    it('re-opens on failure in HALF_OPEN', () => {
        circuitBreaker.recordFailure('groq');
        circuitBreaker.recordFailure('groq');
        circuitBreaker.recordFailure('groq'); // OPEN

        vi.advanceTimersByTime(1001); // HALF_OPEN
        expect(circuitBreaker.isAvailable('groq')).toBe(true);

        circuitBreaker.recordFailure('groq');
        expect(circuitBreaker.getState('groq')).toBe('OPEN');
        expect(circuitBreaker.isAvailable('groq')).toBe(false);
    });

    it('resets correctly', () => {
        circuitBreaker.recordFailure('groq');
        circuitBreaker.recordFailure('groq');
        circuitBreaker.recordFailure('groq'); // OPEN

        circuitBreaker.reset('groq');
        expect(circuitBreaker.getState('groq')).toBe('CLOSED');
        expect(circuitBreaker.isAvailable('groq')).toBe(true);
    });
});
