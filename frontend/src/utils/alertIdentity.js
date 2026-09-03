/**
 * SafeRoute AI — Real-Time Driver Safety Assistant
 * Phase B: Alert Event Identity & Deduplication Engine
 *
 * Provides deterministic event identity key resolution, deduplication tracking,
 * 20.0s event deduplication window, 10.0s audio cooldown state management,
 * and severity escalation detection.
 *
 * CRITICAL SPECIFICATION RECONCILIATION:
 * - Event Deduplication Window: 20.0 seconds (20,000 ms)
 * - Non-Critical Audio Cooldown State: 10.0 seconds (10,000 ms)
 * - Genuine severity escalation MUST BYPASS deduplication windows immediately.
 */

import { SEVERITY_ORDER } from "./alertArbitration.js";

export const EVENT_DEDUPLICATION_MS = 20000;
export const NON_CRITICAL_AUDIO_COOLDOWN_MS = 10000;

/**
 * Gets composite unique identity key for a candidate alert event.
 * @param {Object} candidate - RuleCandidate object.
 * @returns {string} Unique event key string.
 */
export function getEventIdentityKey(candidate) {
  if (!candidate || typeof candidate !== "object") return "";
  return candidate.event_id || candidate.rule_id || "UNKNOWN_EVENT";
}

/**
 * Helper class for alert lifecycle deduplication & audio cooldown state management.
 */
export class AlertDeduplicator {
  /**
   * @param {number} [deduplicationMs=20000] - Identical event deduplication window in milliseconds.
   * @param {number} [audioCooldownMs=10000] - Non-critical audio cooldown window in milliseconds.
   */
  constructor(deduplicationMs = EVENT_DEDUPLICATION_MS, audioCooldownMs = NON_CRITICAL_AUDIO_COOLDOWN_MS) {
    this.deduplicationMs = deduplicationMs;
    this.audioCooldownMs = audioCooldownMs;
    // Map of eventKey -> { timestamp: number, severity: string, severityRank: number }
    this.deliveredHistory = new Map();
    // Last non-critical audio timestamp for Phase C state consumption
    this.lastNonCriticalAudioTimestamp = 0;
  }

  /**
   * Checks whether a candidate alert should be suppressed due to deduplication,
   * or delivered (if new event, expired deduplication window, or genuine severity escalation).
   *
   * @param {Object} candidate - RuleCandidate object.
   * @param {number} [nowMs=Date.now()] - Current timestamp in milliseconds.
   * @returns {Object} { shouldDeliver: boolean, isEscalation: boolean, reason: string }
   */
  evaluateCandidate(candidate, nowMs = Date.now()) {
    if (!candidate || !candidate.event_id) {
      return { shouldDeliver: false, isEscalation: false, reason: "INVALID_CANDIDATE" };
    }

    const eventKey = getEventIdentityKey(candidate);
    const candidateRank = SEVERITY_ORDER[candidate.severity] ?? 1;
    const previousRecord = this.deliveredHistory.get(eventKey);

    // 1. New Event (never delivered before)
    if (!previousRecord) {
      return { shouldDeliver: true, isEscalation: false, reason: "NEW_EVENT" };
    }

    // 2. Genuine Severity Escalation (e.g. CAUTION -> WARNING -> CRITICAL DRIVER WARNING)
    // ESCALATION MUST BYPASS DEDUPLICATION IMMEDIATELY
    if (candidateRank > previousRecord.severityRank) {
      return { shouldDeliver: true, isEscalation: true, reason: "SEVERITY_ESCALATION" };
    }

    // 3. Check 20-Second Deduplication Window for identical or lower severity
    const elapsedMs = nowMs - previousRecord.timestamp;
    if (elapsedMs < this.deduplicationMs) {
      return { shouldDeliver: false, isEscalation: false, reason: "DEDUPLICATION_ACTIVE" };
    }

    // 4. Deduplication Expired -> Deliver updated event state
    return { shouldDeliver: true, isEscalation: false, reason: "DEDUPLICATION_EXPIRED" };
  }

  /**
   * Evaluates if non-critical audio cooldown (10s) is currently active (for Phase C).
   * @param {number} [nowMs=Date.now()]
   * @returns {boolean} True if audio cooldown is active.
   */
  isAudioCooldownActive(nowMs = Date.now()) {
    if (!this.lastNonCriticalAudioTimestamp) return false;
    return nowMs - this.lastNonCriticalAudioTimestamp < this.audioCooldownMs;
  }

  /**
   * Records a delivered alert event in history.
   *
   * @param {Object} candidate - RuleCandidate object.
   * @param {number} [nowMs=Date.now()] - Timestamp in milliseconds.
   */
  recordDelivery(candidate, nowMs = Date.now()) {
    if (!candidate || !candidate.event_id) return;
    const eventKey = getEventIdentityKey(candidate);
    const severityRank = SEVERITY_ORDER[candidate.severity] ?? 1;

    this.deliveredHistory.set(eventKey, {
      timestamp: nowMs,
      severity: candidate.severity,
      severityRank,
    });

    if (candidate.severity !== "CRITICAL DRIVER WARNING") {
      this.lastNonCriticalAudioTimestamp = nowMs;
    }
  }

  /**
   * Clears historical tracking.
   */
  reset() {
    this.deliveredHistory.clear();
    this.lastNonCriticalAudioTimestamp = 0;
  }
}
