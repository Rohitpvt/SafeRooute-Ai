# Frozen Project Directory Layout

## Project: SafeRoute AI
### AI-Powered Road Accident Hotspot Prediction System

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Frozen |
| **Author** | SafeRoute AI Architecture Committee |
| **Date** | 2026-07-27 |
| **Intended Audience** | Lead Developers, DevOps, Integrators |

---

## Table of Contents
1. [Overview & Layout Classification Rules](#1-overview--layout-classification-rules)
2. [Frozen Monorepo Directory Layout](#2-frozen-monorepo-directory-layout)
3. [Component Classification Specifications](#3-component-classification-specifications)
4. [Assumptions, Risks & Mitigation](#4-assumptions-risks--mitigation)
5. [Best Practices](#5-best-practices)
6. [Revision History](#6-revision-history)
7. [References](#7-references)

---

## 1. Overview & Layout Classification Rules
This document freezes the directory layout for SafeRoute AI. Developers must adhere to this folder structure during implementation to prevent build errors and integration issues.

### Classification Codes
* **`[MVP]`**: Component implemented in the initial release.
* **`[FUTURE]`**: Reserved for post-MVP enhancements.
* **`[CONFIG]`**: System configurations and environment files.
* **`[GENERATED]`**: Automatically compiled assets.
* **`[STATIC]`**: Static assets (images, logos).
* **`[MODEL]`**: Serialized machine learning model files.
* **`[SCRIPT]`**: Automated scripts and seed files.
* **`[TEST]`**: Unit, integration, and E2E test suites.
* **`[DOCS]`**: Project documentation files.

---

## 2. Frozen Monorepo Directory Layout

The finalized folder and file structure for SafeRoute AI:

```text
SafeRoute AI/
├── backend/                                       # [MVP] Backend root directory
│   ├── app/                                       # [MVP] Core FastAPI application source
│   │   ├── models/                                # [MVP] SQLAlchemy database models
│   │   │   ├── __init__.py                        # [MVP] Model bindings
│   │   │   ├── user.py                            # [MVP] User schemas DB mapping
│   │   │   ├── prediction.py                      # [MVP] Logs mapping
│   │   │   └── hotspot.py                         # [MVP] Coordinates mapping
│   │   ├── routers/                               # [MVP] APIRouter endpoint definitions
│   │   │   ├── __init__.py                        # [MVP] Route bindings
│   │   │   ├── auth.py                            # [MVP] Register & Login routes
│   │   │   ├── predict.py                         # [MVP] Evaluation endpoints
│   │   │   └── admin.py                           # [MVP] CSV upload & dashboard endpoints
│   │   ├── schemas/                               # [MVP] Pydantic verification schemas
│   │   │   ├── __init__.py                        # [MVP] Schema imports
│   │   │   ├── user.py                            # [MVP] User structures
│   │   │   ├── prediction.py                      # [MVP] Input/output parameters
│   │   │   └── hotspot.py                         # [MVP] Map coordinates structures
│   │   ├── services/                              # [MVP] Business logic layer
│   │   │   ├── __init__.py                        # [MVP] Service imports
│   │   │   ├── auth_service.py                    # [MVP] Password hashes & JWT logic
│   │   │   └── prediction_service.py              # [MVP] Joblib models wrapper
│   │   ├── database.py                            # [MVP] SQLAlchemy engine configurations
│   │   ├── config.py                              # [MVP] Pydantic settings loading
│   │   └── main.py                                # [MVP] FastAPI entry point
│   ├── ml/                                        # [MVP] Machine learning logic
│   │   ├── data/                                  # [MVP] Training data files
│   │   │   └── accident_training.csv              # [MVP] Base training CSV dataset
│   │   ├── models/                                # [GENERATED] Model output binaries
│   │   │   ├── model.joblib                       # [MODEL] Trained model binary
│   │   │   └── scaler.joblib                      # [MODEL] Scaler parameters
│   │   └── train.py                               # [SCRIPT] Offline training script
│   ├── tests/                                     # [TEST] Backend validation suites
│   │   ├── __init__.py                            # [TEST] Testing environment setup
│   │   ├── test_auth.py                           # [TEST] Router auth unit tests
│   │   └── test_predict.py                        # [TEST] Prediction tests
│   ├── alembic/                                   # [MVP] Database migration environment
│   ├── alembic.ini                                # [CONFIG] Alembic migration configurations
│   ├── requirements.txt                           # [CONFIG] Backend dependencies list
│   ├── Dockerfile                                 # [CONFIG] Backend deployment file
│   └── .env.example                               # [CONFIG] Backend variables template
├── frontend/                                      # [MVP] React Vite frontend application
│   ├── public/                                    # [STATIC] Static assets directory
│   │   ├── favicon.ico                            # [STATIC] Favicon icon
│   │   └── logo.png                               # [STATIC] SafeRoute AI logo
│   ├── src/                                       # [MVP] React source code
│   │   ├── assets/                                # [STATIC] Component media assets
│   │   ├── hooks/                                 # [MVP] Custom React hooks
│   │   │   ├── useGeolocation.js                  # [MVP] watchPosition GPS lifecycle & accuracy hook
│   │   │   ├── useDriverTelemetry.js              # [MVP] Speed processing, EMA filter & time derivation hook
│   │   │   └── useLiveRiskAssessment.js           # [MVP] Rate-limited prediction triggering & alerts hook
│   │   ├── components/                            # [MVP] Reusable UI components
│   │   │   ├── prediction/                        # [MVP] Manual Assessment & Mode Switcher
│   │   │   │   ├── PredictionForm.jsx             # [MVP] Manual scenario evaluation form
│   │   │   │   └── ModeSwitcher.jsx               # [MVP] Segmented mode switcher control
│   │   │   ├── live-driver/                       # [MVP] Live Driver Telemetry components
│   │   │   │   ├── LiveDriverMode.jsx             # [MVP] Live Driver session container
│   │   │   │   ├── LiveTelemetry.jsx              # [MVP] Speed gauge & coordinate readout
│   │   │   │   ├── LiveRiskCard.jsx               # [MVP] Risk score & confidence card
│   │   │   │   ├── GPSStatus.jsx                  # [MVP] GPS connectivity & accuracy badge
│   │   │   │   └── DrivingSafetyBanner.jsx        # [MVP] Glanceable safety escalation alert
│   │   ├── context/                               # [MVP] React context managers
│   │   │   ├── AuthContext.jsx                    # [MVP] Authentication states & JWT logs context
│   │   │   └── MapContext.jsx                     # [MVP] Map coordinates & layers coordinates context
│   │   ├── hooks/                                 # [MVP] Shared utility hooks (useAuth, useLocalStorage)
│   │   ├── pages/                                 # [MVP] Route view endpoints
│   │   │   ├── Login.jsx                          # [MVP] SaaS login view
│   │   │   ├── Register.jsx                       # [MVP] SaaS registration view
│   │   │   ├── Dashboard.jsx                      # [MVP] Main SaaS dashboard view
│   │   │   └── AdminDashboard.jsx                 # [MVP] Admin portal workspace view
│   │   ├── services/                              # [MVP] Network and services connectors
│   │   │   └── api.js                             # [MVP] Axios connector interceptor
│   │   ├── utils/                                 # [MVP] Formatting helpers & validators
│   │   ├── App.jsx                                # [MVP] Main router binding
│   │   └── main.jsx                               # [MVP] Application root mounting target
│   ├── package.json                               # [CONFIG] Frontend package configurations
│   ├── vite.config.js                             # [CONFIG] Vite environment configs
│   ├── tailwind.config.js                         # [CONFIG] Tailwind grid styling rules
│   └── .env.example                               # [CONFIG] Frontend environment variables template
├── nginx/                                         # [CONFIG] Nginx reverse proxy configurations
│   ├── conf.d/                                    # [CONFIG] Site redirect configurations
│   │   └── default.conf                           # [CONFIG] Host configs default mappings
│   └── certs/                                     # [CONFIG] Directory for Let's Encrypt certificates
├── docker-compose.yml                             # [CONFIG] Docker development coordination file
└── README.md                                      # [DOCS] Project overview readme
```

---

## 3. Component Classification Specifications
* **Structure Freeze**: All file paths and folder names are frozen. Adding new files during development requires architectural approval.
* **MVP Scope Verification**: All folders and files marked with `[MVP]` are required to build the initial release.

---

## 4. Assumptions, Risks & Mitigation

### 4.1 Assumptions
* Developers maintain this directory layout strictly to ensure CI/CD build scripts remain functional.

### 4.2 Folder Structure Risks & Mitigation
* **Risk**: Accidentally committing generated machine learning binaries (`model.joblib`) or local variables (`.env`) to the repository.
  * *Mitigation*: Configure the root `.gitignore` file to ignore `.env`, `venv/`, and `.joblib` files, forcing binaries to be generated dynamically during builds.

---

## 5. Best Practices
* **Adhere to Code Layouts**: Maintain files in their designated directories as specified in [PROJECT_STRUCTURE.md](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/PROJECT_STRUCTURE.md) to ensure consistency.

## 6. Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-07-27 | Architecture Lead | Frozen directory layout and folder classifications finalized. |

---

## 7. References
1. *Vite Build and Static Directory Guidelines*: https://vite.dev/guide/assets.html
2. *FastAPI Directory Layout Recommendations*: https://fastapi.tiangolo.com/tutorial/bigger-applications/
