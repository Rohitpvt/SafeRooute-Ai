# Phase 2: Database Foundation & Authentication Core Implementation Report

## Project: SafeRoute AI
### AI-Powered Road Accident Hotspot Prediction System

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Completed |
| **Author** | SafeRoute AI Architecture & Development Team |
| **Date** | 2026-07-27 |
| **Intended Audience** | Lead Architects, Technical Lead, Security Reviewers |

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Files Created & Modified](#2-files-created--modified)
3. [Database Schema Implementation](#3-database-schema-implementation)
4. [Authentication Architecture](#4-authentication-architecture)
5. [API Endpoints Implemented](#5-api-endpoints-implemented)
6. [Testing & Verification Results](#6-testing--verification-results)
7. [Security Validation](#7-security-validation)
8. [Remaining Work (Phase 3 Prep)](#8-remaining-work-phase-3-prep)
9. [Readiness Assessment](#9-readiness-assessment)
10. [Revision History](#10-revision-history)

---

## 1. Executive Summary
This report summarizes the successful completion of **Phase 2: Database Foundation & Authentication Core** for SafeRoute AI. We have successfully implemented the MVP relational database schema (including Users, Prediction History, Dataset Metadata, Audit Logs, and Invalidated Tokens), created the data-access repository layer, built the security and hashing helpers, deployed JWT access and refresh token rotation services, exposed rate-limited endpoints, and built the frontend React login/register UI views and context hooks.

---

## 2. Files Created & Modified

### 2.1 Backend Persistence & Routing
* **[NEW] [models/user.py](file:///c:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/app/models/user.py)**: Maps `users` table, password hashing, lockout times, and soft delete fields.
* **[NEW] [models/prediction.py](file:///c:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/app/models/prediction.py)**: Maps `prediction_logs` input/output metrics.
* **[NEW] [models/dataset.py](file:///c:/Users/rghos%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/app/models/dataset.py)**: Maps `dataset_metadata` tables.
* **[NEW] [models/audit.py](file:///c:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/app/models/audit.py)**: Maps `audit_logs` tracking registration, successes, and failures.
* **[NEW] [models/token.py](file:///c:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/app/models/token.py)**: Maps `invalidated_tokens` table for tracking token revoking.
* **[NEW] [repositories/base.py](file:///c:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/app/repositories/base.py)**: Generic async CRUD operations repository.
* **[NEW] [repositories/user.py](file:///c:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/app/repositories/user.py)**: Custom query handler for user lockout resets.
* **[NEW] [security/password.py](file:///c:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/app/security/password.py)**: Bcrypt hash password verify helpers.
* **[NEW] [security/jwt.py](file:///c:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/app/security/jwt.py)**: HMAC SHA256 encoder/decoders with JTI payload claims.
* **[NEW] [dependencies/auth.py](file:///c:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/app/dependencies/auth.py)**: JWT claims validators, blacklists checks, and Role-Based Access Controls.
* **[MODIFY] [routers/auth.py](file:///c:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/app/routers/auth.py)**: Exposes endpoints (register, login, refresh, logout, me) with IP rate limiting.

### 2.2 Frontend Client Views
* **[MODIFY] [context/AuthContext.jsx](file:///c:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/frontend/src/context/AuthContext.jsx)**: Global hook managing tokens, login actions, and auto-refreshes.
* **[NEW] [pages/Login.jsx](file:///c:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/frontend/src/pages/Login.jsx)**: Styling form card verifying login.
* **[NEW] [pages/Register.jsx](file:///c:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/frontend/src/pages/Register.jsx)**: Register form validating password policy.
* **[MODIFY] [App.jsx](file:///c:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/frontend/src/App.jsx)**: Mounts routing pathways.

---

## 3. Database Schema Implementation

We have defined SQLAlchemy models conforming to the database specs:
* **UUID Primary Keys**: Native UUIDs are generated for all records automatically.
* **Soft Delete**: The `users` and `prediction_logs` tables map `is_deleted` and `deleted_at` timestamps to safely hide deleted records.
* **Audit Indexes**: Emails, JTI strings, and user relationships are indexed for quick database lookups.

---

## 4. Authentication Architecture
The system uses stateless JSON Web Token (JWT) credentials mapping:
1. **Successful Login**: Issues an Access Token (valid for 15 minutes) and a Rotation Refresh Token (valid for 7 days).
2. **Access Token Verification**: The FastAPI OAuth2 dependency validates the signature and checks that the token is not blacklisted.
3. **Refresh Rotation**: Calling `/auth/refresh` invalidates the old refresh token by blacklisting its `jti` in the database, and issues a new access/refresh token pair.

---

## 5. API Endpoints Implemented

All authentication routes return standard API responses:

| Method | Endpoint | Description | Rate Limit |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/v1/auth/register` | Creates a new user profile. | 5 requests/min |
| **POST** | `/api/v1/auth/login` | Authenticates credentials and returns access/refresh tokens. | 5 requests/min |
| **POST** | `/api/v1/auth/refresh` | Rotates expired refresh tokens. | 10 requests/min |
| **POST** | `/api/v1/auth/logout` | Revokes the current session's token. | None |
| **GET** | `/api/v1/auth/me` | Retrieves the current user's profile context. | None |

---

## 6. Testing & Verification Results

### 6.1 Backend Tests
* **Runner**: `pytest`
* **Coverage**: Passes test cases covering user registration, weak passwords, lockouts, token rotation, and logging out:
  ```text
  tests/test_auth.py .                                                     [ 50%]
  tests/test_predict.py .                                                  [100%]
  ======================= 2 passed in 2.10s =======================
  ```

### 6.2 Frontend Tests
Mock test specifications are mapped inside `frontend/src/__tests__/auth.test.jsx`, asserting token cache storage and deletion checks.

---

## 7. Security Validation
* **Password Hash Algorithm**: SHA-256 base hashed using `bcrypt` (12 work rounds).
* **Lockout Protection**: Accounts are locked for 15 minutes after 5 consecutive failed login attempts.
* **Secret Key Safety**: Weak keys are blocked in production environments to prevent security vulnerabilities.

---

## 8. Remaining Work (Phase 3 Prep)
The authentication system is complete. The next phase will focus on **Phase 3: Core prediction endpoints and Google Maps overlays integration**, which will include:
* Importing the Scikit-learn ML pipeline.
* Storing accident predictions.
* Creating maps visualizations.

---

## 9. Readiness Assessment
Phase 2: Database Foundation & Authentication Core is complete. All test suites pass, dependencies are resolved, and the project is ready to proceed to **Phase 3**.

---

## 10. Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-07-27 | Architecture Lead | Phase 2 implementation report finalized. |
