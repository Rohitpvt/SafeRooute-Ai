import React, { useState, useEffect } from "react";
import { useMap } from "../context/MapContext";
import apiClient from "../services/api";

export default function ApiKeyModal({ isOpen, onClose, initialTab = "gemini" }) {
  const { customApiKey, saveCustomApiKey, isOffline } = useMap();
  const [activeTab, setActiveTab] = useState(initialTab); // "gemini" | "maps"

  // Gemini Key State
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => {
    return typeof window !== "undefined" ? localStorage.getItem("gemini_api_key") || "" : "";
  });
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState({ loading: false, data: null, error: null });
  const [geminiMessage, setGeminiMessage] = useState(null);

  // Maps Key State
  const [mapsKeyInput, setMapsKeyInput] = useState(customApiKey || "");
  const [showMapsKey, setShowMapsKey] = useState(false);
  const [mapsMessage, setMapsMessage] = useState(null);

  // Probe current backend key status on open
  useEffect(() => {
    if (!isOpen) return;

    const probeKeyStatus = async () => {
      setGeminiStatus((prev) => ({ ...prev, loading: true }));
      try {
        const res = await apiClient.get("/routes/geocode/key-status");
        if (res && res.data) {
          setGeminiStatus({ loading: false, data: res.data, error: null });
        } else {
          setGeminiStatus({ loading: false, data: null, error: null });
        }
      } catch {
        setGeminiStatus({ loading: false, data: null, error: null });
      }
    };

    probeKeyStatus();
  }, [isOpen]);

  if (!isOpen) return null;

  // Handler: Save & Validate Gemini Key
  const handleSaveGemini = async (e) => {
    e.preventDefault();
    const trimmed = geminiKeyInput.trim();
    if (!trimmed) {
      handleClearGemini();
      return;
    }

    setGeminiStatus((prev) => ({ ...prev, loading: true }));
    setGeminiMessage(null);

    try {
      const response = await apiClient.post("/routes/geocode/set-key", { api_key: trimmed });
      if (response && response.success) {
        localStorage.setItem("gemini_api_key", trimmed);
        setGeminiStatus({ loading: false, data: response.data, error: null });
        setGeminiMessage({
          type: "success",
          text: "✨ Google Gemini API Key verified & activated! AI geocoding is live.",
        });
      } else {
        setGeminiMessage({
          type: "error",
          text: response?.message || "Key validation failed with Google AI Studio.",
        });
        setGeminiStatus({ loading: false, data: response?.data || null, error: response?.message });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to validate key with Google AI Studio.";
      setGeminiMessage({ type: "error", text: msg });
      setGeminiStatus({ loading: false, data: null, error: msg });
    }
  };

  // Handler: Clear Gemini Key
  const handleClearGemini = async () => {
    localStorage.removeItem("gemini_api_key");
    setGeminiKeyInput("");
    setGeminiMessage(null);
    try {
      await apiClient.post("/routes/geocode/set-key", { api_key: "" });
    } catch {
      // ignore
    }
    setGeminiStatus({
      loading: false,
      data: { configured: false, valid: false, status: "NOT_CONFIGURED" },
      error: null,
    });
    setGeminiMessage({ type: "info", text: "Gemini API key removed." });
  };

  // Handler: Save Google Maps Key
  const handleSaveMaps = (e) => {
    e.preventDefault();
    const trimmed = mapsKeyInput.trim();
    saveCustomApiKey(trimmed);
    setMapsMessage({
      type: "success",
      text: trimmed ? "Custom Google Maps API key saved! Loading basemap..." : "Key cleared. Using default configurations.",
    });
    setTimeout(() => {
      setMapsMessage(null);
      onClose();
    }, 1500);
  };

  const handleClearMaps = () => {
    setMapsKeyInput("");
    saveCustomApiKey("");
    setMapsMessage({ type: "info", text: "Reset to default system key." });
    setTimeout(() => {
      setMapsMessage(null);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl max-w-lg w-full p-6 sm:p-7 text-white shadow-2xl flex flex-col gap-5 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-orange-500/10 to-transparent pointer-events-none blur-2xl" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-950/60 border border-orange-500/30 text-orange-400 flex items-center justify-center text-lg font-mono shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              ✨
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-white tracking-tight">AI & API Keys Manager</h3>
              <p className="text-[11px] text-slate-400 font-sans">Configure live Google AI Studio & Maps keys in-app</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 z-10 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("gemini")}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-2 ${
              activeTab === "gemini" ? "bg-[#F97316] text-black font-bold shadow-md" : "text-slate-300 hover:text-white"
            }`}
          >
            <span>✨</span> Gemini AI Studio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("maps")}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-2 ${
              activeTab === "maps" ? "bg-[#F97316] text-black font-bold shadow-md" : "text-slate-300 hover:text-white"
            }`}
          >
            <span>🗺️</span> Google Maps
          </button>
        </div>

        {/* TAB 1: Google Gemini AI Studio Key */}
        {activeTab === "gemini" && (
          <div className="flex flex-col gap-4 z-10">
            {/* Status Readout */}
            <div className="flex items-center justify-between bg-black/60 border border-white/10 rounded-2xl p-3.5 text-xs font-mono">
              <span className="text-slate-400">AI Status:</span>
              {geminiStatus.loading ? (
                <span className="text-orange-400 animate-pulse font-semibold">● Validating...</span>
              ) : geminiStatus.data?.valid ? (
                <span className="text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Gemini 1.5 Active & Connected
                </span>
              ) : (
                <span className="text-amber-400 font-semibold bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-800/80">
                  ○ Key Not Configured
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Enables real-time <strong>AI Natural Language Geocoding</strong>, fuzzy landmark resolution, and conversational location parsing powered by Google Gemini.
            </p>

            <form onSubmit={handleSaveGemini} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="geminiKey" className="text-slate-300 font-semibold">
                    Google AI Studio API Key:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="text-orange-400 hover:text-orange-300 text-[11px] font-mono hover:underline"
                  >
                    {showGeminiKey ? "Hide Key" : "Show Key"}
                  </button>
                </div>

                <input
                  id="geminiKey"
                  type={showGeminiKey ? "text" : "password"}
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-black/80 border border-white/15 focus:border-[#F97316] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white outline-none transition"
                />
              </div>

              {geminiMessage && (
                <div
                  className={`p-3 rounded-xl text-xs border ${
                    geminiMessage.type === "success"
                      ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                      : geminiMessage.type === "info"
                      ? "bg-blue-950/60 border-blue-800 text-blue-300"
                      : "bg-red-950/60 border-red-800 text-red-300"
                  }`}
                >
                  {geminiMessage.text}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 mt-1">
                <button
                  type="submit"
                  disabled={geminiStatus.loading}
                  className="flex-1 bg-[#F97316] hover:bg-[#FB923C] text-black font-bold rounded-xl py-2.5 text-xs transition shadow-[0_0_20px_rgba(249,115,22,0.3)] disabled:opacity-50"
                >
                  {geminiStatus.loading ? "Validating with Google..." : "Validate & Activate AI Key"}
                </button>

                {(geminiKeyInput || geminiStatus.data?.valid) && (
                  <button
                    type="button"
                    onClick={handleClearGemini}
                    className="bg-white/5 border border-white/10 hover:bg-red-950/40 text-slate-300 hover:text-red-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition"
                  >
                    Clear Key
                  </button>
                )}
              </div>
            </form>

            {/* Google AI Studio Helper Link */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center justify-between text-xs">
              <span className="text-slate-300">Need a free Gemini API key?</span>
              <a
                href="https://aistudio.google.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-orange-400 hover:text-orange-300 font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>Get Free Key &rarr;</span>
              </a>
            </div>
          </div>
        )}

        {/* TAB 2: Google Maps Key */}
        {activeTab === "maps" && (
          <div className="flex flex-col gap-4 z-10">
            <div className="flex items-center justify-between bg-black/60 border border-white/10 rounded-2xl p-3.5 text-xs font-mono">
              <span className="text-slate-400">Maps Status:</span>
              {customApiKey ? (
                <span className="text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800">
                  Custom BYOK Key Active
                </span>
              ) : !isOffline ? (
                <span className="text-indigo-400 font-semibold bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-800">
                  Default Carto & Leaflet Map
                </span>
              ) : (
                <span className="text-amber-400 font-semibold bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-800">
                  Offline Fallback
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Optionally provide a Google Maps JavaScript API key to load Google satellite basemap layer.
            </p>

            <form onSubmit={handleSaveMaps} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="mapsKey" className="text-slate-300 font-semibold">
                    Google Maps API Key:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowMapsKey(!showMapsKey)}
                    className="text-orange-400 hover:text-orange-300 text-[11px] font-mono hover:underline"
                  >
                    {showMapsKey ? "Hide Key" : "Show Key"}
                  </button>
                </div>

                <input
                  id="mapsKey"
                  type={showMapsKey ? "text" : "password"}
                  value={mapsKeyInput}
                  onChange={(e) => setMapsKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-black/80 border border-white/15 focus:border-[#F97316] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white outline-none transition"
                />
              </div>

              {mapsMessage && (
                <div className="p-3 rounded-xl text-xs border bg-emerald-950/60 border-emerald-800 text-emerald-300">
                  {mapsMessage.text}
                </div>
              )}

              <div className="flex items-center gap-2.5 mt-1">
                <button
                  type="submit"
                  className="flex-1 bg-[#F97316] hover:bg-[#FB923C] text-black font-bold rounded-xl py-2.5 text-xs transition shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                >
                  Save & Apply Maps Key
                </button>

                {customApiKey && (
                  <button
                    type="button"
                    onClick={handleClearMaps}
                    className="bg-white/5 border border-white/10 hover:bg-slate-800 text-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition"
                  >
                    Reset
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        <span className="text-[10px] text-slate-500 font-mono text-center z-10">
          Keys are stored locally in your browser and automatically validated with Google APIs.
        </span>
      </div>
    </div>
  );
}

