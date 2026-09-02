import React, { useState } from "react";
import ModeSwitcher from "./ModeSwitcher";
import LiveDriverMode from "../live-driver/LiveDriverMode";
import RoutePlannerPanel from "../RoutePlannerPanel";
import apiClient from "../../services/api";

export default function PredictionForm({ onPredictionSuccess }) {
  const [activeMode, setActiveMode] = useState("route"); // "route" | "live" | "manual"
  
  const [formData, setFormData] = useState({
    weather: "Clear",
    traffic_density: "Low",
    road_type: "Arterial",
    average_speed: 45.0,
    time_of_day: "Afternoon",
    latitude: 28.6139,
    longitude: 77.2090,
    location_name: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  const weatherOptions = ["Clear", "Rainy", "Snowy", "Foggy", "Windy"];
  const trafficOptions = ["Low", "Medium", "High", "Jammed"];
  const roadOptions = ["Highway", "Arterial", "Local", "Expressway"];
  const timeOptions = ["Morning", "Afternoon", "Evening", "Night"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "average_speed" || name === "latitude" || name === "longitude" ? parseFloat(value) : value,
    }));
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: parseFloat(position.coords.latitude.toFixed(6)),
            longitude: parseFloat(position.coords.longitude.toFixed(6)),
            location_name: prev.location_name || "Current GPS Location",
          }));
        },
        (err) => {
          console.warn("Geolocation permission blocked or failed:", err);
          alert("Could not retrieve current location. Please enter coordinates manually.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessData(null);

    const payload = {
      ...formData,
      city: "New Delhi",
      state: "Delhi",
    };

    try {
      const response = await apiClient.post("/predict", payload);
      if (response && response.success && response.data) {
        setSuccessData(response.data);
        if (onPredictionSuccess) {
          onPredictionSuccess(response.data);
        }
      }
    } catch (err) {
      console.error("Submission failed:", err);
      const detail = err.response?.data?.detail;
      const errorMsg = detail ? (typeof detail === "object" ? JSON.stringify(detail) : detail) : "Prediction submission failed. Check inputs.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Unified Mode Switcher */}
      <ModeSwitcher activeMode={activeMode} onModeChange={setActiveMode} />

      {/* Render Mode Content with Persistent Mounting (Preserves Live Driver Telemetry State Across Tab Switches) */}
      <div className={activeMode === "route" ? "block" : "hidden"}>
        <RoutePlannerPanel />
      </div>

      <div className={activeMode === "live" ? "block" : "hidden"}>
        <LiveDriverMode onPredictionSuccess={onPredictionSuccess} />
      </div>

      <div className={activeMode === "manual" ? "block" : "hidden"}>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 text-white shadow-xl">
          <h3 className="text-sm font-bold tracking-tight border-b border-slate-800 pb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
            Single Spot Manual Assessment
          </h3>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* Weather & Traffic Density */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold" htmlFor="weather">Weather</label>
                <select
                  id="weather"
                  name="weather"
                  value={formData.weather}
                  onChange={handleChange}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-sm focus:border-slate-700 outline-none text-slate-200"
                >
                  {weatherOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold" htmlFor="traffic_density">Traffic</label>
                <select
                  id="traffic_density"
                  name="traffic_density"
                  value={formData.traffic_density}
                  onChange={handleChange}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-sm focus:border-slate-700 outline-none text-slate-200"
                >
                  {trafficOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Road Type & Time of Day */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold" htmlFor="road_type">Road Type</label>
                <select
                  id="road_type"
                  name="road_type"
                  value={formData.road_type}
                  onChange={handleChange}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-sm focus:border-slate-700 outline-none text-slate-200"
                >
                  {roadOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold" htmlFor="time_of_day">Time</label>
                <select
                  id="time_of_day"
                  name="time_of_day"
                  value={formData.time_of_day}
                  onChange={handleChange}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-sm focus:border-slate-700 outline-none text-slate-200"
                >
                  {timeOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Speed & Location Label */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold" htmlFor="average_speed">Avg Speed (km/h)</label>
                <input
                  id="average_speed"
                  type="number"
                  name="average_speed"
                  value={formData.average_speed}
                  onChange={handleChange}
                  min="0"
                  max="200"
                  step="0.5"
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-sm focus:border-slate-700 outline-none text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold" htmlFor="location_name">Location Label</label>
                <input
                  id="location_name"
                  type="text"
                  name="location_name"
                  placeholder="e.g. Ring Rd CP"
                  value={formData.location_name}
                  onChange={handleChange}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-sm focus:border-slate-700 outline-none text-slate-200"
                />
              </div>
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold" htmlFor="latitude">Latitude</label>
                <input
                  id="latitude"
                  type="number"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  step="0.0001"
                  min="-90"
                  max="90"
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-sm focus:border-slate-700 outline-none text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold" htmlFor="longitude">Longitude</label>
                <input
                  id="longitude"
                  type="number"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  step="0.0001"
                  min="-180"
                  max="180"
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-sm focus:border-slate-700 outline-none text-slate-200"
                />
              </div>
            </div>

            {/* GPS Button */}
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              className="bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded py-1.5 text-xs font-semibold tracking-wider transition"
            >
              GPS: LOAD CURRENT LOCATION
            </button>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded py-2.5 text-sm font-semibold tracking-wide transition flex items-center justify-center gap-2"
            >
              {loading ? "Calculating..." : "Assess Spot Risk"}
            </button>
          </form>

          {/* Error state */}
          {error && (
            <div className="bg-red-950/40 border border-red-900/60 text-red-400 text-xs p-3 rounded mt-2">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
