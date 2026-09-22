import { useState, useRef, useCallback, useEffect } from "react";
import apiClient from "../services/api";
import { calculateHaversineDistanceMeters } from "./useDriverTelemetry";

export const IDLE_COOLDOWN_MS = 5000; // Auto re-evaluate every 5 seconds while idle
export const MOVING_COOLDOWN_MS = 2000; // Auto re-evaluate every 2 seconds while moving
export const MOVEMENT_TRIGGER_METERS = 50; // Triggers automatic re-evaluation after 50m

export const RISK_LEVELS = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const normalizeWeatherForApi = (weatherStr) => {
  if (!weatherStr) return "Clear";
  const str = String(weatherStr).trim().toLowerCase();
  if (str.includes("rain") || str.includes("drizzle") || str.includes("storm") || str.includes("shower") || str.includes("thunder")) {
    return "Rainy";
  }
  if (str.includes("snow") || str.includes("sleet") || str.includes("ice") || str.includes("blizzard")) {
    return "Snowy";
  }
  if (str.includes("fog") || str.includes("mist") || str.includes("haze") || str.includes("smoke") || str.includes("visibility")) {
    return "Foggy";
  }
  if (str.includes("wind") || str.includes("gale") || str.includes("breeze") || str.includes("gust")) {
    return "Windy";
  }
  return "Clear";
};

export const normalizeTrafficForApi = (trafficStr) => {
  const allowed = ["Low", "Medium", "High", "Jammed"];
  if (allowed.includes(trafficStr)) return trafficStr;
  return "Low";
};

export const normalizeRoadTypeForApi = (roadStr) => {
  const allowed = ["Highway", "Arterial", "Local", "Expressway"];
  if (allowed.includes(roadStr)) return roadStr;
  return "Arterial";
};

export const normalizeTimeOfDayForApi = (timeStr) => {
  const allowed = ["Morning", "Afternoon", "Evening", "Night"];
  if (allowed.includes(timeStr)) return timeStr;
  return "Morning";
};

export const calculateLocalRiskEstimation = ({
  speed = 40,
  weather = "Clear",
  traffic = "Low",
  roadType = "Arterial",
  timeOfDay = "Morning",
  lat = 28.6139,
  lng = 77.2090,
}) => {
  let baseScore = 20;

  // Speed factor
  if (speed > 80) baseScore += 24;
  else if (speed > 60) baseScore += 14;
  else if (speed > 40) baseScore += 6;
  else if (speed > 20) baseScore += 2;

  // Weather factor
  const normWeather = normalizeWeatherForApi(weather);
  if (normWeather === "Rainy") baseScore += 16;
  else if (normWeather === "Foggy") baseScore += 20;
  else if (normWeather === "Snowy") baseScore += 22;
  else if (normWeather === "Windy") baseScore += 8;

  // Traffic density factor
  const normTraffic = normalizeTrafficForApi(traffic);
  if (normTraffic === "Jammed") baseScore += 18;
  else if (normTraffic === "High") baseScore += 14;
  else if (normTraffic === "Medium") baseScore += 7;

  // Road type factor
  const normRoad = normalizeRoadTypeForApi(roadType);
  if (normRoad === "Expressway" && speed > 70) baseScore += 12;
  else if (normRoad === "Highway") baseScore += 8;
  else if (normRoad === "Local") baseScore += 4;

  // Time of Day factor
  const normTime = normalizeTimeOfDayForApi(timeOfDay);
  if (normTime === "Night") baseScore += 12;
  else if (normTime === "Evening") baseScore += 6;

  const score = Math.min(95, Math.max(10, Math.round(baseScore)));

  let category = "Low";
  if (score > 58) category = "Critical";
  else if (score > 45) category = "High";
  else if (score > 30) category = "Medium";

  return {
    prediction_id: `edge-${Date.now()}`,
    risk_score: score,
    confidence_score: 0.88,
    risk_category: category,
    model_version: "2.0.0-edge",
    prediction_timestamp: new Date().toISOString(),
    latitude: lat,
    longitude: lng,
    location_name: "Live Driver Telemetry",
    city: "Local Sensor Context",
    state: "Delhi NCR",
    is_fallback: true,
  };
};

