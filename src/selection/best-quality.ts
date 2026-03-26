// src/selection/best-quality.ts — Picks highest SWE-tier available model
import { TIER_RANK } from '../providers/types.js';
import type { ModelResolution } from '../providers/types.js';
import type { ModelCandidate } from './strategy.js';
import { buildResolution } from './strategy.js';

/**
 * Best-quality selection strategy.
 * Ranks candidates by SWE-bench tier (desc) then by sweScore (desc).
 * Returns the highest-quality model among available candidates.
 *
 * @param candidates - Pre-filtered available model candidates
 * @returns ModelResolution with best-quality pick, or null if empty
 */
export function selectBestQuality(candidates: ModelCandidate[]): ModelResolution | null {
    if (candidates.length === 0) return null;

    const sorted = candidates.slice().sort((a, b) => {
        // Primary: tier rank descending
        const tierDiff = TIER_RANK[b.model.tier] - TIER_RANK[a.model.tier];
        if (tierDiff !== 0) return tierDiff;

        // Secondary: SWE score descending
        const sweDiff = b.model.sweScore - a.model.sweScore;
        if (sweDiff !== 0) return sweDiff;

        // Tertiary: prefer healthier provider
        return b.health.score - a.health.score;
    });

    const top = sorted[0]!;
    return buildResolution(
        sorted,
        `Best quality: ${top.model.label} (tier ${top.model.tier}, SWE ${top.model.sweScore}%)`,
    );
}
