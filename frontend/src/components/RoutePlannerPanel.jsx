import React, { useState, useEffect } from "react";
import { useRoute, ROUTE_STATUS, SELECTION_MODE } from "../context/RouteContext";
import { useGeolocation } from "../hooks/useGeolocation";
import { geocodePlaceName } from "../services/geocodingService";

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

  // Environmental Scenario State
  const [weather, setWeather] = useState("Rainy");
  const [trafficDensity, setTrafficDensity] = useState("High");
  const [timeOfDay, setTimeOfDay] = useState("Evening");

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
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md text-slate-100 font-sans space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-100 text-base tracking-wide">Route Risk Intelligence</h3>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono">AI-Assisted</span>
            </div>
            <p className="text-xs text-slate-400">Calculate dynamic segment risk along path</p>
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
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
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
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
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
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
          />
          <button
            type="button"
            onClick={() => handleOriginSearch()}
            disabled={isSearchingOrigin}
            className="p-2 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-lg transition-colors border border-emerald-600/80"
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
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700 disabled:opacity-50"
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
            className={`p-2 rounded-lg transition-colors border ${
              selectionMode === SELECTION_MODE.ORIGIN
                ? "bg-amber-500/20 border-amber-500 text-amber-400"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
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
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
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
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500 placeholder:text-slate-600"
          />
          <button
            type="button"
            onClick={() => handleDestSearch()}
            disabled={isSearchingDest}
            className="p-2 bg-red-800/80 hover:bg-red-700 text-white rounded-lg transition-colors border border-red-700/80"
            title="Search Destination Location"
          >
            <svg className={`w-4 h-4 ${isSearchingDest ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setSelectionMode(selectionMode === SELECTION_MODE.DESTINATION ? SELECTION_MODE.NONE : SELECTION_MODE.DESTINATION)}
            className={`p-2 rounded-lg transition-colors border ${
              selectionMode === SELECTION_MODE.DESTINATION
                ? "bg-amber-500/20 border-amber-500 text-amber-400"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
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
      <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
        <p className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" /> Environmental Risk Conditions
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1 font-medium">Weather</label>
            <select
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
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
              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
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
              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
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
        <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-lg text-xs space-y-2">
          <p className="font-semibold text-amber-300">Select a Location:</p>
          <div className="space-y-1.5">
            {candidates.map((cand, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectCandidate(cand)}
                className="w-full text-left p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded text-slate-200 hover:text-white transition flex items-center justify-between gap-2"
              >
                <span>{cand.location_name}</span>
                <span className="text-[10px] text-amber-400 uppercase font-mono">{cand.source}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preset Quick Selectors */}
      <div className="space-y-1.5">
        <p className="text-[11px] text-slate-400 font-medium">Quick Presets (Delhi NCR):</p>
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
              className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded border border-slate-700/60 transition-colors"
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
        <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-300 flex items-start gap-2">
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
        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
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
