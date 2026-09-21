import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function AnalyticsInsightsPage() {
  const [timeRange, setTimeRange] = useState("30d");

  // Multi-Model comparison benchmarks
  const models = [
    {
      name: "RandomForest Classifier (Active Production v2.0)",
      accuracy: "94.8%",
      precision: "92.4%",
      recall: "95.1%",
      f1Score: "93.7%",
      latency: "4.2 ms",
      status: "Active Production",
      statusColor: "text-emerald-400 bg-emerald-950/60 border-emerald-800",
    },
    {
      name: "XGBoost Gradient Boosting",
      accuracy: "95.2%",
      precision: "93.8%",
      recall: "94.2%",
      f1Score: "94.0%",
      latency: "8.9 ms",
      status: "Candidate Benchmark",
      statusColor: "text-indigo-400 bg-indigo-950/60 border-indigo-800",
    },
    {
      name: "Logistic Regression Baseline",
      accuracy: "81.5%",
      precision: "78.2%",
      recall: "82.0%",
      f1Score: "80.1%",
      latency: "1.1 ms",
      status: "Legacy Baseline",
      statusColor: "text-slate-400 bg-slate-900 border-slate-700",
    },
    {
      name: "Deep Neural Network (MLP)",
      accuracy: "93.6%",
      precision: "91.1%",
      recall: "94.0%",
      f1Score: "92.5%",
      latency: "18.4 ms",
      status: "Experimental",
      statusColor: "text-amber-400 bg-amber-950/60 border-amber-800",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto w-full py-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 font-mono text-[11px] uppercase tracking-wider mb-2">
            <span>📊</span> Deep Safety Intelligence & ML Benchmarks
          </div>
          <h1 className="text-3xl font-bold font-display text-white tracking-tight">
            Accident Analytics & ML Model Comparison
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Analyze historical crash causes, road risk factors, and multi-algorithm machine learning model metrics.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-[#0F0F0F] border border-white/10 rounded-full px-4 py-2 text-xs font-mono text-white outline-none"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Past Year</option>
          </select>
          <Link
            to="/dashboard"
            className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium rounded-full text-xs transition"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* Top 4 Insight KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 space-y-2">
          <span className="text-xs font-mono text-slate-400 uppercase">Top Risk Factor</span>
          <h3 className="text-xl font-bold font-display text-white">Curvature & Speed</h3>
          <p className="text-xs text-orange-400 font-mono">38.4% of high-risk segments</p>
        </div>

        <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 space-y-2">
          <span className="text-xs font-mono text-slate-400 uppercase">Peak Accident Window</span>
          <h3 className="text-xl font-bold font-display text-white">18:00 - 21:00 HRS</h3>
          <p className="text-xs text-amber-400 font-mono">Dusk visibility & congestion</p>
        </div>

        <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 space-y-2">
          <span className="text-xs font-mono text-slate-400 uppercase">Active Risk Model Accuracy</span>
          <h3 className="text-xl font-bold font-display text-emerald-400">94.8% F1 Accuracy</h3>
          <p className="text-xs text-slate-400 font-mono">RandomForest v2.0</p>
        </div>

        <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 space-y-2">
          <span className="text-xs font-mono text-slate-400 uppercase">Weather Risk Impact</span>
          <h3 className="text-xl font-bold font-display text-white">+42% Risk in Rain</h3>
          <p className="text-xs text-indigo-400 font-mono">Open-Meteo precipitation data</p>
        </div>
      </div>

      {/* Section 1: ML Multi-Algorithm Benchmarking Table */}
      <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
              <span>🧠</span> Multi-Algorithm Machine Learning Benchmark Comparison
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Evaluated on 50,000+ spatial road segments with cross-validation metrics.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-black/60 px-3 py-1 rounded-full border border-white/10">
            Target Variable: Accident Severity Class
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px]">
                <th className="py-3 px-4">Algorithm Name</th>
                <th className="py-3 px-4">Accuracy</th>
                <th className="py-3 px-4">Precision</th>
                <th className="py-3 px-4">Recall</th>
                <th className="py-3 px-4">F1 Score</th>
                <th className="py-3 px-4">Inference Latency</th>
                <th className="py-3 px-4 text-right">Deployment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {models.map((m, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition">
                  <td className="py-4 px-4 font-bold text-white flex items-center gap-2">
                    {m.name}
                  </td>
                  <td className="py-4 px-4 text-emerald-400 font-bold">{m.accuracy}</td>
                  <td className="py-4 px-4 text-slate-300">{m.precision}</td>
                  <td className="py-4 px-4 text-slate-300">{m.recall}</td>
                  <td className="py-4 px-4 text-orange-400 font-bold">{m.f1Score}</td>
                  <td className="py-4 px-4 text-slate-300">{m.latency}</td>
                  <td className="py-4 px-4 text-right">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${m.statusColor}`}>
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Accident Risk Factors Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 space-y-4">
          <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
            <span>📈</span> Road Risk Factors Weights (Feature Importance)
          </h3>
          <div className="space-y-3 font-mono text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Curve Radius & Kinematic Angle</span>
                <span className="text-orange-400">32% Importance</span>
              </div>
              <div className="w-full h-2 bg-black rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 w-[32%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Precipitation & Waterlogging</span>
                <span className="text-indigo-400">26% Importance</span>
              </div>
              <div className="w-full h-2 bg-black rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-[26%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Speed Limit Variance</span>
                <span className="text-emerald-400">22% Importance</span>
              </div>
              <div className="w-full h-2 bg-black rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[22%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Lighting & Hour of Day</span>
                <span className="text-amber-400">20% Importance</span>
              </div>
              <div className="w-full h-2 bg-black rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 w-[20%]" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 space-y-4">
          <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
            <span>🌧️</span> Weather Condition Risk Modifiers
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-black/60 border border-white/5 rounded-2xl flex justify-between items-center font-mono">
              <span className="text-slate-300">Heavy Rain / Wet Asphalt</span>
              <span className="text-red-400 font-bold">+1.85x Risk Multiplier</span>
            </div>

            <div className="p-3 bg-black/60 border border-white/5 rounded-2xl flex justify-between items-center font-mono">
              <span className="text-slate-300">Dense Fog (&lt;200m visibility)</span>
              <span className="text-amber-400 font-bold">+1.60x Risk Multiplier</span>
            </div>

            <div className="p-3 bg-black/60 border border-white/5 rounded-2xl flex justify-between items-center font-mono">
              <span className="text-slate-300">High Wind (&gt;45 km/h)</span>
              <span className="text-indigo-400 font-bold">+1.30x Risk Multiplier</span>
            </div>

            <div className="p-3 bg-black/60 border border-white/5 rounded-2xl flex justify-between items-center font-mono">
              <span className="text-slate-300">Clear Dry Daylight</span>
              <span className="text-emerald-400 font-bold">1.00x Baseline Risk</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