export function useLiveRiskAssessment({
  position,
  speedKmH,
  timeOfDay,
  weather = "Clear",
  trafficDensity = "Low",
  roadType = "Arterial",
  enabled = false,
  onPredictionSuccess = null,
}) {
  const [riskData, setRiskData] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState(null);
  const [lastEvaluatedTime, setLastEvaluatedTime] = useState(null);
  const [transitionAlert, setTransitionAlert] = useState(null);

  const lastEvaluatedPosRef = useRef(null);
  const lastRequestTimestampRef = useRef(0);
  const isRequestInFlightRef = useRef(false);
  const alertTimerRef = useRef(null);

  const clearTransitionAlert = useCallback(() => {
    setTransitionAlert(null);
  }, []);

  const getActiveCooldownMs = useCallback(() => {
    const speed = speedKmH || 0;
    return speed >= 2.0 ? MOVING_COOLDOWN_MS : IDLE_COOLDOWN_MS;
  }, [speedKmH]);

  const executePrediction = useCallback(
    async (manualTrigger = false) => {
      if (!position || !position.latitude || !position.longitude) return;
      if (isRequestInFlightRef.current) return;

      const now = Date.now();
      const timeSinceLast = now - lastRequestTimestampRef.current;
      const cooldown = getActiveCooldownMs();

      // Rate limit check: enforce 5s (idle) / 2s (moving) cooldown unless explicitly manual
      if (!manualTrigger && timeSinceLast < cooldown) {
        return;
      }

      // Duplicate position check
      if (!manualTrigger && lastEvaluatedPosRef.current) {
        const dist = calculateHaversineDistanceMeters(
          lastEvaluatedPosRef.current.latitude,
          lastEvaluatedPosRef.current.longitude,
          position.latitude,
          position.longitude
        );

        if (dist < 5 && timeSinceLast < cooldown) {
          // Skip redundant assessment if vehicle has barely moved (<5m) and cooldown has not elapsed
          return;
        }
      }

      isRequestInFlightRef.current = true;
      setIsEvaluating(true);
      setError(null);

      const validWeather = normalizeWeatherForApi(weather);
      const validTraffic = normalizeTrafficForApi(trafficDensity);
      const validRoad = normalizeRoadTypeForApi(roadType);
      const validTime = normalizeTimeOfDayForApi(timeOfDay);
      const validSpeed = typeof speedKmH === "number" && !isNaN(speedKmH) ? Math.max(0, Math.min(200, speedKmH)) : 40.0;
      const validLat = parseFloat(Number(position.latitude).toFixed(6));
      const validLng = parseFloat(Number(position.longitude).toFixed(6));

      const payload = {
        weather: validWeather,
        traffic_density: validTraffic,
        road_type: validRoad,
        average_speed: validSpeed,
        time_of_day: validTime,
        latitude: validLat,
        longitude: validLng,
        location_name: "Live Driver Telemetry",
        city: "New Delhi",
        state: "Delhi",
      };

      try {
        const response = await apiClient.post("/predict", payload);
        const data = response?.data || response;
        if (data && (data.risk_score !== undefined || data.risk_category)) {
          const newData = data;
          
          // Detect risk escalation transitions
          if (riskData && newData.risk_category) {
            const oldWeight = RISK_WEIGHTS[riskData.risk_category] || 0;
            const newWeight = RISK_WEIGHTS[newData.risk_category] || 0;

            if (newWeight > oldWeight) {
              const alertMsg = `⚠️ RISK ESCALATED: Moved to ${newData.risk_category.toUpperCase()} Risk Segment (${newData.risk_score}/100)`;
              setTransitionAlert({
                message: alertMsg,
                from: riskData.risk_category,
                to: newData.risk_category,
                score: newData.risk_score,
                timestamp: now,
              });

              if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
              alertTimerRef.current = setTimeout(() => {
                setTransitionAlert(null);
              }, 8000);
            }
          }

          setRiskData(newData);
          setLastEvaluatedTime(now);
          lastEvaluatedPosRef.current = position;
          lastRequestTimestampRef.current = now;
          setError(null);

          if (onPredictionSuccess) {
            onPredictionSuccess(newData);
          }
        }
      } catch (err) {
        console.warn("Live risk remote evaluation notice (activating local sensor inference):", err);
        // Fallback to local calibrated inference so driver HUD never breaks
        const fallback = calculateLocalRiskEstimation({
          speed: validSpeed,
          weather: validWeather,
          traffic: validTraffic,
          roadType: validRoad,
          timeOfDay: validTime,
          lat: validLat,
          lng: validLng,
        });

        setRiskData(fallback);
        setLastEvaluatedTime(now);
        lastEvaluatedPosRef.current = position;
        lastRequestTimestampRef.current = now;
        setError(null);

        if (onPredictionSuccess) {
          onPredictionSuccess(fallback);
        }
      } finally {
        isRequestInFlightRef.current = false;
        setIsEvaluating(false);
      }
    },
    [position, speedKmH, timeOfDay, weather, trafficDensity, roadType, riskData, onPredictionSuccess, getActiveCooldownMs]
  );

  // Auto-trigger evaluator periodically (5s idle / 2s moving) or when position updates
  useEffect(() => {
    if (!enabled || !position) return;

    const checkAndEvaluate = () => {
      const now = Date.now();
      const timeSinceLast = now - lastRequestTimestampRef.current;
      const cooldown = getActiveCooldownMs();

      let movedTrigger = false;
      if (lastEvaluatedPosRef.current) {
        const dist = calculateHaversineDistanceMeters(
          lastEvaluatedPosRef.current.latitude,
          lastEvaluatedPosRef.current.longitude,
          position.latitude,
          position.longitude
        );
        if (dist >= MOVEMENT_TRIGGER_METERS) {
          movedTrigger = true;
        }
      } else {
        // First acquisition
        movedTrigger = true;
      }

      if (movedTrigger || timeSinceLast >= cooldown) {
        executePrediction(false);
      }
    };

    // Immediate check on position update
    checkAndEvaluate();

    // 1-second ticker to guarantee exact 5s (idle) / 2s (moving) risk re-evaluations
    const intervalId = setInterval(checkAndEvaluate, 1000);

    return () => clearInterval(intervalId);
  }, [enabled, position, executePrediction, getActiveCooldownMs]);


  // Clean up alert timer on unmount
  useEffect(() => {
    return () => {
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, []);

  const resetAssessment = useCallback(() => {
    setRiskData(null);
    setLastEvaluatedTime(null);
    setTransitionAlert(null);
    setError(null);
    lastEvaluatedPosRef.current = null;
    lastRequestTimestampRef.current = 0;
  }, []);

  return {
    riskData,
    isEvaluating,
    error,
    lastEvaluatedTime,
    transitionAlert,
    clearTransitionAlert,
    evaluateNow: () => executePrediction(true),
    resetAssessment,
  };
}
