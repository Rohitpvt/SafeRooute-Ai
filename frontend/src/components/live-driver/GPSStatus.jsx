import React from "react";
import { GPS_STATES } from "../../hooks/useGeolocation";

export default function GPSStatus({ status, accuracyLabel, accuracy }) {
  const getBadgeStyle = () => {
    switch (status) {
      case GPS_STATES.ACTIVE:
        return {
          text: "Connected",
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
          dot: "bg-emerald-400 animate-pulse",
        };
      case GPS_STATES.DEGRADED:
        return {
          text: "Degraded GPS",
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          dot: "bg-amber-400",
        };
      case GPS_STATES.ACQUIRING_GPS:
      case GPS_STATES.REQUESTING_PERMISSION:
        return {
          text: "Acquiring Lock...",
          bg: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
          dot: "bg-cyan-400 animate-ping",
        };
      case GPS_STATES.ERROR:
        return {
          text: "GPS Offline",
          bg: "bg-red-500/10 border-red-500/30 text-red-400",
          dot: "bg-red-400",
        };
      case GPS_STATES.STOPPED:
      case GPS_STATES.IDLE:
      default:
        return {
          text: "Idle",
          bg: "bg-slate-800 border-slate-700 text-slate-400",
          dot: "bg-slate-500",
        };
    }
  };

  const badge = getBadgeStyle();

  return (
    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs font-sans">
      <div className="flex items-center gap-2.5">
        <span className="text-slate-400 font-medium">GPS Status:</span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold font-mono ${badge.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
          {badge.text}
        </span>
      </div>

      <div className="flex items-center gap-1.5 font-mono text-[11px]">
        <span className="text-slate-500">Accuracy:</span>
        <span className={accuracyLabel?.color || "text-slate-300"}>
          {accuracy !== null && accuracy !== undefined ? `${accuracy}m` : "--"}
        </span>
      </div>
    </div>
  );
}

