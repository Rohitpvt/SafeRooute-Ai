import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function RoutePlannerPage() {
  const [origin, setOrigin] = useState("MG Road, Bengaluru");
  const [destination, setDestination] = useState("Electronic City, Bengaluru");
  const [vehicleType, setVehicleType] = useState("car");
  const [routeType, setRouteType] = useState("safe"); // 'safe' | 'green' | 'fast'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [routes, setRoutes] = useState(null);

  const handlePlanRoute = (e) => {
    e.preventDefault();
    setIsAnalyzing(true);

    setTimeout(() => {
      setRoutes([
        {
          id: "route-safe",
          name: "SafeRoute AI Shield (Recommended)",
          type: "safe",
          distance: "18.4 km",
          duration: "34 mins",
          safetyScore: 94,
          riskLevel: "Low Risk",
          riskColor: "text-emerald-400 bg-emerald-950/60 border-emerald-800",
          co2Emissions: "2.8 kg CO₂",
          ecoScore: "A+",
          greenSavings: "0.9 kg CO₂ saved vs highway",
          hotspotsAvoided: 4,
          trafficStatus: "Moderate Traffic",
          highlights: [
            "Bypasses 4 critical accident hotspots near Silk Board Junction",
            "Avoids unlit sharp curves & waterlogged underpass",
            "Optimized for smooth braking acceleration curves",
          ],
        },
        {
          id: "route-green",
          name: "Eco-Green Low Emission Route",
          type: "green",
          distance: "16.8 km",
          duration: "38 mins",
          safetyScore: 88,
          riskLevel: "Low Risk",
          riskColor: "text-emerald-400 bg-emerald-950/60 border-emerald-800",
          co2Emissions: "1.9 kg CO₂",
          ecoScore: "A++",
          greenSavings: "1.8 kg CO₂ saved",
          hotspotsAvoided: 2,
          trafficStatus: "Low Traffic Signal Stops",
          highlights: [
            "Minimizes idle engine stop-and-go emissions at major signals",
            "Shaded arterial road reduces cabin AC energy draw by ~14%",
            "Lowest carbon footprint route option",
          ],
        },
        {
          id: "route-fast",
          name: "Standard Fastest Expressway",
          type: "fast",
          distance: "19.2 km",
          duration: "29 mins",
          safetyScore: 62,
          riskLevel: "Moderate Risk",
          riskColor: "text-amber-400 bg-amber-950/60 border-amber-800",
          co2Emissions: "3.7 kg CO₂",
          ecoScore: "C",
          greenSavings: "Baseline High Speed",
          hotspotsAvoided: 0,
          trafficStatus: "Heavy Speed Corridor",
          highlights: [
            "Includes 2 high-speed merging accident blackspots",
            "Elevated toll highway with high speed variation",
            "Highest fuel consumption & emissions",
          ],
        },
      ]);
      setIsAnalyzing(false);
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto w-full py-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] uppercase tracking-wider mb-2">
            <span>🗺️</span> Dual Safety & Carbon Optimization
          </div>
          <h1 className="text-3xl font-bold font-display text-white tracking-tight">
            Safe & Green Route Navigation
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Compare crash probabilities, accident hotspot bypasses, and carbon emissions for your journey.
          </p>
        </div>

        <Link
          to="/dashboard"
          className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium rounded-full text-xs transition self-start"
        >
          ← Return to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Input Form */}
        <div className="lg:col-span-4 bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 space-y-6">
          <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
            <span>📍</span> Route Parameters
          </h2>

          <form onSubmit={handlePlanRoute} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400 uppercase">Origin Point</label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#F97316] outline-none font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400 uppercase">Destination Point</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#F97316] outline-none font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-400 uppercase">Vehicle Type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#F97316] outline-none font-mono"
                >
                  <option value="car">🚗 Hatchback / Sedan</option>
                  <option value="suv">🚙 SUV / Crossover</option>
                  <option value="ev">⚡ Electric Vehicle (EV)</option>
                  <option value="two_wheeler">🏍️ Two Wheeler</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-400 uppercase">Priority Mode</label>
                <select
                  value={routeType}
                  onChange={(e) => setRouteType(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#F97316] outline-none font-mono"
                >
                  <option value="safe">🛡️ Maximum Safety</option>
                  <option value="green">🌱 Eco-Green Emissions</option>
                  <option value="fast">⚡ Fast Corridor</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isAnalyzing}
              className="w-full py-3.5 bg-[#F97316] hover:bg-[#FB923C] text-black font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] transition transform active:scale-95 flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  Calculating Risk & CO₂...
                </>
              ) : (
                <>
                  <span>🚀</span> Analyze & Generate Safe-Green Routes
                </>
              )}
            </button>
          </form>

          {/* Feature Highlight Box */}
          <div className="bg-black/60 border border-white/5 rounded-2xl p-4 space-y-3 text-xs">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <span>🌱</span> Carbon & Safety Dual Optimizer
            </h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              SafeRoute evaluates physical crash history data alongside real-time idling fuel consumption formulas to provide eco-friendly alternative paths.
            </p>
          </div>
        </div>

        {/* Right Output Comparison Cards */}
        <div className="lg:col-span-8 space-y-4">
          {!routes ? (
            <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-950/60 border border-orange-500/30 flex items-center justify-center text-3xl mx-auto">
                🗺️
              </div>
              <h3 className="text-xl font-bold font-display text-white">Enter Journey Details to Generate Routes</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Select your origin, destination, and vehicle type to compare high-safety pathways with eco-friendly low carbon emissions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-2">
                <span>3 Route Alternatives Evaluated</span>
                <span className="text-emerald-400">✓ AI Risk Model Output Ready</span>
              </div>

              {routes.map((rt) => (
                <div
                  key={rt.id}
                  className={`p-6 rounded-3xl border transition space-y-4 ${
                    rt.type === "safe"
                      ? "bg-gradient-to-r from-[#0F0F0F] via-orange-950/20 to-[#0F0F0F] border-[#F97316]/50 shadow-lg shadow-orange-500/10"
                      : "bg-[#0F0F0F] border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold font-display text-white">{rt.name}</h3>
                        {rt.type === "safe" && (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#F97316] text-black font-bold font-mono text-[10px] uppercase">
                            RECOMMENDED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        {rt.distance} • {rt.duration} • Traffic: {rt.trafficStatus}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono">
                        <span className="text-[10px] text-slate-400 uppercase block">Safety Score</span>
                        <span className="text-xl font-bold text-white">{rt.safetyScore}/100</span>
                      </div>
                      <span className={`px-3 py-1 rounded-xl text-xs font-bold font-mono border ${rt.riskColor}`}>
                        {rt.riskLevel}
                      </span>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/60 border border-white/5 rounded-2xl p-3 font-mono text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] block">ESTIMATED CO₂</span>
                      <span className="text-emerald-400 font-bold">{rt.co2Emissions}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">ECO RATING</span>
                      <span className="text-white font-bold">{rt.ecoScore}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">HOTSPOTS BYPASSED</span>
                      <span className="text-orange-400 font-bold">{rt.hotspotsAvoided} Hotspots</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">CARBON SAVINGS</span>
                      <span className="text-slate-300 font-medium text-[11px]">{rt.greenSavings}</span>
                    </div>
                  </div>

                  {/* Highlights list */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">AI Safety & Eco Highlights:</span>
                    <ul className="space-y-1">
                      {rt.highlights.map((hl, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-center gap-2">
                          <span className="text-emerald-400">✓</span> {hl}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
