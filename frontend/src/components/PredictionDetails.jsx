import React from "react";
import { useMap } from "../context/MapContext";

export default function PredictionDetails() {
  const { selectedPrediction } = useMap();

  if (!selectedPrediction) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-center items-center text-center text-slate-500 font-mono text-xs border-dashed min-h-[250px]">
        <div className="w-10 h-10 border border-slate-800 rounded-full flex items-center justify-center mb-3">
          <span className="text-lg">🎯</span>
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
        return "bg-orange-500";
      case "Critical":
        return "bg-red-700";
      default:
        return "bg-slate-500";
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col gap-4 text-white min-h-[250px]">
      <h3 className="text-lg font-bold tracking-tight border-b border-slate-800 pb-3 flex items-center gap-2">
        <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
        Segment Detail Metrics
      </h3>

      <div className="flex flex-col gap-3">
        {/* Title */}
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-500 font-mono">LOCATION</span>
          <span className="text-sm font-bold text-white tracking-tight">
            {selectedPrediction.location_name || "Unknown Road Segment"}
          </span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            Coordinates: {selectedPrediction.latitude.toFixed(6)}, {selectedPrediction.longitude.toFixed(6)}
          </span>
        </div>

        {/* Risk Score Progress Bar */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-400">Risk Score Probability:</span>
            <span className={getRiskColor(selectedPrediction.risk_category) + " px-2 py-0.5 rounded text-[10px] font-bold border uppercase"}>
              {selectedPrediction.risk_category} ({selectedPrediction.risk_score}%)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressBarColor(selectedPrediction.risk_category)}`}
              style={{ width: `${selectedPrediction.risk_score}%` }}
            ></div>
          </div>
        </div>

        {/* Parameter Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono border-t border-b border-slate-800/80 py-3 mt-1">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500">WEATHER</span>
            <span className="text-white mt-0.5">{selectedPrediction.weather}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500">TRAFFIC</span>
            <span className="text-white mt-0.5">{selectedPrediction.traffic_density}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500">ROAD CLASSIFICATION</span>
            <span className="text-white mt-0.5">{selectedPrediction.road_type}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500">SPEED LIMIT</span>
            <span className="text-white mt-0.5">{selectedPrediction.average_speed} km/h</span>
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
