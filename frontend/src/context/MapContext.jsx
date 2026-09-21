import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { MAP_CONFIG, getRiskColor } from "../config/mapConfig";

const MapContext = createContext(null);

export const useMap = () => {
  const context = useContext(MapContext);
  if (!context) {
    // Return fallback context if used outside MapProvider (e.g. in standalone Navbar)
    return {
      customApiKey: localStorage.getItem("saferoute_google_maps_key") || "",
      saveCustomApiKey: (key) => {
        if (key) localStorage.setItem("saferoute_google_maps_key", key);
        else localStorage.removeItem("saferoute_google_maps_key");
      },
      isOffline: !navigator.onLine,
    };
  }
  return context;
};

export const MapProvider = ({ children }) => {
  const [mapCenter, setMapCenter] = useState({
    lat: MAP_CONFIG.DEFAULT_CENTER[0],
    lng: MAP_CONFIG.DEFAULT_CENTER[1],
  });
  const [zoom, setZoom] = useState(MAP_CONFIG.DEFAULT_ZOOM);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isTileError, setIsTileError] = useState(false);

  // Heatmap controls
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapRadius, setHeatmapRadius] = useState(25);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.7);

  // Live Driver Telemetry & Map Follow state
  const [liveDriverLocation, setLiveDriverLocation] = useState(null);
  const [isLiveDriverMode, setIsLiveDriverMode] = useState(false);
  const [followDriver, setFollowDriver] = useState(true);

  // Network online/offline event listeners
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Auto-center map when live driver location updates if followDriver is enabled
  useEffect(() => {
    if (isLiveDriverMode && followDriver && liveDriverLocation && liveDriverLocation.lat && liveDriverLocation.lng) {
      setMapCenter({ lat: liveDriverLocation.lat, lng: liveDriverLocation.lng });
    }
  }, [isLiveDriverMode, followDriver, liveDriverLocation]);

  // Centering & Zoom interactions
  const centerOn = useCallback((lat, lng, zoomLevel = 15) => {
    setMapCenter({ lat, lng });
    setZoom(zoomLevel);
  }, []);

  const selectPrediction = useCallback(
    (pred) => {
      setSelectedPrediction(pred);
      if (pred && pred.latitude && pred.longitude) {
        centerOn(pred.latitude, pred.longitude, 15);
      }
    },
    [centerOn]
  );

  const value = {
    mapCenter,
    setMapCenter,
    zoom,
    setZoom,
    selectedPrediction,
    setSelectedPrediction,
    selectPrediction,
    predictions,
    setPredictions,
    isOffline,
    setIsOffline,
    isTileError,
    setIsTileError,
    showHeatmap,
    setShowHeatmap,
    heatmapRadius,
    setHeatmapRadius,
    heatmapOpacity,
    setHeatmapOpacity,
    centerOn,
    getRiskColor,
    liveDriverLocation,
    setLiveDriverLocation,
    isLiveDriverMode,
    setIsLiveDriverMode,
    followDriver,
    setFollowDriver,
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};
