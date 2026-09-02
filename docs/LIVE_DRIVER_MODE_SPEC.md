# SafeRoute AI - Live Driver Mode Technical Specification

## 1. Overview
Live Driver Mode provides real-time, hands-free road risk assessment for active drivers by continuously streaming GPS telemetry, processing speed, automatically deriving environmental context, and updating safety predictions at rate-limited intervals.

---

## 2. Architecture & Component Hierarchy
```text
frontend/src/
├── components/
│   ├── prediction/
│   │   ├── PredictionForm.jsx          # Mode container & Manual Assessment form
│   │   └── ModeSwitcher.jsx            # Segmented toggle control
│   │
│   └── live-driver/
│       ├── LiveDriverMode.jsx          # Live Driver session manager
│       ├── LiveTelemetry.jsx           # Speed, coordinates, & input transparency readout
│       ├── LiveRiskCard.jsx            # Real-time risk score & confidence card
│       ├── GPSStatus.jsx               # GPS lock & accuracy badge
│       └── DrivingSafetyBanner.jsx     # Non-distracting risk escalation alert banner
│
├── hooks/
│   ├── useGeolocation.js               # watchPosition lifecycle & accuracy thresholds
│   ├── useDriverTelemetry.js           # Speed calculation, EMA filter & time derivation
│   └── useLiveRiskAssessment.js        # Rate-limited prediction triggering & alerts
```

---

## 3. Key Specifications

### 3.1 GPS Lifecycle & Accuracy Thresholds
- **States**: `IDLE` $\rightarrow$ `REQUESTING_PERMISSION` $\rightarrow$ `ACQUIRING_GPS` $\rightarrow$ `ACTIVE` $\rightarrow$ `DEGRADED` $\rightarrow$ `STOPPED` / `ERROR`.
- **Privacy Guarantee**: GPS tracking starts **only** upon explicit user click on "Start Live Driver Mode" and calls `clearWatch()` immediately upon stopping or unmounting.
- **Accuracy Classification**:
  - $\le 20\text{m}$: High Accuracy (Emerald)
  - $20\text{--}50\text{m}$: Acceptable (Blue)
  - $50\text{--}100\text{m}$: Degraded (Amber)
  - $>100\text{m}$: Poor Accuracy (Red)

### 3.2 Telemetry & Speed Processing
- Converts `position.coords.speed` from $\text{m/s}$ to $\text{km/h}$ ($speed \times 3.6$).
- Fallback: Calculates Haversine distance over time delta ($\text{meters} / \text{seconds} \times 3.6$) when hardware speed is null.
- EMA Filter: Exponential Moving Average ($\alpha = 0.35$) eliminates raw GPS jitter.
- Bounds Validation: Rejects negative speeds or unrealistic spikes ($>200\text{ km/h}$).
- Auto Time Derivation: System time maps to `Morning`, `Afternoon`, `Evening`, or `Night`.

### 3.3 Rate-Limited Auto Risk Engine
- **Triggers**: Movement $\ge 50\text{m}$ OR 10 seconds elapsed.
- **Rate Limit**: Enforces strict **10-second minimum cooldown** between API requests.
- **Guards**: Prevents concurrent in-flight requests and ignores duplicate position updates.
- **Glanceable Alerts**: Displays non-intrusive banner on risk level escalation (`LOW` $\rightarrow$ `MEDIUM` $\rightarrow$ `HIGH` $\rightarrow$ `CRITICAL`).

---

## 4. Input Transparency Guidelines
- **Live Telemetry**: `Speed: 64 km/h · Live GPS`, `Location: 28.6139°, 77.2090° · Live GPS`, `Time: Evening · Auto`.
- **Manual Overrides**: `Weather: Clear · Manual`, `Traffic: Low · Manual`, `Road: Arterial · Manual`.
