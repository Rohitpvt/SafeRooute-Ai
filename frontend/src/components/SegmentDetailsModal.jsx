import React from "react";
import { useRoute } from "../context/RouteContext";
import { getRiskCategoryAndColor } from "../services/routeRiskService";

export default function SegmentDetailsModal() {
  const { selectedSegment, selectSegment } = useRoute();

  if (!selectedSegment) return null;

  const {
    segment_id,
    road_name,
    road_type,
    distance_m,
    duration_s,
    risk_score,
    confidence_score,
    risk_category,
    speed_kmh,
    speed_source,
    weather,
    traffic_density,
    time_of_day,
    model_version,
    prediction_timestamp,
  } = selectedSegment;

  const { badgeClass, color } = getRiskCategoryAndColor(risk_score);
  const distanceKm = (distance_m / 1000).toFixed(2);
  const durationMins = Math.round(duration_s / 60) || 1;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-xl p-5 shadow-2xl space-y-4 font-sans text-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={() => selectSegment(null)}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="space-y-1 pr-8">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${badgeClass}`}>
              {risk_category ? risk_category.toUpperCase() : "UNAVAILABLE"}
            </span>
            <span className="text-xs text-slate-400 font-mono">ID: {segment_id}</span>
          </div>
          <h3 className="text-lg font-bold text-slate-100 tracking-tight">{road_name || "Road Segment"}</h3>
          <p className="text-xs text-slate-400 flex items-center gap-2">
            <span>Type: <strong className="text-slate-200">{road_type}</strong></span>
            <span>•</span>
            <span>{distanceKm} km ({durationMins} mins)</span>
          </p>
        </div>

        {/* Risk Score Highlight */}
        <div className="bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Accident Risk Score</p>
            <p className="text-2xl font-extrabold" style={{ color: color }}>
              {risk_score !== null && risk_score !== undefined ? `${risk_score}/100` : "N/A"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Model Confidence</p>
            <p className="text-sm font-semibold text-slate-200">
              {confidence_score !== null && confidence_score !== undefined ? `${(confidence_score * 100).toFixed(1)}%` : "N/A"}
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg space-y-0.5">
            <div className="flex items-center text-slate-400 gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> Weather Condition
            </div>
            <p className="font-semibold text-slate-200">{weather || "Clear"} (Manual Context)</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg space-y-0.5">
            <div className="flex items-center text-slate-400 gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Traffic Density
            </div>
            <p className="font-semibold text-slate-200">{traffic_density || "Low"} (Manual Context)</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg space-y-0.5">
            <div className="flex items-center text-slate-400 gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Average Speed
            </div>
            <p className="font-semibold text-slate-200">{speed_kmh || 45} km/h</p>
            <p className="text-[10px] text-slate-500">Source: {speed_source || "Static Profile"}</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg space-y-0.5">
            <div className="flex items-center text-slate-400 gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" /> Time Block
            </div>
            <p className="font-semibold text-slate-200">{time_of_day || "Afternoon"}</p>
          </div>
        </div>

        {/* Audit Metadata Footer */}
        <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-400 space-y-1">
          <div className="flex justify-between items-center">
            <span>Model Version:</span>
            <span className="font-mono text-slate-300">{model_version || "1.22.0"}</span>
          </div>
          {prediction_timestamp && (
            <div className="flex justify-between items-center">
              <span>Evaluated At:</span>
              <span className="font-mono text-slate-300">{new Date(prediction_timestamp).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
