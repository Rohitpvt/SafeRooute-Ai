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
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Primary Speed & Position Gauge */}
      <div className="grid grid-cols-2 gap-3">
        {/* Speed Gauge */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Live Speed</span>
            <span className="text-[9px] bg-cyan-950 border border-cyan-800/60 text-cyan-400 px-1.5 py-0.5 rounded font-mono">
              Live GPS
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black tracking-tight text-white font-mono">
              {smoothedSpeedKmH}
            </span>
            <span className="text-xs text-slate-400 font-medium">km/h</span>
          </div>
          {speedKmH !== smoothedSpeedKmH && (
            <span className="text-[10px] text-slate-500 font-mono mt-1">Raw: {speedKmH} km/h</span>
          )}
        </div>

        {/* Location Readout */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Location</span>
            <span className="text-[9px] bg-indigo-950 border border-indigo-800/60 text-indigo-400 px-1.5 py-0.5 rounded font-mono">
              GPS Telemetry
            </span>
          </div>
          <div className="mt-2 flex flex-col font-mono text-xs text-slate-200 gap-0.5">
            <div><span className="text-slate-500">Lat:</span> {latitude !== null ? latitude : "--"}</div>
            <div><span className="text-slate-500">Lng:</span> {longitude !== null ? longitude : "--"}</div>
          </div>
        </div>
      </div>

      {/* Environmental & Context Parameter Badges */}
      <div className="bg-slate-950/50 border border-slate-800/70 rounded-lg p-3 flex flex-col gap-2">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Contextual Inputs</span>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Time of Day */}
          <div className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800/60">
            <span className="text-slate-400">Time</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1">
              {timeOfDay}
              <span className="text-[9px] text-emerald-400 font-mono bg-emerald-950 px-1 rounded">Auto</span>
            </span>
          </div>

          {/* Road Type */}
          <div className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800/60">
            <span className="text-slate-400">Road</span>
            <span className="font-semibold text-slate-200">{roadType}</span>
          </div>

          {/* Weather */}
          <div className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800/60">
            <span className="text-slate-400">Weather</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1">
              {weather}
              <span className="text-[9px] text-slate-500 font-mono bg-slate-950 px-1 rounded border border-slate-800">Manual</span>
            </span>
          </div>

          {/* Traffic Density */}
          <div className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800/60">
            <span className="text-slate-400">Traffic</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1">
              {trafficDensity}
              <span className="text-[9px] text-slate-500 font-mono bg-slate-950 px-1 rounded border border-slate-800">Manual</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
