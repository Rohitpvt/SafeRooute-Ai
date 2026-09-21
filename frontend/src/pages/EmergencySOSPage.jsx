import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function EmergencySOSPage() {
  const [contacts, setContacts] = useState([
    { id: "c1", name: "Ananya Ghosh (Spouse)", phone: "+91 98765 43210", relation: "Primary Guardian", verified: true },
    { id: "c2", name: "Rahul Sharma (Brother)", phone: "+91 91234 56789", relation: "Secondary Emergency", verified: true },
  ]);

  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [liveLocationSharing, setLiveLocationSharing] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newRelation, setNewRelation] = useState("Family Member");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timer;
    if (sosActive && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    } else if (sosActive && countdown === 0) {
      setLiveLocationSharing(true);
      setToast("EMERGENCY ALERT DISPATCHED: Guardian contacts & 112 Police notified with live GPS pin!");
    }
    return () => clearInterval(timer);
  }, [sosActive, countdown]);

  const handleTriggerSOS = () => {
    setSosActive(true);
    setCountdown(5);
  };

  const handleCancelSOS = () => {
    setSosActive(false);
    setCountdown(5);
    setLiveLocationSharing(false);
    setToast("SOS Broadcast cancelled by user.");
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddContact = (e) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone) return;

    const newC = {
      id: `c-${Date.now()}`,
      name: newContactName,
      phone: newContactPhone,
      relation: newRelation,
      verified: true,
    };

    setContacts([...contacts, newC]);
    setNewContactName("");
    setNewContactPhone("");
    setToast("New Guardian Contact added successfully!");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto w-full py-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/30 text-red-400 font-mono text-[11px] uppercase tracking-wider mb-2">
            <span>🚨</span> Guardian Safety Network
          </div>
          <h1 className="text-3xl font-bold font-display text-white tracking-tight">
            Emergency SOS & Live Guardian Sharing
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dispatch instant high-priority alerts with live telemetry GPS location sharing to family guardians & emergency services.
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
        <div className="bg-red-950/90 border border-red-500/80 text-white p-4 rounded-2xl font-mono text-xs flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2">
            <span>🚨</span> {toast}
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main SOS Trigger Hero Banner */}
      <div className="bg-gradient-to-r from-[#0F0F0F] via-red-950/30 to-[#0F0F0F] border border-red-500/40 rounded-3xl p-8 sm:p-12 text-center space-y-6 relative overflow-hidden shadow-2xl">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="w-24 h-24 rounded-full bg-red-600/20 border-2 border-red-500/50 flex items-center justify-center text-4xl mx-auto animate-pulse">
            🚨
          </div>

          <h2 className="text-3xl font-bold font-display text-white">
            {sosActive
              ? countdown > 0
                ? `DISPATCHING SOS IN ${countdown} SECONDS...`
                : "SOS BROADCAST IS LIVE"
              : "Emergency Panic Dispatch"}
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed font-sans">
            {sosActive
              ? countdown > 0
                ? "Click cancel if triggered by mistake. Otherwise, live GPS tracking and SMS alerts will be transmitted immediately."
                : "Live telemetry transmission active. 2 emergency contacts & emergency services have received your exact GPS pin."
              : "Press the panic button below during collisions, severe hazards, or personal safety threats to notify guardians instantly."}
          </p>

          <div className="pt-2 flex justify-center">
            {!sosActive ? (
              <button
                onClick={handleTriggerSOS}
                className="px-10 py-5 bg-red-600 hover:bg-red-500 text-white font-black text-lg rounded-full shadow-[0_0_40px_rgba(239,68,68,0.5)] transition transform hover:scale-105 active:scale-95 tracking-wide uppercase font-mono"
              >
                🚨 Trigger Emergency SOS
              </button>
            ) : (
              <button
                onClick={handleCancelSOS}
                className="px-10 py-4 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white font-bold text-sm rounded-full transition shadow-lg font-mono"
              >
                ✕ Cancel SOS Dispatch
              </button>
            )}
          </div>
        </div>

        {/* Live Location Sharing Status Bar */}
        {liveLocationSharing && (
          <div className="mt-8 bg-black/80 border border-red-500/50 rounded-2xl p-4 max-w-2xl mx-auto text-left font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-red-400">
              <span className="flex items-center gap-2 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                LIVE LOCATION TELEMETRY TRANSMISSION
              </span>
              <span>GPS ACCURACY: ±3m</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-300 text-[11px] pt-1">
              <div>LATITUDE: <span className="text-white font-bold">12.9716° N</span></div>
              <div>LONGITUDE: <span className="text-white font-bold">77.5946° E</span></div>
              <div>SPEED: <span className="text-white font-bold">48 km/h</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Guardian Contacts List */}
        <div className="lg:col-span-7 bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
              <span>👥</span> Designated Guardian Contacts ({contacts.length})
            </h3>
            <span className="text-xs text-emerald-400 font-mono">SMS & Voice Alert Ready</span>
          </div>

          <div className="space-y-4">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="bg-black/60 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-950/60 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold font-mono">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{c.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">{c.phone} • {c.relation}</p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-mono text-[10px] font-bold">
                  VERIFIED GUARDIAN
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Contact Form */}
        <div className="lg:col-span-5 bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
            <span>➕</span> Add Emergency Guardian
          </h3>

          <form onSubmit={handleAddContact} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400 uppercase">Contact Full Name</label>
              <input
                type="text"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                placeholder="e.g. Vikram Sharma"
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#F97316] outline-none font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400 uppercase">Mobile Phone Number</label>
              <input
                type="tel"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                placeholder="+91 98765 00000"
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#F97316] outline-none font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400 uppercase">Relationship</label>
              <select
                value={newRelation}
                onChange={(e) => setNewRelation(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#F97316] outline-none font-mono"
              >
                <option value="Spouse">Spouse / Partner</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Friend">Trusted Friend</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-xl transition font-mono"
            >
              + Save Guardian Contact
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
