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
          <div key={i} className="h-28 bg-[#0F0F0F] rounded-3xl border border-white/10 p-5 flex flex-col justify-between">
            <div className="h-3 w-24 bg-white/10 rounded-full"></div>
            <div className="h-8 w-16 bg-white/10 rounded-full mt-2"></div>
            <div className="h-2 w-32 bg-white/5 rounded-full mt-2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/20 border border-red-500/30 rounded-3xl p-4 text-center text-xs text-red-400 flex items-center justify-between">
        <span>{error}</span>
        <button
          onClick={fetchStats}
          className="bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 px-4 py-1.5 rounded-full transition"
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
      gradient: "from-[#F97316] to-[#FB923C]",
      desc: "Historical risk lookups run",
    },
    {
      title: "Average Risk Score",
      value: `${stats.average_risk}%`,
      gradient: "from-emerald-500 to-teal-400",
      desc: "Mean calculated danger factor",
    },
    {
      title: "High Risk Hotspots",
      value: stats.high_risk_count,
      gradient: "from-amber-500 to-orange-500",
      desc: "Locations categorized High Risk",
    },
    {
      title: "Critical Hazards",
      value: stats.critical_risk_count,
      gradient: "from-red-600 to-rose-500",
      desc: "Dangerous segments detected",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item, index) => (
        <div
          key={index}
          className="relative bg-[#0F0F0F] border border-white/10 rounded-3xl p-5 overflow-hidden flex flex-col justify-between hover:border-white/20 transition backdrop-blur-xl group"
        >
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1 font-sans">
              {item.title}
            </span>
            <span className="text-3xl font-bold text-white tracking-tight font-mono">{item.value}</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block font-sans">{item.desc}</span>
          {/* Subtle colored top line indicator */}
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.gradient}`}></div>
        </div>
      ))}
    </div>
  );
}
