import React from "react";
import { useMap } from "../context/MapContext";

export default function FallbackMap() {
  const {
    predictions,
    selectedPrediction,
    selectPrediction,
    mapCenter,
    liveDriverLocation,
    isLiveDriverMode,
  } = useMap();

  return (
    <div className="relative w-full h-[480px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between p-4 shadow-2xl">
      {/* Offline Mode Alert banner */}
      <div className="absolute top-3 left-3 z-20 bg-slate-900/90 backdrop-blur border border-amber-500/40 text-amber-300 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide flex items-center gap-2.5 shadow-lg">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
        <div className="flex flex-col">
          <span>Offline Map Visualization</span>
          <span className="text-[10px] text-slate-400 font-mono normal-case tracking-normal">
            Device disconnected from network. Vector hotspot grid rendering offline.
          </span>
        </div>
      </div>

      {/* Offline Canvas Grid */}
      <div className="relative flex-grow w-full flex items-center justify-center border border-slate-800/80 rounded-lg bg-slate-950/60 overflow-hidden">
        {/* Draw background grid lines */}
        <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 opacity-10 pointer-events-none">
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="border border-slate-700" />
          ))}
        </div>

        {/* Center crosshair */}
        <div className="absolute w-6 h-6 border-l border-t border-cyan-500/40" />

        {/* Render Live Driver pulsating indicator if in Live Driver Mode */}
        {isLiveDriverMode && liveDriverLocation && (
          <div className="absolute z-20 flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-white"></span>
          </div>
        )}

        {/* Render Hotspot vector pins */}
        {predictions && predictions.map((pred) => {
          const isSelected = selectedPrediction?.prediction_id === pred.prediction_id;
          return (
            <button
              key={pred.prediction_id || `${pred.latitude}_${pred.longitude}`}
              onClick={() => selectPrediction(pred)}
              className={`absolute rounded-full transition-transform hover:scale-125 ${isSelected ? "ring-4 ring-white z-30 scale-125" : "z-10"}`}
              style={{
                top: `${50 + (pred.latitude - mapCenter.lat) * 200}%`,
                left: `${50 + (pred.longitude - mapCenter.lng) * 200}%`,
                backgroundColor: pred.risk_category === "Low" ? "#10B981" : pred.risk_category === "Medium" ? "#F59E0B" : pred.risk_category === "High" ? "#EF4444" : "#991B1B",
                width: isSelected ? "16px" : "12px",
                height: isSelected ? "16px" : "12px",
              }}
              title={`${pred.location_name || "Hotspot"} (${pred.risk_category})`}
            />
          );
        })}
      </div>

      <div className="mt-2 text-right">
        <span className="text-[10px] text-slate-500 font-mono">
          SafeRoute AI Offline Grid Renderer v2.0
        </span>
      </div>
    </div>
  );
}
