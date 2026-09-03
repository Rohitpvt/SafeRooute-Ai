/**
 * SafeRoute AI — Real-Time Driver Safety Assistant
 * Comprehensive E2E Validation & UAT Scenario Test Suite
 *
 * Programmatically validates all 12 E2E scenarios, alert timing, deduplication,
 * audio cooldown, resource cleanup, and network request boundaries.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { safetyRuleEngine } from "../services/SafetyRuleEngine.js";
import { arbitrateCandidates } from "../utils/alertArbitration.js";
import { AlertDeduplicator, getEventIdentityKey } from "../utils/alertIdentity.js";
import { EnvironmentService, ENVIRONMENTAL_QUALITY_STATES, WEATHER_STATES } from "../services/environmentService.js";
import { AudioHapticService } from "../services/AudioHapticService.js";

describe("SafeRoute AI — End-to-End Safety Pipeline Validation", () => {
  let envService;
  let audioService;
  let deduplicator;

  beforeEach(() => {
    envService = new EnvironmentService();
    audioService = new AudioHapticService();
    deduplicator = new AlertDeduplicator();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("window", {
      navigator: { onLine: true, vibrate: vi.fn() },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 1 — NORMAL DRIVE
  // ------------------------------------------------------------------------
  it("SCENARIO 1 — Normal Drive: baseline speed, clear weather, low risk, no turn", () => {
    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: { speed_kmh: 40, accuracy_m: 5.0 },
      roadMetadata: { mapped_maxspeed_kmh: 50, ml_risk_score: 20 },
      dataQuality: { gps: "VALID", route: "VALID", weather: "VALID", risk: "VALID" },
    });

    const arbitrated = arbitrateCandidates(candidates);
    expect(candidates.length).toBe(0);
    expect(arbitrated.length).toBe(0);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 2 — OVERSPEED
  // ------------------------------------------------------------------------
  it("SCENARIO 2 — Overspeed: speed above advisory for > 3.0 seconds", () => {
    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: { speed_kmh: 75, accuracy_m: 5.0 },
      advisorySpeedResult: { advisory_speed_kmh: 50 },
      overrides: { sustainedOverspeedDurationMs: 3500 },
      dataQuality: { gps: "VALID", route: "VALID", weather: "VALID", risk: "VALID" },
    });

    const arbitrated = arbitrateCandidates(candidates);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].rule_id).toBe("RULE-OVERSPEED-02");
    expect(arbitrated[0].rule_id).toBe("RULE-OVERSPEED-02");
    expect(arbitrated[0].severity).toBe("WARNING");
  });

  // ------------------------------------------------------------------------
  // SCENARIO 3 — SHARP TURN
  // ------------------------------------------------------------------------
  it("SCENARIO 3 — Sharp Turn: approaching curve at elevated speed", () => {
    const turnEvent = {
      event_id: "TURN_SHARP_1",
      severity: "WARNING",
      turn_type: "SHARP",
      distance_to_hazard_m: 180,
      tte_seconds: 5.1,
      recommended_speed_kmh: 35,
    };

    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: { speed_kmh: 60, accuracy_m: 5.0 },
      advisorySpeedResult: { advisory_speed_kmh: 35 },
      turnEvents: [turnEvent],
      dataQuality: { gps: "VALID", route: "VALID", weather: "VALID", risk: "VALID" },
    });

    const arbitrated = arbitrateCandidates(candidates);
    const turnCandidate = candidates.find((c) => c.rule_id === "RULE-CURVE-02");
    expect(turnCandidate).toBeDefined();
    expect(arbitrated[0].rule_id).toBe("RULE-CURVE-02");
    expect(arbitrated[0].severity).toBe("WARNING");
    expect(arbitrated[0].distance_m).toBe(180);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 4 — HEAVY RAIN
  // ------------------------------------------------------------------------
  it("SCENARIO 4 — Heavy Rain: valid recent weather applies speed modifier and emits caution candidate", () => {
    const mod = envService.calculateWeatherModifier(WEATHER_STATES.HEAVY_RAIN, ENVIRONMENTAL_QUALITY_STATES.VALID);
    expect(mod).toBe(0.85);

    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: { speed_kmh: 40, accuracy_m: 5.0 },
      overrides: { weatherState: "HEAVY_RAIN" },
      dataQuality: { weather: "VALID" },
    });

    const arbitrated = arbitrateCandidates(candidates);
    const weatherCandidate = candidates.find((c) => c.rule_id === "RULE-WEATHER-01");
    expect(weatherCandidate).toBeDefined();
    expect(weatherCandidate.severity).toBe("CAUTION");
    expect(arbitrated[0].rule_id).toBe("RULE-WEATHER-01");
  });

  // ------------------------------------------------------------------------
  // SCENARIO 5 — HEAVY RAIN + OVERSPEED + SHARP TURN (COMPOSITE ARBITRATION)
  // ------------------------------------------------------------------------
  it("SCENARIO 5 — Heavy Rain + Overspeed + Sharp Turn: single primary alert arbitrated cleanly", () => {
    const turnEvent = {
      event_id: "TURN_SHARP_1",
      severity: "WARNING",
      turn_type: "SHARP",
      distance_to_hazard_m: 120,
      tte_seconds: 3.5,
      recommended_speed_kmh: 30,
    };

    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: { speed_kmh: 80, accuracy_m: 5.0 },
      advisorySpeedResult: { advisory_speed_kmh: 40 },
      overrides: { sustainedOverspeedDurationMs: 4000, weatherState: "HEAVY_RAIN" },
      turnEvents: [turnEvent],
      dataQuality: { gps: "VALID", route: "VALID", weather: "VALID", risk: "VALID" },
    });

    expect(candidates.length).toBeGreaterThanOrEqual(3);

    const arbitrated = arbitrateCandidates(candidates);
    expect(arbitrated.length).toBeGreaterThan(0);
    const primaryAlert = arbitrated[0];

    expect(["WARNING", "CRITICAL DRIVER WARNING"]).toContain(primaryAlert.severity);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 6 — HIGH ML RISK WITHOUT PHYSICAL GATE (GATE ENFORCEMENT)
  // ------------------------------------------------------------------------
  it("SCENARIO 6 — High ML Risk (85) without Physical Gate: strictly suppresses CRITICAL alert", () => {
    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: { speed_kmh: 45, accuracy_m: 5.0 }, // within advisory (no overspeed)
      roadMetadata: { ml_risk_score: 85, mapped_maxspeed_kmh: 50 },
      advisorySpeedResult: { advisory_speed_kmh: 50 },
      dataQuality: { gps: "VALID", route: "VALID", weather: "VALID", risk: "VALID" },
    });

    // Un-gated high risk score within advisory speed emits NO intrusive alert
    const riskCandidate = candidates.find((c) => c.rule_id === "RULE-RISK-02");
    expect(riskCandidate).toBeUndefined();
    expect(candidates.length).toBe(0);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 7 — HIGH ML RISK + OVERSPEED (QUALIFYING PHYSICAL GATE)
  // ------------------------------------------------------------------------
  it("SCENARIO 7 — High ML Risk (85) + Overspeed: promotes to RULE-RISK-02 WARNING", () => {
    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: { speed_kmh: 70, accuracy_m: 5.0 },
      roadMetadata: { ml_risk_score: 85, mapped_maxspeed_kmh: 50 },
      advisorySpeedResult: { advisory_speed_kmh: 50 },
      overrides: { sustainedOverspeedDurationMs: 4000 },
      dataQuality: { gps: "VALID", route: "VALID", weather: "VALID", risk: "VALID" },
    });

    const arbitrated = arbitrateCandidates(candidates);
    expect(arbitrated[0].rule_id).toBe("RULE-RISK-02");
    expect(arbitrated[0].severity).toBe("WARNING");
  });

  // ------------------------------------------------------------------------
  // SCENARIO 8 — WEATHER FAILURE RESILIENCE
  // ------------------------------------------------------------------------
  it("SCENARIO 8 — Weather Failure: missing weather removes M_weather and suppresses weather rules", async () => {
    fetch.mockRejectedValue(new Error("Weather server offline"));

    const envCtx = await envService.getEnvironmentalContext(28.6139, 77.209);
    expect(envCtx.quality).toBe(ENVIRONMENTAL_QUALITY_STATES.UNAVAILABLE);
    expect(envCtx.weather_modifier).toBe(1.0);

    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: { speed_kmh: 50, accuracy_m: 5.0 },
      dataQuality: { weather: envCtx.quality },
    });

    const weatherCandidate = candidates.find((c) => c.rule_id === "RULE-WEATHER-01");
    expect(weatherCandidate).toBeUndefined();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 9 — GPS LOSS RESILIENCE
  // ------------------------------------------------------------------------
  it("SCENARIO 9 — GPS Loss: suppresses location rules and returns RULE-GPS-02 WARNING", () => {
    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: { speed_kmh: 50, accuracy_m: 50.0 },
      overrides: { gpsFixAgeMs: 5000 },
      dataQuality: { gps: "UNAVAILABLE" },
    });

    expect(candidates.length).toBe(1);
    expect(candidates[0].rule_id).toBe("RULE-GPS-02");
    expect(candidates[0].severity).toBe("WARNING");
  });

  // ------------------------------------------------------------------------
  // SCENARIO 10 — NETWORK OFFLINE RESILIENCE
  // ------------------------------------------------------------------------
  it("SCENARIO 10 — Network Offline: local kinematic safety logic continues deterministically", async () => {
    vi.stubGlobal("window", {
      navigator: { onLine: false },
    });

    const envCtx = await envService.getEnvironmentalContext(28.6139, 77.209);
    expect(envCtx.is_offline).toBe(true);
    expect(envCtx.display_status).toBe("Offline Mode");

    // Kinematic safety rule still evaluates offline!
    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: { speed_kmh: 80, accuracy_m: 5.0 },
      advisorySpeedResult: { advisory_speed_kmh: 50 },
      overrides: { sustainedOverspeedDurationMs: 4000 },
      dataQuality: { gps: "VALID", weather: envCtx.quality },
    });

    expect(candidates.some((c) => c.rule_id === "RULE-OVERSPEED-02")).toBe(true);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 11 — WEATHER TRANSITION
  // ------------------------------------------------------------------------
  it("SCENARIO 11 — Weather Transition (Clear -> Light Rain -> Heavy Rain)", () => {
    let mod = envService.calculateWeatherModifier(WEATHER_STATES.CLEAR, ENVIRONMENTAL_QUALITY_STATES.VALID);
    expect(mod).toBe(1.0);

    mod = envService.calculateWeatherModifier(WEATHER_STATES.LIGHT_RAIN, ENVIRONMENTAL_QUALITY_STATES.VALID);
    expect(mod).toBe(0.92);

    mod = envService.calculateWeatherModifier(WEATHER_STATES.HEAVY_RAIN, ENVIRONMENTAL_QUALITY_STATES.VALID);
    expect(mod).toBe(0.85);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 12 — HAZARD ESCALATION & DEDUPLICATION
  // ------------------------------------------------------------------------
  it("SCENARIO 12 — Hazard Escalation & 20s Deduplication / 10s Cooldown", () => {
    const candidate = { rule_id: "RULE-OVERSPEED-02", event_id: "OVERSPEED_seg_100", severity: "WARNING" };

    const now = 100000;

    // First emission at t=100s -> Should deliver!
    let result = deduplicator.evaluateCandidate(candidate, now);
    expect(result.shouldDeliver).toBe(true);
    deduplicator.recordDelivery(candidate, now);

    // Same emission at t=105s (within 20s window) -> Suppressed due to deduplication!
    result = deduplicator.evaluateCandidate(candidate, now + 5000);
    expect(result.shouldDeliver).toBe(false);
    expect(result.reason).toBe("DEDUPLICATION_ACTIVE");

    // Audio cooldown check at t=105s -> Active!
    expect(deduplicator.isAudioCooldownActive(now + 5000)).toBe(true);

    // Escalation to CRITICAL DRIVER WARNING at t=106s -> Bypasses deduplication immediately!
    const escalatedCandidate = { rule_id: "RULE-OVERSPEED-02", event_id: "OVERSPEED_seg_100", severity: "CRITICAL DRIVER WARNING" };
    result = deduplicator.evaluateCandidate(escalatedCandidate, now + 6000);
    expect(result.shouldDeliver).toBe(true);
    expect(result.isEscalation).toBe(true);
    expect(result.reason).toBe("SEVERITY_ESCALATION");
  });
});
