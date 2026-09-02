import React, { useEffect, useState, useCallback } from "react";
import apiClient from "../services/api";

export default function StatsCards({ triggerRefresh }) {
  const [stats, setStats] = useState({
    total_predictions: 0,
    average_risk: 0,
    high_risk_count: 0,
    critical_risk_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/predictions/stats");
      if (response && response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error("Failed to load statistics:", err);
      setError("Unable to load metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, triggerRefresh]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-900/80 rounded-lg border border-slate-800 p-5 flex flex-col justify-between">
            <div className="h-3 w-24 bg-slate-800 rounded"></div>
            <div className="h-8 w-16 bg-slate-800 rounded mt-2"></div>
            <div className="h-2 w-32 bg-slate-800/60 rounded mt-2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/20 border border-red-900/40 rounded-lg p-4 text-center text-xs text-red-400 flex items-center justify-between">
        <span>{error}</span>
        <button
          onClick={fetchStats}
          className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-1 rounded transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const statItems = [
    {
      title: "Total Predictions",
      value: stats.total_predictions,
      gradient: "from-blue-600 to-indigo-600",
      desc: "Historical risk lookups run",
    },
    {
      title: "Average Risk Score",
      value: `${stats.average_risk}%`,
      gradient: "from-emerald-600 to-teal-600",
      desc: "Mean calculated danger factor",
    },
    {
      title: "High Risk Hotspots",
      value: stats.high_risk_count,
      gradient: "from-amber-600 to-orange-600",
      desc: "Locations categorized High Risk",
    },
    {
      title: "Critical Hazards",
      value: stats.critical_risk_count,
      gradient: "from-red-800 to-rose-700",
      desc: "Dangerous segments detected",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item, index) => (
        <div
          key={index}
          className="relative bg-slate-900 border border-slate-800 rounded-lg p-5 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition"
        >
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">
              {item.title}
            </span>
            <span className="text-3xl font-bold text-white tracking-tight">{item.value}</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block font-mono">{item.desc}</span>
          {/* Subtle colored top line indicator */}
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.gradient}`}></div>
        </div>
      ))}
    </div>
  );
}
