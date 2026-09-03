/**
 * SafeRoute AI — Real-Time Driver Safety Assistant
 * Phase B: Glanceable Driver HUD Overlay Component
 *
 * Renders hands-free, non-obstructive visual safety alerts:
 * 1. Single Active Primary Safety Alert Banner (Top)
 * 2. Glanceable Telemetry HUD (Bottom) with Current Speed, Conservative Advisory Speed,
 *    Risk Indicator, Next Hazard preview, and Data Quality badges.
 *
 * CRITICAL UX RULES:
 * - Hands-free (zero touch interaction required to dismiss safety alerts).
 * - High contrast, accessible color scales (red, orange, amber, subdued slate).
 * - Sourced speed limits explicitly labeled "Mapped Speed Limit" or "Road Class Baseline".
 */

import React from "react";
import { getRiskCategoryAndColor } from "../services/routeRiskService.js";

export default function DriverHUDOverlay({
  activePrimaryAlert = null,
  currentSpeedKmh = 0,
  advisorySpeedResult = null,
  mlRiskScore = null,
  nextHazard = null,
  dataQuality = { gps: "VALID", route: "VALID", weather: "VALID", risk: "VALID" },
  weatherDisplayStatus = "Weather OK",
  isLiveDriverMode = false,
}) {

  if (!isLiveDriverMode) return null;

  const validSpeed = Math.max(0, Math.round(currentSpeedKmh || 0));
  const advisorySpeed = advisorySpeedResult?.advisory_speed_kmh ?? 50;
  const baseSpeedLabel = advisorySpeedResult?.ui_label || "Road Class Baseline";
  const isOverspeed = validSpeed > advisorySpeed;

  const riskInfo = getRiskCategoryAndColor(mlRiskScore);

  // Render Top Primary Alert Banner if active
  const renderPrimaryBanner = () => {
    if (!activePrimaryAlert) {
      return (
        <div className="w-full max-w-xl mx-auto bg-slate-950/80 backdrop-blur border border-slate-800/80 rounded-full py-2 px-4 flex items-center justify-between shadow-lg text-slate-300 text-xs transition-all duration-300">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-medium tracking-wide">Live Driver Safety Mode Active</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Data Quality:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${dataQuality.gps === "VALID" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-amber-950 text-amber-400 border border-amber-800"}`}>
              {dataQuality.gps === "VALID" ? "GPS OK" : "GPS DEGRADED"}
            </span>
          </div>
        </div>
      );
    }

    const { severity, default_text, distance_m, tte_s, rule_name } = activePrimaryAlert;

    // Severity visual themes
    let containerClass = "bg-slate-900/95 border-slate-700 text-slate-100";
    let badgeClass = "bg-slate-800 text-slate-300 border-slate-700";
    let icon = "ℹ️";

    if (severity === "CRITICAL DRIVER WARNING") {
      containerClass = "bg-red-950/95 border-2 border-red-600 text-red-50 shadow-2xl shadow-red-950/50 animate-pulse";
      badgeClass = "bg-red-600 text-white font-extrabold";
      icon = "⚠️";
    } else if (severity === "WARNING") {
      containerClass = "bg-orange-950/95 border border-orange-500 text-orange-50 shadow-xl shadow-orange-950/40";
      badgeClass = "bg-orange-600 text-white font-bold";
      icon = "🚨";
    } else if (severity === "CAUTION") {
      containerClass = "bg-amber-950/95 border border-amber-500 text-amber-50 shadow-lg shadow-amber-950/30";
      badgeClass = "bg-amber-600 text-slate-950 font-bold";
      icon = "⚡";
    }

    return (
      <div
        role="alert"
        aria-live="assertive"
        className={`w-full max-w-2xl mx-auto backdrop-blur-md rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xl transition-all duration-300 ${containerClass}`}
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl flex-shrink-0">{icon}</div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${badgeClass}`}>
                {severity}
              </span>
              <span className="text-xs font-semibold opacity-90">{rule_name}</span>
            </div>
            <p className="text-sm font-bold mt-1 tracking-tight">{default_text}</p>
          </div>
        </div>

        {(distance_m > 0 || tte_s !== null) && (
          <div className="flex flex-col items-end flex-shrink-0 border-l border-slate-700/50 pl-3">
            {distance_m > 0 && <span className="text-base font-extrabold">{distance_m} m</span>}
            {tte_s !== null && <span className="text-[11px] text-slate-300 font-medium">TTE: {tte_s}s</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-6">
      {/* TOP SAFETY BANNER AREA */}
      <div className="pointer-events-auto w-full flex justify-center pt-2">
        {renderPrimaryBanner()}
      </div>

      {/* BOTTOM GLANCEABLE TELEMETRY HUD */}
      <div className="pointer-events-auto w-full max-w-4xl mx-auto bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-4 text-white">
        {/* Speedometer & Advisory Speed */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 min-w-[90px]">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Speed</span>
            <span className={`text-3xl font-black ${isOverspeed ? "text-amber-400" : "text-white"}`}>
              {validSpeed}
            </span>
            <span className="text-[9px] text-slate-500 font-bold">KM/H</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Advisory Speed</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xl font-bold ${isOverspeed ? "text-amber-400" : "text-emerald-400"}`}>
                {advisorySpeed} km/h
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300 font-medium">
                {baseSpeedLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Risk & Environmental Data Quality Pills */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Road Segment Risk</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${riskInfo.badgeClass}`}>
                {riskInfo.label} {mlRiskScore !== null ? `(${mlRiskScore})` : ""}
              </span>
            </div>
          </div>

          {/* Environmental Weather Quality Badge */}
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Environment</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-700/80 rounded text-[11px] font-bold text-cyan-300">
                🌧️ {weatherDisplayStatus || "Weather OK"}
              </span>

            </div>
          </div>
        </div>


        {/* Next Hazard Preview */}
        {nextHazard && (
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
            <div className="text-lg">⤵️</div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Next Hazard</span>
              <span className="text-xs font-bold text-slate-200">
                {nextHazard.turn_type || "Curve"} ahead in {Math.round(nextHazard.distance_to_hazard_m || nextHazard.distance_m || 0)} m
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
