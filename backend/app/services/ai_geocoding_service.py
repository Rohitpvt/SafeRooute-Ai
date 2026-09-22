import os
import re
import json
import logging
import httpx
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger(__name__)

# Delhi NCR Safety Bounding Box Constraints
DELHI_NCR_BOUNDS = {
    "min_lat": 28.3000,
    "max_lat": 28.9000,
    "min_lng": 76.8000,
    "max_lng": 77.5000,
}

# Local Presets (Authoritative Fast-Path for Delhi NCR Places)
LOCAL_PRESET_DICTIONARY: Dict[str, Dict[str, Any]] = {
    # Major Transportation Hubs & Terminals
    "kashmiri gate": {"lat": 28.6675, "lng": 77.2285, "name": "Kashmere Gate, Old Delhi"},
    "kashmere gate": {"lat": 28.6675, "lng": 77.2285, "name": "Kashmere Gate, Old Delhi"},
    "isbt": {"lat": 28.6675, "lng": 77.2285, "name": "Kashmere Gate ISBT, Old Delhi"},
    "isbt kashmere gate": {"lat": 28.6675, "lng": 77.2285, "name": "Kashmere Gate ISBT, Old Delhi"},
    "isbt kashmiri gate": {"lat": 28.6675, "lng": 77.2285, "name": "Kashmere Gate ISBT, Old Delhi"},
    "kashmiri gate metro": {"lat": 28.6675, "lng": 77.2285, "name": "Kashmere Gate Metro Station"},
    "kashmere gate metro": {"lat": 28.6675, "lng": 77.2285, "name": "Kashmere Gate Metro Station"},
    "new delhi railway station": {"lat": 28.6428, "lng": 77.2201, "name": "New Delhi Railway Station (NDLS)"},
    "ndls": {"lat": 28.6428, "lng": 77.2201, "name": "New Delhi Railway Station (NDLS)"},
    "old delhi railway station": {"lat": 28.6617, "lng": 77.2307, "name": "Old Delhi Railway Station (DLI)"},
    "dli": {"lat": 28.6617, "lng": 77.2307, "name": "Old Delhi Railway Station (DLI)"},
    "hazrat nizamuddin": {"lat": 28.5885, "lng": 77.2536, "name": "Hazrat Nizamuddin Railway Station"},
    "nizamuddin": {"lat": 28.5885, "lng": 77.2536, "name": "Hazrat Nizamuddin Railway Station"},
    "anand vihar isbt": {"lat": 28.6469, "lng": 77.3160, "name": "Anand Vihar ISBT, East Delhi"},
    "anand vihar": {"lat": 28.6469, "lng": 77.3160, "name": "Anand Vihar, East Delhi"},
    "sarai kale khan": {"lat": 28.5900, "lng": 77.2567, "name": "Sarai Kale Khan ISBT, South Delhi"},
    "igi airport": {"lat": 28.5562, "lng": 77.1000, "name": "IGI Airport T3, New Delhi"},
    "delhi airport": {"lat": 28.5562, "lng": 77.1000, "name": "IGI Airport T3, New Delhi"},
    "aerocity": {"lat": 28.5490, "lng": 77.1210, "name": "Aerocity, New Delhi"},

    # Central & Historical Landmarks
    "connaught place": {"lat": 28.6315, "lng": 77.2167, "name": "Connaught Place, New Delhi"},
    "cp": {"lat": 28.6315, "lng": 77.2167, "name": "Connaught Place, New Delhi"},
    "rajiv chowk": {"lat": 28.6328, "lng": 77.2197, "name": "Rajiv Chowk (CP), New Delhi"},
    "india gate": {"lat": 28.6129, "lng": 77.2295, "name": "India Gate, New Delhi"},
    "red fort": {"lat": 28.6562, "lng": 77.2410, "name": "Red Fort, Central Delhi"},
    "lal qila": {"lat": 28.6562, "lng": 77.2410, "name": "Red Fort, Central Delhi"},
    "chandni chowk": {"lat": 28.6506, "lng": 77.2303, "name": "Chandni Chowk, Central Delhi"},
    "jama masjid": {"lat": 28.6507, "lng": 77.2334, "name": "Jama Masjid, Central Delhi"},
    "khan market": {"lat": 28.6003, "lng": 77.2270, "name": "Khan Market, Central Delhi"},

    # South Delhi
    "aiims": {"lat": 28.5672, "lng": 77.2100, "name": "AIIMS New Delhi, South Delhi"},
    "aiims delhi": {"lat": 28.5672, "lng": 77.2100, "name": "AIIMS New Delhi, South Delhi"},
    "safdarjung": {"lat": 28.5684, "lng": 77.2062, "name": "Safdarjung Hospital, South Delhi"},
    "dhaula kuan": {"lat": 28.5912, "lng": 77.1580, "name": "Dhaula Kuan, New Delhi"},
    "lajpat nagar": {"lat": 28.5677, "lng": 77.2433, "name": "Lajpat Nagar, South Delhi"},
    "saket": {"lat": 28.5244, "lng": 77.2105, "name": "Saket, South Delhi"},
    "hauz khas": {"lat": 28.5494, "lng": 77.2001, "name": "Hauz Khas, South Delhi"},
    "iit delhi": {"lat": 28.5450, "lng": 77.1926, "name": "IIT Delhi, Hauz Khas"},
    "green park": {"lat": 28.5589, "lng": 77.2028, "name": "Green Park, South Delhi"},
    "malviya nagar": {"lat": 28.5355, "lng": 77.2090, "name": "Malviya Nagar, South Delhi"},
    "greater kailash": {"lat": 28.5482, "lng": 77.2343, "name": "Greater Kailash, South Delhi"},
    "gk": {"lat": 28.5482, "lng": 77.2343, "name": "Greater Kailash, South Delhi"},
    "south extension": {"lat": 28.5694, "lng": 77.2195, "name": "South Extension, South Delhi"},
    "defence colony": {"lat": 28.5727, "lng": 77.2312, "name": "Defence Colony, South Delhi"},
    "nehru place": {"lat": 28.5492, "lng": 77.2517, "name": "Nehru Place, South Delhi"},
    "kalkaji": {"lat": 28.5412, "lng": 77.2554, "name": "Kalkaji, South Delhi"},
    "lotus temple": {"lat": 28.5535, "lng": 77.2588, "name": "Lotus Temple, South Delhi"},
    "qutub minar": {"lat": 28.5245, "lng": 77.1855, "name": "Qutub Minar, Mehrauli"},
    "qutab minar": {"lat": 28.5245, "lng": 77.1855, "name": "Qutub Minar, Mehrauli"},
    "mehrauli": {"lat": 28.5173, "lng": 77.1852, "name": "Mehrauli, South Delhi"},
    "vasant kunj": {"lat": 28.5293, "lng": 77.1552, "name": "Vasant Kunj, South Delhi"},
    "vasant vihar": {"lat": 28.5588, "lng": 77.1601, "name": "Vasant Vihar, South Delhi"},
    "sarojini nagar": {"lat": 28.5772, "lng": 77.1983, "name": "Sarojini Nagar, South Delhi"},
    "okhla": {"lat": 28.5308, "lng": 77.2713, "name": "Okhla Industrial Area, Delhi"},

    # West & North-West Delhi
    "inderlok": {"lat": 28.6733, "lng": 77.1706, "name": "Inderlok, North West Delhi"},
    "inderlok delhi": {"lat": 28.6733, "lng": 77.1706, "name": "Inderlok, North West Delhi"},
    "karol bagh": {"lat": 28.6514, "lng": 77.1907, "name": "Karol Bagh, New Delhi"},
    "dwarka": {"lat": 28.5921, "lng": 77.0460, "name": "Dwarka, New Delhi"},
    "janakpuri": {"lat": 28.6219, "lng": 77.0878, "name": "Janakpuri, West Delhi"},
    "rajouri garden": {"lat": 28.6492, "lng": 77.1226, "name": "Rajouri Garden, West Delhi"},
    "punjabi bagh": {"lat": 28.6692, "lng": 77.1264, "name": "Punjabi Bagh, West Delhi"},
    "paschim vihar": {"lat": 28.6698, "lng": 77.0926, "name": "Paschim Vihar, West Delhi"},
    "tilak nagar": {"lat": 28.6366, "lng": 77.0963, "name": "Tilak Nagar, West Delhi"},
    "uttam nagar": {"lat": 28.6216, "lng": 77.0560, "name": "Uttam Nagar, West Delhi"},
    "kirti nagar": {"lat": 28.6558, "lng": 77.1408, "name": "Kirti Nagar, West Delhi"},

    # North Delhi
    "shalimar bagh": {"lat": 28.7167, "lng": 77.1667, "name": "Shalimar Bagh, North Delhi"},
    "rohini": {"lat": 28.7041, "lng": 77.1025, "name": "Rohini, North Delhi"},
    "pitampura": {"lat": 28.6989, "lng": 77.1384, "name": "Pitampura, North Delhi"},
    "model town": {"lat": 28.7029, "lng": 77.1937, "name": "Model Town, North Delhi"},
    "ashok vihar": {"lat": 28.6965, "lng": 77.1729, "name": "Ashok Vihar, North Delhi"},
    "delhi university": {"lat": 28.6892, "lng": 77.2114, "name": "Delhi University North Campus"},
    "vips": {"lat": 28.7180, "lng": 77.1390, "name": "VIPS, Pitampura, Delhi"},

    # East Delhi & NCR
    "laxmi nagar": {"lat": 28.6304, "lng": 77.2774, "name": "Laxmi Nagar, East Delhi"},
    "preet vihar": {"lat": 28.6410, "lng": 77.2964, "name": "Preet Vihar, East Delhi"},
    "nirman vihar": {"lat": 28.6373, "lng": 77.2882, "name": "Nirman Vihar, East Delhi"},
    "mayur vihar": {"lat": 28.6090, "lng": 77.2942, "name": "Mayur Vihar, East Delhi"},
    "akshardham": {"lat": 28.6127, "lng": 77.2773, "name": "Akshardham Temple, East Delhi"},
    "shahdara": {"lat": 28.6732, "lng": 77.2873, "name": "Shahdara, East Delhi"},
    "dilshad garden": {"lat": 28.6853, "lng": 77.3185, "name": "Dilshad Garden, East Delhi"},
    "cyber city": {"lat": 28.4950, "lng": 77.0890, "name": "Cyber City, Gurugram"},
    "gurugram": {"lat": 28.4595, "lng": 77.0266, "name": "Gurugram, Haryana"},
    "gurgaon": {"lat": 28.4595, "lng": 77.0266, "name": "Gurugram, Haryana"},
    "noida sector 18": {"lat": 28.5700, "lng": 77.3200, "name": "Noida Sector 18, UP"},
    "noida sector 62": {"lat": 28.6280, "lng": 77.3649, "name": "Noida Sector 62, UP"},
    "noida": {"lat": 28.5700, "lng": 77.3200, "name": "Noida, Uttar Pradesh"},
    "pari chowk": {"lat": 28.4682, "lng": 77.5097, "name": "Pari Chowk, Greater Noida"},
    "indirapuram": {"lat": 28.6435, "lng": 77.3698, "name": "Indirapuram, Ghaziabad"},
    "vaishali": {"lat": 28.6475, "lng": 77.3396, "name": "Vaishali, Ghaziabad"},
    "ghaziabad": {"lat": 28.6692, "lng": 77.4538, "name": "Ghaziabad, Uttar Pradesh"},
    "faridabad": {"lat": 28.4089, "lng": 77.3178, "name": "Faridabad, Haryana"},
}

