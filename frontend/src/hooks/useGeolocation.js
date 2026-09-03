import { useState, useEffect, useRef, useCallback } from "react";

export const GPS_ACCURACY_THRESHOLDS = {
  HIGH: 20,       // <= 20m: High accuracy
  ACCEPTABLE: 50, // 20 - 50m: Acceptable
  DEGRADED: 100,  // 50 - 100m: Degraded
                  // > 100m: Poor
};

export const GPS_STATES = {
  IDLE: "IDLE",
  REQUESTING_PERMISSION: "REQUESTING_PERMISSION",
  ACQUIRING_GPS: "ACQUIRING_GPS",
  ACTIVE: "ACTIVE",
  DEGRADED: "DEGRADED",
  STOPPED: "STOPPED",
  ERROR: "ERROR",
};

export const getAccuracyLabel = (accuracy) => {
  if (accuracy === null || accuracy === undefined) return { label: "Unknown", color: "text-slate-400", level: "unknown" };
  if (accuracy <= GPS_ACCURACY_THRESHOLDS.HIGH) return { label: "High Accuracy", color: "text-emerald-400", level: "high" };
  if (accuracy <= GPS_ACCURACY_THRESHOLDS.ACCEPTABLE) return { label: "Acceptable", color: "text-blue-400", level: "acceptable" };
  if (accuracy <= GPS_ACCURACY_THRESHOLDS.DEGRADED) return { label: "Degraded", color: "text-amber-400", level: "degraded" };
  return { label: "Poor Accuracy", color: "text-red-400", level: "poor" };
};



export function useGeolocation() {
  const [status, setStatus] = useState(GPS_STATES.IDLE);
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const watchIdRef = useRef(null);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatus(GPS_STATES.STOPPED);
    setPosition(null);
    setError(null);
  }, []);

  const getCurrentLocation = useCallback((options = {}) => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by your browser.");
        resolve({ latitude: 28.6315, longitude: 77.2167, accuracy: 50, isFallback: true });
        return;
      }

      const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 10000,
        ...options,
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            isFallback: false,
          };
          setPosition(coords);
          setError(null);
          resolve(coords);
        },
        (err) => {
          // If high-accuracy times out, retry with low accuracy before fallback
          console.warn("GPS high-accuracy query failed/timed out, retrying with standard accuracy:", err.message);
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => {
              const coords = {
                latitude: fallbackPos.coords.latitude,
                longitude: fallbackPos.coords.longitude,
                accuracy: fallbackPos.coords.accuracy,
                isFallback: false,
              };
              setPosition(coords);
              setError(null);
              resolve(coords);
            },
            (fallbackErr) => {
              console.warn("GPS standard accuracy query failed, returning fallback Delhi location:", fallbackErr.message);
              // Fallback to Connaught Place, New Delhi if browser/device lacks GPS or denies permission
              const fallbackCoords = {
                latitude: 28.6315,
                longitude: 77.2167,
                accuracy: 100,
                isFallback: true,
                errorReason: fallbackErr.message,
              };
              setPosition(fallbackCoords);
              setError("Using default location (GPS permission denied or unavailable).");
              resolve(fallbackCoords);
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
          );
        },
        defaultOptions
      );
    });
  }, []);

  const startTracking = useCallback((options = {}) => {
    if (!navigator.geolocation) {
      setStatus(GPS_STATES.ERROR);
      setError("Geolocation is not supported by your browser.");
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setStatus(GPS_STATES.REQUESTING_PERMISSION);
    setError(null);

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 2000,
      ...options,
    };

    try {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp || Date.now(),
          };

          setPosition(coords);
          setError(null);

          if (coords.accuracy > GPS_ACCURACY_THRESHOLDS.DEGRADED) {
            setStatus(GPS_STATES.DEGRADED);
          } else {
            setStatus(GPS_STATES.ACTIVE);
          }
        },
        (err) => {
          let errorMessage = "An unknown GPS error occurred.";
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = "GPS Permission denied. Please grant location access to enable Live Driver Mode.";
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = "GPS Position unavailable. Ensure your location hardware is active.";
              break;
            case err.TIMEOUT:
              errorMessage = "GPS signal request timed out. Retrying acquiring location...";
              break;
            default:
              errorMessage = err.message || errorMessage;
              break;
          }
          setStatus(GPS_STATES.ERROR);
          setError(errorMessage);
        },
        defaultOptions
      );

      watchIdRef.current = id;
      setStatus(GPS_STATES.ACQUIRING_GPS);
    } catch (err) {
      setStatus(GPS_STATES.ERROR);
      setError(err.message || "Failed to start GPS tracking.");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return {
    status,
    position,
    error,
    accuracyLabel: getAccuracyLabel(position?.accuracy),
    getCurrentLocation,
    startTracking,
    stopTracking,
    isAcquiringLocation: status === GPS_STATES.REQUESTING_PERMISSION || status === GPS_STATES.ACQUIRING_GPS,
    isTracking: status === GPS_STATES.ACTIVE || status === GPS_STATES.DEGRADED || status === GPS_STATES.ACQUIRING_GPS,
  };
}
