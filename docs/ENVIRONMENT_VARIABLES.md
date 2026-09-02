# System Environment Configurations Specification

## Project: SafeRoute AI
### AI-Powered Road Accident Hotspot Prediction System

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Approved |
| **Author** | SafeRoute AI Lead DevOps Engineer |
| **Date** | 2026-07-27 |
| **Intended Audience** | DevOps Engineers, Backend Developers, Frontend Developers, Integrators |

---

## Table of Contents
1. [Configuration Overview](#1-configuration-overview)
2. [Backend Environment Variables (FastAPI)](#2-backend-environment-variables-fastapi)
3. [Frontend Environment Variables (React/Vite)](#3-frontend-environment-variables-reactvite)
4. [Environment Configurations Setup (Dev/Prod)](#4-environment-configurations-setup-devprod)
5. [Secrets Management & Storage Guidelines](#5-secrets-management--storage-guidelines)
6. [Assumptions, Risks & Mitigation](#6-assumptions-risks--mitigation)
7. [Best Practices](#7-best-practices)
8. [Revision History](#8-revision-history)
9. [References](#9-references)

---

## 1. Configuration Overview
SafeRoute AI follows 12-factor application guidelines by managing configuration settings using environment variables. This approach keeps secret keys isolated from code repositories, simplifies configuration across environments, and ensures that environments (development, staging, production) are configured consistently.

---

## 2. Backend Environment Variables (FastAPI)
The backend service parses parameters at startup using a config module (`backend/app/config.py`) built with Pydantic Settings.

| Variable Name | Type | Required | Default Value | Description | Example Values |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`ENVIRONMENT`** | String | No | `'development'`| Defines application behavior modes (development or production). | `'development'`, `'production'` |
| **`DATABASE_URL`** | String | Yes | None | Connection string for PostgreSQL database. | `'postgresql+asyncpg://saferoute_user:pass@localhost:5432/saferoute_db'`|
| **`JWT_SECRET_KEY`** | String | Yes | None | Signing key used to secure JWT authorization tokens. | `'d76a26df85764d084df8da987c88b...'` (Secure SHA256 string) |
| **`JWT_ALGORITHM`** | String | No | `'HS256'` | Algorithm parameter used to sign JWT signatures. | `'HS256'`, `'RS256'` |
| **`ACCESS_TOKEN_EXPIRE_MINUTES`** | Int | No | `1440` (24h) | Lifespan of generated JWT tokens before expiration. | `60` (1 hour), `1440` (24 hours) |
| **`CORS_ORIGINS`** | JSON | No | `'["http://localhost:5173"]'`| List of origins authorized to connect to the backend APIs. | `'["http://localhost:5173", "https://saferoute.vercel.app"]'` |
| **`HOST`** | String | No | `'127.0.0.1'` | Host IP bind address for the Uvicorn ASGI server. | `'127.0.0.1'`, `'0.0.0.0'` |
| **`PORT`** | Int | No | `8000` | Port mapping for Uvicorn server binds. | `8000`, `10000` |

---

## 3. Frontend Environment Variables (React/Vite)
Because the Vite client bundle is static, all environment variables must be prefixed with `VITE_` to be compiled into the final client assets.

| Variable Name | Type | Required | Default Value | Description | Example Values |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`VITE_API_BASE_URL`**| String | Yes | None | Endpoint target URL for frontend API requests. | `'http://localhost:8000/api'`, `'https://api.saferouteai.com/api'` |
| **`VITE_GOOGLE_MAPS_API_KEY`**| String | Yes | None | Client-side API key for the Google Maps API. | `'AIzaSyD-1A2b3C4d5E6f7G8h9I0j...'` |

---

## 4. Environment Configurations Setup (Dev/Prod)

### 4.1 Development Template (`backend/.env.example`)
```env
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://saferoute_user:secure_dev_password@localhost:5432/saferoute_db
JWT_SECRET_KEY=generate_a_secure_token_for_local_development_runs
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=["http://localhost:5173"]
HOST=127.0.0.1
PORT=8000
```

---

## 5. Secrets Management & Storage Guidelines
* **No Git Commits**: Never commit `.env` configuration files containing real passwords or keys to version control. Add `.env` to `.gitignore`.
* **Inject in Production**: In production environments (e.g., Render, Railway, Vercel), inject variables using the platform's environment settings panels, rather than relying on local configuration files.

---

## 6. Assumptions, Risks & Mitigation

### 6.1 Assumptions
* JWT tokens and Google Maps billing profiles are created before deployments.

### 6.2 Configuration Risks & Mitigation
* **Risk**: Accidentally exposing secret keys in frontend client builds by using the wrong prefix in code.
  * *Mitigation*: Restrict Google Maps API keys to specific HTTP referrers in the Google Cloud Console, preventing their use from other domains.

---

## 7. Best Practices
* **Document Configurations**: Keep `.env.example` templates up-to-date whenever new parameters are added to the application configuration.
* **Fail Early**: Configure validation in the backend configuration class to abort startup if required variables are missing.

## 8. Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-07-27 | Lead DevOps | Initial specifications release, including backend and frontend configurations. |

---

## 9. References
1. *The Twelve-Factor App Methodology*: https://12factor.net/config
2. *Pydantic Settings Management*: https://docs.pydantic.dev/latest/concepts/pydantic_settings/
3. *Vite Environment Variables*: https://vite.dev/guide/env-and-mode
