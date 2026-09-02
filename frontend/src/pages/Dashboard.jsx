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
  const { logout, user } = useAuth();
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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Segment Details Modal */}
      <SegmentDetailsModal />
      
      {/* 1. Top Navigation */}
      <header className="border-b border-slate-900 bg-slate-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-600/30">
            SR
          </span>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight">SafeRoute AI</span>
            <span className="text-[10px] text-slate-500 font-mono tracking-wider">PREDICTIVE ROAD SAFETY ENGINE</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end text-xs">
            <span className="text-slate-300 font-semibold">{user?.email || "User Profile"}</span>
            <span className="text-[10px] text-indigo-400 capitalize">Commuter Portal</span>
          </div>
          <button
            onClick={logout}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs px-3.5 py-2 rounded font-semibold tracking-wide transition text-red-400"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main viewport */}
      <main className="flex-grow p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        
        {/* 2. Statistics Row */}
        <section aria-label="Quick Statistics Metrics">
          <StatsCards triggerRefresh={refreshTrigger} />
        </section>

        {/* 3. Viewport Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Unified SafeRoute Control Center */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <PredictionForm onPredictionSuccess={handlePredictionCompleted} />
            <RouteSummaryCard />
            <PredictionDetails />
          </div>

          {/* Center map viewports */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            {/* Map Controls toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-wrap gap-4 items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <input
                  id="showHeatmap"
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={(e) => setShowHeatmap(e.target.checked)}
                  className="w-4 h-4 bg-slate-950 border border-slate-800 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="showHeatmap" className="text-slate-300 font-semibold cursor-pointer">
                  Toggle Heatmap overlay
                </label>
              </div>

              {showHeatmap && (
                <div className="flex flex-wrap gap-6 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Radius:</span>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={heatmapRadius}
                      onChange={(e) => setHeatmapRadius(parseInt(e.target.value))}
                      className="w-24 accent-indigo-500 cursor-pointer"
                    />
                    <span className="font-mono text-slate-500">{heatmapRadius}px</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Opacity:</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={heatmapOpacity}
                      onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                      className="w-24 accent-indigo-500 cursor-pointer"
                    />
                    <span className="font-mono text-slate-500">{Math.round(heatmapOpacity * 100)}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Leaflet Map canvas container */}
            <MapContainer />
          </div>
        </div>

        {/* 4. History Logs List Panel */}
        <section aria-label="Predictions History log records">
          <PredictionHistory triggerRefresh={refreshTrigger} />
        </section>
      </main>
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
