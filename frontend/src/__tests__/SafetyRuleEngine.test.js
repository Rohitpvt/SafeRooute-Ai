/**
 * Unit Tests for Deterministic Safety Rule Engine Service (Phase A)
 */

import { describe, it, expect } from "vitest";
import { safetyRuleEngine } from "../services/SafetyRuleEngine.js";

describe("Safety Rule Engine Service", () => {
  const defaultTelemetry = {
    latitude: 28.6315,
    longitude: 77.2167,
    speed_kmh: 40,
    heading_deg: 90,
    accuracy_m: 5,
    timestamp_ms: 1000,
  };

  const defaultRoadMetadata = {
    segment_id: "seg_101",
    road_name: "Vikas Marg",
    road_type: "Arterial",
    mapped_maxspeed_kmh: 50,
    taxonomy_baseline_speed_kmh: 50,
    ml_risk_score: 25,
  };

  const defaultDataQuality = {
    gps: "VALID",
    route: "VALID",
    weather: "VALID",
    risk: "VALID",
  };

  const defaultAdvisorySpeed = {
    advisory_speed_kmh: 50,
    base_speed_kmh: 50,
    base_speed_source: "MAPPED_SPEED_LIMIT",
    ui_label: "Mapped Speed Limit",
  };

  it("evaluates moderate overspeed (RULE-OVERSPEED-01)", () => {
    const telemetry = { ...defaultTelemetry, speed_kmh: 62 }; // +12 km/h over 50
    const candidates = safetyRuleEngine.evaluateRules({
      telemetry,
      roadMetadata: defaultRoadMetadata,
      dataQuality: defaultDataQuality,
      advisorySpeedResult: defaultAdvisorySpeed,
      overrides: { sustainedOverspeedDurationMs: 3500 },
    });

    const overspeedRule = candidates.find((c) => c.rule_id === "RULE-OVERSPEED-01");
    expect(overspeedRule).toBeDefined();
    expect(overspeedRule.severity).toBe("CAUTION");
    expect(overspeedRule.event_id).toBe("OVERSPEED_MODERATE_seg_101");
  });

  it("evaluates severe overspeed (RULE-OVERSPEED-02)", () => {
    const telemetry = { ...defaultTelemetry, speed_kmh: 75 }; // +25 km/h over 50
    const candidates = safetyRuleEngine.evaluateRules({
      telemetry,
      roadMetadata: defaultRoadMetadata,
      dataQuality: defaultDataQuality,
      advisorySpeedResult: defaultAdvisorySpeed,
      overrides: { sustainedOverspeedDurationMs: 2500 },
    });

    const overspeedRule = candidates.find((c) => c.rule_id === "RULE-OVERSPEED-02");
    expect(overspeedRule).toBeDefined();
    expect(overspeedRule.severity).toBe("WARNING");
    expect(overspeedRule.event_id).toBe("OVERSPEED_SEVERE_seg_101");
  });

  // ------------------------------------------------------------------------
  // TEST A: RiskScore = 50 + qualifying proximity -> RULE-RISK-01 / CAUTION
  // ------------------------------------------------------------------------
  it("TEST A: maps RiskScore 50 with qualifying proximity to RULE-RISK-01 (CAUTION)", () => {
    const roadMetadataMediumRisk = { ...defaultRoadMetadata, ml_risk_score: 50 };
    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: defaultTelemetry,
      roadMetadata: roadMetadataMediumRisk,
      dataQuality: defaultDataQuality,
      advisorySpeedResult: defaultAdvisorySpeed,
      overrides: { segmentDistanceMeters: 300 },
    });

    const riskRule = candidates.find((c) => c.rule_id === "RULE-RISK-01");
    expect(riskRule).toBeDefined();
    expect(riskRule.severity).toBe("CAUTION");
    expect(riskRule.rule_id).toBe("RULE-RISK-01");
  });

  // ------------------------------------------------------------------------
  // TEST B: RiskScore = 85 + speed within advisory + no sharp turn -> NO RULE-RISK-02 / NO RULE-RISK-01 candidate
  // ------------------------------------------------------------------------
  it("TEST B: RiskScore 85 with safe speed and no turn emits NO intrusive risk candidates (NO RULE-RISK-01/02)", () => {
    const roadMetadataHighRisk = { ...defaultRoadMetadata, ml_risk_score: 85 };
    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: defaultTelemetry, // speed 40 km/h (within 50 advisory)
      roadMetadata: roadMetadataHighRisk,
      dataQuality: defaultDataQuality,
      advisorySpeedResult: defaultAdvisorySpeed,
      overrides: { segmentDistanceMeters: 200 },
    });

    const riskRule = candidates.find((c) => c.rule_id.startsWith("RULE-RISK"));
    expect(riskRule).toBeUndefined(); // Zero intrusive risk candidates emitted when physical gate is NOT met
  });

  // ------------------------------------------------------------------------
  // TEST C: RiskScore = 85 + speed > advisory + 10 -> RULE-RISK-02 / WARNING
  // ------------------------------------------------------------------------
  it("TEST C: RiskScore 85 with vehicle overspeed emits RULE-RISK-02 (WARNING)", () => {
    const roadMetadataHighRisk = { ...defaultRoadMetadata, ml_risk_score: 85 };
    const telemetryOverspeed = { ...defaultTelemetry, speed_kmh: 65 }; // +15 km/h over 50
    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: telemetryOverspeed,
      roadMetadata: roadMetadataHighRisk,
      dataQuality: defaultDataQuality,
      advisorySpeedResult: defaultAdvisorySpeed,
      overrides: { segmentDistanceMeters: 200 },
    });

    const riskRule = candidates.find((c) => c.rule_id === "RULE-RISK-02");
    expect(riskRule).toBeDefined();
    expect(riskRule.severity).toBe("WARNING");
  });

  // ------------------------------------------------------------------------
  // TEST D: RiskScore = 85 + sharp turn within physical gate -> RULE-RISK-02 / WARNING
  // ------------------------------------------------------------------------
  it("TEST D: RiskScore 85 with sharp turn within physical gate emits RULE-RISK-02 (WARNING)", () => {
    const roadMetadataHighRisk = { ...defaultRoadMetadata, ml_risk_score: 85 };
    const turnEvents = [
      {
        event_id: "CURVE_10_12",
        turn_type: "SHARP",
        cumulative_angle_deg: 60,
        curve_length_m: 20,
        radius_m: 35,
        distance_to_hazard_m: 150,
        current_speed_kmh: 40,
        approach_speed_kmh: 40,
        tte_seconds: 3.5,
        severity: "WARNING",
        data_quality: defaultDataQuality,
      },
    ];

    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: defaultTelemetry,
      roadMetadata: roadMetadataHighRisk,
      dataQuality: defaultDataQuality,
      turnEvents,
      advisorySpeedResult: defaultAdvisorySpeed,
      overrides: { segmentDistanceMeters: 200 },
    });

    const riskRule = candidates.find((c) => c.rule_id === "RULE-RISK-02");
    expect(riskRule).toBeDefined();
    expect(riskRule.severity).toBe("WARNING");
  });

  // ------------------------------------------------------------------------
  // TEST E: RiskScore = 20 -> NO risk alert candidate
  // ------------------------------------------------------------------------
  it("TEST E: RiskScore 20 emits NO risk alert candidates", () => {
    const roadMetadataLowRisk = { ...defaultRoadMetadata, ml_risk_score: 20 };
    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: defaultTelemetry,
      roadMetadata: roadMetadataLowRisk,
      dataQuality: defaultDataQuality,
      advisorySpeedResult: defaultAdvisorySpeed,
      overrides: { segmentDistanceMeters: 200 },
    });

    const riskRule = candidates.find((c) => c.rule_id.startsWith("RULE-RISK"));
    expect(riskRule).toBeUndefined();
  });

  // ------------------------------------------------------------------------
  // TEST F: Risk unavailable or stale -> NO risk alert candidate
  // ------------------------------------------------------------------------
  it("TEST F: suppresses risk alert candidates when risk data is unavailable or stale", () => {
    const roadMetadataHighRisk = { ...defaultRoadMetadata, ml_risk_score: 85 };
    const dataQualityStaleRisk = { ...defaultDataQuality, risk: "STALE" };

    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: defaultTelemetry,
      roadMetadata: roadMetadataHighRisk,
      dataQuality: dataQualityStaleRisk,
      advisorySpeedResult: defaultAdvisorySpeed,
    });

    const riskRule = candidates.find((c) => c.rule_id.startsWith("RULE-RISK"));
    expect(riskRule).toBeUndefined();
  });

  it("evaluates adverse weather rule (RULE-WEATHER-01)", () => {
    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: defaultTelemetry,
      roadMetadata: defaultRoadMetadata,
      dataQuality: defaultDataQuality,
      advisorySpeedResult: defaultAdvisorySpeed,
      overrides: { weatherState: "Heavy Rain" },
    });

    const weatherRule = candidates.find((c) => c.rule_id === "RULE-WEATHER-01");
    expect(weatherRule).toBeDefined();
    expect(weatherRule.severity).toBe("CAUTION");
    expect(weatherRule.event_id).toBe("WEATHER_HEAVY_RAIN");
  });

  it("evaluates GPS fix loss (RULE-GPS-02)", () => {
    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: defaultTelemetry,
      roadMetadata: defaultRoadMetadata,
      dataQuality: { ...defaultDataQuality, gps: "UNAVAILABLE" },
      advisorySpeedResult: defaultAdvisorySpeed,
    });

    const gpsRule = candidates.find((c) => c.rule_id === "RULE-GPS-02");
    expect(gpsRule).toBeDefined();
    expect(gpsRule.severity).toBe("WARNING");
  });

  it("evaluates route deviation (RULE-OFFROUTE-01)", () => {
    const candidates = safetyRuleEngine.evaluateRules({
      telemetry: defaultTelemetry,
      roadMetadata: defaultRoadMetadata,
      dataQuality: defaultDataQuality,
      advisorySpeedResult: defaultAdvisorySpeed,
      overrides: { distanceToRouteMeters: 75, sustainedOffRouteDurationMs: 3500 },
    });

    const offRouteRule = candidates.find((c) => c.rule_id === "RULE-OFFROUTE-01");
    expect(offRouteRule).toBeDefined();
    expect(offRouteRule.severity).toBe("WARNING");
  });

  it("ensures 100% deterministic outputs across 1,000 iterations", () => {
    const turnEvents = [
      {
        event_id: "CURVE_2_5",
        turn_type: "SHARP",
        cumulative_angle_deg: 65,
        curve_length_m: 15,
        radius_m: 30,
        distance_to_hazard_m: 150,
        current_speed_kmh: 55,
        approach_speed_kmh: 55,
        tte_seconds: 4.2,
        severity: "WARNING",
        data_quality: defaultDataQuality,
      },
    ];

    const firstRun = safetyRuleEngine.evaluateRules({
      telemetry: defaultTelemetry,
      roadMetadata: defaultRoadMetadata,
      dataQuality: defaultDataQuality,
      turnEvents,
      advisorySpeedResult: defaultAdvisorySpeed,
    });

    for (let i = 0; i < 1000; i++) {
      const run = safetyRuleEngine.evaluateRules({
        telemetry: defaultTelemetry,
        roadMetadata: defaultRoadMetadata,
        dataQuality: defaultDataQuality,
        turnEvents,
        advisorySpeedResult: defaultAdvisorySpeed,
      });
      expect(run).toEqual(firstRun);
    }
  });
});
