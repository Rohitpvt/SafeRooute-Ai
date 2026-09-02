# Workspace Directory Layout & Component Mapping

## Project: SafeRoute AI
### AI-Powered Road Accident Hotspot Prediction System

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Approved |
| **Author** | SafeRoute AI Architecture Lead |
| **Date** | 2026-07-27 |
| **Intended Audience** | Developers, QA Engineers, DevOps Engineers |

---

## Table of Contents
1. [Workspace Overview](#1-workspace-overview)
2. [Directory Tree Structure](#2-directory-tree-structure)
3. [Backend Directory Deep-Dive](#3-backend-directory-deep-dive)
4. [Frontend Directory Deep-Dive](#4-frontend-directory-deep-dive)
5. [Docker & Configuration Directories](#5-docker--configuration-directories)
6. [Assumptions, Risks & Mitigation](#6-assumptions-risks--mitigation)
7. [Best Practices](#7-best-practices)
8. [Revision History](#8-revision-history)
9. [References](#9-references)

---

## 1. Workspace Overview
SafeRoute AI is structured as a monorepo containing distinct directories for the backend API, frontend SPA, and Nginx proxy gateway configurations. This layout is designed to simplify local development, testing, and deployment.

---

## 2. Directory Tree Structure

The project workspace uses the following file and folder structure:

```text
SafeRoute AI/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── prediction.py
│   │   │   └── hotspot.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── predict.py
│   │   │   └── admin.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── prediction.py
│   │   │   └── hotspot.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   └── prediction_service.py
│   │   ├── database.py
│   │   ├── config.py
│   │   └── main.py
│   ├── ml/
│   │   ├── data/
│   │   │   └── accident_training.csv
│   │   ├── models/
│   │   │   ├── model.joblib
│   │   │   └── scaler.joblib
│   │   └── train.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_auth.py
│   │   └── test_predict.py
│   ├── alembic/
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── MapView.jsx
│   │   │   ├── PredictionForm.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Predict.jsx
│   │   │   └── AdminPanel.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── styles/
│   │   │   └── index.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.example
├── nginx/
│   ├── conf.d/
│   │   └── default.conf
│   └── certs/
├── docker-compose.yml
└── README.md
```

---

## 3. Backend Directory Deep-Dive

### 3.1 `backend/app/`
Contains the core FastAPI application code.
* **`main.py`**: The entry point for the API. Initializes the FastAPI instance, mounts CORS middleware, and registers API routers.
* **`config.py`**: Loads environment variables from `.env` and exports system configuration properties (e.g., database URLs, JWT keys).
* **`database.py`**: Manages the SQLAlchemy database connection session lifecycle.

### 3.2 `backend/app/models/`
Defines the SQLAlchemy ORM mapping classes that correspond to database tables.
* **`user.py`**: Relates to the `users` table, containing user properties and roles.
* **`prediction.py`**: Maps to the `prediction_logs` table, storing history details.
* **`hotspot.py`**: Maps to the `accident_hotspots` table, storing coordinates.

### 3.3 `backend/app/routers/`
Defines API endpoints using FastAPI's APIRouter classes.
* **`auth.py`**: Exposes `/auth/register` and `/auth/login` login verification endpoints.
* **`predict.py`**: Exposes `/predict` and `/predictions/history` prediction endpoints.
* **`admin.py`**: Exposes `/admin/*` system monitoring and CSV upload endpoints.

### 3.4 `backend/app/schemas/`
Defines Pydantic models for payload validation and serialization checks.

### 3.5 `backend/app/services/`
Contains business logic layers, separating controller routes from database operations.
* **`auth_service.py`**: Manages password hashing, token validation, and authorization checks.
* **`prediction_service.py`**: Interface for loading joblib binaries and running Random Forest inference.

### 3.6 `backend/ml/`
Houses machine learning components.
* **`train.py`**: Runs offline training tasks and saves output binaries.
* **`data/`**: Directory containing raw training CSV datasets.
* **`models/`**: Houses the generated `model.joblib` and `scaler.joblib` binary files.

---

## 4. Frontend Directory Deep-Dive

### 4.1 `frontend/src/components/`
Reusable UI components.
* **`MapView.jsx`**: Integrates the Google Map interface, rendering risk pins and heatmap layers.
* **`PredictionForm.jsx`**: Input form interface that allows users to test risk scenarios.
* **`ProtectedRoute.jsx`**: Renders child components only when a valid JWT token is present in the session context.

### 4.2 `frontend/src/context/`
Maintains global application states.
* **`AuthContext.jsx`**: Manages login status, token persistence, and role configurations.

### 4.3 `frontend/src/pages/`
Main layout views mapped to routes.
* **`Dashboard.jsx`**: Displays map visualizations, charts, and current risk metrics.
* **`AdminPanel.jsx`**: Layout with user management, log listings, and file uploads.

### 4.4 `frontend/src/services/`
* **`api.js`**: An Axios client instance configured with interceptors to inject JWT headers automatically.

---

## 5. Docker & Configuration Directories
* **`nginx/conf.d/default.conf`**: Sets up domain routing, forces SSL connection upgrades, and configures reverse proxies.
* **`docker-compose.yml`**: Defines service configurations to orchestrate containers.

---

## 6. Assumptions, Risks & Mitigation

### 6.1 Assumptions
* Developers maintain this directory layout strictly to ensure CI/CD build scripts remain functional.

### 6.2 Workspace Risks & Mitigation
* **Risk**: Circular dependencies between models and routers during startup.
  * *Mitigation*: Ensure relationships and model files are imported through the app's central `__init__.py` or metadata configurations.

---

## 7. Best Practices
* **Keep Folders Flat**: Avoid nesting folders too deeply within the source directory.
* **Isolate ML Components**: Keep machine learning code and training datasets isolated in the `ml/` directory.

## 8. Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-07-27 | Architecture Lead | Initial workspace layout mapping backend, frontend, and Docker assets. |

---

## 9. References
1. *FastAPI Directory Layout Best Practices*: https://fastapi.tiangolo.com/tutorial/bigger-applications/
2. *Vite Project Scaffolding Guidelines*: https://vite.dev/guide/
