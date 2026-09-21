import React from "react";
import { useMap } from "../context/MapContext";

export default function PredictionDetails() {
  const { selectedPrediction } = useMap();

  if (!selectedPrediction) {
    return (
      <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 flex flex-col justify-center items-center text-center text-slate-500 font-mono text-xs border-dashed min-h-[250px]">
        <div className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center mb-3 bg-white/5">
          <span className="text-xl">🎯</span>
        </div>
        <span>Select a hotspot marker or submit a new query to load detailed assessment data.</span>
      </div>
    );
  }

  // Resolve visual tags colors
  const getRiskColor = (category) => {
    switch (category) {
      case "Low":
        return "text-emerald-400 bg-emerald-950/60 border-emerald-900";
      case "Medium":
        return "text-amber-400 bg-amber-950/60 border-amber-900";
      case "High":
        return "text-orange-400 bg-orange-950/60 border-orange-900";
      case "Critical":
        return "text-red-400 bg-red-950/60 border-red-900";
      default:
        return "text-slate-400 bg-slate-950 border-slate-800";
    }
  };

  const getProgressBarColor = (category) => {
    switch (category) {
      case "Low":
        return "bg-emerald-500";
      case "Medium":
        return "bg-amber-500";
      case "High":
        return "bg-[#F97316]";
      case "Critical":
        return "bg-red-600";
      default:
        return "bg-slate-500";
    }
  };

  return (
    <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 flex flex-col gap-4 text-white min-h-[250px] font-sans">
      <h3 className="text-lg font-bold tracking-tight border-b border-white/10 pb-3 flex items-center gap-2 font-display">
        <span className="w-2.5 h-2.5 bg-[#F97316] rounded-full"></span>
        Segment Detail Metrics
      </h3>

      <div className="flex flex-col gap-3">
        {/* Title */}
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">LOCATION</span>
          <span className="text-base font-bold text-white tracking-tight font-display">
            {selectedPrediction.location_name || "Unknown Road Segment"}
          </span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            Coordinates: {selectedPrediction.latitude.toFixed(6)}, {selectedPrediction.longitude.toFixed(6)}
          </span>
        </div>

        {/* Risk Score Progress Bar */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-400 font-sans">Risk Score Probability:</span>
            <span className={getRiskColor(selectedPrediction.risk_category) + " px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase font-mono"}>
              {selectedPrediction.risk_category} ({selectedPrediction.risk_score}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
            <div
              className={`h-full ${getProgressBarColor(selectedPrediction.risk_category)} transition-all duration-500`}
              style={{ width: `${selectedPrediction.risk_score}%` }}
            ></div>
          </div>
        </div>

        {/* Parameter Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs font-mono border-t border-b border-white/10 py-3 mt-1">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-sans">WEATHER</span>
            <span className="text-white mt-0.5 font-bold">{selectedPrediction.weather}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-sans">TRAFFIC</span>
            <span className="text-white mt-0.5 font-bold">{selectedPrediction.traffic_density}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-sans">ROAD CLASSIFICATION</span>
            <span className="text-white mt-0.5 font-bold">{selectedPrediction.road_type}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-sans">SPEED LIMIT</span>
            <span className="text-white mt-0.5 font-bold">{selectedPrediction.average_speed} km/h</span>
          </div>
        </div>

        {/* Audit Details */}
        <div className="flex flex-col gap-1.5 text-[10px] text-slate-500 font-mono">
          <div className="flex justify-between">
            <span>Assessment Time:</span>
            <span>{new Date(selectedPrediction.prediction_timestamp || selectedPrediction.created_at).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Model Version:</span>
            <span>{selectedPrediction.model_version || "1.0.0"}</span>
          </div>
          <div className="flex justify-between">
            <span>Assessment ID:</span>
            <span>{selectedPrediction.prediction_id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
