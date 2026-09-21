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
        <div className="w-full max-w-xl mx-auto bg-black/80 backdrop-blur-xl border border-white/10 rounded-full py-2.5 px-6 flex items-center justify-between shadow-2xl text-slate-200 text-xs transition-all duration-300 font-sans">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F97316] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#F97316]"></span>
            </span>
            <span className="font-semibold tracking-wide font-display">Live Driver Safety Mode Active</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>Data Quality:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${dataQuality.gps === "VALID" ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60" : "bg-amber-950/80 text-amber-400 border border-amber-800/60"}`}>
              {dataQuality.gps === "VALID" ? "GPS OK" : "GPS DEGRADED"}
            </span>
          </div>
        </div>
      );
    }

    const { severity, default_text, distance_m, tte_s, rule_name } = activePrimaryAlert;

    // Severity visual themes
    let containerClass = "bg-[#0F0F0F]/95 border-white/20 text-slate-100";
    let badgeClass = "bg-white/10 text-slate-300 border-white/10";
    let icon = "ℹ️";

    if (severity === "CRITICAL DRIVER WARNING") {
      containerClass = "bg-red-950/95 border-2 border-red-600 text-red-50 shadow-[0_0_35px_rgba(239,68,68,0.5)] animate-pulse";
      badgeClass = "bg-red-600 text-white font-extrabold";
      icon = "⚠️";
    } else if (severity === "WARNING") {
      containerClass = "bg-orange-950/95 border-2 border-[#F97316] text-orange-50 shadow-[0_0_30px_rgba(249,115,22,0.4)]";
      badgeClass = "bg-[#F97316] text-black font-extrabold";
      icon = "🚨";
    } else if (severity === "CAUTION") {
      containerClass = "bg-amber-950/95 border border-amber-500 text-amber-50 shadow-[0_0_20px_rgba(245,158,11,0.3)]";
      badgeClass = "bg-amber-500 text-black font-bold";
      icon = "⚡";
    }

    return (
      <div
        role="alert"
        aria-live="assertive"
        className={`w-full max-w-2xl mx-auto backdrop-blur-xl rounded-3xl p-5 flex items-center justify-between gap-4 shadow-2xl transition-all duration-300 font-sans ${containerClass}`}
      >
        <div className="flex items-center gap-3.5">
          <div className="text-3xl flex-shrink-0">{icon}</div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border font-mono ${badgeClass}`}>
                {severity}
              </span>
              <span className="text-xs font-semibold font-mono opacity-90">{rule_name}</span>
            </div>
            <p className="text-base font-bold mt-1 tracking-tight font-display">{default_text}</p>
          </div>
        </div>

        {(distance_m > 0 || tte_s !== null) && (
          <div className="flex flex-col items-end flex-shrink-0 border-l border-white/20 pl-4 font-mono">
            {distance_m > 0 && <span className="text-lg font-extrabold">{distance_m} m</span>}
            {tte_s !== null && <span className="text-xs text-slate-300 font-medium">TTE: {tte_s}s</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* TOP SAFETY BANNER AREA */}
      <div className="pointer-events-auto w-full flex justify-center pt-2">
        {renderPrimaryBanner()}
      </div>

      {/* BOTTOM GLANCEABLE TELEMETRY HUD */}
      <div className="pointer-events-auto w-full max-w-4xl mx-auto bg-[#0F0F0F]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4 text-white">
        {/* Speedometer & Advisory Speed */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center justify-center bg-black/60 border border-white/10 rounded-2xl px-5 py-2.5 min-w-[100px]">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Speed</span>
            <span className={`text-3xl sm:text-4xl font-black font-mono ${isOverspeed ? "text-amber-400" : "text-white"}`}>
              {validSpeed}
            </span>
            <span className="text-[9px] text-[#F97316] font-bold font-mono">KM/H</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Advisory Speed</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xl font-bold font-mono ${isOverspeed ? "text-amber-400" : "text-emerald-400"}`}>
                {advisorySpeed} km/h
              </span>
              <span className="text-[10px] px-2.5 py-0.5 bg-white/5 border border-white/10 rounded-full text-slate-300 font-medium font-mono">
                {baseSpeedLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Risk & Environmental Data Quality Pills */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Road Segment Risk</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${riskInfo.badgeClass}`}>
                {riskInfo.label} {mlRiskScore !== null ? `(${mlRiskScore})` : ""}
              </span>
            </div>
          </div>

          {/* Environmental Weather Quality Badge */}
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Environment</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold font-mono text-cyan-300">
                🌧️ {weatherDisplayStatus || "Clear"}
              </span>
            </div>
          </div>
        </div>

        {/* Next Hazard Preview */}
        {nextHazard && (
          <div className="flex items-center gap-3 bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5">
            <div className="text-xl">⤵️</div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Next Hazard</span>
              <span className="text-xs font-bold font-mono text-slate-200">
                {nextHazard.turn_type || "Curve"} ahead in {Math.round(nextHazard.distance_to_hazard_m || nextHazard.distance_m || 0)} m
              </span>
            </div>
          </div>
        )}
      </div>
    </div>

  );
}
