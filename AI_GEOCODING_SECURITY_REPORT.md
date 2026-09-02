# SafeRoute AI — AI-Assisted Place Search Security & Privacy Audit Report

## 1. Credential Isolation & API Key Security

- **Rule**: `GEMINI_API_KEY` must remain strictly backend-only.
- **Audit Findings**:
  - `GEMINI_API_KEY` is loaded exclusively via `app.config.settings` or environment variables on the FastAPI server.
  - Zero reference to `GEMINI_API_KEY` or `VITE_GEMINI_API_KEY` in `frontend/` source code.
  - Vite client bundle build verified: `dist/assets/` contains **0 occurrences** of API keys or Gemini credentials.
  - API Responses from `POST /api/v1/routes/geocode` return only `location_name`, `latitude`, `longitude`, `source`, `match_status`, and `ai_interpretation`. Credentials are **never** returned or logged.

---

## 2. Bounding Box & Coordinate Injection Guard

- **Rule**: Prevent model hallucination or out-of-region coordinate injection.
- **Audit Findings**:
  - All coordinates returned by authoritative geocoders must pass:
    $$\text{latitude} \in [28.3000, 28.9000] \quad \text{and} \quad \text{longitude} \in [76.8000, 77.5000]$$
  - Any coordinates outside Delhi NCR are rejected immediately before reaching the frontend.

---

## 3. Query-Match Validation & Ambiguity Guard

- **Rule**: Never silently select an uncertain or mismatched place.
- **Audit Findings**:
  - Deterministic text token matching validates returned addresses against user search intent.
  - Ambiguous queries return `match_status: "candidate_list"` forcing explicit user selection in the UI.
