# SafeRoute AI Admin Portal Report

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Approved & Completed |
| **Author** | Lead Operations Architect |
| **Date** | 2026-07-28 |

---

## 1. Executive Summary
This report describes the architecture, capabilities, and security controls of the **SafeRoute AI Admin Portal**, completing the administrator workspace requirement for the MVP.

---

## 2. Administrator Workspace Features

The portal is implemented as a tabbed workspace containing four distinct management consoles:

### 2.1 Analytics Dashboard
* Displays total registered users, current ML model version, and total predictions.
* Includes risk classification charts showing the breakdown of predictions by hazard levels.

### 2.2 User Directory Manager
* Interactive search and paginated list of accounts.
* Role toggles to elevate standard users or demote administrators (`PATCH /admin/users/{id}/role`).
* Status toggles to deactivate/activate accounts (`PATCH /admin/users/{id}/status`).
* Soft-delete actions secured by confirmation dialogs.

### 2.3 Dataset Management Dropzone
* Drag-and-drop file upload for training CSV files.
* Displays checksums, row counts, and missing value percentages.

### 2.4 System Telemetry Monitor
* Real-time resource usage logs (CPU and Memory percentages).
* Displays API server uptime.
* Model retraining and one-click promotion controls.

---

## 3. Role-Based Access Control (RBAC) & Endpoint Security

All admin endpoints are protected by role-based guards:
1. **Authorization Middleware**: Verifies JWT claims and fetches the user's role from the database.
2. **Access Control**: Rejects non-admin requests with `403 Forbidden` errors.
3. **Self-Action Prevention**: Prevents administrators from modifying their own active status, demoting themselves, or soft-deleting their own accounts.
