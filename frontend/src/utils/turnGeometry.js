/**
 * SafeRoute AI — Real-Time Driver Safety Assistant
 * Phase A: Turn & Route Curvature Geometry Engine
 *
 * Pure, deterministic mathematical utilities for polyline simplification (RDP),
 * local planar projection, 3-point osculating circle curve radius calculation,
 * micro-curve merging, turn classification, and TurnEvent generation.
 */

import { calculateHaversineDistanceMeters, calculateBearingDegrees, calculateTTE } from "./kinematics.js";

/**
 * Projects latitude/longitude coordinates to local planar metric coordinates (x, y) in meters
 * centered around the bounding box centroid.
 *
 * @param {Array<{latitude: number, longitude: number}>} points - Array of lat/lon coordinate objects.
 * @returns {Array<{x: number, y: number, latitude: number, longitude: number, originalIndex: number}>}
 */
export function projectToLocalPlanarMeters(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return [];
  }

  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;

  points.forEach((pt) => {
    if (pt.latitude < minLat) minLat = pt.latitude;
    if (pt.latitude > maxLat) maxLat = pt.latitude;
    if (pt.longitude < minLon) minLon = pt.longitude;
    if (pt.longitude > maxLon) maxLon = pt.longitude;
  });

  const centerLat = (minLat + maxLat) / 2.0;
  const centerLon = (minLon + maxLon) / 2.0;
  const radCenterLat = (centerLat * Math.PI) / 180.0;
  const R_EARTH = 6371000.0;

  return points.map((pt, idx) => {
    const radLat = (pt.latitude * Math.PI) / 180.0;
    const radLon = (pt.longitude * Math.PI) / 180.0;
    const radCenterLon = (centerLon * Math.PI) / 180.0;

    const x = R_EARTH * (radLon - radCenterLon) * Math.cos(radCenterLat);
    const y = R_EARTH * (radLat - radCenterLat);

    return {
      x,
      y,
      latitude: pt.latitude,
      longitude: pt.longitude,
      originalIndex: idx,
    };
  });
}

/**
 * Perpendicular distance in meters from point P to line segment AB.
 */
function perpendicularDistanceMeters(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }

  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));

  const projX = a.x + clampedT * dx;
  const projY = a.y + clampedT * dy;

  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Ramer-Douglas-Peucker (RDP) polyline simplification algorithm.
 * Simplifies 2D planar metric polyline points using perpendicular distance tolerance (epsilon meters).
 *
 * @param {Array<{x: number, y: number}>} points - Planar metric points.
 * @param {number} [epsilon=2.0] - Epsilon distance tolerance in meters.
 * @returns {Array<{x: number, y: number}>} Simplified polyline points.
 */
export function simplifyPolylineRDP(points, epsilon = 2.0) {
  if (!Array.isArray(points) || points.length <= 2) {
    return points || [];
  }

  let maxDist = 0;
  let maxIndex = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const dist = perpendicularDistanceMeters(points[i], points[0], points[end]);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPolylineRDP(points.slice(0, maxIndex + 1), epsilon);
    const right = simplifyPolylineRDP(points.slice(maxIndex), epsilon);
    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [points[0], points[end]];
  }
}

/**
 * Calculates local curve radius R in meters using 3-point osculating circle formula.
 * A, B, C are 2D planar metric points ({x, y}).
 *
 * Radius R = (a * b * c) / (4 * Area)
 *
 * @param {{x: number, y: number}} A - Point 1.
 * @param {{x: number, y: number}} B - Point 2 (Apex).
 * @param {{x: number, y: number}} C - Point 3.
 * @returns {number|null} Curve radius in meters, or `null` if collinear / invalid.
 */
