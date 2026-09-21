import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useMap } from "../context/MapContext";

export default function SettingsProfile() {
  const { user } = useAuth();
  const { customApiKey, saveCustomApiKey, isOffline } = useMap();

  const [keyInput, setKeyInput] = useState(customApiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSaveKey = (e) => {
    e.preventDefault();
    const trimmed = keyInput.trim();
    saveCustomApiKey(trimmed);
    setMessage({
      type: "success",
      text: trimmed
        ? "Google API key saved to local storage! Real-time maps will use your key."
        : "Key cleared. Reverted to default system configuration.",
    });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleClearKey = () => {
    setKeyInput("");
    saveCustomApiKey("");
    setMessage({ type: "info", text: "API key reset to system default." });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto w-full py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-[#F97316] p-0.5 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <div className="w-full h-full bg-black rounded-2xl flex items-center justify-center text-white text-xl font-bold font-mono">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : "U"}
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
              User Profile & Settings
            </h1>
            <p className="text-sm text-slate-400">
              Manage your personal account credentials, system preferences, and API keys.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Account Details */}
        <div className="md:col-span-1 bg-[#0F0F0F] border border-white/10 rounded-2xl p-6 space-y-6">
          <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
            <span>👤</span> Account Details
          </h2>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 font-mono uppercase text-[10px]">Email Address</span>
              <p className="text-slate-200 font-medium break-all">{user?.email || "driver@saferoute.ai"}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-mono uppercase text-[10px]">Display Name</span>
              <p className="text-slate-200 font-medium">{user?.full_name || user?.name || "SafeRoute Driver"}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-mono uppercase text-[10px]">Account Role</span>
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-orange-950/60 border border-orange-500/30 text-orange-400 font-mono text-[10px] uppercase font-bold tracking-wider">
                  {user?.role || "user"}
                </span>
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-white/5">
              <span className="text-slate-500 font-mono uppercase text-[10px]">Security Session</span>
              <p className="text-emerald-400 text-[11px] flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active JWT Session
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: API Key Configuration Section */}
        <div className="md:col-span-2 bg-[#0F0F0F] border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center text-lg">
                🔑
              </span>
              <div>
                <h2 className="text-base font-bold font-display text-white">
                  Google AI Studio & Maps API Key
                </h2>
                <p className="text-xs text-slate-400">
                  Bring Your Own Key (BYOK) for maps, satellite views & AI features
                </p>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-between bg-black/60 border border-white/10 rounded-xl p-3 text-xs font-mono">
            <span className="text-slate-400">Current API Key Status:</span>
            {customApiKey ? (
              <span className="text-emerald-400 font-semibold bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Custom Key Saved
              </span>
            ) : !isOffline ? (
              <span className="text-indigo-400 font-semibold bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-800">
                Default System Key
              </span>
            ) : (
              <span className="text-amber-400 font-semibold bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-800">
                Offline Mode
              </span>
            )}
          </div>

          {/* Key Input Form */}
          <form onSubmit={handleSaveKey} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="settingsApiKey" className="text-xs font-semibold text-slate-300">
                  Google AI Studio / Maps API Key
                </label>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono hover:underline"
                >
                  {showKey ? "Hide Key" : "Show Key"}
                </button>
              </div>
              <input
                id="settingsApiKey"
                type={showKey ? "text" : "password"}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy... / AQ..."
                className="w-full bg-black/80 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              />
            </div>

            {message && (
              <div
                className={`p-3 rounded-xl text-xs border font-medium ${
                  message.type === "success"
                    ? "bg-emerald-950/50 border-emerald-800 text-emerald-300"
                    : "bg-indigo-950/50 border-indigo-800 text-indigo-300"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-xs font-bold transition shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                Save API Key
              </button>

              {customApiKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="bg-black/60 border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl px-4 py-3 text-xs font-semibold transition"
                >
                  Remove Key
                </button>
              )}
            </div>
          </form>

          {/* Key Guidelines */}
          <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-xs text-slate-400 space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <span>ℹ️</span> Persistent Key Details:
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 leading-relaxed font-mono">
              <li>Stored locally in browser <span className="text-slate-200 font-bold">localStorage</span> until manually removed.</li>
              <li>Keys start with <span className="text-cyan-400">AIzaSy...</span> (Google Cloud / Studio Console).</li>
              <li>Enables full vector tile maps, satellite imagery & AI inferencing.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
