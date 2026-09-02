# SafeRoute AI - Technical Debt Report

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 2.0.0 |
| **Status** | Completed |
| **Author** | Lead Systems Architect |
| **Date** | 2026-07-28 |

---

## 1. Executive Summary
This report analyzes architectural trade-offs, outdated coding practices, and technical debt in the SafeRoute AI MVP. No production-blocking technical debt was identified.

* **Technical Debt Score**: **95 / 100**

---

## 2. Technical Debt Catalog

### Finding 1: Class-Based Configuration in Pydantic V2 Schemas
* **Affected File(s)**: All schemas in `backend/app/schemas/` (e.g. [user.py lines 42-45](file:///c:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/app/schemas/user.py#L42-L45))
* **Evidence**:
  ```python
  class UserResponse(BaseModel):
      id: UUID
      email: EmailStr
      class Config:
          from_attributes = True
  ```
* **Impact**: Triggers deprecation warnings in Pydantic v2.0+, as class-based config is replaced by `ConfigDict`.
* **Recommended Fix**: Update to the new syntax: `model_config = ConfigDict(from_attributes=True)`.
* **Blocks UAT**: No

### Finding 2: Deprecated timezone-naive datetime utility calls
* **Affected File(s)**: All models and services (e.g. `jwt.py`, `user.py`, `prediction.py`)
* **Evidence**: Frequent calls to `datetime.utcnow()` and `datetime.utcfromtimestamp()`.
* **Impact**: Python 3.12+ deprecates timezone-naive UTC helpers, which can lead to timezone offset errors.
* **Recommended Fix**: Update to timezone-aware UTC objects: `datetime.now(datetime.UTC)` and `datetime.fromtimestamp(ts, datetime.UTC)`.
* **Blocks UAT**: No

### Finding 3: Monolithic Admin Dashboard layout
* **Affected File(s)**: `frontend/src/pages/AdminDashboard.jsx` ([AdminDashboard.jsx](file:///c:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/frontend/src/pages/AdminDashboard.jsx))
* **Evidence**: The entire dashboard (sidebar tabs, users table, dataset uploads, retraining triggers, system telemetry, and charts) is contained in a single 400+ line component.
* **Impact**: Increases code complexity, making it harder to maintain and test.
* **Recommended Fix**: Refactor tabs (e.g. `UserTable`, `DatasetList`, `RetrainPanel`) into standalone child components.
* **Blocks UAT**: No
