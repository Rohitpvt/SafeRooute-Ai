// SafeRoute AI Centralized Map Configuration

export const MAP_PROVIDERS = {
  osm_dark: {
    id: "osm_dark",
    name: "OpenStreetMap Dark Tactical (Keyless Default)",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    className: "dark-tile-filter",
    requiresKey: false,
  },
  carto_dark: {
    id: "carto_dark",
    name: "CARTO Dark Matter (Optional with Key)",
    url: (apiKey) => `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${apiKey ? `?api_key=${apiKey}` : ""}`,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
    className: "",
    requiresKey: true,
  },
};

export const getActiveMapProvider = () => {
  const providerKey = import.meta.env.VITE_MAP_PROVIDER || "osm_dark";
  const cartoKey = import.meta.env.VITE_CARTO_API_KEY || "";

  if (providerKey === "carto_dark" && cartoKey) {
    return {
      ...MAP_PROVIDERS.carto_dark,
      url: MAP_PROVIDERS.carto_dark.url(cartoKey),
    };
  }

  // Keyless default fallback
  return MAP_PROVIDERS.osm_dark;
};

export const MAP_CONFIG = {
  DEFAULT_CENTER: [28.6139, 77.2090], // Delhi, India
  DEFAULT_ZOOM: 12,
};

// Risk score thresholds & color palettes
export const RISK_THRESHOLDS = {
  LOW: { max: 25, label: "Low", color: "#10B981", bgClass: "bg-emerald-500", textClass: "text-emerald-400" },
  MEDIUM: { max: 50, label: "Medium", color: "#F59E0B", bgClass: "bg-amber-500", textClass: "text-amber-400" },
  HIGH: { max: 75, label: "High", color: "#EF4444", bgClass: "bg-orange-500", textClass: "text-orange-400" },
  CRITICAL: { max: 100, label: "Critical", color: "#991B1B", bgClass: "bg-red-700", textClass: "text-red-400" },
};

export const getRiskCategoryFromScore = (score) => {
  if (score <= RISK_THRESHOLDS.LOW.max) return "Low";
  if (score <= RISK_THRESHOLDS.MEDIUM.max) return "Medium";
  if (score <= RISK_THRESHOLDS.HIGH.max) return "High";
  return "Critical";
};

export const getRiskColor = (category) => {
  switch (category) {
    case "Low": return RISK_THRESHOLDS.LOW.color;
    case "Medium": return RISK_THRESHOLDS.MEDIUM.color;
    case "High": return RISK_THRESHOLDS.HIGH.color;
    case "Critical": return RISK_THRESHOLDS.CRITICAL.color;
    default: return "#6B7280";
  }
};
