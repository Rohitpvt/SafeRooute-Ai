import React from "react";
import { RISK_COLORS } from "../services/routeRiskService";

export default function RouteLegend() {
  const legendItems = [
    { label: "Low Risk (0-25)", color: RISK_COLORS.LOW },
    { label: "Medium Risk (26-50)", color: RISK_COLORS.MEDIUM },
    { label: "High Risk (51-75)", color: RISK_COLORS.HIGH },
    { label: "Critical Risk (76-100)", color: RISK_COLORS.CRITICAL },
    { label: "Risk Unavailable", color: RISK_COLORS.UNAVAILABLE },
  ];

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-lg text-xs text-slate-200 font-sans shadow-xl space-y-1.5 min-w-[170px]">
      <p className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] mb-1">
        Route Risk Legend
      </p>
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-[11px] text-slate-300 font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
