import apiClient from "./api";

const CLIENT_LOCAL_PRESETS = {
  // Major Transportation Hubs & Terminals
  "kashmiri gate": { latitude: 28.6675, longitude: 77.2285, location_name: "Kashmere Gate, Old Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "kashmere gate": { latitude: 28.6675, longitude: 77.2285, location_name: "Kashmere Gate, Old Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "isbt": { latitude: 28.6675, longitude: 77.2285, location_name: "Kashmere Gate ISBT, Old Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "isbt kashmere gate": { latitude: 28.6675, longitude: 77.2285, location_name: "Kashmere Gate ISBT, Old Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "isbt kashmiri gate": { latitude: 28.6675, longitude: 77.2285, location_name: "Kashmere Gate ISBT, Old Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "kashmiri gate metro": { latitude: 28.6675, longitude: 77.2285, location_name: "Kashmere Gate Metro Station", source: "LOCAL_PRESET", match_status: "verified" },
  "kashmere gate metro": { latitude: 28.6675, longitude: 77.2285, location_name: "Kashmere Gate Metro Station", source: "LOCAL_PRESET", match_status: "verified" },
  "new delhi railway station": { latitude: 28.6428, longitude: 77.2201, location_name: "New Delhi Railway Station (NDLS)", source: "LOCAL_PRESET", match_status: "verified" },
  "ndls": { latitude: 28.6428, longitude: 77.2201, location_name: "New Delhi Railway Station (NDLS)", source: "LOCAL_PRESET", match_status: "verified" },
  "old delhi railway station": { latitude: 28.6617, longitude: 77.2307, location_name: "Old Delhi Railway Station (DLI)", source: "LOCAL_PRESET", match_status: "verified" },
  "dli": { latitude: 28.6617, longitude: 77.2307, location_name: "Old Delhi Railway Station (DLI)", source: "LOCAL_PRESET", match_status: "verified" },
  "hazrat nizamuddin": { latitude: 28.5885, longitude: 77.2536, location_name: "Hazrat Nizamuddin Railway Station", source: "LOCAL_PRESET", match_status: "verified" },
  "nizamuddin": { latitude: 28.5885, longitude: 77.2536, location_name: "Hazrat Nizamuddin Railway Station", source: "LOCAL_PRESET", match_status: "verified" },
  "anand vihar isbt": { latitude: 28.6469, longitude: 77.3160, location_name: "Anand Vihar ISBT, East Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "anand vihar": { latitude: 28.6469, longitude: 77.3160, location_name: "Anand Vihar, East Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "sarai kale khan": { latitude: 28.5900, longitude: 77.2567, location_name: "Sarai Kale Khan ISBT, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "igi airport": { latitude: 28.5562, longitude: 77.1000, location_name: "IGI Airport T3, New Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "delhi airport": { latitude: 28.5562, longitude: 77.1000, location_name: "IGI Airport T3, New Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "airport": { latitude: 28.5562, longitude: 77.1000, location_name: "IGI Airport T3, New Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "aerocity": { latitude: 28.5490, longitude: 77.1210, location_name: "Aerocity, New Delhi", source: "LOCAL_PRESET", match_status: "verified" },

  // Central & Landmark Locations
  "connaught place": { latitude: 28.6315, longitude: 77.2167, location_name: "Connaught Place, New Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "cp": { latitude: 28.6315, longitude: 77.2167, location_name: "Connaught Place, New Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "rajiv chowk": { latitude: 28.6328, longitude: 77.2197, location_name: "Rajiv Chowk (CP), New Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "india gate": { latitude: 28.6129, longitude: 77.2295, location_name: "India Gate, New Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "red fort": { latitude: 28.6562, longitude: 77.2410, location_name: "Red Fort, Central Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "lal qila": { latitude: 28.6562, longitude: 77.2410, location_name: "Red Fort, Central Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "chandni chowk": { latitude: 28.6506, longitude: 77.2303, location_name: "Chandni Chowk, Central Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "jama masjid": { latitude: 28.6507, longitude: 77.2334, location_name: "Jama Masjid, Central Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "khan market": { latitude: 28.6003, longitude: 77.2270, location_name: "Khan Market, Central Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "rashtrapati bhavan": { latitude: 28.6143, longitude: 77.1994, location_name: "Rashtrapati Bhavan, New Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "parliament": { latitude: 28.6172, longitude: 77.2081, location_name: "Parliament House, New Delhi", source: "LOCAL_PRESET", match_status: "verified" },

  // South Delhi
  "aiims": { latitude: 28.5672, longitude: 77.2100, location_name: "AIIMS New Delhi, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "aiims delhi": { latitude: 28.5672, longitude: 77.2100, location_name: "AIIMS New Delhi, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "safdarjung": { latitude: 28.5684, longitude: 77.2062, location_name: "Safdarjung Hospital, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "safdarjung enclave": { latitude: 28.5630, longitude: 77.1960, location_name: "Safdarjung Enclave, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "dhaula kuan": { latitude: 28.5912, longitude: 77.1580, location_name: "Dhaula Kuan, New Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "lajpat nagar": { latitude: 28.5677, longitude: 77.2433, location_name: "Lajpat Nagar, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "saket": { latitude: 28.5244, longitude: 77.2105, location_name: "Saket, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "hauz khas": { latitude: 28.5494, longitude: 77.2001, location_name: "Hauz Khas, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "iit delhi": { latitude: 28.5450, longitude: 77.1926, location_name: "IIT Delhi, Hauz Khas", source: "LOCAL_PRESET", match_status: "verified" },
  "green park": { latitude: 28.5589, longitude: 77.2028, location_name: "Green Park, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "malviya nagar": { latitude: 28.5355, longitude: 77.2090, location_name: "Malviya Nagar, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "greater kailash": { latitude: 28.5482, longitude: 77.2343, location_name: "Greater Kailash, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "gk": { latitude: 28.5482, longitude: 77.2343, location_name: "Greater Kailash, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "south extension": { latitude: 28.5694, longitude: 77.2195, location_name: "South Extension, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "defence colony": { latitude: 28.5727, longitude: 77.2312, location_name: "Defence Colony, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "nehru place": { latitude: 28.5492, longitude: 77.2517, location_name: "Nehru Place, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "kalkaji": { latitude: 28.5412, longitude: 77.2554, location_name: "Kalkaji, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "lotus temple": { latitude: 28.5535, longitude: 77.2588, location_name: "Lotus Temple, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "qutub minar": { latitude: 28.5245, longitude: 77.1855, location_name: "Qutub Minar, Mehrauli", source: "LOCAL_PRESET", match_status: "verified" },
  "qutab minar": { latitude: 28.5245, longitude: 77.1855, location_name: "Qutub Minar, Mehrauli", source: "LOCAL_PRESET", match_status: "verified" },
  "mehrauli": { latitude: 28.5173, longitude: 77.1852, location_name: "Mehrauli, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "chhatarpur": { latitude: 28.5029, longitude: 77.1842, location_name: "Chhatarpur, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "vasant kunj": { latitude: 28.5293, longitude: 77.1552, location_name: "Vasant Kunj, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "vasant vihar": { latitude: 28.5588, longitude: 77.1601, location_name: "Vasant Vihar, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "sarojini nagar": { latitude: 28.5772, longitude: 77.1983, location_name: "Sarojini Nagar, South Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "okhla": { latitude: 28.5308, longitude: 77.2713, location_name: "Okhla Industrial Area, Delhi", source: "LOCAL_PRESET", match_status: "verified" },

  // West & North-West Delhi
  "inderlok": { latitude: 28.6733, longitude: 77.1706, location_name: "Inderlok, North West Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "inderlok delhi": { latitude: 28.6733, longitude: 77.1706, location_name: "Inderlok, North West Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "karol bagh": { latitude: 28.6514, longitude: 77.1907, location_name: "Karol Bagh, New Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "dwarka": { latitude: 28.5921, longitude: 77.0460, location_name: "Dwarka, New Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "janakpuri": { latitude: 28.6219, longitude: 77.0878, location_name: "Janakpuri, West Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "rajouri garden": { latitude: 28.6492, longitude: 77.1226, location_name: "Rajouri Garden, West Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "punjabi bagh": { latitude: 28.6692, longitude: 77.1264, location_name: "Punjabi Bagh, West Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "paschim vihar": { latitude: 28.6698, longitude: 77.0926, location_name: "Paschim Vihar, West Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "tilak nagar": { latitude: 28.6366, longitude: 77.0963, location_name: "Tilak Nagar, West Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "uttam nagar": { latitude: 28.6216, longitude: 77.0560, location_name: "Uttam Nagar, West Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "kirti nagar": { latitude: 28.6558, longitude: 77.1408, location_name: "Kirti Nagar, West Delhi", source: "LOCAL_PRESET", match_status: "verified" },

  // North Delhi
  "shalimar bagh": { latitude: 28.7167, longitude: 77.1667, location_name: "Shalimar Bagh, North Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "rohini": { latitude: 28.7041, longitude: 77.1025, location_name: "Rohini, North Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "pitampura": { latitude: 28.6989, longitude: 77.1384, location_name: "Pitampura, North Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "model town": { latitude: 28.7029, longitude: 77.1937, location_name: "Model Town, North Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "ashok vihar": { latitude: 28.6965, longitude: 77.1729, location_name: "Ashok Vihar, North Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "delhi university": { latitude: 28.6892, longitude: 77.2114, location_name: "Delhi University North Campus", source: "LOCAL_PRESET", match_status: "verified" },
  "vips": { latitude: 28.7180, longitude: 77.1390, location_name: "VIPS, Pitampura, Delhi", source: "LOCAL_PRESET", match_status: "verified" },

  // East Delhi
  "laxmi nagar": { latitude: 28.6304, longitude: 77.2774, location_name: "Laxmi Nagar, East Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "preet vihar": { latitude: 28.6410, longitude: 77.2964, location_name: "Preet Vihar, East Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "nirman vihar": { latitude: 28.6373, longitude: 77.2882, location_name: "Nirman Vihar, East Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "mayur vihar": { latitude: 28.6090, longitude: 77.2942, location_name: "Mayur Vihar, East Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "akshardham": { latitude: 28.6127, longitude: 77.2773, location_name: "Akshardham Temple, East Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "shahdara": { latitude: 28.6732, longitude: 77.2873, location_name: "Shahdara, East Delhi", source: "LOCAL_PRESET", match_status: "verified" },
  "dilshad garden": { latitude: 28.6853, longitude: 77.3185, location_name: "Dilshad Garden, East Delhi", source: "LOCAL_PRESET", match_status: "verified" },

  // NCR Regions (Gurugram, Noida, Ghaziabad, Faridabad)
  "cyber city": { latitude: 28.4950, longitude: 77.0890, location_name: "Cyber City, Gurugram", source: "LOCAL_PRESET", match_status: "verified" },
  "gurugram": { latitude: 28.4595, longitude: 77.0266, location_name: "Gurugram, Haryana", source: "LOCAL_PRESET", match_status: "verified" },
  "gurgaon": { latitude: 28.4595, longitude: 77.0266, location_name: "Gurugram, Haryana", source: "LOCAL_PRESET", match_status: "verified" },
  "noida sector 18": { latitude: 28.5700, longitude: 77.3200, location_name: "Noida Sector 18, UP", source: "LOCAL_PRESET", match_status: "verified" },
  "noida sector 62": { latitude: 28.6280, longitude: 77.3649, location_name: "Noida Sector 62, UP", source: "LOCAL_PRESET", match_status: "verified" },
  "noida": { latitude: 28.5700, longitude: 77.3200, location_name: "Noida, Uttar Pradesh", source: "LOCAL_PRESET", match_status: "verified" },
  "greater noida": { latitude: 28.4744, longitude: 77.5040, location_name: "Greater Noida, Uttar Pradesh", source: "LOCAL_PRESET", match_status: "verified" },
  "pari chowk": { latitude: 28.4682, longitude: 77.5097, location_name: "Pari Chowk, Greater Noida", source: "LOCAL_PRESET", match_status: "verified" },
  "indirapuram": { latitude: 28.6435, longitude: 77.3698, location_name: "Indirapuram, Ghaziabad", source: "LOCAL_PRESET", match_status: "verified" },
  "vaishali": { latitude: 28.6475, longitude: 77.3396, location_name: "Vaishali, Ghaziabad", source: "LOCAL_PRESET", match_status: "verified" },
  "ghaziabad": { latitude: 28.6692, longitude: 77.4538, location_name: "Ghaziabad, Uttar Pradesh", source: "LOCAL_PRESET", match_status: "verified" },
  "faridabad": { latitude: 28.4089, longitude: 77.3178, location_name: "Faridabad, Haryana", source: "LOCAL_PRESET", match_status: "verified" },
};

/**
 * Normalizes query string for robust fuzzy & alias lookup
 */
function normalizeQuery(str) {
  if (!str) return "";
  let s = str.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  // Alias common phonetic variations
  s = s.replace(/\bkashmiri\b/g, "kashmere");
  s = s.replace(/\bgurgaon\b/g, "gurugram");
  s = s.replace(/\bqutub\b/g, "qutab");
  s = s.replace(/\bconnaught\b/g, "connaught place");
  return s;
}

/**
 * Direct OSM Nominatim fallback from browser
 */
async function fallbackClientGeocode(query) {
  try {
    const clean = query.trim();
    const hasRegion = /delhi|ncr|india|gurugram|noida|ghaziabad|faridabad/i.test(clean);
    const searchParam = hasRegion ? clean : `${clean}, Delhi, India`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchParam)}&format=json&limit=5`;
    
    const resp = await fetch(url, {
      headers: {
        "Accept-Language": "en"
      }
    });

    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        for (const item of data) {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          if (lat >= 28.0 && lat <= 29.2 && lon >= 76.5 && lon <= 77.8) {
            const parts = (item.display_name || "").split(",").map(p => p.trim());
            const locName = parts.length > 1 ? `${parts[0]}, ${parts[1]}` : parts[0];
            return {
              latitude: roundCoord(lat),
              longitude: roundCoord(lon),
              location_name: locName,
              source: "NOMINATIM_CLIENT",
              match_status: "verified"
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn("Client-side direct OSM lookup error:", err);
  }
  return null;
}

function roundCoord(val) {
  return Math.round(val * 1000000) / 1000000;
}

/**
 * AI-Assisted Place Geocoding Service (Frontend).
 * Calls backend API endpoint POST /api/v1/routes/geocode with client-side fast path and fallback.
 */
export async function geocodePlaceName(query) {
  if (!query || !query.trim()) return null;

  const raw = query.trim();
  const normalized = normalizeQuery(raw);
  const rawClean = raw.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

  // 1. Exact or Alias Preset Fast Path
  if (CLIENT_LOCAL_PRESETS[rawClean]) {
    return CLIENT_LOCAL_PRESETS[rawClean];
  }
  if (CLIENT_LOCAL_PRESETS[normalized]) {
    return CLIENT_LOCAL_PRESETS[normalized];
  }

  // 2. Substring / Prefix Match on Presets
  for (const [key, val] of Object.entries(CLIENT_LOCAL_PRESETS)) {
    if (key === rawClean || key === normalized || (rawClean.length >= 4 && (rawClean.includes(key) || key.includes(rawClean)))) {
      return val;
    }
    if (normalized.length >= 4 && (normalized.includes(key) || key.includes(normalized))) {
      return val;
    }
  }

  // 3. Backend API Service Lookup
  try {
    const response = await apiClient.post("/routes/geocode", { query: raw });
    if (response && response.success && response.data) {
      const data = response.data;
      if (data.match_status !== "no_match" && data.latitude && data.longitude) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Backend geocoding request warning, proceeding to client fallback:", err);
  }

  // 4. Client-side OSM direct geocoder fallback
  const clientFallback = await fallbackClientGeocode(raw);
  if (clientFallback) {
    return clientFallback;
  }

  return null;
}
