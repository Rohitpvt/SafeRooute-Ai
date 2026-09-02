# SafeRoute AI Security Audit Report

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Approved |
| **Author** | Lead Security Engineer |
| **Date** | 2026-07-28 |

---

## 1. Executive Summary
This report summarizes the security controls, audit logging, and HTTP hardening headers implemented in Phase 5 of SafeRoute AI.

---

## 2. Hardened HTTP Response Headers

The application registers secure headers middleware in the FastAPI pipeline:

* **X-Frame-Options (`DENY`)**: Prevents clickjacking attacks by blocking the app from being loaded in iframes.
* **X-Content-Type-Options (`nosniff`)**: Blocks MIME-type sniffing by forcing the browser to respect the declared Content-Type.
* **Referrer-Policy (`strict-origin-when-cross-origin`)**: Protects user privacy by limiting referrer information sent in headers.
* **Permissions-Policy**: Restricts access to browser features (e.g. disables microphone access, limits geolocation to self).
* **Strict-Transport-Security (HSTS)**: Forces HTTPS connections for production traffic:
  `"max-age=63072000; includeSubDomains; preload"`
* **Content Security Policy (CSP)**: Limits script, style, and media sources:
  * Allowed scripts: `self`, `maps.googleapis.com`
  * Allowed styles: `self`, `fonts.googleapis.com`

---

## 3. Privileged Operations Audit Logging

All administrative actions are logged in the `audit_logs` database table:

* **User Account Modifications**: Changes to user roles and status updates.
* **Dataset Lifecycle Events**: Uploads and deletions of datasets.
* **Model Retraining Pipelines**: Model retraining starts, promotions, and failed actions.
* **Failed Admin Requests**: Rejections from RBAC guards.
* **Authentication Events**: Logouts and token invalidation tracking.
