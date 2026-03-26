// src/health/circuit-breaker.ts — Per-provider circuit breaker state machine
import type { CircuitState, CircuitStateType, CircuitStateInfo } from '../providers/types.js';

/** Default failure threshold before circuit opens */
const DEFAULT_THRESHOLD = 5;

/** Default reset time in ms before half-open attempt */
const DEFAULT_RESET_MS = 60_000;

/**
 * Circuit breaker implementing the standard CLOSED → OPEN → HALF_OPEN → CLOSED pattern.
 * Tracks state per provider to prevent cascading failures.
 */
export class CircuitBreaker {
    private readonly states = new Map<string, CircuitState>();
    private readonly threshold: number;
    private readonly resetMs: number;

    /**
     * @param threshold - Consecutive failures before circuit opens
     * @param resetMs - Milliseconds before OPEN → HALF_OPEN transition
     */
    constructor(threshold = DEFAULT_THRESHOLD, resetMs = DEFAULT_RESET_MS) {
        this.threshold = threshold;
        this.resetMs = resetMs;
    }

    /**
     * Check if a provider is available for requests.
     * - CLOSED: always available
     * - OPEN: unavailable unless reset time has elapsed → transitions to HALF_OPEN
     * - HALF_OPEN: available (one test request allowed)
     * @param provider - Provider identifier
     * @returns true if requests can be sent
     */
    isAvailable(provider: string): boolean {
        const state = this.states.get(provider);
        if (!state || state.state === 'CLOSED') return true;

        if (state.state === 'OPEN') {
            const elapsed = Date.now() - (state.openedAt ?? 0);
            if (elapsed >= this.resetMs) {
                // Transition to HALF_OPEN
                state.state = 'HALF_OPEN';
                state.halfOpenAt = Date.now();
                return true;
            }
            return false;
        }

        // HALF_OPEN: allow one test request
        return true;
    }

    /**
     * Record a successful request. Resets failure count.
     * HALF_OPEN → CLOSED transition on success.
     * @param provider - Provider identifier
     */
    recordSuccess(provider: string): void {
        const state = this.states.get(provider);
        if (!state) return;

        if (state.state === 'HALF_OPEN' || state.state === 'CLOSED') {
            state.state = 'CLOSED';
            state.failures = 0;
            state.openedAt = undefined;
            state.halfOpenAt = undefined;
        }
    }

    /**
     * Record a failed request. Increments failure counter.
     * Opens circuit if threshold is reached.
     * HALF_OPEN failures re-open the circuit.
     * @param provider - Provider identifier
     */
    recordFailure(provider: string): void {
        let state = this.states.get(provider);
        if (!state) {
            state = {
                state: 'CLOSED',
                failures: 0,
                lastFailureTime: 0,
            };
            this.states.set(provider, state);
        }

        state.failures++;
        state.lastFailureTime = Date.now();

        if (state.state === 'HALF_OPEN') {
            // Still broken — re-open
            state.state = 'OPEN';
            state.openedAt = Date.now();
            state.halfOpenAt = undefined;
            return;
        }

        if (state.state === 'CLOSED' && state.failures >= this.threshold) {
            state.state = 'OPEN';
            state.openedAt = Date.now();
        }
    }

    /**
     * Get the current state for a provider.
     * @param provider - Provider identifier
     * @returns Current circuit state type
     */
    getState(provider: string): CircuitStateType {
        return this.states.get(provider)?.state ?? 'CLOSED';
    }

    /**
     * Get detailed state info for all providers.
     * @returns Record of provider → state info
     */
    getStates(): Record<string, CircuitStateInfo> {
        const result: Record<string, CircuitStateInfo> = {};
        for (const [id, s] of this.states) {
            result[id] = {
                state: s.state,
                failures: s.failures,
                lastFailureTime: s.lastFailureTime,
                openedAt: s.openedAt,
            };
        }
        return result;
    }

    /**
     * Reset circuit for a specific provider to CLOSED.
     * @param provider - Provider identifier
     */
    reset(provider: string): void {
        this.states.delete(provider);
    }

    /** Reset all circuits to CLOSED. */
    resetAll(): void {
        this.states.clear();
    }
}
