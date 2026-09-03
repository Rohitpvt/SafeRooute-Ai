/**
 * Unit Tests for Turn & Route Curvature Geometry Engine (Phase A)
 */

import { describe, it, expect } from "vitest";
import {
  projectToLocalPlanarMeters,
  simplifyPolylineRDP,
  calculate3PointRadius,
  classifyTurnSeverity,
  mergeMicroCurves,
  extractTurnEvents,
} from "../utils/turnGeometry.js";

describe("Turn & Curvature Geometry Engine", () => {
  it("projects lat/lon coordinates to local metric planar (x, y) meters", () => {
    const points = [
      { latitude: 28.6315, longitude: 77.2167 },
      { latitude: 28.6325, longitude: 77.2177 },
    ];
    const planar = projectToLocalPlanarMeters(points);
    expect(planar.length).toBe(2);
    expect(typeof planar[0].x).toBe("number");
    expect(typeof planar[0].y).toBe("number");
    expect(planar[0].originalIndex).toBe(0);
  });

  it("simplifies polyline using RDP algorithm with epsilon tolerance", () => {
    // 3 collinear points (middle point lies exactly on segment between 0 and 2)
    const points = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
    ];
    const simplified = simplifyPolylineRDP(points, 2.0);
    expect(simplified.length).toBe(2);
    expect(simplified[0].x).toBe(0);
    expect(simplified[1].x).toBe(10);
  });

  it("calculates 3-point osculating circle radius correctly and handles collinear points", () => {
    // 3 points forming a right triangle with known circumradius
    const A = { x: 0, y: 0 };
    const B = { x: 0, y: 30 };
    const C = { x: 40, y: 0 };
    const radius = calculate3PointRadius(A, B, C);
    expect(radius).toBe(25); // Hypotenuse = 50, circumradius = 25

    // Collinear points -> return null (infinite radius / straight line)
    const P1 = { x: 0, y: 0 };
    const P2 = { x: 5, y: 0 };
    const P3 = { x: 10, y: 0 };
    expect(calculate3PointRadius(P1, P2, P3)).toBeNull();
  });

  it("classifies turn severity correctly based on cumulative angle, approach speed, and TTE", () => {
    // Gentle bend (< 25 deg) -> GENTLE
    const c1 = classifyTurnSeverity({ cumulativeAngleDeg: 15, approachSpeedKmh: 50, tteSeconds: 5 });
    expect(c1.turn_type).toBe("GENTLE");

    // Moderate turn (35 deg) -> MODERATE
    const c2 = classifyTurnSeverity({ cumulativeAngleDeg: 35, approachSpeedKmh: 50, tteSeconds: 5 });
    expect(c2.turn_type).toBe("MODERATE");

    // Sharp turn (65 deg) -> SHARP / WARNING
    const c3 = classifyTurnSeverity({ cumulativeAngleDeg: 65, approachSpeedKmh: 50, tteSeconds: 4 });
    expect(c3.turn_type).toBe("SHARP");
    expect(c3.severity).toBe("WARNING");

    // Hairpin turn (90 deg) at high speed -> HAIRPIN / CRITICAL DRIVER WARNING
    const c4 = classifyTurnSeverity({ cumulativeAngleDeg: 90, approachSpeedKmh: 45, tteSeconds: 3 });
    expect(c4.turn_type).toBe("HAIRPIN");
    expect(c4.severity).toBe("CRITICAL DRIVER WARNING");
  });

  it("merges consecutive micro-curves spaced closer than maxGapMeters (25m)", () => {
    const rawCurves = [
      {
        event_id: "CURVE_1_2",
        cumulative_angle_deg: 30,
        curve_length_m: 10,
        radius_m: 40,
        distance_to_hazard_m: 100,
        start_node_idx: 1,
        end_node_idx: 2,
        approach_speed_kmh: 50,
        tte_seconds: 5,
      },
      {
        event_id: "CURVE_2_3",
        cumulative_angle_deg: 35,
        curve_length_m: 10,
        radius_m: 35,
        distance_to_hazard_m: 115, // Gap = 15m (< 25m threshold)
        start_node_idx: 2,
        end_node_idx: 3,
        approach_speed_kmh: 50,
        tte_seconds: 5,
      },
    ];

    const merged = mergeMicroCurves(rawCurves, 25.0);
    expect(merged.length).toBe(1);
    expect(merged[0].cumulative_angle_deg).toBe(65); // 30 + 35
    expect(merged[0].event_id).toBe("CURVE_1_3");
  });

  it("extracts TurnEvent[] from route polyline deterministically", () => {
    const polyline = [
      { latitude: 28.6315, longitude: 77.2167 },
      { latitude: 28.6315, longitude: 77.2200 }, // East
      { latitude: 28.6350, longitude: 77.2200 }, // North (90 deg turn)
      { latitude: 28.6400, longitude: 77.2200 },
    ];
    const telemetry = { latitude: 28.6315, longitude: 77.2150, speed_kmh: 50, heading_deg: 90, accuracy_m: 5, timestamp_ms: 1000 };
    const dataQuality = { gps: "VALID", route: "VALID", weather: "VALID", risk: "VALID" };

    const events = extractTurnEvents({ routePolyline: polyline, telemetry, dataQuality });
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].turn_type).toBe("HAIRPIN");
    expect(events[0].event_id).toMatch(/^CURVE_\d+_\d+$/); // Deterministic event ID
  });
});
