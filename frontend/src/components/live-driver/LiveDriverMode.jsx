import React, { useEffect } from "react";
import { useGeolocation, GPS_STATES } from "../../hooks/useGeolocation";
import { useDriverTelemetry } from "../../hooks/useDriverTelemetry";
import { useLiveRiskAssessment } from "../../hooks/useLiveRiskAssessment";
import { useMap } from "../../context/MapContext";
import GPSStatus from "./GPSStatus";
import LiveTelemetry from "./LiveTelemetry";
import LiveRiskCard from "./LiveRiskCard";
import DrivingSafetyBanner from "./DrivingSafetyBanner";

import { environmentService } from "../../services/environmentService";

export default function LiveDriverMode({ onPredictionSuccess }) {
  const [envWeather, setEnvWeather] = React.useState("Clear");
  const [envQuality, setEnvQuality] = React.useState("VALID");

  const {
    status: gpsStatus,
    position,
    error: gpsError,
    accuracyLabel,
    startTracking,
    stopTracking,
    isTracking,
  } = useGeolocation();

  const telemetry = useDriverTelemetry(position);

  useEffect(() => {
    if (position?.latitude && position?.longitude) {
      environmentService
        .getEnvironmentalContext(position.latitude, position.longitude)
        .then((env) => {
          if (env?.display_status) {
            setEnvWeather(env.display_status);
            setEnvQuality(env.quality || "VALID");
          }
        })
        .catch(() => {});
    }
  }, [position?.latitude, position?.longitude]);


  const {
    setLiveDriverLocation,
    setIsLiveDriverMode,
    followDriver,
    setFollowDriver,
  } = useMap();

  const {
    riskData,
    isEvaluating,
    error: riskError,
    lastEvaluatedTime,
    transitionAlert,
    clearTransitionAlert,
    evaluateNow,
    resetAssessment,
  } = useLiveRiskAssessment({
    position,
    speedKmH: telemetry.smoothedSpeedKmH,
    timeOfDay: telemetry.timeOfDay,
    enabled: isTracking && (gpsStatus === GPS_STATES.ACTIVE || gpsStatus === GPS_STATES.DEGRADED),
    onPredictionSuccess,
  });

  // Sync telemetry position to MapContext for driver marker on Google Map and SVG Fallback Map
  useEffect(() => {
    if (isTracking && position) {
      setLiveDriverLocation({
        lat: position.latitude,
        lng: position.longitude,
        accuracy: position.accuracy,
        heading: position.heading,
        speed: telemetry.smoothedSpeedKmH,
      });
      setIsLiveDriverMode(true);
    } else {
      setLiveDriverLocation(null);
      setIsLiveDriverMode(false);
    }
  }, [position, isTracking, telemetry.smoothedSpeedKmH, setLiveDriverLocation, setIsLiveDriverMode]);

  // Handler for explicit Start Live Driver Mode button
  const handleStart = () => {
    startTracking();
  };

  // Handler for explicit Stop Live Driver Mode button
  const handleStop = () => {
    stopTracking();
    resetAssessment();
    setLiveDriverLocation(null);
    setIsLiveDriverMode(false);
  };

  return (
    <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 flex flex-col gap-5 text-white shadow-2xl relative overflow-hidden">
      {/* Background Subtle Backglow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-orange-500/10 to-transparent pointer-events-none blur-2xl" />

      {/* Header */}
      <div className="border-b border-white/10 pb-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isTracking ? "bg-[#F97316]" : "bg-slate-500"}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isTracking ? "bg-[#F97316]" : "bg-slate-600"}`}></span>
          </span>
          <h3 className="text-base font-bold font-display tracking-tight text-white">Live Driver Telemetry Mode</h3>
        </div>

        {isTracking && (
          <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={followDriver}
              onChange={(e) => setFollowDriver(e.target.checked)}
              className="w-3.5 h-3.5 bg-black border border-white/20 rounded accent-[#F97316] cursor-pointer"
            />
            Follow Map
          </label>
        )}
      </div>

      {/* Safety Alert Banner */}
      <DrivingSafetyBanner transitionAlert={transitionAlert} onDismiss={clearTransitionAlert} />

      {/* Main Mode View */}
      {!isTracking ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 z-10">
          <div className="w-14 h-14 rounded-full bg-orange-950/60 border border-orange-500/30 flex items-center justify-center text-[#F97316] text-2xl font-mono shadow-[0_0_20px_rgba(249,115,22,0.3)]">
            📡
          </div>

          <div className="flex flex-col gap-1 max-w-sm">
            <h4 className="text-base font-bold font-display text-white">Start Real-Time Driving Monitor</h4>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Continuously streams GPS telemetry, speed, and automatically calculates road segment risk hands-free while driving.
            </p>
          </div>

          <button
            type="button"
            onClick={handleStart}
            className="w-full mt-2 bg-[#F97316] hover:bg-[#FB923C] text-black font-semibold rounded-full py-3.5 text-sm tracking-wide transition shadow-[0_0_25px_rgba(249,115,22,0.4)] flex items-center justify-center gap-2 active:scale-95"
          >
            <span>▶</span> Start Live Driver Mode
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 z-10">
          {/* GPS Status */}
          <GPSStatus
            status={gpsStatus}
            accuracyLabel={accuracyLabel}
            accuracy={telemetry.accuracy}
          />

          {/* GPS Error Message */}
          {gpsError && (
            <div className="bg-red-950/40 border border-red-900/60 text-red-400 text-xs p-3 rounded-2xl flex flex-col gap-1">
              <span className="font-semibold">GPS Warning</span>
              <span>{gpsError}</span>
            </div>
          )}

          {/* Live Telemetry Display */}
          <LiveTelemetry
            speedKmH={telemetry.speedKmH}
            smoothedSpeedKmH={telemetry.smoothedSpeedKmH}
            latitude={telemetry.latitude}
            longitude={telemetry.longitude}
            timeOfDay={telemetry.timeOfDay}
            weather={envWeather}
            weatherBadge={envQuality === "UNAVAILABLE" ? "Manual" : "Auto"}
            trafficDensity="Low"
            trafficBadge="Manual"
            roadType="Arterial"
          />

          {/* Live Risk Evaluation Card */}
          <LiveRiskCard
            riskData={riskData}
            isEvaluating={isEvaluating}
            lastEvaluatedTime={lastEvaluatedTime}
            onReevaluate={evaluateNow}
          />

          {riskError && (
            <div className="bg-red-950/40 border border-red-900/60 text-red-400 text-xs p-3 rounded-2xl">
              {riskError}
            </div>
          )}

          {/* Stop Live Mode Button */}
          <button
            type="button"
            onClick={handleStop}
            className="w-full bg-white/5 border border-red-500/30 hover:bg-red-950/40 text-red-400 hover:text-red-300 rounded-full py-3 text-xs font-bold tracking-wider transition uppercase"
          >
            ■ Stop Live Driver Mode
          </button>
        </div>
      )}
    </div>
  );

}
