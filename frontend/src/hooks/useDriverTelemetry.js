import { useState, useEffect, useRef } from "react";

// Haversine distance in meters between two lat/lng points
export const calculateHaversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Automatic local Time of Day derivation
export const deriveTimeOfDay = (date = new Date()) => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
};

const SPEED_BOUNDS = { MIN: 0, MAX: 200 }; // km/h
const EMA_ALPHA = 0.35; // Exponential Moving Average smoothing factor

export function useDriverTelemetry(position) {
  const [speedKmH, setSpeedKmH] = useState(0);
  const [smoothedSpeedKmH, setSmoothedSpeedKmH] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState(deriveTimeOfDay());
  const [distanceTraveledMeters, setDistanceTraveledMeters] = useState(0);

  const prevPositionRef = useRef(null);
  const smoothedSpeedRef = useRef(0);

  // Periodic time-of-day update
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeOfDay(deriveTimeOfDay());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Compute telemetry whenever position updates
  useEffect(() => {
    if (!position) {
      prevPositionRef.current = null;
      setSpeedKmH(0);
      setSmoothedSpeedKmH(0);
      return;
    }

    let rawCalculatedSpeedKmH = 0;

    // 1. Direct hardware speed metric if available
    if (typeof position.speed === "number" && !isNaN(position.speed) && position.speed >= 0) {
      rawCalculatedSpeedKmH = position.speed * 3.6; // m/s -> km/h
    } 
    // 2. Haversine delta fallback if hardware speed is null/invalid
    else if (prevPositionRef.current) {
      const prev = prevPositionRef.current;
      const distance = calculateHaversineDistanceMeters(
        prev.latitude,
        prev.longitude,
        position.latitude,
        position.longitude
      );
      const timeDeltaSeconds = (position.timestamp - prev.timestamp) / 1000;

      if (timeDeltaSeconds > 0 && distance >= 0) {
        const speedMS = distance / timeDeltaSeconds;
        rawCalculatedSpeedKmH = speedMS * 3.6;
        setDistanceTraveledMeters((prevTotal) => prevTotal + distance);
      }
    }

    // 3. Sanity check bounds
    if (isNaN(rawCalculatedSpeedKmH) || rawCalculatedSpeedKmH < SPEED_BOUNDS.MIN) {
      rawCalculatedSpeedKmH = 0;
    } else if (rawCalculatedSpeedKmH > SPEED_BOUNDS.MAX) {
      rawCalculatedSpeedKmH = prevPositionRef.current ? smoothedSpeedRef.current : 0; // Reject unrealistic spikes
    }

    const roundedRaw = Math.round(rawCalculatedSpeedKmH);

    // 4. Apply Exponential Moving Average (EMA) smoothing filter
    const prevSmoothed = smoothedSpeedRef.current;
    const nextSmoothed = Math.round(EMA_ALPHA * roundedRaw + (1 - EMA_ALPHA) * prevSmoothed);

    smoothedSpeedRef.current = nextSmoothed;
    setSpeedKmH(roundedRaw);
    setSmoothedSpeedKmH(nextSmoothed);

    prevPositionRef.current = position;
  }, [position]);

  return {
    speedKmH,
    smoothedSpeedKmH,
    timeOfDay,
    distanceTraveledMeters,
    latitude: position?.latitude ? parseFloat(position.latitude.toFixed(6)) : null,
    longitude: position?.longitude ? parseFloat(position.longitude.toFixed(6)) : null,
    accuracy: position?.accuracy ? Math.round(position.accuracy) : null,
  };
}
