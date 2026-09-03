/**
 * SafeRoute AI — Real-Time Driver Safety Assistant
 * Phase B: Driver HUD Overlay Component Unit Test Suite
 */

import React from "react";
import { describe, it, expect } from "vitest";
import DriverHUDOverlay from "../components/DriverHUDOverlay.jsx";

describe("Phase B: DriverHUDOverlay Visual Component", () => {
  const defaultAdvisory = {
    advisory_speed_kmh: 50,
    base_speed_kmh: 50,
    base_speed_source: "MAPPED_SPEED_LIMIT",
    ui_label: "Mapped Speed Limit",
  };

  it("21. Returns null when isLiveDriverMode is false", () => {
    const element = DriverHUDOverlay({ isLiveDriverMode: false });
    expect(element).toBeNull();
  });

  it("22. Returns React element structure when isLiveDriverMode is true", () => {
    const element = DriverHUDOverlay({
      isLiveDriverMode: true,
      currentSpeedKmh: 40,
      advisorySpeedResult: defaultAdvisory,
    });
    expect(element).not.toBeNull();
    expect(typeof element).toBe("object");
    expect(element.type).toBe("div");
  });

  it("23. Correctly processes CAUTION primary alert props", () => {
    const alert = {
      rule_id: "RULE-OVERSPEED-01",
      rule_name: "Moderate Overspeed",
      severity: "CAUTION",
      default_text: "Moderate overspeed. Recommended speed: 50 km/h.",
      distance_m: 0,
      tte_s: null,
    };

    const element = DriverHUDOverlay({
      isLiveDriverMode: true,
      activePrimaryAlert: alert,
      currentSpeedKmh: 62,
      advisorySpeedResult: defaultAdvisory,
    });

    expect(element).not.toBeNull();
    const topArea = element.props.children[0]; // Top banner container
    expect(topArea).toBeDefined();
  });

  it("24. Correctly processes WARNING primary alert props", () => {
    const alert = {
      rule_id: "RULE-CURVE-02",
      rule_name: "Severe Curve",
      severity: "WARNING",
      default_text: "Sharp turn ahead in 180 m. Slow down.",
      distance_m: 180,
      tte_s: 3.6,
    };

    const element = DriverHUDOverlay({
      isLiveDriverMode: true,
      activePrimaryAlert: alert,
      currentSpeedKmh: 50,
      advisorySpeedResult: defaultAdvisory,
    });

    expect(element).not.toBeNull();
    const banner = element.props.children[0].props.children;
    expect(banner.props.role).toBe("alert");
  });

  it("25. Correctly processes CRITICAL DRIVER WARNING primary alert props", () => {
    const alert = {
      rule_id: "RULE-CURVE-03",
      rule_name: "Hairpin / Sharp Turn",
      severity: "CRITICAL DRIVER WARNING",
      default_text: "Caution: Hairpin turn ahead in 120 m.",
      distance_m: 120,
      tte_s: 2.4,
    };

    const element = DriverHUDOverlay({
      isLiveDriverMode: true,
      activePrimaryAlert: alert,
      currentSpeedKmh: 65,
      advisorySpeedResult: defaultAdvisory,
    });

    expect(element).not.toBeNull();
    const banner = element.props.children[0].props.children;
    expect(banner.props.role).toBe("alert");
    expect(banner.props.className).toContain("bg-red-950");
  });

  it("26. Correctly processes ML Risk Score props", () => {
    const element = DriverHUDOverlay({
      isLiveDriverMode: true,
      mlRiskScore: 85,
      advisorySpeedResult: defaultAdvisory,
    });

    expect(element).not.toBeNull();
    const bottomBar = element.props.children[1];
    expect(bottomBar).toBeDefined();
  });

  it("27. Correctly processes Next Hazard preview props", () => {
    const nextHazard = {
      turn_type: "SHARP",
      distance_to_hazard_m: 250,
    };

    const element = DriverHUDOverlay({
      isLiveDriverMode: true,
      nextHazard,
      advisorySpeedResult: defaultAdvisory,
    });

    expect(element).not.toBeNull();
    const bottomBar = element.props.children[1];
    expect(bottomBar.props.children[2]).toBeDefined(); // Next hazard card
  });

  it("28. Correctly processes degraded GPS quality state props", () => {
    const element = DriverHUDOverlay({
      isLiveDriverMode: true,
      dataQuality: { gps: "DEGRADED", route: "VALID", weather: "VALID", risk: "VALID" },
    });

    expect(element).not.toBeNull();
  });
});
