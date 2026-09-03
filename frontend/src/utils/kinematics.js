/**
 * SafeRoute AI — Real-Time Driver Safety Assistant
 * Phase A: Kinematic Utility Engine
 *
 * Pure, deterministic mathematical utilities for speed conversion, spatial distance,
 * bearing, time-to-event (TTE) calculation, base speed limit resolution, and
 * conservative advisory speed derivation.
 */

/**
 * Converts kilometers per hour (km/h) to meters per second (m/s).
 * @param {number} kmh - Speed in km/h.
 * @returns {number} Speed in m/s.
 */
export function kmhToMs(kmh) {
  if (kmh === null || kmh === undefined || isNaN(kmh) || kmh < 0) {
    return 0;
  }
  return kmh / 3.6;
}

/**
 * Converts meters per second (m/s) to kilometers per hour (km/h).
 * @param {number} ms - Speed in m/s.
 * @returns {number} Speed in km/h.
 */
export function msToKmh(ms) {
  if (ms === null || ms === undefined || isNaN(ms) || ms < 0) {
    return 0;
  }
  return ms * 3.6;
}

/**
 * Calculates Haversine distance in meters between two lat/lon coordinates.
 * @param {number} lat1 - Latitude of origin.
 * @param {number} lon1 - Longitude of origin.
 * @param {number} lat2 - Latitude of destination.
 * @param {number} lon2 - Longitude of destination.
 * @returns {number} Distance in meters.
 */
export function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (
    lat1 === null || lat1 === undefined || isNaN(lat1) ||
    lon1 === null || lon1 === undefined || isNaN(lon1) ||
    lat2 === null || lat2 === undefined || isNaN(lat2) ||
    lon2 === null || lon2 === undefined || isNaN(lon2)
  ) {
    return 0;
  }

  const R = 6371000.0; // Earth radius in meters
  const radLat1 = (lat1 * Math.PI) / 180.0;
  const radLat2 = (lat2 * Math.PI) / 180.0;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180.0;

  const a =
    Math.sin(deltaLat / 2.0) * Math.sin(deltaLat / 2.0) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(deltaLon / 2.0) * Math.sin(deltaLon / 2.0);
  
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1.0 - a)));
  return R * c;
}

/**
 * Calculates initial bearing in degrees (0 - 360) between two lat/lon coordinates.
 * @param {number} lat1 - Origin latitude.
 * @param {number} lon1 - Origin longitude.
 * @param {number} lat2 - Destination latitude.
 * @param {number} lon2 - Destination longitude.
 * @returns {number} Initial bearing in degrees (0 <= bearing < 360).
 */
export function calculateBearingDegrees(lat1, lon1, lat2, lon2) {
  if (
    lat1 === null || lat1 === undefined || isNaN(lat1) ||
    lon1 === null || lon1 === undefined || isNaN(lon1) ||
    lat2 === null || lat2 === undefined || isNaN(lat2) ||
    lon2 === null || lon2 === undefined || isNaN(lon2)
  ) {
    return 0;
  }

  const phi1 = (lat1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;
  const deltaLam = ((lon2 - lon1) * Math.PI) / 180.0;

  const y = Math.sin(deltaLam) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLam);

  let bearing = (Math.atan2(y, x) * 180.0) / Math.PI;
  return (bearing + 360.0) % 360.0;
}

/**
 * Calculates Time-To-Event (TTE) in seconds given distance in meters and ground speed in km/h.
 * Adheres to low-speed trigger policy: returns `null` for stationary or very low speed (< 1 km/h)
 * to prevent returning Infinity.
 *
 * @param {number} distanceMeters - Distance to hazard in meters.
 * @param {number} speedKmh - Current vehicle ground speed in km/h.
 * @returns {number|null} TTE in seconds, or `null` if vehicle is stopped/stationary.
 */
export function calculateTTE(distanceMeters, speedKmh) {
  if (distanceMeters === null || distanceMeters === undefined || isNaN(distanceMeters) || distanceMeters <= 0) {
    return 0;
  }
  
  // Low-speed stationary check (< 1.0 km/h): return null sentinel to prevent Infinity
  if (speedKmh === null || speedKmh === undefined || isNaN(speedKmh) || speedKmh < 1.0) {
    return null;
  }

  const speedMs = speedKmh / 3.6;
  const tte = distanceMeters / speedMs;
  return Math.round(tte * 100) / 100;
}

/**
 * Resolves base speed limit from OpenStreetMap mapped maxspeed or taxonomy fallback.
 * CRITICAL TERMINOLOGY RULE:
 * - If OSM maxspeed is present & valid, source is "MAPPED_SPEED_LIMIT" / "Mapped Speed Limit".
 * - If falling back to taxonomy, source is "ROAD_CLASS_BASELINE" / "Road Class Baseline".
 *
 * @param {Object} segment - Road segment metadata.
 * @returns {Object} { speed: number, source: string, label: string }
 */