export function calculate3PointRadius(A, B, C) {
  if (!A || !B || !C) return null;

  const a = Math.hypot(B.x - C.x, B.y - C.y);
  const b = Math.hypot(A.x - C.x, A.y - C.y);
  const c = Math.hypot(A.x - B.x, A.y - B.y);

  // Collinear / degenerate check (sides under 1mm)
  if (a < 0.001 || b < 0.001 || c < 0.001) {
    return null;
  }

  const area = 0.5 * Math.abs((B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x));

  // Area near zero (< 1e-5 m^2) indicates straight line / infinite radius
  if (area < 0.00001) {
    return null;
  }

  const radius = (a * b * c) / (4.0 * area);
  return (isFinite(radius) && radius > 0) ? radius : null;
}

/**
 * Classifies turn severity based on cumulative bearing change, approach speed, and TTE.
 *
 * @param {Object} params
 * @param {number} params.cumulativeAngleDeg - Absolute bearing change in degrees.
 * @param {number} params.approachSpeedKmh - Vehicle approach speed in km/h.
 * @param {number|null} params.tteSeconds - Time-To-Event in seconds (or null if low speed).
 * @returns {Object} { turn_type: string, severity: string }
 */
export function classifyTurnSeverity({ cumulativeAngleDeg, approachSpeedKmh, tteSeconds }) {
  const angle = Math.abs(cumulativeAngleDeg || 0);
  const speed = approachSpeedKmh || 0;
  const tte = (tteSeconds !== null && tteSeconds !== undefined) ? tteSeconds : 999.0;

  if (angle < 25.0) {
    return { turn_type: "GENTLE", severity: "CAUTION" }; // Gentle bend (suppressed from alert candidates)
  }

  if (angle < 50.0) {
    const isHighApproach = speed > 60.0 || tte <= 6.0;
    return {
      turn_type: "MODERATE",
      severity: isHighApproach ? "CAUTION" : "CAUTION",
    };
  }

  if (angle < 85.0) {
    const isUrgent = speed > 45.0 || tte <= 4.5;
    return {
      turn_type: "SHARP",
      severity: isUrgent ? "WARNING" : "CAUTION",
    };
  }

  // Hairpin / Junction Turn (angle >= 85.0)
  const isCritical = speed > 35.0 || tte <= 3.5;
  return {
    turn_type: "HAIRPIN",
    severity: isCritical ? "CRITICAL DRIVER WARNING" : "WARNING",
  };
}

/**
 * Merges consecutive micro-curves spaced closer than maxGapMeters (default 25m)
 * to prevent polyline fragmentation and duplicate curve warnings.
 *
 * @param {Array<Object>} rawCurves - Array of preliminary curve objects.
 * @param {number} [maxGapMeters=25.0] - Maximum gap in meters to trigger merge.
 * @returns {Array<Object>} Merged curve array.
 */
