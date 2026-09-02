import apiClient from "./api";

const CLIENT_LOCAL_PRESETS = {
  "inderlok": { latitude: 28.6733, longitude: 77.1706, location_name: "Inderlok, North West Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "inderlok delhi": { latitude: 28.6733, longitude: 77.1706, location_name: "Inderlok, North West Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "shalimar bagh": { latitude: 28.7167, longitude: 77.1667, location_name: "Shalimar Bagh, North Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "karol bagh": { latitude: 28.6514, longitude: 77.1907, location_name: "Karol Bagh, New Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "connaught place": { latitude: 28.6315, longitude: 77.2167, location_name: "Connaught Place, New Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "cp": { latitude: 28.6315, longitude: 77.2167, location_name: "Connaught Place, New Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "india gate": { latitude: 28.6129, longitude: 77.2295, location_name: "India Gate, New Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "dhaula kuan": { latitude: 28.5912, longitude: 77.1580, location_name: "Dhaula Kuan, New Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "cyber city": { latitude: 28.4950, longitude: 77.0890, location_name: "Cyber City, Gurugram", source: "LOCAL_PRESET", match_status: "verified" },
  "noida sector 18": { latitude: 28.5700, longitude: 77.3200, location_name: "Noida Sector 18, UP", source: "LOCAL_PRESET", match_status: "verified" },
  "dwarka": { latitude: 28.5921, longitude: 77.0460, location_name: "Dwarka, New Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "janakpuri": { latitude: 28.6219, longitude: 77.0878, location_name: "Janakpuri, West Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "rohini": { latitude: 28.7041, longitude: 77.1025, location_name: "Rohini, North Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "pitampura": { latitude: 28.6989, longitude: 77.1384, location_name: "Pitampura, North Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "saket": { latitude: 28.5244, longitude: 77.2105, location_name: "Saket, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "lajpat nagar": { latitude: 28.5677, longitude: 77.2433, location_name: "Lajpat Nagar, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
};

/**
 * AI-Assisted Place Geocoding Service (Frontend).
 * Calls backend API endpoint POST /api/v1/routes/geocode.
 * Uses client-side preset fast-path and backend fallback.
 */
export async function geocodePlaceName(query) {
  if (!query || !query.trim()) return null;

  const normalized = query.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");

  // Instant Client-Side Fast Path Lookup
  if (CLIENT_LOCAL_PRESETS[normalized]) {
    return CLIENT_LOCAL_PRESETS[normalized];
  }

  for (const key of Object.keys(CLIENT_LOCAL_PRESETS)) {
    if (normalized.length >= 3 && (normalized.startsWith(key) || key.startsWith(normalized))) {
      return CLIENT_LOCAL_PRESETS[key];
    }
  }

  try {
    const response = await apiClient.post("/routes/geocode", { query: query.trim() });
    if (response && response.success && response.data) {
      const data = response.data;
      if (data.match_status === "no_match") {
        return null;
      }
      return data;
    }
  } catch (err) {
    console.warn("AI Geocoding endpoint failed, checking client fallback:", err);
  }

  return null;
}