# In-Memory Cache for Verified Results
_GEOCODE_CACHE: Dict[str, Dict[str, Any]] = {}


def normalize_query_key(query: str) -> str:
    """Normalizes query string with phonetic/alias support for caching and lookup."""
    clean = re.sub(r"\s+", " ", re.sub(r"[^a-zA-Z0-9\s]", "", query.lower())).strip()
    clean = re.sub(r"\bkashmiri\b", "kashmere", clean)
    clean = re.sub(r"\bgurgaon\b", "gurugram", clean)
    clean = re.sub(r"\bqutub\b", "qutab", clean)
    return clean


def validate_delhi_ncr_bounds(lat: float, lng: float) -> bool:
    """Validates that coordinates fall strictly within Delhi NCR safety bounds."""
    return (
        DELHI_NCR_BOUNDS["min_lat"] <= lat <= DELHI_NCR_BOUNDS["max_lat"]
        and DELHI_NCR_BOUNDS["min_lng"] <= lng <= DELHI_NCR_BOUNDS["max_lng"]
    )


def verify_query_match(user_query: str, location_name: str, ai_intent: Optional[Dict[str, str]] = None) -> bool:
    """
    Deterministic validation checking if the geocoder result is textually relevant
    to user query or Gemini extracted place intent.
    """
    query_clean = normalize_query_key(user_query)
    loc_clean = normalize_query_key(location_name)

    query_tokens = [t for t in query_clean.split() if len(t) > 2 and t not in ["near", "opposite", "gate", "block", "delhi", "ncr"]]
    
    if ai_intent and ai_intent.get("place"):
        place_clean = normalize_query_key(ai_intent["place"])
        if place_clean and place_clean in loc_clean:
            return True

    # If any query token appears in returned location string, accept
    for token in query_tokens:
        if token in loc_clean or loc_clean.startswith(token):
            return True

    return len(query_tokens) == 0



