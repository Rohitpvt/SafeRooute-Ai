import React, { useState, useEffect } from "react";

const getRiskTheme = (category) => {
  switch (category) {
    case "Low":
      return {
        bg: "bg-emerald-950/30 border-emerald-800/60",
        badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
        scoreColor: "text-emerald-400",
        bar: "bg-emerald-500",
      };
    case "Medium":
      return {
        bg: "bg-amber-950/30 border-amber-800/60",
        badge: "bg-amber-500/20 text-amber-400 border-amber-500/40",
        scoreColor: "text-amber-400",
        bar: "bg-amber-500",
      };
    case "High":
      return {
        bg: "bg-orange-950/30 border-orange-800/60",
        badge: "bg-orange-500/20 text-orange-400 border-orange-500/40",
        scoreColor: "text-orange-400",
        bar: "bg-orange-500",
      };
    case "Critical":
      return {
        bg: "bg-red-950/40 border-red-800/80",
        badge: "bg-red-600/30 text-red-300 border-red-500/50",
        scoreColor: "text-red-400",
        bar: "bg-red-600",
      };
    default:
      return {
        bg: "bg-slate-950/40 border-slate-800",
        badge: "bg-slate-800 text-slate-400 border-slate-700",
        scoreColor: "text-slate-300",
        bar: "bg-indigo-500",
      };
  }
};

export default function LiveRiskCard({ riskData, isEvaluating, lastEvaluatedTime, onReevaluate }) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!lastEvaluatedTime) return;

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - lastEvaluatedTime) / 1000);
      setSecondsAgo(elapsed >= 0 ? elapsed : 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lastEvaluatedTime]);

  if (isEvaluating && !riskData) {
    return (
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 flex flex-col gap-3 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/3"></div>
        <div className="h-10 bg-slate-800 rounded w-full"></div>
        <div className="h-3 bg-slate-800 rounded w-1/2"></div>
      </div>
    );
  }

  if (!riskData) {
    return (
      <div className="bg-slate-950/50 border border-slate-800/70 rounded-lg p-4 text-center flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
        <span>Waiting for initial GPS location to evaluate road risk...</span>
        <button
          onClick={onReevaluate}
          className="mt-1 text-indigo-400 hover:text-indigo-300 underline font-medium text-[11px]"
        >
          Evaluate Now
        </button>
      </div>
    );
  }

  const theme = getRiskTheme(riskData.risk_category);
  const confidencePct = Math.round((riskData.confidence_score || 0.85) * 100);

  return (
    <div className={`border rounded-lg p-4 flex flex-col gap-3 transition-colors ${theme.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-300">Segment Safety Risk</span>
          {isEvaluating && (
            <span className="inline-flex items-center text-[10px] text-cyan-400 font-mono animate-pulse">
              ● Refreshing...
            </span>
          )}
        </div>
        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${theme.badge}`}>
          {riskData.risk_category?.toUpperCase()} RISK
        </span>
      </div>

      {/* Score gauge */}
      <div className="flex items-baseline justify-between mt-1">
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-black font-mono tracking-tight ${theme.scoreColor}`}>
            {riskData.risk_score}
          </span>
          <span className="text-xs text-slate-400 font-medium">/ 100</span>
        </div>

        <div className="flex flex-col items-end text-xs">
          <span className="text-slate-400 text-[10px]">Confidence</span>
          <span className="font-mono text-slate-200 font-semibold">{confidencePct}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
        <div
          className={`h-full transition-all duration-500 ${theme.bar}`}
          style={{ width: `${Math.min(100, Math.max(0, riskData.risk_score))}%` }}
        ></div>
      </div>

      {/* Last evaluation timestamp footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
        <span>Last assessment: {secondsAgo}s ago</span>
        <button
          onClick={onReevaluate}
          disabled={isEvaluating}
          className="text-indigo-400 hover:text-indigo-300 transition text-[10px] font-semibold tracking-wider hover:underline"
        >
          FORCE RE-EVALUATE
        </button>
      </div>
    </div>
  );
}