export function mergeMicroCurves(rawCurves, maxGapMeters = 25.0) {
  if (!Array.isArray(rawCurves) || rawCurves.length <= 1) {
    return rawCurves || [];
  }

  const merged = [];
  let current = { ...rawCurves[0] };

  for (let i = 1; i < rawCurves.length; i++) {
    const next = rawCurves[i];
    const gap = next.distance_to_hazard_m - current.distance_to_hazard_m;

    if (Math.abs(gap) <= maxGapMeters) {
      // Merge curves
      current.cumulative_angle_deg = Math.round((current.cumulative_angle_deg + next.cumulative_angle_deg) * 10) / 10;
      current.curve_length_m = Math.round((current.curve_length_m + next.curve_length_m + Math.abs(gap)) * 10) / 10;
      current.radius_m = (current.radius_m && next.radius_m) ? Math.min(current.radius_m, next.radius_m) : (current.radius_m || next.radius_m);
      current.end_node_idx = next.end_node_idx;
      current.event_id = `CURVE_${current.start_node_idx}_${current.end_node_idx}`;

      // Re-classify severity for merged curve
      const reClassified = classifyTurnSeverity({
        cumulativeAngleDeg: current.cumulative_angle_deg,
        approachSpeedKmh: current.approach_speed_kmh,
        tteSeconds: current.tte_seconds,
      });
      current.turn_type = reClassified.turn_type;
      current.severity = reClassified.severity;
    } else {
      merged.push(current);
      current = { ...next };
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Preprocesses route polyline, detects upcoming turns, and returns TurnEvent[] objects.
 * 100% deterministic (uses composite node indices for event_id, zero randomness).
 *
 * @param {Object} params
 * @param {Array<{latitude: number, longitude: number}>} params.routePolyline - Array of polyline coordinate objects.
 * @param {Object} params.telemetry - TelemetryInput snapshot.
 * @param {Object} params.dataQuality - DataQualityState.
 * @returns {Array<Object>} TurnEvent[] array.
 */
export function extractTurnEvents({ routePolyline, telemetry, dataQuality }) {
  if (!Array.isArray(routePolyline) || routePolyline.length < 3 || !telemetry) {
    return [];
  }

  // 1. Convert to local planar metric coordinates
  const planarPoints = projectToLocalPlanarMeters(routePolyline);
  if (planarPoints.length < 3) return [];

  // 2. RDP Polyline Simplification (epsilon = 2.0 meters)
  const simplified = simplifyPolylineRDP(planarPoints, 2.0);
  if (simplified.length < 3) return [];

  const rawCurves = [];
  const currentLat = telemetry.latitude;
  const currentLon = telemetry.longitude;
  const currentSpeed = telemetry.speed_kmh || 0;

  // 3. Bearing & Osculating Circle Curvature Analysis
  for (let i = 1; i < simplified.length - 1; i++) {
    const prev = simplified[i - 1];
    const curr = simplified[i];
    const next = simplified[i + 1];

    const bearing1 = calculateBearingDegrees(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    const bearing2 = calculateBearingDegrees(curr.latitude, curr.longitude, next.latitude, next.longitude);

    let diff = Math.abs(bearing2 - bearing1);
    if (diff > 180.0) diff = 360.0 - diff;

    // Filter bends under 25 degrees (gentle bends)
    if (diff < 25.0) continue;

    const radiusMeters = calculate3PointRadius(prev, curr, next);
    const distFromVehicle = calculateHaversineDistanceMeters(currentLat, currentLon, curr.latitude, curr.longitude);
    const tte = calculateTTE(distFromVehicle, currentSpeed);
    const curveLen = calculateHaversineDistanceMeters(prev.latitude, prev.longitude, next.latitude, next.longitude);

    const classification = classifyTurnSeverity({
      cumulativeAngleDeg: diff,
      approachSpeedKmh: currentSpeed,
      tteSeconds: tte,
    });

    const startIdx = prev.originalIndex;
    const endIdx = next.originalIndex;
    const eventId = `CURVE_${startIdx}_${endIdx}`;

    rawCurves.push({
      event_id: eventId,
      turn_type: classification.turn_type,
      cumulative_angle_deg: Math.round(diff * 10) / 10,
      curve_length_m: Math.round(curveLen * 10) / 10,
      radius_m: radiusMeters ? Math.round(radiusMeters * 10) / 10 : null,
      distance_to_hazard_m: Math.round(distFromVehicle * 10) / 10,
      current_speed_kmh: Math.round(currentSpeed),
      approach_speed_kmh: Math.round(currentSpeed),
      tte_seconds: tte,
      severity: classification.severity,
      data_quality: dataQuality || { gps: "VALID", route: "VALID", weather: "VALID", risk: "VALID" },
      start_node_idx: startIdx,
      end_node_idx: endIdx,
    });
  }

  // 4. Micro-Curve Merging
  const mergedCurves = mergeMicroCurves(rawCurves, 25.0);

  // Return clean TurnEvent objects (excluding raw node index helpers)
  return mergedCurves.map(({ start_node_idx, end_node_idx, ...turnEvent }) => turnEvent);
}
