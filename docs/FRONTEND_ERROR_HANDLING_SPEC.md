# SafeRoute AI - Frontend Error Handling & Diagnostics Specification

## 1. Overview
SafeRoute AI implements a robust, transparent error-handling strategy across all frontend components and API client services. Generic, opaque error strings are replaced with actionable diagnostic logging and user-friendly error banners.

---

## 2. API Endpoint Canonical Paths
All frontend API calls use `apiClient` (`frontend/src/services/api.js`) with `baseURL` set to `http://localhost:8000/api/v1`.

| Module | Relative Route | Canonical Backend URL | HTTP Method |
| :--- | :--- | :--- | :--- |
| **Auth Login** | `/auth/login` | `http://localhost:8000/api/v1/auth/login` | `POST` |
| **Auth Register** | `/auth/register` | `http://localhost:8000/api/v1/auth/register` | `POST` |
| **Auth Me** | `/auth/me` | `http://localhost:8000/api/v1/auth/me` | `GET` |
| **Risk Prediction** | `/predict` | `http://localhost:8000/api/v1/predict` | `POST` |
| **Prediction History** | `/predictions/history` | `http://localhost:8000/api/v1/predictions/history` | `GET` |
| **Prediction Stats** | `/predictions/stats` | `http://localhost:8000/api/v1/predictions/stats` | `GET` |
| **Admin Dashboard** | `/admin/dashboard` | `http://localhost:8000/api/v1/admin/dashboard` | `GET` |

---

## 3. Error Diagnostics & Empty States

### A. Live Driver Mode Risk Evaluation
- **Failure Cause**: HTTP status or network failure.
- **Developer Log**: `Risk evaluation failed: HTTP 422 — [validation details]`
- **User Toast**: Non-blocking warning banner with retry indicator.

### B. Prediction History
- **Zero Records**: Displays **"No prediction history yet."** (Not an error state).
- **Filtered Zero Records**: Displays **"No records match search query."**
- **API Failure**: Displays **"Unable to load prediction history."** with a **Retry** button.

### C. Statistics Cards
- **API Failure**: Renders inline error banner with **Retry** button.
- **Loading State**: Renders smooth dark skeleton shimmer grid.

### D. GPS Accuracy Classification
- `≤ 20m`: High Accuracy (Green)
- `20 – 50m`: Acceptable Accuracy (Cyan)
- `50 – 100m`: Degraded Accuracy (Amber)
- `> 100m`: Poor Accuracy (Red)
