/**
 * SafeRoute AI — Real-Time Driver Safety Assistant
 * Phase B: Alert Orchestrator Hook & State Manager
 *
 * Deterministic alert orchestrator responsible for candidate validation,
 * arbitration, deduplication (20s window), non-critical audio cooldown state tracking (10s),
 * lifecycle transitions, escalation, and maintaining exactly ONE Active Primary Alert.
 *
 * ABSOLUTE PHASE B CONSTRAINTS:
 * - Pure stateless/React hook logic (zero audio, zero TTS, zero vibration, zero network APIs).
 * - Maintains single active primary alert invariant.
 * - Severity ceiling preserved (lower severity NEVER outranks higher severity).
 */

import { useState, useCallback, useRef } from "react";
import { arbitrateCandidates } from "../utils/alertArbitration.js";
import { AlertDeduplicator, EVENT_DEDUPLICATION_MS, NON_CRITICAL_AUDIO_COOLDOWN_MS } from "../utils/alertIdentity.js";

export const ALERT_STATES = {
  IDLE: "IDLE",
  EVALUATING: "EVALUATING",
  DELIVERING: "DELIVERING",
  COOLDOWN: "COOLDOWN",
  SUPPRESSED: "SUPPRESSED",
};

/**
 * Custom React hook for deterministic alert orchestration.
 *
 * @param {Object} [options]
 * @param {number} [options.deduplicationMs=20000] - Deduplication window for identical events in milliseconds.
 * @param {number} [options.audioCooldownMs=10000] - Audio cooldown window for non-critical alerts in milliseconds.
 * @returns {Object} Orchestrator state and control methods.
 */
export function useAlertOrchestrator(options = {}) {
  const deduplicationMs = options.deduplicationMs || EVENT_DEDUPLICATION_MS;
  const audioCooldownMs = options.audioCooldownMs || NON_CRITICAL_AUDIO_COOLDOWN_MS;
  const deduplicatorRef = useRef(new AlertDeduplicator(deduplicationMs, audioCooldownMs));

  const [alertState, setAlertState] = useState(ALERT_STATES.IDLE);
  const [activePrimaryAlert, setActivePrimaryAlert] = useState(null);
  const [suppressedAlerts, setSuppressedAlerts] = useState([]);
  const [nextHazard, setNextHazard] = useState(null);
  const [dataQualitySummary, setDataQualitySummary] = useState({
    gps: "VALID",
    route: "VALID",
    weather: "VALID",
    risk: "VALID",
  });

  /**
   * Processes incoming RuleCandidate[] array from Phase A SafetyRuleEngine.
   *
   * @param {Array<Object>} candidates - RuleCandidate[] array.
   * @param {Object} [context] - Spatial and telemetry context snapshot.
   */
  const processRuleCandidates = useCallback((candidates, context = {}) => {
    if (!Array.isArray(candidates) || candidates.length === 0) {
      setActivePrimaryAlert(null);
      setSuppressedAlerts([]);
      setNextHazard(null);
      setAlertState(ALERT_STATES.IDLE);
      return;
    }

    // Update data quality summary if present
    if (context.dataQuality) {
      setDataQualitySummary(context.dataQuality);
    }

    // 1. Arbitrate candidates according to strict severity tier & S score
    const arbitrated = arbitrateCandidates(candidates);
    if (arbitrated.length === 0) {
      setActivePrimaryAlert(null);
      setSuppressedAlerts([]);
      setNextHazard(null);
      setAlertState(ALERT_STATES.IDLE);
      return;
    }

    // 2. Highest priority candidate becomes primary candidate
    const primaryCandidate = arbitrated[0];
    const suppressed = arbitrated.slice(1);
    setSuppressedAlerts(suppressed);

    // 3. Evaluate deduplication and escalation for primary candidate
    const now = context.timestamp_ms || Date.now();
    const evalResult = deduplicatorRef.current.evaluateCandidate(primaryCandidate, now);

    if (evalResult.shouldDeliver) {
      // Deliver/Escalate primary alert
      deduplicatorRef.current.recordDelivery(primaryCandidate, now);
      setActivePrimaryAlert(primaryCandidate);
      setAlertState(ALERT_STATES.DELIVERING);
    } else {
      // In active deduplication window for same event, keep active alert state consistent
      setAlertState(ALERT_STATES.COOLDOWN);
    }

    // 4. Resolve Next Hazard preview (closest upcoming turn or risk segment not currently primary alert)
    const upcomingTurnEvents = context.turnEvents || [];
    const availableHazards = upcomingTurnEvents.filter(
      (t) => t.event_id !== primaryCandidate.event_id && t.turn_type !== "GENTLE"
    );

    if (availableHazards.length > 0) {
      // Sort upcoming turn hazards by distance ascending
      availableHazards.sort((a, b) => (a.distance_to_hazard_m || 0) - (b.distance_to_hazard_m || 0));
      setNextHazard(availableHazards[0]);
    } else if (suppressed.length > 0) {
      // Fallback to first suppressed candidate as next hazard preview
      setNextHazard(suppressed[0]);
    } else {
      setNextHazard(null);
    }
  }, []);

  /**
   * Resets orchestrator state to baseline.
   */
  const resetOrchestrator = useCallback(() => {
    deduplicatorRef.current.reset();
    setActivePrimaryAlert(null);
    setSuppressedAlerts([]);
    setNextHazard(null);
    setAlertState(ALERT_STATES.IDLE);
  }, []);

  /**
   * Helper to check if non-critical audio cooldown (10s) is currently active (for Phase C).
   */
  const isAudioCooldownActive = useCallback((nowMs = Date.now()) => {
    return deduplicatorRef.current.isAudioCooldownActive(nowMs);
  }, []);

  return {
    alertState,
    activePrimaryAlert,
    suppressedAlerts,
    nextHazard,
    dataQualitySummary,
    processRuleCandidates,
    resetOrchestrator,
    isAudioCooldownActive,
  };
}
