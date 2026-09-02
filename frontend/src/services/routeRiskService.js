import apiClient from "./api";

// Centralized Design System Risk Palette
export const RISK_COLORS = {
  LOW: "#10B981",       // Emerald Green (0-25)
  MEDIUM: "#F59E0B",    // Amber Yellow (26-50)
  HIGH: "#F97316",      // Orange (51-75)
  CRITICAL: "#EF4444",  // Red (76-100)
  UNAVAILABLE: "#64748B", // Slate Gray (Risk evaluation missing/failed)
};

export const RISK_CATEGORIES = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
  UNAVAILABLE: "Unavailable",
};

/**
 * Maps a numeric risk score (0-100) to its authoritative category name and hex color.
 */
export function getRiskCategoryAndColor(score) {
  if (score === null || score === undefined || isNaN(score)) {
    return {
      category: RISK_CATEGORIES.UNAVAILABLE,
      color: RISK_COLORS.UNAVAILABLE,
      label: "Risk Unavailable",
      badgeClass: "bg-slate-800 text-slate-400 border-slate-700",
    };
  }

  const numericScore = Number(score);
  if (numericScore <= 25) {
    return {
      category: RISK_CATEGORIES.LOW,
      color: RISK_COLORS.LOW,
      label: "Low Risk",
      badgeClass: "bg-emerald-950/80 text-emerald-400 border-emerald-800",
    };
  }
  if (numericScore <= 50) {
    return {
      category: RISK_CATEGORIES.MEDIUM,
      color: RISK_COLORS.MEDIUM,
      label: "Medium Risk",
      badgeClass: "bg-amber-950/80 text-amber-400 border-amber-800",
    };
  }
  if (numericScore <= 75) {
    return {
      category: RISK_CATEGORIES.HIGH,
      color: RISK_COLORS.HIGH,
      label: "High Risk",
      badgeClass: "bg-orange-950/80 text-orange-400 border-orange-800",
    };
  }
  return {
    category: RISK_CATEGORIES.CRITICAL,
    color: RISK_COLORS.CRITICAL,
    label: "Critical Risk",
    badgeClass: "bg-red-950/80 text-red-400 border-red-800",
  };
}

/**
 * Calculates distance-weighted route risk and aggregated risk metrics.
 * 
 * Formula: Weighted Risk = Σ(segment_risk * segment_length) / Σ(evaluated_segment_lengths)
 */
export function calculateDistanceWeightedRouteRisk(mergedSegments) {
  if (!mergedSegments || mergedSegments.length === 0) {
    return {
      weightedRiskScore: null,
      overallCategory: RISK_CATEGORIES.UNAVAILABLE,
      highestSegmentRisk: 0,
      highRiskCount: 0,
      criticalRiskCount: 0,
      evaluatedDistanceM: 0,
      totalDistanceM: 0,
    };
  }

  let weightedScoreSum = 0;
  let evaluatedLengthSum = 0;
  let totalLengthSum = 0;
  let maxRisk = 0;
  let highCount = 0;
  let criticalCount = 0;

  for (const seg of mergedSegments) {
    const len = seg.distance_m || 0;
    totalLengthSum += len;

    if (seg.risk_score !== null && seg.risk_score !== undefined && !isNaN(seg.risk_score)) {
      const score = Number(seg.risk_score);
      weightedScoreSum += score * len;
      evaluatedLengthSum += len;

      if (score > maxRisk) {
        maxRisk = score;
      }
      if (score > 50 && score <= 75) {
        highCount++;
      } else if (score > 75) {
        criticalCount++;
      }
    }
  }

  let weightedRiskScore = null;
  if (evaluatedLengthSum > 0) {
    weightedRiskScore = Math.round(weightedScoreSum / evaluatedLengthSum);
  }

  const { category: overallCategory } = getRiskCategoryAndColor(weightedRiskScore);

  return {
    weightedRiskScore,
    overallCategory,
    highestSegmentRisk: maxRisk,
    highRiskCount: highCount,
    criticalRiskCount: criticalCount,
    evaluatedDistanceM: Math.round(evaluatedLengthSum),
    totalDistanceM: Math.round(totalLengthSum),
  };
}

/**
 * Orchestrates full Route Preview + Batch Risk Scoring pipeline:
 * 
 * 1. POST /api/v1/routes/preview (Backend RoutingService -> OSRM -> Segmentation -> Enrichment)
 * 2. POST /api/v1/predict/batch (Vectorized Batch Risk scoring across N segments)
 * 3. Segment ID matching & distance-weighted risk aggregation
 * 4. Partial failure resilience (renders route with slate color for un-evaluated segments if batch fails)
 */
