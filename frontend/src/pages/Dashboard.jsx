import React, { useState } from "react";
import { MapProvider, useMap } from "../context/MapContext";
import { RouteProvider } from "../context/RouteContext";
import { useAuth } from "../context/AuthContext";
import StatsCards from "../components/StatsCards";
import PredictionForm from "../components/PredictionForm";
import RouteSummaryCard from "../components/RouteSummaryCard";
import SegmentDetailsModal from "../components/SegmentDetailsModal";
import MapContainer from "../components/MapContainer";
import PredictionHistory from "../components/PredictionHistory";
import PredictionDetails from "../components/PredictionDetails";

function DashboardContent() {
  const { user } = useAuth();
  const {
    showHeatmap,
    setShowHeatmap,
    heatmapRadius,
    setHeatmapRadius,
    heatmapOpacity,
    setHeatmapOpacity,
    setPredictions,
    selectPrediction,
  } = useMap();

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handlePredictionCompleted = (newPrediction) => {
    setRefreshTrigger((prev) => prev + 1);
    setPredictions((prev) => [newPrediction, ...prev]);
    selectPrediction(newPrediction);
  };

  return (
    <div className="flex flex-col gap-8 w-full text-white font-sans">
      {/* Segment Details Modal */}
      <SegmentDetailsModal />

      {/* Dashboard Sub-Header / Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F0F0F] border border-white/10 p-6 sm:p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-orange-500/10 via-orange-500/0 to-transparent pointer-events-none blur-2xl" />
        
        <div className="space-y-1.5 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-950/60 border border-orange-500/30 text-orange-400 font-mono text-[11px] uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            Active Commuter Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
            Welcome back, <span className="font-serif italic font-normal text-[#F97316]">{user?.full_name || user?.email?.split('@')[0] || "Commuter"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-sans">
            Real-time ML accident probability inference, road segment geometry, and driver telemetry alerts.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <div className="flex flex-col items-end text-right font-mono text-xs text-slate-400 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
            <span className="text-white font-semibold">{user?.email || "Commuter"}</span>
            <span className="text-[10px] text-orange-400 uppercase">Role: {user?.role || "Driver"}</span>
          </div>
        </div>
      </div>

      {/* 2. Statistics Row */}
      <section aria-label="Quick Statistics Metrics">
        <StatsCards triggerRefresh={refreshTrigger} />
      </section>

      {/* 3. Main Viewport Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left panel: SafeRoute Control Center & Telemetry */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <PredictionForm onPredictionSuccess={handlePredictionCompleted} />
          <RouteSummaryCard />
          <PredictionDetails />
        </div>

        {/* Center/Right panel: Map Toolbar & Map Viewport */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Asterix Heatmap Toolbar */}
          <div className="bg-[#0F0F0F] border border-white/10 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <input
                id="showHeatmap"
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
                className="w-4 h-4 bg-black border border-white/20 rounded accent-[#F97316] cursor-pointer"
              />
              <label htmlFor="showHeatmap" className="text-slate-200 font-medium cursor-pointer flex items-center gap-1.5">
                <span>🔥</span> Heatmap Density Overlay
              </label>
            </div>

            {showHeatmap && (
              <div className="flex flex-wrap gap-6 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono text-[11px]">Radius:</span>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={heatmapRadius}
                    onChange={(e) => setHeatmapRadius(parseInt(e.target.value))}
                    className="w-24 accent-[#F97316] cursor-pointer"
                  />
                  <span className="font-mono text-[#F97316] text-[11px]">{heatmapRadius}px</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono text-[11px]">Opacity:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={heatmapOpacity}
                    onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                    className="w-24 accent-[#F97316] cursor-pointer"
                  />
                  <span className="font-mono text-[#F97316] text-[11px]">{Math.round(heatmapOpacity * 100)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Leaflet Map Container */}
          <div className="rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            <MapContainer />
          </div>
        </div>
      </div>

      {/* 4. Prediction History Panel */}
      <section aria-label="Predictions History log records" className="pt-4">
        <PredictionHistory triggerRefresh={refreshTrigger} />
      </section>
    </div>
  );
}

export default function Dashboard() {
  return (
    <MapProvider>
      <RouteProvider>
        <DashboardContent />
      </RouteProvider>
    </MapProvider>
  );
}
