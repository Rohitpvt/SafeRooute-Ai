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
      <div className="bg-[#0F0F0F] border border-white/10 rounded-2xl p-5 flex flex-col gap-3 animate-pulse">
        <div className="h-4 bg-white/10 rounded-full w-1/3"></div>
        <div className="h-10 bg-white/10 rounded-2xl w-full"></div>
        <div className="h-3 bg-white/10 rounded-full w-1/2"></div>
      </div>
    );
  }

  if (!riskData) {
    return (
      <div className="bg-[#0F0F0F] border border-white/10 rounded-2xl p-5 text-center flex flex-col items-center justify-center gap-2 text-xs text-slate-400 font-sans">
        <span>Waiting for initial GPS location to evaluate road risk...</span>
        <button
          onClick={onReevaluate}
          className="mt-1 text-[#F97316] hover:text-[#FB923C] underline font-semibold font-mono text-[11px]"
        >
          Evaluate Now
        </button>
      </div>
    );
  }

  const theme = getRiskTheme(riskData.risk_category);
  const confidencePct = Math.round((riskData.confidence_score || 0.85) * 100);

  return (
    <div className={`border rounded-2xl p-5 flex flex-col gap-3.5 transition-colors font-sans ${theme.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-200 font-display">Segment Safety Risk</span>
          {isEvaluating && (
            <span className="inline-flex items-center text-[10px] text-orange-400 font-mono animate-pulse">
              ● Refreshing...
            </span>
          )}
        </div>
        <span className={`px-3 py-0.5 text-[11px] font-bold font-mono rounded-full border ${theme.badge}`}>
          {riskData.risk_category?.toUpperCase()} RISK
        </span>
      </div>

      {/* Score gauge */}
      <div className="flex items-baseline justify-between mt-1">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-4xl font-black font-mono tracking-tight ${theme.scoreColor}`}>
            {riskData.risk_score}
          </span>
          <span className="text-xs text-slate-400 font-mono font-medium">/ 100</span>
        </div>

        <div className="flex flex-col items-end text-xs">
          <span className="text-slate-400 text-[10px] font-mono">Confidence</span>
          <span className="font-mono text-slate-200 font-bold">{confidencePct}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-black/80 rounded-full h-2.5 overflow-hidden border border-white/10">
        <div
          className={`h-full transition-all duration-500 rounded-full ${theme.bar}`}
          style={{ width: `${riskData.risk_score}%` }}
        />
      </div>

      {/* Voice Warning Speech Synthesizer Simulator Controls */}
      <div className="pt-2 border-t border-white/5 flex flex-col gap-2 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
            <span>🔊</span> Hands-Free Voice Speech Warnings
          </span>
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
            Web Speech TTS Active
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const text = `Caution: ${riskData.risk_category} risk zone detected ahead. Maintain advisory speed of ${Math.round((riskData.risk_score > 60 ? 40 : 55))} kilometers per hour.`;
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 1.05;
                utterance.pitch = riskData.risk_category === "Critical" ? 1.15 : 1.0;
                window.speechSynthesis.speak(utterance);
              }
            }}
            className="px-3 py-2 bg-white/5 hover:bg-orange-950/60 border border-white/10 hover:border-orange-500/50 text-slate-200 hover:text-orange-300 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5"
          >
            <span>🗣️</span> Test Speech Warning
          </button>

          <button
            type="button"
            onClick={() => {
              if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const text = "Critical alert! Sharp hairpin curve ahead in 150 meters. Reduce speed immediately.";
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 1.1;
                utterance.pitch = 1.2;
                window.speechSynthesis.speak(utterance);
              }
            }}
            className="px-3 py-2 bg-red-950/60 hover:bg-red-900/60 border border-red-500/40 text-red-300 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5"
          >
            <span>🚨</span> Test Critical SOS Voice
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
        <span>Evaluated {secondsAgo}s ago</span>
        <button
          onClick={onReevaluate}
          disabled={isEvaluating}
          className="text-[#F97316] hover:text-[#FB923C] hover:underline font-semibold text-[11px]"
        >
          {isEvaluating ? "Evaluating..." : "Refresh Risk"}
        </button>
      </div>
    </div>
  );
}
