// src/health/health-aggregator.ts — Combines circuit breaker + quota + latency → composite score
import type { HealthScore, CircuitStateType } from '../providers/types.js';
import type { CircuitBreaker } from './circuit-breaker.js';
import type { LatencyTracker } from './latency-tracker.js';
import type { QuotaTracker } from '../quota/quota-tracker.js';

/** Weight distribution for composite health score */
const WEIGHTS = {
    circuit: 0.40,   // Circuit state is most critical
    quota: 0.30,     // Quota availability
    latency: 0.30,   // Response time quality
} as const;

/**
 * Aggregates health signals from circuit breaker, quota tracker,
 * and latency tracker into a single composite score per provider.
 */
export class HealthAggregator {
    private readonly circuitBreaker: CircuitBreaker;
    private readonly quotaTracker: QuotaTracker;
    private readonly latencyTracker: LatencyTracker;
    private readonly quotaThreshold: number;

    /**
     * @param circuitBreaker - Circuit breaker instance
     * @param quotaTracker - Quota tracker instance
     * @param latencyTracker - Latency tracker instance
     * @param quotaThreshold - Quota % below which provider is considered unavailable
     */
    constructor(
        circuitBreaker: CircuitBreaker,
        quotaTracker: QuotaTracker,
        latencyTracker: LatencyTracker,
        quotaThreshold = 10,
    ) {
        this.circuitBreaker = circuitBreaker;
        this.quotaTracker = quotaTracker;
        this.latencyTracker = latencyTracker;
        this.quotaThreshold = quotaThreshold;
    }

    /**
     * Get composite health score for a provider.
     *
     * @param providerId - Provider identifier
     * @returns HealthScore with availability flag and composite 0–100 score
     */
    getScore(providerId: string): HealthScore {
        const circuitState = this.circuitBreaker.getState(providerId);
        const circuitAvailable = this.circuitBreaker.isAvailable(providerId);
        const quotaPercent = this.quotaTracker.getQuotaPercent(providerId);
        const latency = this.latencyTracker.getStats(providerId);

        // Determine availability
        const quotaBelowThreshold = quotaPercent !== null && quotaPercent <= this.quotaThreshold;
        const available = circuitAvailable && !quotaBelowThreshold;

        // Compute individual component scores (0–100)
        const circuitScore = computeCircuitScore(circuitState);
        const quotaScore = computeQuotaScore(quotaPercent);
        const latencyScore = latency ? latency.stabilityScore : 50; // Unknown = neutral

        // Weighted composite
        const score = Math.round(
            circuitScore * WEIGHTS.circuit +
            quotaScore * WEIGHTS.quota +
            latencyScore * WEIGHTS.latency,
        );

        return {
            providerId,
            circuitState,
            quotaPercent,
            latency,
            score: Math.max(0, Math.min(100, score)),
            available,
        };
    }

    /**
     * Get health scores for multiple providers, sorted by score descending.
     *
     * @param providerIds - Provider identifiers to score
     * @returns Array of HealthScore sorted best-first
     */
    getScores(providerIds: string[]): HealthScore[] {
        return providerIds
            .map((id) => this.getScore(id))
            .sort((a, b) => b.score - a.score);
    }

    /**
     * Get only available providers, sorted by health score descending.
     *
     * @param providerIds - Provider identifiers to check
     * @returns Available providers sorted best-first
     */
    getAvailableProviders(providerIds: string[]): HealthScore[] {
        return this.getScores(providerIds).filter((s) => s.available);
    }

    /**
     * Check if a specific provider is available for requests.
     *
     * @param providerId - Provider identifier
     * @returns true if circuit is not OPEN and quota is above threshold
     */
    isAvailable(providerId: string): boolean {
        return this.getScore(providerId).available;
    }
}

/**
 * Convert circuit state to a 0–100 score.
 * CLOSED = 100 (healthy), HALF_OPEN = 50 (testing), OPEN = 0 (broken)
 */
function computeCircuitScore(state: CircuitStateType): number {
    switch (state) {
        case 'CLOSED': return 100;
        case 'HALF_OPEN': return 50;
        case 'OPEN': return 0;
    }
}

/**
 * Convert quota percentage to a health score.
 * null = 70 (unknown, slightly optimistic), otherwise direct mapping.
 */
function computeQuotaScore(quotaPercent: number | null): number {
    if (quotaPercent === null) return 70; // Unknown = assume mostly OK
    return Math.max(0, Math.min(100, quotaPercent));
}
