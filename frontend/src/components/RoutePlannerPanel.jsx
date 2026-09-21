import React, { useState, useEffect, useCallback } from "react";
import { useRoute, ROUTE_STATUS, SELECTION_MODE } from "../context/RouteContext";
import { useGeolocation } from "../hooks/useGeolocation";
import { geocodePlaceName } from "../services/geocodingService";
import { environmentService } from "../services/environmentService";

export default function RoutePlannerPanel() {
  const {
    origin,
    destination,
    setOrigin,
    setDestination,
    routeStatus,
    calculateRoute,
    resetRoute,
    routeError,
    selectionMode,
    setSelectionMode,
  } = useRoute();

  const { getCurrentLocation, isAcquiringLocation } = useGeolocation();
  const [geoStatusMsg, setGeoStatusMsg] = useState("");
  const [isAcquiring, setIsAcquiring] = useState(false);

  // Local text input states for manual typing / place search
  const [originInputText, setOriginInputText] = useState("");
  const [destInputText, setDestInputText] = useState("");
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);

  // Environmental Scenario State with Automatic Fetching
  const [weather, setWeather] = useState("Clear");
  const [trafficDensity, setTrafficDensity] = useState("Medium");
  const [timeOfDay, setTimeOfDay] = useState("Afternoon");
  const [isFetchingEnv, setIsFetchingEnv] = useState(false);
  const [envBadge, setEnvBadge] = useState("Auto");

  // Candidate Selection List state
  const [candidates, setCandidates] = useState([]);
  const [candidateTarget, setCandidateTarget] = useState(null); // 'origin' | 'destination'

  const DELHI_PRESETS = [
    { label: "Connaught Place", lat: 28.6315, lng: 77.2167 },
    { label: "India Gate", lat: 28.6129, lng: 77.2295 },
    { label: "Dhaula Kuan", lat: 28.5912, lng: 77.1580 },
    { label: "Cyber City (Gurugram)", lat: 28.4950, lng: 77.0890 },
    { label: "Noida Sector 18", lat: 28.5700, lng: 77.3200 },
  ];

  // Helper: derive automatic time of day based on current local hour
  const getAutoTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Morning";
    if (hour >= 12 && hour < 17) return "Afternoon";
    if (hour >= 17 && hour < 22) return "Evening";
    return "Night";
  };

  // Helper: derive traffic density from rush hour and weather
  const getAutoTrafficDensity = (weatherStr) => {
    const hour = new Date().getHours();
    const isRushHour = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
    if (isRushHour) {
      return weatherStr === "Rainy" || weatherStr === "Foggy" ? "Jammed" : "High";
    }
    if (hour >= 11 && hour <= 16) return "Medium";
    return "Low";
  };

  // Helper: map backend/API weather_state canonical string to UI option
  const mapWeatherStateToUI = (weatherState) => {
    if (!weatherState) return "Clear";
    const s = String(weatherState).toUpperCase();
    if (s.includes("RAIN") || s.includes("STORM")) return "Rainy";
    if (s.includes("FOG") || s.includes("VISIBILITY")) return "Foggy";
    if (s.includes("SNOW")) return "Snowy";
    if (s.includes("WIND")) return "Windy";
    return "Clear";
  };

  // Automatic Environmental Fetcher based on coordinates
  const fetchLiveEnvironmentalContext = useCallback(async (lat, lng) => {
    setIsFetchingEnv(true);
    const timeVal = getAutoTimeOfDay();
    setTimeOfDay(timeVal);

    try {
      const targetLat = lat || 28.6139;
      const targetLng = lng || 77.2090;

      const env = await environmentService.getEnvironmentalContext(targetLat, targetLng);
      const mappedWeather = mapWeatherStateToUI(env?.weather_state);
      setWeather(mappedWeather);

      const trafficVal = getAutoTrafficDensity(mappedWeather);
      setTrafficDensity(trafficVal);

      setEnvBadge(env?.quality === "VALID" || env?.quality === "RECENT" ? "Live Auto" : "Auto");
    } catch (err) {
      console.warn("Auto-fetching environmental conditions failed:", err);
      setWeather("Clear");
      setTrafficDensity(getAutoTrafficDensity("Clear"));
      setEnvBadge("Auto Fallback");
    } finally {
      setIsFetchingEnv(false);
    }
  }, []);

  // Trigger automatic environmental data fetch whenever origin coordinates change or on mount
  useEffect(() => {
    const targetLat = origin?.latitude || 28.6139;
    const targetLng = origin?.longitude || 77.2090;
    fetchLiveEnvironmentalContext(targetLat, targetLng);
  }, [origin?.latitude, origin?.longitude, fetchLiveEnvironmentalContext]);

  // Sync inputs when origin or destination context objects update
  useEffect(() => {
    if (origin && origin.latitude && origin.longitude) {
      setOriginInputText(`${origin.location_name || "Origin"} (${origin.latitude}, ${origin.longitude})`);
    } else if (!origin) {
      setOriginInputText("");
    }
  }, [origin]);

  useEffect(() => {
    if (destination && destination.latitude && destination.longitude) {
      setDestInputText(`${destination.location_name || "Destination"} (${destination.latitude}, ${destination.longitude})`);
    } else if (!destination) {
      setDestInputText("");
    }
  }, [destination]);

  // Strict helper to parse full typed coordinates e.g. "28.6315, 77.2167"
  const parseCoordinatesFromText = (text, defaultLabel, strictRegionCheck = true) => {
    if (!text.trim()) return null;

    // Match "28.6315, 77.2167" or "28.6315 77.2167"
    const match = text.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);

      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        // Enforce active region bounds check (lat: 28.0 to 29.2, lng: 76.5 to 77.8)
        if (strictRegionCheck) {
          if (lat < 28.0 || lat > 29.2 || lng < 76.5 || lng > 77.8) {
            return null; // Ignore incomplete or out-of-region coordinates while typing
          }
        }
        return { latitude: lat, longitude: lng, location_name: text.split("(")[0].trim() || defaultLabel };
      }
    }
    return null;
  };

  const handleOriginSearch = async (textToSearch) => {
    const text = textToSearch || originInputText;
    if (!text || !text.trim()) return;

    // Try parsing raw coordinates without strict region check
    const parsedCoords = parseCoordinatesFromText(text, "Typed Origin", false);
    if (parsedCoords) {
      if (parsedCoords.latitude < 28.0 || parsedCoords.latitude > 29.2 || parsedCoords.longitude < 76.5 || parsedCoords.longitude > 77.8) {
        setGeoStatusMsg(`Coordinate (${parsedCoords.latitude}, ${parsedCoords.longitude}) is outside active Delhi NCR coverage region.`);
        return;
      }
      setOrigin(parsedCoords);
      setGeoStatusMsg(`Coordinates set: ${parsedCoords.latitude}, ${parsedCoords.longitude}`);
      setTimeout(() => setGeoStatusMsg(""), 3500);
      return;
    }

    setIsSearchingOrigin(true);
    setGeoStatusMsg("Understanding location...");

    setTimeout(() => {
      setGeoStatusMsg("Verifying location...");
    }, 400);

    const result = await geocodePlaceName(text);
    setIsSearchingOrigin(false);

    if (result && result.latitude && result.longitude) {
      if (result.match_status === "candidate_list" && result.candidates && result.candidates.length > 0) {
        setCandidates([
          { location_name: result.location_name, latitude: result.latitude, longitude: result.longitude, source: result.source },
          ...result.candidates,
        ]);
        setCandidateTarget("origin");
        setGeoStatusMsg("Multiple locations found. Please select one below.");
      } else {
        setOrigin({
          latitude: result.latitude,
          longitude: result.longitude,
          location_name: result.location_name,
        });
        setGeoStatusMsg(`Location verified: ${result.location_name}`);
        setTimeout(() => setGeoStatusMsg(""), 3500);
      }
    } else {
      setGeoStatusMsg(`Location "${text}" could not be verified.`);
    }
  };

  const handleDestSearch = async (textToSearch) => {
    const text = textToSearch || destInputText;
    if (!text || !text.trim()) return;

    // Try parsing raw coordinates without strict region check
    const parsedCoords = parseCoordinatesFromText(text, "Typed Destination", false);
    if (parsedCoords) {
      if (parsedCoords.latitude < 28.0 || parsedCoords.latitude > 29.2 || parsedCoords.longitude < 76.5 || parsedCoords.longitude > 77.8) {
        setGeoStatusMsg(`Coordinate (${parsedCoords.latitude}, ${parsedCoords.longitude}) is outside active Delhi NCR coverage region.`);
        return;
      }
      setDestination(parsedCoords);
      setGeoStatusMsg(`Coordinates set: ${parsedCoords.latitude}, ${parsedCoords.longitude}`);
      setTimeout(() => setGeoStatusMsg(""), 3500);
      return;
    }

    setIsSearchingDest(true);
    setGeoStatusMsg("Understanding location...");

    setTimeout(() => {
      setGeoStatusMsg("Verifying location...");
    }, 400);

    const result = await geocodePlaceName(text);
    setIsSearchingDest(false);

    if (result && result.latitude && result.longitude) {
      if (result.match_status === "candidate_list" && result.candidates && result.candidates.length > 0) {
        setCandidates([
          { location_name: result.location_name, latitude: result.latitude, longitude: result.longitude, source: result.source },
          ...result.candidates,
        ]);
        setCandidateTarget("destination");
        setGeoStatusMsg("Multiple locations found. Please select one below.");
      } else {
        setDestination({
          latitude: result.latitude,
          longitude: result.longitude,
          location_name: result.location_name,
        });
        setGeoStatusMsg(`Location verified: ${result.location_name}`);
        setTimeout(() => setGeoStatusMsg(""), 3500);
      }
    } else {
      setGeoStatusMsg(`Location "${text}" could not be verified.`);
    }
  };

  const selectCandidate = (cand) => {
    const item = {
      latitude: cand.latitude,
      longitude: cand.longitude,
      location_name: cand.location_name,
    };
    if (candidateTarget === "origin") {
      setOrigin(item);
    } else {
      setDestination(item);
    }
    setCandidates([]);
    setCandidateTarget(null);
    setGeoStatusMsg(`Location verified: ${cand.location_name}`);
    setTimeout(() => setGeoStatusMsg(""), 3500);
  };

  const handleOriginTextChange = (e) => {
    const text = e.target.value;
    setOriginInputText(text);

    // Only parse valid full coordinates in Delhi NCR region while typing
    const parsed = parseCoordinatesFromText(text, "Typed Origin", true);
    if (parsed) {
      setOrigin(parsed);
    }
  };

  const handleDestTextChange = (e) => {
    const text = e.target.value;
    setDestInputText(text);

    // Only parse valid full coordinates in Delhi NCR region while typing
    const parsed = parseCoordinatesFromText(text, "Typed Destination", true);
    if (parsed) {
      setDestination(parsed);
    }
  };

  const handleUseCurrentLocation = async () => {
    setGeoStatusMsg("Acquiring GPS location...");
    setIsAcquiring(true);
    try {
      const pos = await getCurrentLocation();
      if (pos && pos.latitude && pos.longitude) {
        setOrigin({
          latitude: parseFloat(pos.latitude.toFixed(6)),
          longitude: parseFloat(pos.longitude.toFixed(6)),
          location_name: pos.isFallback ? "Default Delhi Location (GPS Off)" : "Current GPS Location",
        });
        setGeoStatusMsg(pos.isFallback ? "GPS unavailable — set to default location." : "GPS Location acquired!");
      } else {
        setGeoStatusMsg("Unable to retrieve location.");
      }
    } catch (err) {
      setGeoStatusMsg("Location request failed.");
    } finally {
      setIsAcquiring(false);
      setTimeout(() => setGeoStatusMsg(""), 4000);
    }
  };

  const isCalculating = routeStatus === ROUTE_STATUS.LOADING;

  const handleCalculateRouteClick = () => {
    calculateRoute({ weather, traffic_density: trafficDensity, time_of_day: timeOfDay });
  };

  return (
    <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-xl text-slate-100 font-sans space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-[#F97316]/10 border border-[#F97316]/30 rounded-2xl text-[#F97316]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-100 text-sm sm:text-base tracking-wide font-display whitespace-nowrap">Route Risk Intelligence</h3>
              <span className="text-[10px] bg-[#F97316]/20 text-[#FB923C] border border-[#F97316]/30 px-2 py-0.5 rounded-full font-mono font-medium whitespace-nowrap shrink-0 inline-block">AI-Assisted</span>
            </div>
            <p className="text-xs text-slate-400 font-sans">Calculate dynamic segment risk along path</p>
          </div>
        </div>
        {routeStatus !== ROUTE_STATUS.IDLE && (
          <button
            onClick={() => {
              resetRoute();
              setOriginInputText("");
              setDestInputText("");
              setCandidates([]);
            }}
            className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-200 transition-colors border border-transparent hover:border-white/10"
            title="Reset Route"
            disabled={isCalculating}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* Origin Input Section */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between font-sans">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Origin Location
          </span>
          {selectionMode === SELECTION_MODE.ORIGIN && (
            <span className="text-[10px] text-amber-400 animate-pulse font-normal">Click map to set</span>
          )}
        </label>
        
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={originInputText}
            onChange={handleOriginTextChange}
            onKeyDown={(e) => e.key === "Enter" && handleOriginSearch()}
            placeholder="Type place name or coords... (Press Enter / Search)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#F97316] placeholder:text-slate-600 transition-colors font-mono"
          />
          <button
            type="button"
            onClick={() => handleOriginSearch()}
            disabled={isSearchingOrigin}
            className="p-2 bg-[#F97316] hover:bg-[#FB923C] text-white rounded-xl transition-colors border border-[#F97316]"
            title="Search Origin Location"
          >
            <svg className={`w-4 h-4 ${isSearchingOrigin ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isAcquiring || isAcquiringLocation || isCalculating}
            className="p-2 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl transition-colors border border-white/10 disabled:opacity-50"
            title="Use Current Location"
          >
            <svg className={`w-4 h-4 text-emerald-400 ${isAcquiring ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setSelectionMode(selectionMode === SELECTION_MODE.ORIGIN ? SELECTION_MODE.NONE : SELECTION_MODE.ORIGIN)}
            className={`p-2 rounded-xl transition-colors border ${
              selectionMode === SELECTION_MODE.ORIGIN
                ? "bg-amber-500/20 border-amber-500 text-amber-400"
                : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-200"
            }`}
            title="Click on Map to Pick Origin"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Destination Input Section */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between font-sans">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Destination Location
          </span>
          {selectionMode === SELECTION_MODE.DESTINATION && (
            <span className="text-[10px] text-amber-400 animate-pulse font-normal">Click map to set</span>
          )}
        </label>
        
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={destInputText}
            onChange={handleDestTextChange}
            onKeyDown={(e) => e.key === "Enter" && handleDestSearch()}
            placeholder="Type place name or coords... (Press Enter / Search)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#F97316] placeholder:text-slate-600 transition-colors font-mono"
          />
          <button
            type="button"
            onClick={() => handleDestSearch()}
            disabled={isSearchingDest}
            className="p-2 bg-red-500 hover:bg-red-400 text-white rounded-xl transition-colors border border-red-500"
            title="Search Destination Location"
          >
            <svg className={`w-4 h-4 ${isSearchingDest ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setSelectionMode(selectionMode === SELECTION_MODE.DESTINATION ? SELECTION_MODE.NONE : SELECTION_MODE.DESTINATION)}
            className={`p-2 rounded-xl transition-colors border ${
              selectionMode === SELECTION_MODE.DESTINATION
                ? "bg-amber-500/20 border-amber-500 text-amber-400"
                : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-200"
            }`}
            title="Click on Map to Pick Destination"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Environmental Scenario Parameters */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] sm:text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider font-sans whitespace-nowrap shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#F97316] shrink-0 inline-block" /> Environmental Risk Conditions
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#F97316]/20 text-[#FB923C] border border-[#F97316]/30 inline-flex items-center gap-1 font-medium whitespace-nowrap shrink-0">
              {isFetchingEnv && <span className="w-1.5 h-1.5 bg-[#F97316] rounded-full animate-ping shrink-0" />}
              {isFetchingEnv ? "Fetching..." : envBadge}
            </span>
            <button
              type="button"
              onClick={() => fetchLiveEnvironmentalContext(origin?.latitude, origin?.longitude)}
              disabled={isFetchingEnv}
              title="Refresh Live Data"
              className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors shrink-0"
            >
              <svg className={`w-3.5 h-3.5 ${isFetchingEnv ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1 font-medium">Weather</label>
            <select
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              className="w-full bg-[#050505] border border-white/10 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-[#F97316]"
            >
              <option value="Clear">Clear</option>
              <option value="Rainy">Rainy</option>
              <option value="Foggy">Foggy</option>
              <option value="Snowy">Snowy</option>
              <option value="Windy">Windy</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1 font-medium">Traffic</label>
            <select
              value={trafficDensity}
              onChange={(e) => setTrafficDensity(e.target.value)}
              className="w-full bg-[#050505] border border-white/10 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-[#F97316]"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Jammed">Jammed</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1 font-medium">Time</label>
            <select
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
              className="w-full bg-[#050505] border border-white/10 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-[#F97316]"
            >
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Evening">Evening</option>
              <option value="Night">Night</option>
            </select>
          </div>
        </div>
      </div>

      {/* Multiple Candidate Selection List */}
      {candidates.length > 0 && (
        <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-xs space-y-2">
          <p className="font-semibold text-amber-300">Select a Location:</p>
          <div className="space-y-1.5">
            {candidates.map((cand, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectCandidate(cand)}
                className="w-full text-left p-2 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-slate-200 hover:text-white transition flex items-center justify-between gap-2 font-mono"
              >
                <span>{cand.location_name}</span>
                <span className="text-[10px] text-amber-400 uppercase">{cand.source}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preset Quick Selectors */}
      <div className="space-y-1.5">
        <p className="text-[11px] text-slate-400 font-medium font-sans">Quick Presets (Delhi NCR):</p>
        <div className="flex flex-wrap gap-1.5">
          {DELHI_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                const item = { latitude: preset.lat, longitude: preset.lng, location_name: preset.label };
                if (!origin) setOrigin(item);
                else setDestination(item);
              }}
              className="text-[11px] bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-3 py-1.5 rounded-full border border-white/10 transition-colors font-medium"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status Feedback */}
      {geoStatusMsg && <p className="text-[11px] text-emerald-400 font-medium">{geoStatusMsg}</p>}

      {/* Error Alert */}
      {routeError && (
        <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-2xl text-xs text-red-300 flex items-start gap-2">
          <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold text-red-200">Route Error</p>
            <p>{routeError}</p>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        type="button"
        onClick={handleCalculateRouteClick}
        disabled={!origin || !destination || isCalculating}
        className="w-full py-3 px-4 bg-[#F97316] hover:bg-[#FB923C] disabled:bg-white/5 disabled:text-slate-600 text-white text-xs font-bold rounded-full transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#F97316]/20 font-display uppercase tracking-wider"
      >
        {isCalculating ? (
          <>
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span>Calculating Route & Risk Scores...</span>
          </>
        ) : (
          <span>Calculate Safe Route</span>
        )}
      </button>
    </div>
  );
}
