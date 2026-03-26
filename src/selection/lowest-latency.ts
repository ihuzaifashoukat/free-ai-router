// src/selection/lowest-latency.ts — Picks fastest model by avg+p95 latency
import type { ModelResolution } from '../providers/types.js';
import type { ModelCandidate } from './strategy.js';
import { buildResolution } from './strategy.js';

/** Score used for candidates with no latency data (sorted last) */
const NO_DATA_SCORE = Number.MAX_SAFE_INTEGER;

/**
 * Compute a latency score for sorting.
 * Uses weighted avg (70%) + p95 (30%) for a balanced measure.
 * No-data candidates get a very high score (sorted last).
 *
 * @param candidate - Model candidate with health data
 * @returns Numeric score (lower = faster)
 */
function latencyScore(candidate: ModelCandidate): number {
    const lat = candidate.health.latency;
    if (!lat || lat.sampleCount === 0) return NO_DATA_SCORE;
    return lat.avg * 0.7 + lat.p95 * 0.3;
}

/**
 * Lowest-latency selection strategy.
 * Picks the model with the fastest response time (avg weighted with p95).
 * No-data candidates are pushed to the end.
 *
 * @param candidates - Pre-filtered available model candidates
 * @returns ModelResolution with fastest pick, or null if empty
 */
export function selectLowestLatency(candidates: ModelCandidate[]): ModelResolution | null {
    if (candidates.length === 0) return null;

    const sorted = candidates.slice().sort((a, b) => {
        const diff = latencyScore(a) - latencyScore(b);
        if (diff !== 0) return diff;

        // Tiebreaker: higher health score wins
        return b.health.score - a.health.score;
    });

    const top = sorted[0]!;
    const avgMs = top.health.latency?.avg;
    const reason = avgMs != null
        ? `Fastest: ${top.model.label} (avg ${avgMs}ms)`
        : `Fastest: ${top.model.label} (no latency data, selected by health score)`;

    return buildResolution(sorted, reason);
}
