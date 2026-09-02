import React, { createContext, useContext, useState, useCallback } from "react";
import { calculateRouteWithRisk } from "../services/routeRiskService";

const RouteContext = createContext(null);

export const ROUTE_STATUS = {
  IDLE: "IDLE",
  LOADING: "LOADING",
  SUCCESS: "SUCCESS",
  PARTIAL_SUCCESS: "PARTIAL_SUCCESS",
  ERROR: "ERROR",
};

export const SELECTION_MODE = {
  NONE: "none",
  ORIGIN: "origin",
  DESTINATION: "destination",
};

export function RouteProvider({ children }) {
  const [routeStatus, setRouteStatus] = useState(ROUTE_STATUS.IDLE);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeRiskResult, setRouteRiskResult] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [selectionMode, setSelectionMode] = useState(SELECTION_MODE.NONE);

  const resetRoute = useCallback(() => {
    setRouteStatus(ROUTE_STATUS.IDLE);
    setRouteRiskResult(null);
    setSelectedSegment(null);
    setRouteError(null);
    setSelectionMode(SELECTION_MODE.NONE);
  }, []);

  const calculateRoute = useCallback(async (options = {}) => {
    let origToUse = origin;
    let destToUse = destination;
    let weather = "Rainy";
    let traffic_density = "High";
    let time_of_day = "Evening";

    if (options) {
      if (options.origin) origToUse = options.origin;
      if (options.destination) destToUse = options.destination;
      if (options.weather) weather = options.weather;
      if (options.traffic_density) traffic_density = options.traffic_density;
      if (options.time_of_day) time_of_day = options.time_of_day;
    }

    if (!origToUse || !origToUse.latitude || !origToUse.longitude) {
      setRouteError("Please select a valid origin location.");
      setRouteStatus(ROUTE_STATUS.ERROR);
      return null;
    }
    if (!destToUse || !destToUse.latitude || !destToUse.longitude) {
      setRouteError("Please select a valid destination location.");
      setRouteStatus(ROUTE_STATUS.ERROR);
      return null;
    }

    setRouteStatus(ROUTE_STATUS.LOADING);
    setRouteError(null);
    setSelectedSegment(null);

    try {
      const result = await calculateRouteWithRisk({
        origin: origToUse,
        destination: destToUse,
        weather,
        traffic_density,
        time_of_day,
      });

      setRouteRiskResult(result);
      if (result.status === "PARTIAL_FAILURE") {
        setRouteStatus(ROUTE_STATUS.PARTIAL_SUCCESS);
      } else {
        setRouteStatus(ROUTE_STATUS.SUCCESS);
      }
      return result;
    } catch (err) {
      console.error("Route risk calculation failed:", err);
      const msg = err.message || "Failed to calculate route and risk profile.";
      setRouteError(msg);
      setRouteStatus(ROUTE_STATUS.ERROR);
      return null;
    }
  }, [origin, destination]);

  const value = {
    routeStatus,
    origin,
    destination,
    routeRiskResult,
    selectedSegment,
    routeError,
    selectionMode,
    setOrigin,
    setDestination,
    setSelectionMode,
    calculateRoute,
    resetRoute,
    selectSegment: setSelectedSegment,
  };

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

export function useRoute() {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error("useRoute must be used within a RouteProvider");
  }
  return context;
}
