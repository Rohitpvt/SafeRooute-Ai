import React from "react";

export default function DrivingSafetyBanner({ transitionAlert, onDismiss }) {
  if (!transitionAlert) return null;

  return (
    <div className="bg-amber-950/90 border border-amber-500/60 rounded-lg p-3 text-amber-200 text-xs flex items-center justify-between shadow-lg shadow-amber-950/40 animate-pulse">
      <div className="flex items-center gap-2.5">
        <span className="text-lg">⚠️</span>
        <div className="flex flex-col">
          <span className="font-bold tracking-wide text-amber-100 uppercase text-[11px]">
            Safety Advisory Escalation
          </span>
          <span className="font-medium text-amber-200">{transitionAlert.message}</span>
        </div>
      </div>

      <button
        onClick={onDismiss}
        className="text-amber-400 hover:text-white transition px-2 py-1 rounded bg-amber-900/50 hover:bg-amber-900 text-[10px] font-mono"
      >
        DISMISS
      </button>
    </div>
  );
}
