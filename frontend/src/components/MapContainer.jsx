import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.heat";
import { useMap } from "../context/MapContext";
import { useRoute, SELECTION_MODE } from "../context/RouteContext";
import { getRiskColor, getActiveMapProvider } from "../config/mapConfig";
import RouteLegend from "./RouteLegend";
import FallbackMap from "./FallbackMap";

export default function MapContainer() {
  const mapRef = useRef(null);
  const leafletMapInstance = useRef(null);
  const markersRef = useRef({});
  const routePolylinesRef = useRef([]);
  const originMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const heatmapLayerRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const driverAccuracyCircleRef = useRef(null);
  const tileLayerRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);

  const {
    mapCenter,
    zoom,
    predictions,
    selectedPrediction,
    selectPrediction,
    isOffline,
    isTileError,
    setIsTileError,
    showHeatmap,
    heatmapRadius,
    heatmapOpacity,
    liveDriverLocation,
    isLiveDriverMode,
    setFollowDriver,
  } = useMap();

  const {
    origin,
    destination,
    setOrigin,
    setDestination,
    routeRiskResult,
    selectedSegment,
    selectSegment,
    selectionMode,
    setSelectionMode,
  } = useRoute();

  // 1. Initialize Leaflet map instance
  useEffect(() => {
    if (!mapRef.current || leafletMapInstance.current) return;

    try {
      const map = L.map(mapRef.current, {
        center: [mapCenter.lat, mapCenter.lng],
        zoom: zoom,
        zoomControl: true,
      });

      const activeProvider = getActiveMapProvider();

      const tileLayer = L.tileLayer(activeProvider.url, {
        attribution: activeProvider.attribution,
        maxZoom: activeProvider.maxZoom,
        className: activeProvider.className || "",
        subdomains: "abc",
      });

      tileLayer.on("tileerror", () => {
        console.warn("Leaflet tile fetching warning: Map tiles temporarily unavailable.");
        setIsTileError(true);
      });

      tileLayer.on("load", () => {
        setIsTileError(false);
      });

      tileLayer.addTo(map);
      tileLayerRef.current = tileLayer;

      map.on("dragstart", () => {
        if (setFollowDriver) setFollowDriver(false);
      });

      leafletMapInstance.current = map;
      setMapLoaded(true);
    } catch (err) {
      console.error("Failed to initialize Leaflet map:", err);
    }

    return () => {
      if (leafletMapInstance.current) {
        leafletMapInstance.current.remove();
        leafletMapInstance.current = null;
      }
    };
  }, []);

  // Map Click Listener for Pick-on-Map Selection Modes
  useEffect(() => {
    const map = leafletMapInstance.current;
    if (!map || !mapLoaded) return;

    const handleMapClick = (e) => {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));

      if (selectionMode === SELECTION_MODE.ORIGIN) {
        setOrigin({ latitude: lat, longitude: lng, location_name: "Selected Map Origin" });
        setSelectionMode(SELECTION_MODE.NONE);
      } else if (selectionMode === SELECTION_MODE.DESTINATION) {
        setDestination({ latitude: lat, longitude: lng, location_name: "Selected Map Destination" });
        setSelectionMode(SELECTION_MODE.NONE);
      }
    };

    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [selectionMode, setOrigin, setDestination, setSelectionMode, mapLoaded]);

  // Sync Map Center & Zoom
  useEffect(() => {
    const map = leafletMapInstance.current;
    if (!map || !mapCenter || !mapCenter.lat || !mapCenter.lng) return;

    const currentCenter = map.getCenter();
    const dist = Math.hypot(currentCenter.lat - mapCenter.lat, currentCenter.lng - mapCenter.lng);
    if (dist > 0.0001 || map.getZoom() !== zoom) {
      map.setView([mapCenter.lat, mapCenter.lng], zoom, { animate: true });
    }
  }, [mapCenter, zoom]);

  // Render Origin & Destination Markers
  useEffect(() => {
    const map = leafletMapInstance.current;
    if (!map || !mapLoaded) return;

    if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }

    // Origin Marker (Emerald Pin)
    if (origin && origin.latitude && origin.longitude) {
      const originIcon = L.divIcon({
        className: "origin-map-icon",
        html: `
          <div style="
            position: relative; display: flex; align-items: center; justify-content: center;
            width: 28px; height: 28px; background-color: #10B981; border: 2.5px solid white;
            border-radius: 50%; box-shadow: 0 0 12px #10B981; font-weight: bold; color: white; font-size: 11px;
          ">
            A
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([origin.latitude, origin.longitude], { icon: originIcon }).addTo(map);
      marker.bindPopup(`<b>Origin:</b> ${origin.location_name || "Start Location"}`);
      originMarkerRef.current = marker;
    }

    // Destination Marker (Red Pin)
    if (destination && destination.latitude && destination.longitude) {
      const destIcon = L.divIcon({
        className: "dest-map-icon",
        html: `
          <div style="
            position: relative; display: flex; align-items: center; justify-content: center;
            width: 28px; height: 28px; background-color: #EF4444; border: 2.5px solid white;
            border-radius: 50%; box-shadow: 0 0 12px #EF4444; font-weight: bold; color: white; font-size: 11px;
          ">
            B
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([destination.latitude, destination.longitude], { icon: destIcon }).addTo(map);
      marker.bindPopup(`<b>Destination:</b> ${destination.location_name || "End Location"}`);
      destMarkerRef.current = marker;
    }
  }, [origin, destination, mapLoaded]);

  // Render Multi-Segment Risk-Colored Polyline Route
  useEffect(() => {
    const map = leafletMapInstance.current;
    if (!map || !mapLoaded) return;

    // Clear existing route polylines
    routePolylinesRef.current.forEach((line) => line.remove());
    routePolylinesRef.current = [];

    if (!routeRiskResult) return;

    const bounds = L.latLngBounds([]);
    const segments = routeRiskResult.segments || [];

    // Fallback: If segments array is empty but route_geometry is provided
    if (segments.length === 0 && routeRiskResult.route_geometry?.coordinates) {
      const rawCoords = routeRiskResult.route_geometry.coordinates;
      const latLngs = rawCoords.map((coord) => [coord[1], coord[0]]);
      latLngs.forEach((ll) => bounds.extend(ll));

      // Glow / shadow casing
      const casing = L.polyline(latLngs, {
        color: "#0F172A",
        weight: 9,
        opacity: 0.8,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      const polyline = L.polyline(latLngs, {
        color: "#10B981",
        weight: 5,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      routePolylinesRef.current.push(casing, polyline);
    } else {
      segments.forEach((seg) => {
        const rawCoords = seg.geometry?.coordinates || [];
        if (rawCoords.length < 2) return;

        // GeoJSON [lng, lat] -> Leaflet [lat, lng]
        const latLngs = rawCoords.map((coord) => [coord[1], coord[0]]);
        latLngs.forEach((ll) => bounds.extend(ll));

        const isSelected = selectedSegment?.segment_id === seg.segment_id;
        const segColor = seg.color || "#10B981";

        // Underline shadow casing for high visibility over satellite & dark tiles
        const casing = L.polyline(latLngs, {
          color: isSelected ? "#FFFFFF" : "#0A0A0A",
          weight: isSelected ? 10 : 8,
          opacity: isSelected ? 0.9 : 0.7,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        const polyline = L.polyline(latLngs, {
          color: segColor,
          weight: isSelected ? 7 : 5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        const popupContent = `
          <div style="font-family: sans-serif; font-size: 12px; color: #1E293B;">
            <div style="font-weight: bold; margin-bottom: 2px;">${seg.road_name || "Road Segment"}</div>
            <div style="color: #64748B;">Type: <b>${seg.road_type || "Arterial"}</b> | Length: <b>${seg.distance_m || 0}m</b></div>
            <div style="margin-top: 4px;">Risk Score: <b style="color: ${segColor};">${seg.risk_score ?? "Low"}</b> (${seg.risk_category || "Low"})</div>
          </div>
        `;
        polyline.bindPopup(popupContent);

        polyline.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          selectSegment(seg);
        });

        routePolylinesRef.current.push(casing, polyline);
      });
    }

    // Fit map bounds to show complete route geometry
    if (bounds.isValid()) {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [routeRiskResult, selectedSegment, selectSegment, mapLoaded]);

  // Render Prediction Hotspot Markers
  useEffect(() => {
    const map = leafletMapInstance.current;
    if (!map || !mapLoaded) return;

    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    if (!predictions || predictions.length === 0) return;

    predictions.forEach((pred) => {
      if (!pred.latitude || !pred.longitude) return;

      const isSelected = selectedPrediction?.prediction_id === pred.prediction_id;
      const color = getRiskColor(pred.risk_category);

      const customIcon = L.divIcon({
        className: "custom-risk-pin",
        html: `
          <div style="
            position: relative; display: flex; align-items: center; justify-content: center;
            width: ${isSelected ? "28px" : "20px"}; height: ${isSelected ? "28px" : "20px"};
            background-color: ${color}; border: 2px solid white; border-radius: 50%;
            box-shadow: 0 0 12px ${color}; cursor: pointer; transition: transform 0.2s ease;
          ">
            ${isSelected ? `<div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>` : ""}
          </div>
        `,
        iconSize: [isSelected ? 28 : 20, isSelected ? 28 : 20],
        iconAnchor: [isSelected ? 14 : 10, isSelected ? 14 : 10],
      });

      const marker = L.marker([pred.latitude, pred.longitude], { icon: customIcon }).addTo(map);
      marker.on("click", () => selectPrediction(pred));
      markersRef.current[pred.prediction_id || `${pred.latitude}_${pred.longitude}`] = marker;
    });
  }, [predictions, selectedPrediction, selectPrediction, mapLoaded]);

  // Render Heatmap Layer
  useEffect(() => {
    const map = leafletMapInstance.current;
    if (!map || !mapLoaded) return;

    if (heatmapLayerRef.current) {
      map.removeLayer(heatmapLayerRef.current);
      heatmapLayerRef.current = null;
    }

    if (!showHeatmap || !predictions || predictions.length === 0) return;

    const heatPoints = predictions
      .filter((p) => p.latitude && p.longitude)
      .map((p) => [p.latitude, p.longitude, Math.max(0.1, (p.risk_score || 50) / 100.0)]);

    if (heatPoints.length > 0 && typeof L.heatLayer === "function") {
      const heatLayer = L.heatLayer(heatPoints, {
        radius: heatmapRadius,
        blur: 15,
        maxZoom: 17,
        minOpacity: 0.2,
        maxOpacity: heatmapOpacity,
        gradient: { 0.2: "#10B981", 0.4: "#F59E0B", 0.7: "#EF4444", 1.0: "#991B1B" },
      });
      heatLayer.addTo(map);
      heatmapLayerRef.current = heatLayer;
    }
  }, [showHeatmap, heatmapRadius, heatmapOpacity, predictions, mapLoaded]);

  // Render Live Driver Marker
  useEffect(() => {
    const map = leafletMapInstance.current;
    if (!map || !mapLoaded) return;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }
    if (driverAccuracyCircleRef.current) {
      driverAccuracyCircleRef.current.remove();
      driverAccuracyCircleRef.current = null;
    }

    if (isLiveDriverMode && liveDriverLocation && liveDriverLocation.lat && liveDriverLocation.lng) {
      const driverIcon = L.divIcon({
        className: "live-driver-icon",
        html: `
          <div style="position: relative; display: flex; items-center; justify-content: center; width: 24px; height: 24px;">
            <div style="position: absolute; width: 24px; height: 24px; background-color: #06b6d4; border-radius: 50%; opacity: 0.5; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 14px; height: 14px; background-color: #0891b2; border: 2.5px solid white; border-radius: 50%; margin: auto; box-shadow: 0 0 10px #06b6d4;"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const driverMarker = L.marker([liveDriverLocation.lat, liveDriverLocation.lng], { icon: driverIcon }).addTo(map);
      driverMarkerRef.current = driverMarker;

      if (liveDriverLocation.accuracy) {
        const accuracyCircle = L.circle([liveDriverLocation.lat, liveDriverLocation.lng], {
          radius: liveDriverLocation.accuracy,
          color: "#06b6d4",
          fillColor: "#06b6d4",
          fillOpacity: 0.15,
          weight: 1,
        }).addTo(map);
        driverAccuracyCircleRef.current = accuracyCircle;
      }
    }
  }, [isLiveDriverMode, liveDriverLocation, mapLoaded]);

  if (isOffline) {
    return <FallbackMap />;
  }

  return (
    <div className="relative w-full h-[480px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Pick-on-Map Prompt Banner */}
      {selectionMode !== SELECTION_MODE.NONE && (
        <div className="absolute top-3 left-3 z-[1000] bg-amber-950/90 backdrop-blur border border-amber-500/60 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg animate-bounce">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>Click anywhere on map to select {selectionMode === SELECTION_MODE.ORIGIN ? "Origin" : "Destination"}</span>
        </div>
      )}

      {/* Route Legend Overlay */}
      {routeRiskResult && (
        <div className="absolute bottom-4 right-4 z-[1000]">
          <RouteLegend />
        </div>
      )}

      {/* Non-blocking Map Tile Warning Banner */}
      {isTileError && (
        <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>Map tiles unavailable — showing vector hotspots</span>
        </div>
      )}

      {/* Leaflet Map Canvas Container */}
      <div ref={mapRef} className="w-full h-full z-10" />
    </div>
  );
}
