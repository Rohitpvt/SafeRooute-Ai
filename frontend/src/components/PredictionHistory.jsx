import React, { useEffect, useState, useCallback } from "react";
import apiClient from "../services/api";
import { useMap } from "../context/MapContext";

export default function PredictionHistory({ triggerRefresh, onSelectItem }) {
  const { selectPrediction, selectedPrediction } = useMap();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search / filter states
  const [skip, setSkip] = useState(0);
  const [limit] = useState(6);
  const [sort, setSort] = useState("desc");
  const [weather, setWeather] = useState("");
  const [riskCategory, setRiskCategory] = useState("");

  const weatherOptions = ["Clear", "Rainy", "Snowy", "Foggy", "Windy"];
  const riskOptions = ["Low", "Medium", "High", "Critical"];

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Build parameters
    let url = `/predictions/history?skip=${skip}&limit=${limit}&sort=${sort}`;
    if (weather) url += `&weather=${weather}`;
    if (riskCategory) url += `&risk_category=${riskCategory}`;

    try {
      const response = await apiClient.get(url);
      if (response && response.success && response.data) {
        setRecords(response.data.records || []);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error("Failed to load prediction logs history:", err);
      const detailMsg = err.response?.data?.detail;
      const status = err.response?.status;
      const msg = detailMsg
        ? `Unable to load prediction history (HTTP ${status}: ${typeof detailMsg === "object" ? JSON.stringify(detailMsg) : detailMsg})`
        : "Unable to load prediction history.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [skip, limit, sort, weather, riskCategory]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, triggerRefresh]);

  const handleNextPage = () => {
    if (records.length === limit) {
      setSkip((prev) => prev + limit);
    }
  };

  const handlePrevPage = () => {
    setSkip((prev) => Math.max(0, prev - limit));
  };

  // Synchronize statistics colors
  const getRiskTagColor = (category) => {
    switch (category) {
      case "Low":
        return "bg-emerald-950/60 text-emerald-400 border border-emerald-900";
      case "Medium":
        return "bg-amber-950/60 text-amber-400 border border-amber-900";
      case "High":
        return "bg-orange-950/60 text-orange-400 border border-orange-900";
      case "Critical":
        return "bg-red-950/60 text-red-400 border border-red-900";
      default:
        return "bg-slate-950 text-slate-400 border border-slate-800";
    }
  };

  return (
    <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 flex flex-col gap-4 text-white font-sans">
      <h3 className="text-lg font-bold tracking-tight border-b border-white/10 pb-3 flex items-center gap-2 font-display">
        <span className="w-2.5 h-2.5 bg-[#F97316] rounded-full"></span>
        Prediction Logs
      </h3>

      {/* Filter panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-sans">
        {/* Sort select */}
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setSkip(0);
          }}
          className="bg-[#050505] border border-white/10 rounded-xl px-3 py-2 focus:border-[#F97316] outline-none text-slate-300"
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>

        {/* Weather filter */}
        <select
          value={weather}
          onChange={(e) => {
            setWeather(e.target.value);
            setSkip(0);
          }}
          className="bg-[#050505] border border-white/10 rounded-xl px-3 py-2 focus:border-[#F97316] outline-none text-slate-300"
        >
          <option value="">All Weather</option>
          {weatherOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        {/* Risk category filter */}
        <select
          value={riskCategory}
          onChange={(e) => {
            setRiskCategory(e.target.value);
            setSkip(0);
          }}
          className="bg-[#050505] border border-white/10 rounded-xl px-3 py-2 focus:border-[#F97316] outline-none text-slate-300"
        >
          <option value="">All Risk levels</option>
          {riskOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        <button
          onClick={() => {
            setWeather("");
            setRiskCategory("");
            setSkip(0);
          }}
          className="bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition font-medium"
        >
          Reset Filters
        </button>
      </div>

      {/* List Container */}
      {loading ? (
        <div className="flex flex-col gap-3 animate-pulse py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-2xl border border-white/10" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 py-6 bg-red-950/20 rounded-2xl border border-red-500/30 text-xs">
          <span className="text-red-400 font-semibold">{error}</span>
          <button
            onClick={fetchHistory}
            className="bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 px-4 py-1.5 rounded-full text-xs font-semibold transition"
          >
            Retry
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="text-slate-500 text-xs text-center py-8 font-mono border border-dashed border-white/10 rounded-2xl">
          {weather || riskCategory ? "No records match search query." : "No prediction history yet."}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {records.map((item) => {
            const isSelected = selectedPrediction?.prediction_id === item.prediction_id;
            return (
              <div
                key={item.prediction_id}
                onClick={() => {
                  selectPrediction(item);
                  if (onSelectItem) onSelectItem(item);
                }}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  isSelected
                    ? "bg-white/10 border-[#F97316] shadow-md"
                    : "bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5"
                }`}
              >
                {/* Left details */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-full ${getRiskTagColor(item.risk_category)}`}>
                      {item.risk_category} ({item.risk_score}%)
                    </span>
                    <span className="text-xs font-bold text-slate-200">
                      {item.location_name || `Location (${item.latitude.toFixed(3)}, ${item.longitude.toFixed(3)})`}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span>Weather: {item.weather}</span>
                    <span>•</span>
                    <span>Traffic: {item.traffic_density}</span>
                    <span>•</span>
                    <span>Road: {item.road_type}</span>
                    <span>•</span>
                    <span>Speed: {item.average_speed} km/h</span>
                  </div>
                </div>

                {/* Right metadata */}
                <div className="text-right flex flex-col items-end text-[11px] font-mono text-slate-500">
                  <span>{new Date(item.prediction_timestamp).toLocaleDateString()}</span>
                  <span>{new Date(item.prediction_timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination controls */}
      {!loading && !error && records.length > 0 && (
        <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs font-mono text-slate-400">
          <span>
            Showing records {skip + 1} - {skip + records.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handlePrevPage}
              disabled={skip === 0}
              className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition"
            >
              Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={records.length < limit}
              className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
