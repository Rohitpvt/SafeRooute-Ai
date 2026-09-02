import React from "react";

export default function ModeSwitcher({ activeMode, onModeChange }) {
  return (
    <div className="bg-slate-950 border border-slate-800 p-1 rounded-xl flex items-center gap-1 w-full text-xs font-semibold shadow-inner">
      <button
        type="button"
        onClick={() => onModeChange("route")}
        className={`flex-1 py-2.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
          activeMode === "route"
            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        Route Risk
      </button>

      <button
        type="button"
        onClick={() => onModeChange("live")}
        className={`flex-1 py-2.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
          activeMode === "live"
            ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
        }`}
      >
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeMode === "live" ? "bg-cyan-200" : "bg-cyan-400"}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${activeMode === "live" ? "bg-white" : "bg-cyan-400"}`}></span>
        </span>
        Live Driver
      </button>

      <button
        type="button"
        onClick={() => onModeChange("manual")}
        className={`flex-1 py-2.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
          activeMode === "manual"
            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Single Spot
      </button>
    </div>
  );
}
