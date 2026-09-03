/**
 * Unit Tests for Kinematics Utility Engine (Phase A)
 */

import { describe, it, expect } from "vitest";
import {
  kmhToMs,
  msToKmh,
  calculateHaversineDistanceMeters,
  calculateBearingDegrees,
  calculateTTE,
  resolveBaseSpeed,
  calculateAdvisorySpeed,
} from "../utils/kinematics.js";

describe("Kinematics Utility Engine", () => {
  it("converts km/h to m/s correctly and handles invalid inputs", () => {
    expect(kmhToMs(36)).toBe(10);
    expect(kmhToMs(0)).toBe(0);
    expect(kmhToMs(-10)).toBe(0);
    expect(kmhToMs(null)).toBe(0);
    expect(kmhToMs(undefined)).toBe(0);
    expect(kmhToMs(NaN)).toBe(0);
  });

  it("converts m/s to km/h correctly and handles invalid inputs", () => {
    expect(msToKmh(10)).toBe(36);
    expect(msToKmh(0)).toBe(0);
    expect(msToKmh(-5)).toBe(0);
    expect(msToKmh(null)).toBe(0);
  });

  it("calculates Haversine distance in meters accurately", () => {
    // Connaught Place (28.6315, 77.2167) to India Gate (28.6129, 77.2295) approx 2.4 km
    const dist = calculateHaversineDistanceMeters(28.6315, 77.2167, 28.6129, 77.2295);
    expect(dist).toBeGreaterThan(2000);
    expect(dist).toBeLessThan(3000);
    expect(calculateHaversineDistanceMeters(0, 0, 0, 0)).toBe(0);
    expect(calculateHaversineDistanceMeters(null, 77.2167, 28.6129, 77.2295)).toBe(0);
  });

  it("calculates initial bearing in degrees correctly", () => {
    // Due North
    const bearingNorth = calculateBearingDegrees(28.0, 77.0, 29.0, 77.0);
    expect(Math.round(bearingNorth)).toBe(0);

    // Due East
    const bearingEast = calculateBearingDegrees(0, 0, 0, 1.0);
    expect(Math.round(bearingEast)).toBe(90);
  });

  it("calculates Time-To-Event (TTE) correctly and handles zero/low speed", () => {
    // 100 meters at 36 km/h (10 m/s) -> 10 seconds
    expect(calculateTTE(100, 36)).toBe(10);
    
    // Stationary vehicle (< 1 km/h): return null sentinel to prevent Infinity
    expect(calculateTTE(100, 0)).toBeNull();
    expect(calculateTTE(100, 0.5)).toBeNull();
    expect(calculateTTE(0, 50)).toBe(0);
    expect(calculateTTE(-50, 50)).toBe(0);
  });

  it("resolves base speed correctly with precedence to mapped speed limit", () => {
    // 1. Mapped speed limit takes priority
    const segMapped = { mapped_maxspeed_kmh: 60, taxonomy_baseline_speed_kmh: 50, road_type: "Arterial" };
    const res1 = resolveBaseSpeed(segMapped);
    expect(res1.speed).toBe(60);
    expect(res1.source).toBe("MAPPED_SPEED_LIMIT");
    expect(res1.label).toBe("Mapped Speed Limit");

    // 2. Fallback to taxonomy baseline when maxspeed missing
    const segTaxonomy = { mapped_maxspeed_kmh: null, taxonomy_baseline_speed_kmh: 50, road_type: "Arterial" };
    const res2 = resolveBaseSpeed(segTaxonomy);
    expect(res2.speed).toBe(50);
    expect(res2.source).toBe("ROAD_CLASS_BASELINE");
    expect(res2.label).toBe("Road Class Baseline");

    // 3. Fallback when both missing
    const res3 = resolveBaseSpeed({});
    expect(res3.speed).toBe(30);
    expect(res3.source).toBe("ROAD_CLASS_BASELINE");
    expect(res3.label).toBe("Road Class Baseline");
  });

  it("calculates conservative advisory speed min(base, geom, weather, risk) and bounds curvature", () => {
    // Small curve radius (R = 30m) -> V_geom = sqrt(0.35 * 9.81 * 30) * 3.6 = approx 36.5 km/h
    const adv1 = calculateAdvisorySpeed({
      baseSpeedKmh: 60,
      radiusMeters: 30,
      weatherModifier: null,
      riskModifier: null,
      baseSpeedSource: "MAPPED_SPEED_LIMIT",
      uiLabel: "Mapped Speed Limit",
    });
    expect(adv1.advisory_speed_kmh).toBeLessThan(60);
    expect(adv1.advisory_speed_kmh).toBeGreaterThanOrEqual(20);
    expect(adv1.base_speed_source).toBe("MAPPED_SPEED_LIMIT");

    // Missing modifiers (null) MUST NOT force advisory speed to zero
    const adv2 = calculateAdvisorySpeed({
      baseSpeedKmh: 50,
      radiusMeters: null,
      weatherModifier: null,
      riskModifier: null,
    });
    expect(adv2.advisory_speed_kmh).toBe(50);
    expect(isNaN(adv2.advisory_speed_kmh)).toBe(false);

    // Weather modifier 0.85 on base speed 50 -> 42.5 -> 43 km/h
    const adv3 = calculateAdvisorySpeed({
      baseSpeedKmh: 50,
      radiusMeters: null,
      weatherModifier: 0.85,
      riskModifier: null,
    });
    expect(adv3.advisory_speed_kmh).toBe(43);

    // Geometry speed must NEVER increase base speed (R = 500m -> raw V_geom = approx 149 km/h -> clamped to 110 -> min(50, 110) = 50)
    const adv4 = calculateAdvisorySpeed({
      baseSpeedKmh: 50,
      radiusMeters: 500,
      weatherModifier: null,
      riskModifier: null,
    });
    expect(adv4.advisory_speed_kmh).toBe(50);
  });
});
