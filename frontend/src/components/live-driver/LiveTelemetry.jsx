import React from "react";

export default function LiveTelemetry({
  speedKmH,
  smoothedSpeedKmH,
  latitude,
  longitude,
  timeOfDay,
  weather,
  trafficDensity,
  roadType,
  weatherBadge = "Auto",
  trafficBadge = "Manual",
}) {

  return (
    <div className="flex flex-col gap-3 font-sans">
      {/* Primary Speed & Position Gauge */}
      <div className="grid grid-cols-2 gap-3">
        {/* Speed Gauge */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold font-mono">Live Speed</span>
            <span className="text-[9px] bg-orange-950/60 border border-orange-500/30 text-orange-400 px-2 py-0.5 rounded-full font-mono font-semibold">
              Live GPS
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
              {smoothedSpeedKmH}
            </span>
            <span className="text-xs text-[#F97316] font-semibold font-mono">km/h</span>
          </div>
          {speedKmH !== smoothedSpeedKmH && (
            <span className="text-[10px] text-slate-500 font-mono mt-1">Raw: {speedKmH} km/h</span>
          )}
        </div>

        {/* Location Readout */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold font-mono">Location</span>
            <span className="text-[9px] bg-white/10 border border-white/10 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              Telemetry
            </span>
          </div>
          <div className="mt-3 flex flex-col font-mono text-xs text-slate-200 gap-1">
            <div><span className="text-slate-500">Lat:</span> {latitude !== null ? latitude : "--"}</div>
            <div><span className="text-slate-500">Lng:</span> {longitude !== null ? longitude : "--"}</div>
          </div>
        </div>
      </div>

      {/* Environmental & Context Parameter Badges */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2.5">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold font-mono">Contextual Inputs</span>
        
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          {/* Time of Day */}
          <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-xl border border-white/10">
            <span className="text-slate-400">Time</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 font-mono">
              {timeOfDay}
              <span className="text-[9px] text-emerald-400 font-mono bg-emerald-950/80 px-1.5 py-0.5 rounded-full border border-emerald-800/60">Auto</span>
            </span>
          </div>

          {/* Road Type */}
          <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-xl border border-white/10">
            <span className="text-slate-400">Road</span>
            <span className="font-semibold text-slate-200 font-mono">{roadType}</span>
          </div>

          {/* Weather */}
          <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-xl border border-white/10 min-w-0">
            <span className="text-slate-400 flex-shrink-0">Weather</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 min-w-0 ml-1 font-mono">
              <span className="truncate">{weather === "Weather OK" ? "Clear" : weather}</span>
              <span className={`flex-shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${weatherBadge === "Auto" || weatherBadge === "Live" ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/60" : "bg-white/5 text-slate-400 border-white/10"}`}>
                {weatherBadge}
              </span>
            </span>
          </div>

          {/* Traffic Density */}
          <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-xl border border-white/10 min-w-0">
            <span className="text-slate-400 flex-shrink-0">Traffic</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 min-w-0 ml-1 font-mono">
              <span className="truncate">{trafficDensity}</span>
              <span className={`flex-shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${trafficBadge === "Auto" || trafficBadge === "Live" ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/60" : "bg-white/5 text-slate-400 border-white/10"}`}>
                {trafficBadge}
              </span>
            </span>
          </div>

        </div>
      </div>
    </div>
  );

}