export async function calculateRouteWithRisk({
  origin,
  destination,
  weather = "Rainy",
  traffic_density = "High",
  time_of_day = "Evening",
}) {
  if (!origin || !origin.latitude || !origin.longitude) {
    throw new Error("Invalid origin location coordinates.");
  }
  if (!destination || !destination.latitude || !destination.longitude) {
    throw new Error("Invalid destination location coordinates.");
  }

  // 1. Fetch Route Preview & Segmentation from Backend Routing API
  const routeResponse = await apiClient.post("/routes/preview", {
    origin: {
      latitude: parseFloat(origin.latitude),
      longitude: parseFloat(origin.longitude),
      location_name: origin.location_name || "Origin Location",
    },
    destination: {
      latitude: parseFloat(destination.latitude),
      longitude: parseFloat(destination.longitude),
      location_name: destination.location_name || "Destination Location",
    },
  });

  if (!routeResponse || !routeResponse.success || !routeResponse.data) {
    throw new Error("Failed to calculate route geometry.");
  }

  const routeData = routeResponse.data;
  const segments = routeData.segments || [];

  if (segments.length === 0) {
    throw new Error("No navigable route segments returned.");
  }

  if (segments.length > 250) {
    throw new Error("Route length exceeds maximum 250-segment capacity limit.");
  }

  // 2. Prepare Batch ML Inference Payload using Active Environmental Parameters
  const batchPayload = {
    segments: segments.map((seg) => ({
      segment_id: seg.segment_id,
      weather: weather,
      traffic_density: traffic_density,
      road_type: seg.road_type || "Arterial",
      average_speed: Number(seg.speed_kmh) || 45.0,
      time_of_day: time_of_day,
      latitude: parseFloat(seg.centroid_latitude),
      longitude: parseFloat(seg.centroid_longitude),
      location_name: seg.road_name,
    })),
  };

  // 3. Fire Batch ML Risk Scoring Request (with partial failure resilience)
  let batchPredictionsMap = {};
  let riskEvaluationStatus = "SUCCESS";

  try {
    const batchResponse = await apiClient.post("/predict/batch", batchPayload);
    if (batchResponse && batchResponse.success && batchResponse.data) {
      const preds = batchResponse.data.predictions || [];
      preds.forEach((pred) => {
        batchPredictionsMap[pred.segment_id] = pred;
      });
    } else {
      riskEvaluationStatus = "PARTIAL_FAILURE";
    }
  } catch (err) {
    console.warn("Batch risk prediction error (falling back to partial route rendering):", err);
    riskEvaluationStatus = "PARTIAL_FAILURE";
  }

  // 4. Merge Segment Geometries with Predictions by segment_id (NEVER array index)
  const mergedSegments = segments.map((seg) => {
    const pred = batchPredictionsMap[seg.segment_id];
    let risk_score = null;
    let confidence_score = null;
    let risk_category = RISK_CATEGORIES.UNAVAILABLE;
    let color = RISK_COLORS.UNAVAILABLE;
    let model_version = "Unknown";
    let prediction_timestamp = null;

    if (pred) {
      risk_score = pred.risk_score;
      confidence_score = pred.confidence_score;
      risk_category = pred.risk_category;
      color = getRiskCategoryAndColor(risk_score).color;
      model_version = "1.27.0";
      prediction_timestamp = new Date().toISOString();
    }

    return {
      segment_id: seg.segment_id,
      sequence_index: seg.sequence_index,
      road_name: seg.road_name,
      road_type: seg.road_type,
      distance_m: seg.distance_m,
      duration_s: seg.duration_s,
      centroid_latitude: seg.centroid_latitude,
      centroid_longitude: seg.centroid_longitude,
      geometry: seg.geometry,
      speed_kmh: seg.speed_kmh,
      speed_source: seg.speed_source,
      weather: weather,
      traffic_density: traffic_density,
      time_of_day: time_of_day,
      
      // ML Prediction outputs
      risk_score,
      confidence_score,
      risk_category,
      color,
      model_version,
      prediction_timestamp,
    };
  });

  // 5. Compute Distance-Weighted Route Risk Aggregation
  const summary = calculateDistanceWeightedRouteRisk(mergedSegments);

  return {
    route_id: routeData.route_id,
    total_distance_m: routeData.total_distance_m,
    total_duration_s: routeData.total_duration_s,
    route_geometry: routeData.route_geometry,
    provider_info: routeData.provider_info,
    segments: mergedSegments,
    summary,
    status: riskEvaluationStatus,
  };
}
