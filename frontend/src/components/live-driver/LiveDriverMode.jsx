import React, { useEffect } from "react";
import { useGeolocation, GPS_STATES } from "../../hooks/useGeolocation";
import { useDriverTelemetry } from "../../hooks/useDriverTelemetry";
import { useLiveRiskAssessment } from "../../hooks/useLiveRiskAssessment";
import { useMap } from "../../context/MapContext";
import GPSStatus from "./GPSStatus";
import LiveTelemetry from "./LiveTelemetry";
import LiveRiskCard from "./LiveRiskCard";
import DrivingSafetyBanner from "./DrivingSafetyBanner";

export default function LiveDriverMode({ onPredictionSuccess }) {
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
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col gap-4 text-white shadow-xl">
      {/* Header */}
      <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isTracking ? "bg-cyan-400" : "bg-slate-500"}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isTracking ? "bg-cyan-500" : "bg-slate-600"}`}></span>
          </span>
          <h3 className="text-base font-bold tracking-tight">Live Driver Telemetry Mode</h3>
        </div>

        {isTracking && (
          <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={followDriver}
              onChange={(e) => setFollowDriver(e.target.checked)}
              className="w-3.5 h-3.5 bg-slate-950 border border-slate-800 rounded text-indigo-600 focus:ring-0 cursor-pointer"
            />
            Follow Map
          </label>
        )}
      </div>

      {/* Safety Alert Banner */}
      <DrivingSafetyBanner transitionAlert={transitionAlert} onDismiss={clearTransitionAlert} />

      {/* Main Mode View */}
      {!isTracking ? (
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-6 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400 text-xl font-mono shadow-lg shadow-cyan-950/50">
            📡
          </div>

          <div className="flex flex-col gap-1 max-w-sm">
            <h4 className="text-sm font-bold text-slate-200">Start Real-Time Driving Monitor</h4>
            <p className="text-xs text-slate-400">
              Continuously streams GPS telemetry, speed, and automatically calculates road segment risk hands-free while driving.
            </p>
          </div>

          <button
            type="button"
            onClick={handleStart}
            className="w-full mt-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg py-3 text-sm font-bold tracking-wide transition shadow-lg shadow-cyan-600/25 flex items-center justify-center gap-2"
          >
            <span>▶</span> Start Live Driver Mode
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* GPS Status */}
          <GPSStatus
            status={gpsStatus}
            accuracyLabel={accuracyLabel}
            accuracy={telemetry.accuracy}
          />

          {/* GPS Error Message */}
          {gpsError && (
            <div className="bg-red-950/40 border border-red-900/60 text-red-400 text-xs p-3 rounded-lg flex flex-col gap-1">
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
            weather="Clear"
            trafficDensity="Low"
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
            <div className="bg-red-950/40 border border-red-900/60 text-red-400 text-xs p-2.5 rounded">
              {riskError}
            </div>
          )}

          {/* Stop Live Mode Button */}
          <button
            type="button"
            onClick={handleStop}
            className="w-full bg-slate-950 border border-red-900/50 hover:bg-red-950/40 text-red-400 hover:text-red-300 rounded-lg py-2.5 text-xs font-bold tracking-wider transition uppercase"
          >
            ■ Stop Live Driver Mode
          </button>
        </div>
      )}
    </div>
  );
}
