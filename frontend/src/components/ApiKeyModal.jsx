import React, { useState } from "react";
import { useMap } from "../context/MapContext";

export default function ApiKeyModal({ isOpen, onClose }) {
  const { customApiKey, saveCustomApiKey, isOffline, loaderStatus } = useMap();
  const [keyInput, setKeyInput] = useState(customApiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState(null);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    const trimmed = keyInput.trim();
    saveCustomApiKey(trimmed);
    setMessage({ type: "success", text: trimmed ? "Custom API key saved! Loading Google Maps..." : "Key cleared. Using default configurations." });
    setTimeout(() => {
      setMessage(null);
      onClose();
    }, 1500);
  };

  const handleClear = () => {
    setKeyInput("");
    saveCustomApiKey("");
    setMessage({ type: "info", text: "Reset to default system key." });
    setTimeout(() => {
      setMessage(null);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 text-white shadow-2xl flex flex-col gap-4">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center text-base">
              🔑
            </span>
            <div className="flex flex-col">
              <h3 className="text-base font-bold tracking-tight">Bring Your Own Key (BYOK)</h3>
              <span className="text-[10px] text-slate-400 font-mono">GOOGLE MAPS API CREDENTIALS</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition text-lg w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Info & Status */}
        <div className="flex flex-col gap-2 text-xs">
          <p className="text-slate-300 leading-relaxed">
            Provide your Google Maps API key to render real satellite maps, heatmaps, and live driver markers in SafeRoute AI.
          </p>

          <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px]">
            <span className="text-slate-400">Current Status:</span>
            {customApiKey ? (
              <span className="text-emerald-400 font-semibold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800">
                Custom BYOK Key Saved
              </span>
            ) : !isOffline ? (
              <span className="text-indigo-400 font-semibold bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-800">
                Default Environment Key
              </span>
            ) : (
              <span className="text-amber-400 font-semibold bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800">
                Offline Visualization Mode
              </span>
            )}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400 font-semibold flex items-center justify-between" htmlFor="byokKey">
              <span>Google Maps API Key</span>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[10px] text-indigo-400 hover:underline font-mono"
              >
                {showKey ? "Hide Key" : "Show Key"}
              </button>
            </label>
            <div className="relative flex items-center">
              <input
                id="byokKey"
                type={showKey ? "text" : "password"}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy... / AQ..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:border-indigo-500 outline-none pr-10"
              />
            </div>
          </div>

          {message && (
            <div className={`p-2.5 rounded text-xs border ${message.type === "success" ? "bg-emerald-950/50 border-emerald-800 text-emerald-300" : "bg-indigo-950/50 border-indigo-800 text-indigo-300"}`}>
              {message.text}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-2">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2.5 text-xs font-bold transition shadow-lg shadow-indigo-600/20"
            >
              Save & Apply Key
            </button>

            {customApiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg px-3 py-2.5 text-xs font-semibold transition"
              >
                Reset Default
              </button>
            )}
          </div>
        </form>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-400 flex flex-col gap-1.5 font-mono">
          <span className="text-slate-300 font-semibold flex items-center gap-1">
            <span>ℹ️</span> Google Maps Key Checklist:
          </span>
          <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-400">
            <li>Key must start with <span className="text-cyan-400 font-bold">AIzaSy...</span></li>
            <li>Enable <span className="text-slate-200">"Maps JavaScript API"</span> in Google Cloud Console</li>
            <li>HTTP Referrers must allow <span className="text-slate-200">http://localhost:5173/*</span></li>
          </ul>
        </div>

        <span className="text-[10px] text-slate-500 font-mono text-center">
          Keys are stored locally in your browser session (localStorage) and never transmitted to SafeRoute servers.
        </span>
      </div>
    </div>
  );
}
