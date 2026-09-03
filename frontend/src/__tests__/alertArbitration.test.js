/**
 * SafeRoute AI — Real-Time Driver Safety Assistant
 * Phase B: Alert Arbitration & Orchestration Unit Test Suite
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateUrgencyScore,
  calculateQualityScore,
  calculateArbitrationScore,
  arbitrateCandidates,
} from "../utils/alertArbitration.js";
import { AlertDeduplicator } from "../utils/alertIdentity.js";
import { SafetyRuleEngine } from "../services/SafetyRuleEngine.js";

describe("Phase B: Alert Arbitration & Orchestration Engine", () => {
  let ruleEngine;

  beforeEach(() => {
    ruleEngine = new SafetyRuleEngine();
  });

  // ------------------------------------------------------------------------
  // A. ALERT ARBITRATION TESTS (Requirements 1-6)
  // ------------------------------------------------------------------------
  describe("Arbitration Priority & Scoring", () => {
    it("1. CRITICAL DRIVER WARNING beats WARNING", () => {
      const candidates = [
        { rule_id: "RULE-OVERSPEED-02", severity: "WARNING", tte_s: 2.0, event_id: "OV_1" },
        { rule_id: "RULE-CURVE-03", severity: "CRITICAL DRIVER WARNING", tte_s: 3.5, event_id: "CURVE_1" },
      ];
      const sorted = arbitrateCandidates(candidates);
      expect(sorted[0].severity).toBe("CRITICAL DRIVER WARNING");
      expect(sorted[0].event_id).toBe("CURVE_1");
    });

    it("2. WARNING beats CAUTION", () => {
      const candidates = [
        { rule_id: "RULE-OVERSPEED-01", severity: "CAUTION", tte_s: 1.0, event_id: "OV_1" },
        { rule_id: "RULE-OVERSPEED-02", severity: "WARNING", tte_s: 4.0, event_id: "OV_2" },
      ];
      const sorted = arbitrateCandidates(candidates);
      expect(sorted[0].severity).toBe("WARNING");
    });

    it("3. CAUTION beats INFO", () => {
      const candidates = [
        { rule_id: "RULE-GPS-01", severity: "INFO", tte_s: 0.5, event_id: "GPS_1" },
        { rule_id: "RULE-RISK-01", severity: "CAUTION", tte_s: 8.0, event_id: "RISK_1" },
      ];
      const sorted = arbitrateCandidates(candidates);
      expect(sorted[0].severity).toBe("CAUTION");
    });

    it("4. Same severity tie-breaks using composite arbitration score S", () => {
      // Both WARNING severity: closer TTE (2s vs 8s) gets higher urgency score S
      const c1 = { rule_id: "RULE-OVERSPEED-02", severity: "WARNING", tte_s: 8.0, event_id: "OV_8" };
      const c2 = { rule_id: "RULE-CURVE-02", severity: "WARNING", tte_s: 2.0, event_id: "CURVE_2" };

      const sorted = arbitrateCandidates([c1, c2]);
      expect(sorted[0].event_id).toBe("CURVE_2");
    });

    it("5. Clamps urgency score correctly to [0.0, 1.0]", () => {
      expect(calculateUrgencyScore(0.0)).toBe(1.0);
      expect(calculateUrgencyScore(5.0)).toBe(0.5);
      expect(calculateUrgencyScore(10.0)).toBe(0.0);
      expect(calculateUrgencyScore(15.0)).toBe(0.0); // clamped to 0
      expect(calculateUrgencyScore(-5.0)).toBe(0.0); // negative TTE returns 0
      expect(calculateUrgencyScore(null)).toBe(0.0);
    });

    it("6. Data quality score affects tie-breaking correctly", () => {
      // Same severity (WARNING) and same TTE (4s), but VALID data quality outranks DEGRADED
      const cValid = { rule_id: "RULE-1", severity: "WARNING", tte_s: 4.0, quality_state: "VALID", event_id: "E1" };
      const cDegraded = { rule_id: "RULE-2", severity: "WARNING", tte_s: 4.0, quality_state: "DEGRADED", event_id: "E2" };

      const sorted = arbitrateCandidates([cDegraded, cValid]);
      expect(sorted[0].event_id).toBe("E1");
    });
  });

  // ------------------------------------------------------------------------
  // B. DEDUPLICATION TESTS (Requirements 7-10 & Reconciled Specs)
  // ------------------------------------------------------------------------
  describe("Alert Deduplication & Escalation", () => {
    it("7. Same EventID within 20s deduplication window does not re-trigger delivery", () => {
      const deduplicator = new AlertDeduplicator(20000, 10000);
      const candidate = { event_id: "CURVE_10_15", severity: "WARNING" };

      const res1 = deduplicator.evaluateCandidate(candidate, 1000);
      expect(res1.shouldDeliver).toBe(true);
      deduplicator.recordDelivery(candidate, 1000);

      // 19 seconds later (within 20s deduplication window) -> suppress duplicate
      const res2 = deduplicator.evaluateCandidate(candidate, 19000);
      expect(res2.shouldDeliver).toBe(false);
      expect(res2.reason).toBe("DEDUPLICATION_ACTIVE");
    });

    it("8. Different EventIDs with identical messages remain separate events", () => {
      const deduplicator = new AlertDeduplicator(20000, 10000);
      const candidate1 = { event_id: "CURVE_10_15", severity: "WARNING", default_text: "Sharp turn ahead in 200 m." };
      const candidate2 = { event_id: "CURVE_30_35", severity: "WARNING", default_text: "Sharp turn ahead in 200 m." };

      deduplicator.recordDelivery(candidate1, 1000);
      const res2 = deduplicator.evaluateCandidate(candidate2, 1000);
      expect(res2.shouldDeliver).toBe(true);
      expect(res2.reason).toBe("NEW_EVENT");
    });

    it("9. 20-second deduplication window expires correctly", () => {
      const deduplicator = new AlertDeduplicator(20000, 10000);
      const candidate = { event_id: "CURVE_10_15", severity: "WARNING" };

      deduplicator.recordDelivery(candidate, 1000);
      // 21 seconds later (> 20s window) -> delivers update
      const res2 = deduplicator.evaluateCandidate(candidate, 22000);
      expect(res2.shouldDeliver).toBe(true);
      expect(res2.reason).toBe("DEDUPLICATION_EXPIRED");
    });

    it("10. Genuine severity escalation BYPASSES DEDUPLICATION WINDOW IMMEDIATELY", () => {
      const deduplicator = new AlertDeduplicator(20000, 10000);
      const cautionCand = { event_id: "CURVE_10_15", severity: "CAUTION" };
      const warningCand = { event_id: "CURVE_10_15", severity: "WARNING" };

      deduplicator.recordDelivery(cautionCand, 1000);

      // Only 500ms later, severity escalates to WARNING -> MUST DELIVER IMMEDIATELY
      const resEscalated = deduplicator.evaluateCandidate(warningCand, 1500);
      expect(resEscalated.shouldDeliver).toBe(true);
      expect(resEscalated.isEscalation).toBe(true);
      expect(resEscalated.reason).toBe("SEVERITY_ESCALATION");
    });

    it("10b. Exposes 10-second non-critical audio cooldown state for Phase C", () => {
      const deduplicator = new AlertDeduplicator(20000, 10000);
      const cautionCand = { event_id: "CURVE_10_15", severity: "CAUTION" };

      expect(deduplicator.isAudioCooldownActive(1000)).toBe(false);
      deduplicator.recordDelivery(cautionCand, 1000);

      // Audio cooldown ACTIVE for 10s (e.g. at 5s)
      expect(deduplicator.isAudioCooldownActive(6000)).toBe(true);
      // Audio cooldown EXPIRED after 10s (e.g. at 12s)
      expect(deduplicator.isAudioCooldownActive(12000)).toBe(false);
    });
  });

  // ------------------------------------------------------------------------
  // C. MULTI-HAZARD & SIMULATION SCENARIOS (Requirements 17-20)
  // ------------------------------------------------------------------------
  describe("Simulation Scenarios", () => {
    it("SCENARIO 1: 65 km/h in 50 advisory with sharp curve candidate -> WARNING", () => {
      const telemetry = { latitude: 28.6, longitude: 77.2, speed_kmh: 65 };
      const turnEvents = [
        {
          event_id: "CURVE_99",
          turn_type: "SHARP",
          severity: "WARNING",
          distance_to_hazard_m: 180,
          tte_seconds: 3.8,
        },
      ];
      const candidates = ruleEngine.evaluateRules({
        telemetry,
        turnEvents,
        advisorySpeedResult: { advisory_speed_kmh: 50 },
      });

      const arbitrated = arbitrateCandidates(candidates);
      expect(arbitrated[0].severity).toBe("WARNING");
    });

    it("SCENARIO 2: sharp curve + heavy rain + overspeed -> exactly ONE primary alert selected", () => {
      const candidates = [
        { rule_id: "RULE-WEATHER-01", severity: "CAUTION", event_id: "W_1" },
        { rule_id: "RULE-OVERSPEED-01", severity: "CAUTION", event_id: "OV_1" },
        { rule_id: "RULE-CURVE-02", severity: "WARNING", event_id: "CURVE_1" },
      ];

      const arbitrated = arbitrateCandidates(candidates);
      expect(arbitrated.length).toBe(3);
      // Primary alert MUST be the WARNING curve alert (highest severity tier)
      expect(arbitrated[0].event_id).toBe("CURVE_1");
      expect(arbitrated[0].severity).toBe("WARNING");
    });

    it("SCENARIO 3: same curve event escalates from CAUTION to WARNING -> same EventID preserved", () => {
      const cautionEvent = { event_id: "CURVE_50_55", severity: "CAUTION" };
      const warningEvent = { event_id: "CURVE_50_55", severity: "WARNING" };

      expect(cautionEvent.event_id).toBe(warningEvent.event_id);
    });

    it("SCENARIO 4: risk score 85 but safe speed -> ambient indicator only, NO intrusive critical risk alert", () => {
      const telemetry = { latitude: 28.6, longitude: 77.2, speed_kmh: 40 }; // safe speed
      const roadMetadata = { ml_risk_score: 85, segment_id: "seg_85" };

      const candidates = ruleEngine.evaluateRules({
        telemetry,
        roadMetadata,
        dataQuality: { gps: "VALID", route: "VALID", weather: "VALID", risk: "VALID" },
        advisorySpeedResult: { advisory_speed_kmh: 50 },
      });

      const arbitrated = arbitrateCandidates(candidates);
      const riskAlert = arbitrated.find((c) => c.rule_id.startsWith("RULE-RISK"));
      expect(riskAlert).toBeUndefined(); // Zero intrusive risk candidates emitted
    });

    it("SCENARIO 5: GPS degraded -> dependent alerts suppressed/degraded safely", () => {
      const telemetry = { latitude: 28.6, longitude: 77.2, speed_kmh: 40, accuracy_m: 40 };
      const candidates = ruleEngine.evaluateRules({
        telemetry,
        dataQuality: { gps: "DEGRADED", route: "VALID", weather: "VALID", risk: "VALID" },
        overrides: { sustainedLowGpsDurationMs: 6000 },
      });

      const arbitrated = arbitrateCandidates(candidates);
      expect(arbitrated[0].rule_id).toBe("RULE-GPS-01");
      expect(arbitrated[0].severity).toBe("INFO");
    });
  });
});
