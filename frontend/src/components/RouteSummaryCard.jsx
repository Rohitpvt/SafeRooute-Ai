import React from "react";
import { useRoute, ROUTE_STATUS } from "../context/RouteContext";
import { getRiskCategoryAndColor } from "../services/routeRiskService";

export default function RouteSummaryCard() {
  const { routeRiskResult, routeStatus, selectedSegment, selectSegment } = useRoute();

  if (routeStatus === ROUTE_STATUS.LOADING) {
    return (
      <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-4 shadow-xl text-slate-400 space-y-3 animate-pulse">
        <div className="h-4 bg-white/10 rounded-full w-1/3" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 bg-white/10 rounded-2xl" />
          <div className="h-12 bg-white/10 rounded-2xl" />
        </div>
        <div className="h-16 bg-white/10 rounded-2xl" />
      </div>
    );
  }

  if (!routeRiskResult) return null;

  const { total_distance_m, total_duration_s, segments, summary, status } = routeRiskResult;
  const { weightedRiskScore, overallCategory, highestSegmentRisk, highRiskCount, criticalRiskCount, evaluatedDistanceM } = summary;

  const distanceKm = (total_distance_m / 1000).toFixed(1);
  const durationMins = Math.round(total_duration_s / 60);
  const evalDistanceKm = (evaluatedDistanceM / 1000).toFixed(1);

  const { badgeClass } = getRiskCategoryAndColor(weightedRiskScore);

  return (
    <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-xl text-slate-100 font-sans space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 text-[#F97316]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h4 className="font-bold text-slate-100 text-sm font-display">Route Risk Summary</h4>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-bold font-mono border ${badgeClass}`}>
          {overallCategory.toUpperCase()} RISK {weightedRiskScore !== null ? `(${weightedRiskScore}/100)` : ""}
        </span>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 text-center font-mono">
        <div className="bg-white/5 border border-white/10 p-2.5 rounded-2xl">
          <div className="flex items-center justify-center text-slate-400 text-xs mb-1 font-sans">
            <svg className="w-3.5 h-3.5 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Distance
          </div>
          <p className="text-sm font-bold text-slate-100">{distanceKm} km</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-2.5 rounded-2xl">
          <div className="flex items-center justify-center text-slate-400 text-xs mb-1 font-sans">
            <svg className="w-3.5 h-3.5 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Est. Time
          </div>
          <p className="text-sm font-bold text-slate-100">{durationMins} mins</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-2.5 rounded-2xl">
          <div className="flex items-center justify-center text-slate-400 text-xs mb-1 font-sans">
            <svg className="w-3.5 h-3.5 mr-1 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Max Segment
          </div>
          <p className="text-sm font-bold text-amber-400">{highestSegmentRisk}/100</p>
        </div>
      </div>

      {/* Segment Breakdown */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span>Total Route Segments:</span>
          <span className="font-semibold text-slate-100 font-mono">{segments.length} segments</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span>High Risk Segments (51-75):</span>
          <span className={`font-semibold font-mono ${highRiskCount > 0 ? "text-orange-400" : "text-slate-400"}`}>
            {highRiskCount}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span>Critical Risk Segments (76-100):</span>
          <span className={`font-semibold font-mono ${criticalRiskCount > 0 ? "text-red-400" : "text-slate-400"}`}>
            {criticalRiskCount}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-400 border-t border-white/10 pt-2 text-[11px]">
          <span>Risk-Evaluated Distance:</span>
          <span className="font-mono">{evalDistanceKm} / {distanceKm} km</span>
        </div>
      </div>

      {/* Partial Risk Evaluation Warning if applicable */}
      {status === "PARTIAL_FAILURE" && (
        <div className="p-2.5 bg-amber-950/60 border border-amber-500/40 rounded-2xl text-xs text-amber-300 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Risk evaluation partially unavailable for some segments (rendered in slate).</span>
        </div>
      )}

      {/* Interactive Segment List for Click Inspection */}
      <div className="space-y-1.5 pt-1">
        <p className="text-[11px] text-slate-400 font-medium">Click segment to inspect details:</p>
        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
          {segments.map((seg, idx) => {
            const isSelected = selectedSegment?.segment_id === seg.segment_id;
            return (
              <button
                key={seg.segment_id}
                type="button"
                onClick={() => selectSegment(seg)}
                className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors border ${
                  isSelected
                    ? "bg-white/10 border-[#F97316] text-white"
                    : "bg-black/40 hover:bg-white/5 border-white/10 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color || "#64748B" }}
                  />
                  <span className="truncate font-medium">
                    {idx + 1}. {seg.road_name || "Segment"} ({seg.road_type})
                  </span>
                </div>
                <span className="font-mono text-[11px] shrink-0 ml-2 font-semibold" style={{ color: seg.color || "#64748B" }}>
                  {seg.risk_score !== null && seg.risk_score !== undefined ? `${seg.risk_score}%` : "N/A"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
