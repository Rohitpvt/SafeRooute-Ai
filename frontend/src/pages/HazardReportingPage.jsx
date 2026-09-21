import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function HazardReportingPage() {
  const [hazardType, setHazardType] = useState("accident");
  const [severity, setSeverity] = useState("high");
  const [location, setLocation] = useState("Silk Board Junction, Outer Ring Rd, Bengaluru");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reports, setReports] = useState([
    {
      id: "rep-101",
      type: "Accident / Collision",
      icon: "💥",
      location: "Silk Board Underpass Flyover",
      severity: "High Hazard",
      severityColor: "text-red-400 bg-red-950/60 border-red-800",
      reportedBy: "Commuter #842",
      timeAgo: "12 mins ago",
      confirmations: 14,
      status: "Verified by SafeRoute AI",
    },
    {
      id: "rep-102",
      type: "Heavy Waterlogging & Pothole",
      icon: "🌧️",
      location: "Bellandur Outer Ring Road",
      severity: "Moderate Hazard",
      severityColor: "text-amber-400 bg-amber-950/60 border-amber-800",
      reportedBy: "Driver #194",
      timeAgo: "35 mins ago",
      confirmations: 8,
      status: "Active Alert",
    },
    {
      id: "rep-103",
      type: "Broken Down Vehicle",
      icon: "⚠️",
      location: "Electronic City Expressway Toll Gate",
      severity: "Low Hazard",
      severityColor: "text-indigo-400 bg-indigo-950/60 border-indigo-800",
      reportedBy: "Commuter #512",
      timeAgo: "1 hour ago",
      confirmations: 5,
      status: "Clearing in progress",
    },
  ]);
  const [toast, setToast] = useState(null);

  const handleSubmitReport = (e) => {
    e.preventDefault();
    setSubmitting(true);

    setTimeout(() => {
      const newRep = {
        id: `rep-${Date.now()}`,
        type:
          hazardType === "accident"
            ? "Accident / Collision"
            : hazardType === "pothole"
            ? "Pothole / Road Damage"
            : hazardType === "weather"
            ? "Severe Weather / Fog"
            : "Traffic Signal Malfunction",
        icon: hazardType === "accident" ? "💥" : hazardType === "pothole" ? "⚠️" : hazardType === "weather" ? "🌧️" : "🚦",
        location: location || "Current GPS Location",
        severity: severity === "high" ? "High Hazard" : severity === "moderate" ? "Moderate Hazard" : "Low Hazard",
        severityColor:
          severity === "high"
            ? "text-red-400 bg-red-950/60 border-red-800"
            : severity === "moderate"
            ? "text-amber-400 bg-amber-950/60 border-amber-800"
            : "text-indigo-400 bg-indigo-950/60 border-indigo-800",
        reportedBy: "You (Verified Driver)",
        timeAgo: "Just now",
        confirmations: 1,
        status: "Submitted & Broadcasting to Drivers",
      };

      setReports([newRep, ...reports]);
      setSubmitting(false);
      setDescription("");
      setToast("Hazard report broadcasted successfully to all active drivers!");
      setTimeout(() => setToast(null), 4000);
    }, 1000);
  };

  const handleUpvote = (id) => {
    setReports(
      reports.map((r) => (r.id === id ? { ...r, confirmations: r.confirmations + 1 } : r))
    );
  };

  return (
    <div className="max-w-7xl mx-auto w-full py-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/30 text-red-400 font-mono text-[11px] uppercase tracking-wider mb-2">
            <span>⚠️</span> Crowd-Sourced Hazard Network
          </div>
          <h1 className="text-3xl font-bold font-display text-white tracking-tight">
            Real-Time Hazard & Incident Reporting
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Report live road dangers, waterlogging, or accidents to immediately alert nearby SafeRoute drivers.
          </p>
        </div>

        <Link
          to="/dashboard"
          className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium rounded-full text-xs transition self-start"
        >
          ← Return to Dashboard
        </Link>
      </div>

      {toast && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-4 rounded-2xl font-mono text-xs flex items-center gap-2 animate-bounce">
          <span>✓</span> {toast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Submit New Incident */}
        <div className="lg:col-span-5 bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 space-y-6">
          <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
            <span>📢</span> Broadcast New Road Hazard
          </h2>

          <form onSubmit={handleSubmitReport} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400 uppercase">Hazard / Incident Category</label>
              <select
                value={hazardType}
                onChange={(e) => setHazardType(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#F97316] outline-none font-mono"
              >
                <option value="accident">💥 Vehicle Crash / Collision</option>
                <option value="pothole">⚠️ Road Work / Severe Potholes</option>
                <option value="weather">🌧️ Heavy Waterlogging / Fog</option>
                <option value="signal">🚦 Traffic Signal Malfunction</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400 uppercase">Hazard Severity Level</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSeverity("low")}
                  className={`py-2 rounded-xl text-xs font-mono border transition ${
                    severity === "low"
                      ? "bg-indigo-950 border-indigo-500 text-indigo-300 font-bold"
                      : "bg-black/60 border-white/10 text-slate-400"
                  }`}
                >
                  Low Risk
                </button>
                <button
                  type="button"
                  onClick={() => setSeverity("moderate")}
                  className={`py-2 rounded-xl text-xs font-mono border transition ${
                    severity === "moderate"
                      ? "bg-amber-950 border-amber-500 text-amber-300 font-bold"
                      : "bg-black/60 border-white/10 text-slate-400"
                  }`}
                >
                  Moderate
                </button>
                <button
                  type="button"
                  onClick={() => setSeverity("high")}
                  className={`py-2 rounded-xl text-xs font-mono border transition ${
                    severity === "high"
                      ? "bg-red-950 border-red-500 text-red-300 font-bold"
                      : "bg-black/60 border-white/10 text-slate-400"
                  }`}
                >
                  Critical Danger
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400 uppercase">Exact Location / Segment</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Silk Board Flyover Underpass"
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#F97316] outline-none font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400 uppercase">Additional Context Details</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Left lane blocked by overturned truck, drive slowly..."
                rows={3}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#F97316] outline-none font-mono resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.3)] transition transform active:scale-95 flex items-center justify-center gap-2"
            >
              {submitting ? "Broadcasting to Network..." : "🚨 Submit & Broadcast Live Hazard"}
            </button>
          </form>
        </div>

        {/* Right Feed: Live Incident Stream */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-2">
            <span className="flex items-center gap-2 text-white font-bold">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              Live Commuter Incident Stream
            </span>
            <span>{reports.length} Active Feeds</span>
          </div>

          <div className="space-y-4">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 space-y-4 hover:border-white/20 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-xl">
                      {rep.icon}
                    </span>
                    <div>
                      <h3 className="text-base font-bold font-display text-white">{rep.type}</h3>
                      <p className="text-xs text-slate-400 font-mono">{rep.location}</p>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-xl text-xs font-bold font-mono border ${rep.severityColor}`}>
                    {rep.severity}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs font-mono text-slate-400">
                  <span>Reported by: <strong className="text-slate-200">{rep.reportedBy}</strong> ({rep.timeAgo})</span>
                  
                  <button
                    onClick={() => handleUpvote(rep.id)}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-emerald-950/60 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <span>👍 Confirm ({rep.confirmations})</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