_RUNTIME_GEMINI_API_KEY: str = ""


class AIGeocodingService:
    """
    AI-Assisted Place Search Service.
    Gemini is strictly used as an Interpretation Layer (extracts place, landmark, locality, city).
    Coordinates originate exclusively from Authoritative Geocoders (LOCAL_PRESET, NOMINATIM, OPEN_METEO).
    """

    @classmethod
    def set_runtime_key(cls, key: str):
        global _RUNTIME_GEMINI_API_KEY
        _RUNTIME_GEMINI_API_KEY = key.strip() if key else ""

    @classmethod
    def get_runtime_key(cls) -> str:
        global _RUNTIME_GEMINI_API_KEY
        return _RUNTIME_GEMINI_API_KEY or getattr(settings, "GEMINI_API_KEY", "") or os.environ.get("GEMINI_API_KEY", "")

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or self.get_runtime_key()

    @staticmethod
    async def validate_api_key(test_key: Optional[str] = None) -> Dict[str, Any]:
        """Directly probes Google Gemini API to test key validity and model accessibility."""
        key_to_test = test_key or AIGeocodingService.get_runtime_key()
        if not key_to_test or not key_to_test.strip():
            return {
                "configured": False,
                "valid": False,
                "status": "NOT_CONFIGURED",
                "message": "No GEMINI_API_KEY configured yet.",
                "masked_key": None,
            }

        masked = key_to_test[:6] + "..." + key_to_test[-4:] if len(key_to_test) > 10 else "***"
        
        # Test key validity via official ListModels endpoint
        list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key_to_test}"

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(list_url)
                if resp.status_code == 200:
                    data = resp.json()
                    models_list = data.get("models", [])
                    gen_models = [
                        m.get("name", "").replace("models/", "")
                        for m in models_list
                        if "generateContent" in m.get("supportedGenerationMethods", [])
                    ]
                    
                    # Identify best available model
                    preferred_order = [
                        "gemini-1.5-flash-latest",
                        "gemini-1.5-flash",
                        "gemini-2.0-flash",
                        "gemini-1.5-pro",
                        "gemini-pro",
                    ]
                    selected_model = "gemini-1.5-flash"
                    for pref in preferred_order:
                        match = next((m for m in gen_models if pref in m), None)
                        if match:
                            selected_model = match
                            break
                    else:
                        if gen_models:
                            selected_model = gen_models[0]

                    return {
                        "configured": True,
                        "valid": True,
                        "status": "ACTIVE_VALID",
                        "model": selected_model,
                        "available_models_count": len(gen_models),
                        "message": f"Gemini API key is valid and connected to Google AI Studio (Active Model: {selected_model}).",
                        "masked_key": masked,
                    }
                else:
                    try:
                        err_json = resp.json()
                        err_msg = err_json.get("error", {}).get("message", f"HTTP {resp.status_code}")
                    except Exception:
                        err_msg = f"HTTP {resp.status_code}"
                    
                    return {
                        "configured": True,
                        "valid": False,
                        "status": "INVALID_OR_RESTRICTED",
                        "http_status": resp.status_code,
                        "message": f"Google AI Studio rejected key: {err_msg}",
                        "masked_key": masked,
                    }
        except Exception as e:
            return {
                "configured": True,
                "valid": False,
                "status": "CONNECTION_ERROR",
                "message": f"Network error contacting Google Generative Language API: {str(e)}",
                "masked_key": masked,
            }

    async def interpret_query_with_gemini(self, query: str) -> Optional[Dict[str, str]]:
        """
        Uses Gemini to parse user query into structured search intent:
        Returns: { "place": "...", "landmark": "...", "locality": "...", "city": "Delhi" }
        Does NOT generate or return latitude/longitude coordinates.
        """
        active_key = self.api_key or self.get_runtime_key()
        if not active_key:
            logger.info("Gemini API key not configured; skipping AI interpretation layer.")
            return None

        prompt = (
            f"You are a place search parser for Delhi NCR, India. Given the location query '{query}', "
            "extract the core spatial components as JSON with keys: 'place', 'locality', 'landmark', 'city'. "
            "Do NOT output coordinates, markdown formatting, or explanation. Return ONLY valid JSON."
        )

        candidate_endpoints = [
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={active_key}",
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={active_key}",
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={active_key}",
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={active_key}",
            f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={active_key}",
            f"https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key={active_key}",
        ]

        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 100},
        }

        for url in candidate_endpoints:
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                            match = re.search(r"\{.*\}", text, re.DOTALL)
                            if match:
                                parsed = json.loads(match.group(0))
                                return {
                                    "place": parsed.get("place") or "",
                                    "locality": parsed.get("locality") or "",
                                    "landmark": parsed.get("landmark") or "",
                                    "city": parsed.get("city") or "Delhi",
                                }
            except Exception as e:
                logger.debug(f"Gemini endpoint probe failed for {url.split('?')[0]}: {e}")

        return None

    async def query_nominatim(self, search_term: str) -> List[Dict[str, Any]]:
        """Primary Authoritative Geocoder: OpenStreetMap Nominatim with clean query formatting."""
        clean_term = search_term.strip()
        has_region = any(w in clean_term.lower() for w in ["delhi", "ncr", "india", "gurugram", "gurgaon", "noida", "ghaziabad", "faridabad"])

        query_str = clean_term if has_region else f"{clean_term}, Delhi, India"
        encoded_query = httpx.URL(f"https://nominatim.openstreetmap.org/search?q={query_str}").raw_path.decode().split("?q=")[-1]
        url = f"https://nominatim.openstreetmap.org/search?q={encoded_query}&format=json&limit=5"

        headers = {"User-Agent": "SafeRouteAI-Geocoder/1.0", "Accept-Language": "en"}
        results = []
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data:
                        lat = float(item.get("lat", 0))
                        lng = float(item.get("lon", 0))
                        if validate_delhi_ncr_bounds(lat, lng):
                            display_name = item.get("display_name", "")
                            parts = [p.strip() for p in display_name.split(",")]
                            loc_name = f"{parts[0]}, {parts[1]}" if len(parts) > 1 else parts[0]
                            results.append({
                                "location_name": loc_name,
                                "latitude": round(lat, 6),
                                "longitude": round(lng, 6),
                                "source": "NOMINATIM",
                                "match_status": "verified",
                            })
        except Exception as e:
            logger.warning(f"Nominatim geocoder request failed: {e}")

        return results

    async def query_open_meteo(self, search_term: str) -> List[Dict[str, Any]]:
        """Secondary Authoritative Geocoder: OpenMeteo Geocoding API."""
        clean_name = re.sub(r"\b(delhi|ncr|india|new delhi|gurugram|gurgaon|noida|ghaziabad|faridabad)\b", "", search_term, flags=re.IGNORECASE).strip()
        if not clean_name:
            clean_name = search_term.strip()

        results = []
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(
                    f"https://geocoding-api.open-meteo.com/v1/search?name={clean_name}&count=5&language=en&format=json"
                )
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data.get("results", []):
                        lat = float(item.get("latitude", 0))
                        lng = float(item.get("longitude", 0))
                        if validate_delhi_ncr_bounds(lat, lng):
                            name = item.get("name", "")
                            admin1 = item.get("admin1", "")
                            loc_name = f"{name}, {admin1}" if admin1 else f"{name}, Delhi"
                            results.append({
                                "location_name": loc_name,
                                "latitude": round(lat, 6),
                                "longitude": round(lng, 6),
                                "source": "OPEN_METEO",
                                "match_status": "verified",
                            })
        except Exception as e:
            logger.warning(f"OpenMeteo geocoder request failed: {e}")

        return results

    async def geocode(self, query: str) -> Dict[str, Any]:
        """
        Executes Full Geocoder Fallback Chain & Query-Match Validation.
        """
        raw_query = query.strip()
        cache_key = normalize_query_key(raw_query)

        # Check Cache for verified queries
        if cache_key in _GEOCODE_CACHE:
            logger.info(f"Geocode cache hit for '{cache_key}'")
            return _GEOCODE_CACHE[cache_key]

        # 1. Local Presets (Tier 1 Authoritative Fast-Path)
        if cache_key in LOCAL_PRESET_DICTIONARY:
            preset = LOCAL_PRESET_DICTIONARY[cache_key]
            result = {
                "query": raw_query,
                "location_name": preset["name"],
                "latitude": preset["lat"],
                "longitude": preset["lng"],
                "source": "LOCAL_PRESET",
                "match_status": "verified",
                "ai_status": "none",
                "ai_interpretation": None,
                "candidates": [],
            }
            _GEOCODE_CACHE[cache_key] = result
            return result

        # Check partial prefix/substring match in local presets
        for key, preset in LOCAL_PRESET_DICTIONARY.items():
            if len(cache_key) >= 3 and (key == cache_key or cache_key.startswith(key) or key.startswith(cache_key)):
                result = {
                    "query": raw_query,
                    "location_name": preset["name"],
                    "latitude": preset["lat"],
                    "longitude": preset["lng"],
                    "source": "LOCAL_PRESET",
                    "match_status": "verified",
                    "ai_status": "none",
                    "ai_interpretation": None,
                    "candidates": [],
                }
                _GEOCODE_CACHE[cache_key] = result
                return result

        # 2. Gemini Query Interpretation (Tier 2 Interpretation Layer)
        ai_intent = await self.interpret_query_with_gemini(raw_query)
        ai_status = "interpreted" if ai_intent else "none"

        # Build candidate search terms
        search_terms = []
        if ai_intent:
            place = ai_intent.get("place", "")
            landmark = ai_intent.get("landmark", "")
            locality = ai_intent.get("locality", "")
            if place and landmark:
                search_terms.append(f"{place} {landmark}")
            if place:
                search_terms.append(place)
            if locality:
                search_terms.append(locality)
        search_terms.append(raw_query)

        # 3. Query Authoritative Geocoders (Nominatim -> OpenMeteo)
        geocoded_candidates: List[Dict[str, Any]] = []
        for term in search_terms:
            if not term.strip():
                continue
            # Try Primary (Nominatim)
            nom_results = await self.query_nominatim(term)
            if nom_results:
                geocoded_candidates.extend(nom_results)
                break

            # Try Secondary (OpenMeteo)
            om_results = await self.query_open_meteo(term)
            if om_results:
                geocoded_candidates.extend(om_results)
                break

        # 4. Filter by Query-Match Validation & Bounding Box
        valid_candidates = []
        for cand in geocoded_candidates:
            if verify_query_match(raw_query, cand["location_name"], ai_intent):
                valid_candidates.append(cand)

        # If strict query match filtered everything out, preserve original bounds-checked candidates
        final_candidates = valid_candidates if valid_candidates else geocoded_candidates

        # 5. Determine Final Response Status & Candidates
        if final_candidates:
            primary = final_candidates[0]
            candidates = final_candidates[1:] if len(final_candidates) > 1 else []
            match_status = "verified" if len(final_candidates) == 1 else "candidate_list"

            result = {
                "query": raw_query,
                "location_name": primary["location_name"],
                "latitude": primary["latitude"],
                "longitude": primary["longitude"],
                "source": primary["source"],
                "match_status": match_status,
                "ai_status": ai_status,
                "ai_interpretation": ai_intent,
                "candidates": candidates,
            }
            # Cache only verified results
            if match_status == "verified":
                _GEOCODE_CACHE[cache_key] = result
            return result

        # 6. Deterministic Failure State (No Verified Match Found)
        return {
            "query": raw_query,
            "location_name": "",
            "latitude": 0.0,
            "longitude": 0.0,
            "source": "NONE",
            "match_status": "no_match",
            "ai_status": ai_status,
            "ai_interpretation": ai_intent,
            "candidates": [],
        }
