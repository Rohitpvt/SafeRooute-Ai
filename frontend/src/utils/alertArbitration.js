/**
 * SafeRoute AI — Real-Time Driver Safety Assistant
 * Phase B: Alert Arbitration Engine Utilities
 *
 * Implements the authoritative alert arbitration model:
 * S = 0.50 * SeverityScore + 0.35 * UrgencyScore + 0.15 * DataQualityScore
 *
 * CRITICAL ARBITRATION INVARIANT:
 * Arbitration score (S) is ONLY used to rank/tie-break candidate alerts
 * WITHIN THE SAME HIGHEST ACTIVE SEVERITY TIER.
 * A lower-severity alert can NEVER outrank a higher-severity alert.
 * (CRITICAL DRIVER WARNING > WARNING > CAUTION > INFO)
 */

export const SEVERITY_SCORES = {
  "CRITICAL DRIVER WARNING": 100,
  WARNING: 70,
  CAUTION: 40,
  INFO: 10,
};

export const SEVERITY_ORDER = {
  "CRITICAL DRIVER WARNING": 4,
  WARNING: 3,
  CAUTION: 2,
  INFO: 1,
};

export const DATA_QUALITY_SCORES = {
  VALID: 1.0,
  RECENT: 0.7,
  DEGRADED: 0.4,
  UNRELIABLE: 0.0,
  STALE: 0.0,
  UNAVAILABLE: 0.0,
};

/**
 * Calculates normalized urgency score in range [0.0, 1.0].
 * UrgencyScore = clamp(1 - TTE / TTE_max, 0, 1)
 * Default TTE_max = 10.0 seconds.
 * If TTE is null or undefined (stationary vehicle or non-temporal alert), returns 0.0.
 *
 * @param {number|null} tteSeconds - Time-To-Event in seconds.
 * @param {number} [tteMax=10.0] - Maximum TTE threshold in seconds.
 * @returns {number} Normalized urgency score between 0.0 and 1.0.
 */
export function calculateUrgencyScore(tteSeconds, tteMax = 10.0) {
  if (tteSeconds === null || tteSeconds === undefined || isNaN(tteSeconds) || tteSeconds < 0) {
    return 0.0;
  }
  const rawUrgency = 1.0 - tteSeconds / tteMax;
  return Math.max(0.0, Math.min(1.0, rawUrgency));
}

/**
 * Calculates numeric Data Quality score [0.0 - 1.0] from DataQuality input.
 *
 * @param {string|Object} qualityInput - Quality string state ("VALID", "DEGRADED", etc.) or quality object.
 * @returns {number} Normalized quality score (0.0 to 1.0).
 */
export function calculateQualityScore(qualityInput) {
  if (!qualityInput) return 1.0;
  if (typeof qualityInput === "string") {
    return DATA_QUALITY_SCORES[qualityInput.toUpperCase()] ?? 0.4;
  }
  if (typeof qualityInput === "object") {
    const gpsQ = DATA_QUALITY_SCORES[qualityInput.gps?.toUpperCase()] ?? 1.0;
    const routeQ = DATA_QUALITY_SCORES[qualityInput.route?.toUpperCase()] ?? 1.0;
    return Math.min(gpsQ, routeQ);
  }
  return 1.0;
}

/**
 * Calculates composite arbitration score (S) for a RuleCandidate object.
 * S = 0.50 * SeverityScore + 0.35 * (UrgencyScore * 100) + 0.15 * (DataQualityScore * 100)
 *
 * @param {Object} candidate - RuleCandidate object from Phase A.
 * @returns {number} Composite arbitration score S.
 */
export function calculateArbitrationScore(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return 0;
  }

  const severityScore = SEVERITY_SCORES[candidate.severity] ?? 10;
  const urgencyNorm = calculateUrgencyScore(candidate.tte_s);
  const urgencyScore = urgencyNorm * 100.0;
  const qualityNorm = calculateQualityScore(candidate.quality_state || candidate.data_quality);
  const qualityScore = qualityNorm * 100.0;

  const score = 0.50 * severityScore + 0.35 * urgencyScore + 0.15 * qualityScore;
  return Math.round(score * 100) / 100;
}

/**
 * Sorts RuleCandidate array deterministically according to arbitration rules:
 * 1. Strict Severity Tier Hierarchy (CRITICAL > WARNING > CAUTION > INFO)
 * 2. Arbitration Score S (descending) within the same severity tier
 * 3. Distance to hazard ascending (closer hazard wins tie)
 * 4. Event ID alphabetical ascending (deterministic tie-breaker)
 *
 * @param {Array<Object>} candidates - Array of RuleCandidate objects.
 * @returns {Array<Object>} Sorted array of candidates.
 */
export function arbitrateCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return [];
  }

  const validCandidates = candidates.filter((c) => c && typeof c === "object" && c.rule_id);
  if (validCandidates.length === 0) return [];

  // Map candidates with pre-calculated scores
  const scored = validCandidates.map((c) => ({
    ...c,
    _severityRank: SEVERITY_ORDER[c.severity] ?? 1,
    _arbitrationScore: calculateArbitrationScore(c),
  }));

  // Deterministic sorting comparator
  scored.sort((a, b) => {
    // 1. Highest Severity Tier First (NON-NEGOTIABLE CEILING)
    if (b._severityRank !== a._severityRank) {
      return b._severityRank - a._severityRank;
    }

    // 2. Within same severity tier, highest arbitration score S
    if (Math.abs(b._arbitrationScore - a._arbitrationScore) > 0.001) {
      return b._arbitrationScore - a._arbitrationScore;
    }

    // 3. Distance ascending (closer hazard wins)
    const distA = a.distance_m ?? Infinity;
    const distB = b.distance_m ?? Infinity;
    if (distA !== distB) {
      return distA - distB;
    }

    // 4. Deterministic string comparison on event_id
    const idA = String(a.event_id || "");
    const idB = String(b.event_id || "");
    return idA.localeCompare(idB);
  });

  return scored;
}
