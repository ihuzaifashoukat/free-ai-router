// src/selection/least-used.ts — Picks model with most quota remaining
import type { ModelResolution } from '../providers/types.js';
import type { ModelCandidate } from './strategy.js';
import { buildResolution } from './strategy.js';

/** Assumed quota % when no data is available (slightly optimistic) */
const UNKNOWN_QUOTA = 70;

/**
 * Get effective quota percent for sorting.
 * Unknown quota defaults to 70% (optimistic but not top-priority).
 *
 * @param candidate - Model candidate with health data
 * @returns Effective quota percentage (0–100)
 */
function effectiveQuota(candidate: ModelCandidate): number {
    return candidate.health.quotaPercent ?? UNKNOWN_QUOTA;
}

/**
 * Least-used selection strategy.
 * Picks the model whose provider has the most quota remaining.
 * This distributes load away from heavily-used providers.
 *
 * @param candidates - Pre-filtered available model candidates
 * @returns ModelResolution with least-used pick, or null if empty
 */
export function selectLeastUsed(candidates: ModelCandidate[]): ModelResolution | null {
    if (candidates.length === 0) return null;

    const sorted = candidates.slice().sort((a, b) => {
        // Primary: highest quota remaining first
        const quotaDiff = effectiveQuota(b) - effectiveQuota(a);
        if (quotaDiff !== 0) return quotaDiff;

        // Tiebreaker: higher health score
        return b.health.score - a.health.score;
    });

    const top = sorted[0]!;
    const quota = effectiveQuota(top);
    return buildResolution(
        sorted,
        `Least used: ${top.model.label} on ${top.provider.name} (quota ${quota}%)`,
    );
}