export function resolveBaseSpeed(segment) {
  if (!segment || typeof segment !== 'object') {
    return {
      speed: 30.0,
      source: "ROAD_CLASS_BASELINE",
      label: "Road Class Baseline",
    };
  }

  // 1. Check OpenStreetMap mapped maxspeed
  const mapped = Number(segment.mapped_maxspeed_kmh);
  if (!isNaN(mapped) && mapped > 0) {
    return {
      speed: mapped,
      source: "MAPPED_SPEED_LIMIT",
      label: "Mapped Speed Limit",
    };
  }

  // 2. Taxonomy Road Class Baselines
  const taxonomyBaseline = Number(segment.taxonomy_baseline_speed_kmh);
  if (!isNaN(taxonomyBaseline) && taxonomyBaseline > 0) {
    return {
      speed: taxonomyBaseline,
      source: "ROAD_CLASS_BASELINE",
      label: "Road Class Baseline",
    };
  }

  // Fallback map based on road_type string
  const roadTypeMap = {
    Expressway: 90.0,
    Highway: 70.0,
    Arterial: 50.0,
    Local: 30.0,
  };

  const derivedSpeed = roadTypeMap[segment.road_type] || 30.0;
  return {
    speed: derivedSpeed,
    source: "ROAD_CLASS_BASELINE",
    label: "Road Class Baseline",
  };
}

/**
 * Calculates Conservative Advisory Speed (V_advisory) using minimum comparison:
 * V_advisory = min(V_base, V_geom, V_weather, V_risk)
 *
 * Missing or stale modifiers are omitted (evaluated as Infinity in comparison)
 * so that missing data NEVER forces the advisory speed to zero or NaN.
 *
 * @param {Object} params
 * @param {number} params.baseSpeedKmh - Resolved base speed limit.
 * @param {number|null} [params.radiusMeters] - Local curve radius in meters (if any).
 * @param {number|null} [params.weatherModifier] - Weather speed multiplier (0 < M <= 1.0) or null if stale/missing.
 * @param {number|null} [params.riskModifier] - ML risk speed multiplier (0 < M <= 1.0) or null if stale/missing.
 * @returns {Object} AdvisorySpeedResult { advisory_speed_kmh, base_speed_kmh, base_speed_source, active_modifiers, ui_label }
 */
export function calculateAdvisorySpeed({
  baseSpeedKmh,
  radiusMeters = null,
  weatherModifier = null,
  riskModifier = null,
  baseSpeedSource = "ROAD_CLASS_BASELINE",
  uiLabel = "Road Class Baseline",
}) {
  const validBase = (baseSpeedKmh !== null && baseSpeedKmh !== undefined && !isNaN(baseSpeedKmh) && baseSpeedKmh > 0)
    ? Number(baseSpeedKmh)
    : 30.0;

  // 1. Geometry Curvature Speed (V_geom = sqrt(mu * g * R) * 3.6, mu = 0.35, g = 9.81)
  let vGeom = Infinity;
  let activeVGeom = null;

  if (radiusMeters !== null && radiusMeters !== undefined && !isNaN(radiusMeters) && radiusMeters > 0) {
    const rawGeom = Math.sqrt(0.35 * 9.81 * radiusMeters) * 3.6;
    // Bounded to [20.0, 110.0] km/h
    vGeom = Math.max(20.0, Math.min(110.0, rawGeom));
    activeVGeom = Math.round(vGeom * 10) / 10;
  }

  // 2. Weather Modifier Speed (V_weather = V_base * weatherModifier)
  let vWeather = Infinity;
  let activeVWeather = null;
  if (
    weatherModifier !== null &&
    weatherModifier !== undefined &&
    !isNaN(weatherModifier) &&
    weatherModifier > 0 &&
    weatherModifier <= 1.0
  ) {
    vWeather = validBase * Number(weatherModifier);
    activeVWeather = Math.round(vWeather * 10) / 10;
  }

  // 3. ML Risk Modifier Speed (V_risk = V_base * riskModifier)
  let vRisk = Infinity;
  let activeVRisk = null;
  if (
    riskModifier !== null &&
    riskModifier !== undefined &&
    !isNaN(riskModifier) &&
    riskModifier > 0 &&
    riskModifier <= 1.0
  ) {
    vRisk = validBase * Number(riskModifier);
    activeVRisk = Math.round(vRisk * 10) / 10;
  }

  // Calculate overall minimum speed
  const calculatedMin = Math.min(validBase, vGeom, vWeather, vRisk);

  // Invariant Protection: advisory speed must be a finite positive number
  const finalAdvisory = (calculatedMin > 0 && calculatedMin < Infinity)
    ? Math.round(calculatedMin)
    : Math.round(validBase);

  return {
    advisory_speed_kmh: finalAdvisory,
    base_speed_kmh: Math.round(validBase),
    base_speed_source: baseSpeedSource,
    ui_label: uiLabel,
    active_modifiers: {
      geom_limit_kmh: activeVGeom,
      weather_modifier: activeVWeather,
      risk_modifier: activeVRisk,
    },
  };
}
