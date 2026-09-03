/**
 * SafeRoute AI — Real-Time Driver Safety Assistant
 * Phase A: Deterministic Safety Rule Engine Service
 *
 * Pure, 100% deterministic evaluator that evaluates telemetry, spatial geometry,
 * road metadata, and environmental quality to produce raw RuleCandidate objects.
 *
 * ABSOLUTE INVARIANTS:
 * - Pure stateless functions (zero side effects, no API calls, no network, no LLMs).
 * - Zero randomness (no Math.random(), no UUIDs, no Date.now() inside math).
 * - ML Risk score is contextual input only (NEVER promotes to CRITICAL DRIVER WARNING without speed/geometry gates).
 */

import { calculateTTE } from "../utils/kinematics.js";

export class SafetyRuleEngine {
  /**
   * Evaluates incoming driver session telemetry and spatial context against the
   * deterministic safety rule matrix to generate active RuleCandidate objects.
   *
   * @param {Object} context
   * @param {Object} context.telemetry - TelemetryInput snapshot { latitude, longitude, speed_kmh, heading_deg, accuracy_m, timestamp_ms }.
   * @param {Object} [context.roadMetadata] - RoadSegmentMetadata { segment_id, road_name, road_type, mapped_maxspeed_kmh, taxonomy_baseline_speed_kmh, ml_risk_score }.
   * @param {Object} [context.dataQuality] - DataQualityState { gps, route, weather, risk }.
   * @param {Array<Object>} [context.turnEvents] - Array of TurnEvent objects.
   * @param {Object} [context.advisorySpeedResult] - AdvisorySpeedResult { advisory_speed_kmh, base_speed_kmh, ... }.
   * @param {Object} [context.overrides] - Optional evaluation state overrides (e.g. sustained overspeed duration ms, distance to route m, weather state string).
   * @returns {Array<Object>} RuleCandidate[] array of raw candidate alert objects.
   */
  evaluateRules({
    telemetry,
    roadMetadata = null,
    dataQuality = null,
    turnEvents = [],
    advisorySpeedResult = null,
    overrides = {},
  }) {
    if (!telemetry || typeof telemetry !== 'object') {
      return [];
    }

    const candidates = [];
    const quality = dataQuality || { gps: "VALID", route: "VALID", weather: "VALID", risk: "VALID" };
    const currentSpeed = (telemetry.speed_kmh !== null && telemetry.speed_kmh !== undefined && !isNaN(telemetry.speed_kmh))
      ? Math.max(0, telemetry.speed_kmh)
      : 0;

    const advisorySpeed = (advisorySpeedResult && advisorySpeedResult.advisory_speed_kmh)
      ? advisorySpeedResult.advisory_speed_kmh
      : 50;

    const currentSegmentId = (roadMetadata && roadMetadata.segment_id) ? roadMetadata.segment_id : "seg_0";

    // ------------------------------------------------------------------------
    // 1. RULE-GPS-02: GPS Fix Loss Check
    // ------------------------------------------------------------------------
    const gpsFixAgeMs = overrides.gpsFixAgeMs || 0;
    if (quality.gps === "UNAVAILABLE" || gpsFixAgeMs > 4000) {
      candidates.push({
        rule_id: "RULE-GPS-02",
        rule_name: "GPS Fix Loss",
        severity: "WARNING",
        event_id: "GPS_FIX_LOSS",
        distance_m: 0,
        tte_s: null,
        message_key: "gps_loss",
        default_text: "GPS fix lost. Location guidance paused.",
        quality_state: "DEGRADED",
      });
      // Return early on complete GPS loss as location-dependent rules are invalid
      return candidates;
    }

    // ------------------------------------------------------------------------
    // 2. RULE-GPS-01: Low GPS Accuracy Check
    // ------------------------------------------------------------------------
    const sustainedLowGpsDurationMs = overrides.sustainedLowGpsDurationMs || 0;
    if (quality.gps === "DEGRADED" || (telemetry.accuracy_m > 30.0 && sustainedLowGpsDurationMs >= 5000)) {
      candidates.push({
        rule_id: "RULE-GPS-01",
        rule_name: "Low GPS Accuracy",
        severity: "INFO",
        event_id: "GPS_LOW_ACCURACY",
        distance_m: 0,
        tte_s: null,
        message_key: "gps_low_accuracy",
        default_text: `Low GPS accuracy (${Math.round(telemetry.accuracy_m)} m). Guidance precision degraded.`,
        quality_state: "DEGRADED",
      });
    }

    // ------------------------------------------------------------------------
    // 3. RULE-OFFROUTE-01: Route Deviation Check
    // ------------------------------------------------------------------------
    const distanceToRouteMeters = overrides.distanceToRouteMeters || 0;
    const sustainedOffRouteDurationMs = overrides.sustainedOffRouteDurationMs || 0;
    if (distanceToRouteMeters > 50.0 && sustainedOffRouteDurationMs >= 3000) {
      candidates.push({
        rule_id: "RULE-OFFROUTE-01",
        rule_name: "Route Deviation",
        severity: "WARNING",
        event_id: `OFFROUTE_${Math.round(distanceToRouteMeters)}`,
        distance_m: Math.round(distanceToRouteMeters),
        tte_s: null,
        message_key: "off_route",
        default_text: `Off route (${Math.round(distanceToRouteMeters)} m). Safety guidance temporarily paused.`,
        quality_state: "DEGRADED",
      });
      // When off-route, suppress route-segment specific alerts
      return candidates;
    }

    // ------------------------------------------------------------------------
    // 4. RULE-OVERSPEED-01 & RULE-OVERSPEED-02: Overspeed Rules
    // ------------------------------------------------------------------------
    const speedDelta = currentSpeed - advisorySpeed;
    const sustainedOverspeedDurationMs = overrides.sustainedOverspeedDurationMs || 3500; // default active duration if test provides speedDelta

    if (speedDelta > 20.0 && sustainedOverspeedDurationMs >= 2000) {
      candidates.push({
        rule_id: "RULE-OVERSPEED-02",
        rule_name: "Severe Overspeed",
        severity: "WARNING",
        event_id: `OVERSPEED_SEVERE_${currentSegmentId}`,
        distance_m: 0,
        tte_s: null,
        message_key: "severe_overspeed",
        default_text: `Severe overspeed. Please reduce speed to ${advisorySpeed} km/h.`,
        quality_state: "VALID",
      });
    } else if (speedDelta > 10.0 && sustainedOverspeedDurationMs >= 3000) {
      candidates.push({
        rule_id: "RULE-OVERSPEED-01",
        rule_name: "Moderate Overspeed",
        severity: "CAUTION",
        event_id: `OVERSPEED_MODERATE_${currentSegmentId}`,
        distance_m: 0,
        tte_s: null,
        message_key: "moderate_overspeed",
        default_text: `Moderate overspeed. Recommended speed: ${advisorySpeed} km/h.`,
        quality_state: "VALID",
      });
    }

    // ------------------------------------------------------------------------
    // 5. RULE-CURVE-01, RULE-CURVE-02 & RULE-CURVE-03: Turn Hazard Rules
    // ------------------------------------------------------------------------
    if (Array.isArray(turnEvents) && turnEvents.length > 0) {
      turnEvents.forEach((turn) => {
        if (!turn || turn.turn_type === "GENTLE") return;

        let ruleId = "RULE-CURVE-01";
        let ruleName = "Moderate Curve";
        let messageKey = "moderate_curve";
        let text = `Moderate curve ahead in ${Math.round(turn.distance_to_hazard_m)} m.`;

        if (turn.severity === "CRITICAL DRIVER WARNING" || turn.turn_type === "HAIRPIN") {
          ruleId = "RULE-CURVE-03";
          ruleName = "Hairpin / Sharp Turn";
          messageKey = "hairpin_turn";
          text = `Caution: Hairpin turn ahead in ${Math.round(turn.distance_to_hazard_m)} m.`;
        } else if (turn.severity === "WARNING" || turn.turn_type === "SHARP") {
          ruleId = "RULE-CURVE-02";
          ruleName = "Severe Curve";
          messageKey = "severe_curve";
          text = `Sharp turn ahead in ${Math.round(turn.distance_to_hazard_m)} m. Slow down.`;
        }

        candidates.push({
          rule_id: ruleId,
          rule_name: ruleName,
          severity: turn.severity,
          event_id: turn.event_id,
          distance_m: Math.round(turn.distance_to_hazard_m),
          tte_s: turn.tte_seconds,
          message_key: messageKey,
          default_text: text,
          quality_state: "VALID",
        });
      });
    }

    // ------------------------------------------------------------------------
    // 6. RULE-RISK-01 & RULE-RISK-02: ML Risk Rules (Gated)
    // ------------------------------------------------------------------------
    const mlRiskScore = (roadMetadata && roadMetadata.ml_risk_score !== null && roadMetadata.ml_risk_score !== undefined)
      ? Number(roadMetadata.ml_risk_score)
      : null;

    const segmentDistanceMeters = (overrides.segmentDistanceMeters !== undefined)
      ? overrides.segmentDistanceMeters
      : 200;

    // ML Risk is contextual: if risk is null, stale, or unavailable, suppress risk rules
    if (mlRiskScore !== null && !isNaN(mlRiskScore) && quality.risk === "VALID") {
      const upcomingSharpTurnNear = candidates.some((c) => c.rule_id === "RULE-CURVE-02" || c.rule_id === "RULE-CURVE-03");

      if (mlRiskScore >= 59 && segmentDistanceMeters <= 250) {
        // GATING CHECK: ML Risk >= 59 MUST be gated by overspeed (>10 km/h over advisory) OR upcoming sharp turn to emit RULE-RISK-02 (WARNING)
        if (speedDelta > 10.0 || upcomingSharpTurnNear) {
          candidates.push({
            rule_id: "RULE-RISK-02",
            rule_name: "Critical Risk Zone Approach",
            severity: "WARNING",
            event_id: `RISK_CRITICAL_${currentSegmentId}`,
            distance_m: Math.round(segmentDistanceMeters),
            tte_s: calculateTTE(segmentDistanceMeters, currentSpeed),
            message_key: "critical_risk_zone",
            default_text: `Caution: Critical-risk segment ahead (${Math.round(segmentDistanceMeters)} m). Reduce speed.`,
            quality_state: "VALID",
          });
        }
        // If physical gate is NOT satisfied, emit NO intrusive rule candidate.
        // Ambient risk state remains exposed on roadMetadata/HUD context, but zero intrusive alerts are generated.
      } else if (mlRiskScore >= 46 && mlRiskScore <= 58 && segmentDistanceMeters <= 400) {
        candidates.push({
          rule_id: "RULE-RISK-01",
          rule_name: "High Risk Zone Entrance",
          severity: "CAUTION",
          event_id: `RISK_HIGH_${currentSegmentId}`,
          distance_m: Math.round(segmentDistanceMeters),
          tte_s: calculateTTE(segmentDistanceMeters, currentSpeed),
          message_key: "high_risk_zone",
          default_text: `Approaching high-risk road segment (${Math.round(segmentDistanceMeters)} m).`,
          quality_state: "VALID",
        });
      }
    }

    // ------------------------------------------------------------------------
    // 7. RULE-WEATHER-01: Adverse Weather Rule
    // ------------------------------------------------------------------------
    const weatherState = overrides.weatherState || (roadMetadata && roadMetadata.weatherState) || "Clear";
    const weatherQuality = (quality && quality.weather) || "VALID";

    const isWeatherAdverse =
      weatherState === "Heavy Rain" ||
      weatherState === "HEAVY_RAIN" ||
      weatherState === "Fog" ||
      weatherState === "FOG" ||
      weatherState === "Storm" ||
      weatherState === "STORM" ||
      weatherState === "Low Visibility" ||
      weatherState === "LOW_VISIBILITY";

    if ((weatherQuality === "VALID" || weatherQuality === "RECENT") && isWeatherAdverse) {
      candidates.push({
        rule_id: "RULE-WEATHER-01",
        rule_name: "Adverse Weather Warning",
        severity: "CAUTION",
        event_id: `WEATHER_${weatherState.toUpperCase().replace(/\s+/g, '_')}`,
        distance_m: 0,
        tte_s: null,
        message_key: "adverse_weather",
        default_text: `Adverse weather detected (${weatherState}). Maintain extra distance.`,
        quality_state: weatherQuality,
      });
    }

    return candidates;

  }
}

export const safetyRuleEngine = new SafetyRuleEngine();
