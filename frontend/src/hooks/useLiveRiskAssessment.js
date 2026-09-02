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

const RISK_WEIGHTS = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
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

        if (dist < 5 && timeSinceLast < cooldown * 2) {
          // Skip redundant assessment if vehicle has barely moved (<5m) and < 2x cooldown elapsed
          return;
        }
      }

      isRequestInFlightRef.current = true;
      setIsEvaluating(true);
      setError(null);

      const payload = {
        weather,
        traffic_density: trafficDensity,
        road_type: roadType,
        average_speed: speedKmH || 45.0,
        time_of_day: timeOfDay,
        latitude: parseFloat(position.latitude.toFixed(6)),
        longitude: parseFloat(position.longitude.toFixed(6)),
        location_name: "Live Driver Telemetry",
        city: "New Delhi",
        state: "Delhi",
      };

      try {
        const response = await apiClient.post("/predict", payload);
        if (response && response.success && response.data) {
          const newData = response.data;
          
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

          if (onPredictionSuccess) {
            onPredictionSuccess(newData);
          }
        }
      } catch (err) {
        console.error("Live risk assessment error:", err);
        const status = err.response?.status;
        const detail = err.response?.data?.detail;
        let msg = "Failed to complete live risk evaluation.";
        if (status) {
          msg = `Risk evaluation failed: HTTP ${status}${detail ? ` — ${typeof detail === "object" ? JSON.stringify(detail) : detail}` : ""}`;
        } else if (err.message) {
          msg = `Risk evaluation failed: ${err.message}`;
        }
        setError(msg);
      } finally {
        isRequestInFlightRef.current = false;
        setIsEvaluating(false);
      }
    },
    [position, speedKmH, timeOfDay, weather, trafficDensity, roadType, riskData, onPredictionSuccess, getActiveCooldownMs]
  );

  // Auto-trigger evaluator when position updates while enabled
  useEffect(() => {
    if (!enabled || !position) return;

    const now = Date.now();
    const timeSinceLast = now - lastRequestTimestampRef.current;
    const cooldown = getActiveCooldownMs();

    // Check movement threshold (>= 50m)
    let moved50m = false;
    if (lastEvaluatedPosRef.current) {
      const dist = calculateHaversineDistanceMeters(
        lastEvaluatedPosRef.current.latitude,
        lastEvaluatedPosRef.current.longitude,
        position.latitude,
        position.longitude
      );
      if (dist >= MOVEMENT_TRIGGER_METERS) {
        moved50m = true;
      }
    } else {
      // First acquisition
      moved50m = true;
    }

    if (moved50m || timeSinceLast >= cooldown) {
      executePrediction(false);
    }
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
