# Application Page Specifications

## Project: SafeRoute AI
### AI-Powered Road Accident Hotspot Prediction System

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Frozen |
| **Author** | SafeRoute AI Frontend Systems Engineer |
| **Date** | 2026-07-27 |
| **Intended Audience** | Frontend Developers, QA Engineers, UI Designers |

---

## Table of Contents
1. [Routing Strategy & Scope](#1-routing-strategy--scope)
2. [Landing Page Specification](#2-landing-page-specification)
3. [Authentication: Login & Register Pages](#3-authentication-login--register-pages)
4. [User Dashboard Specification](#4-user-dashboard-specification)
5. [AI Risk Prediction Page](#5-ai-risk-prediction-page)
6. [Prediction History Log](#6-prediction-history-log)
7. [User Profile Specification](#7-user-profile-specification)
8. [Admin Console Pages](#8-admin-console-pages)
9. [Settings Page Specification](#9-settings-page-specification)
10. [Fallback 404 Page](#10-fallback-404-page)
11. [Assumptions, Risks & Mitigation](#11-assumptions-risks--mitigation)
12. [Best Practices](#12-best-practices)
13. [Revision History](#13-revision-history)
14. [References](#14-references)

---

## 1. Routing Strategy & Scope
SafeRoute AI is a Single Page Application (SPA). Router structures are managed client-side using `react-router-dom` to enforce route access restrictions.

---

## 2. Landing Page Specification
* **Route**: `/`
* **Purpose**: Present the product's value proposition and provide links to login or register.
* **UI Components**: Main hero sections, feature grids (heatmap details, ML risk analysis, dashboards), navigation header, footer.
* **Inputs**: None.
* **Outputs**: None.
* **User Actions**:
  * Click **Sign In**: Navigates to `/login`.
  * Click **Get Started**: Navigates to `/register`.
* **API Calls**: None.
* **Validation / Error Handling**: Not applicable.
* **Loading Behaviour**: Static assets load immediately.
* **Navigation Rules**: Accessible to all visitors.

---

## 3. Authentication: Login & Register Pages

### 3.1 Login Page
* **Route**: `/login`
* **Purpose**: Authenticate users and return access tokens.
* **UI Components**: Login card, email/password form fields, error banners, submit button.
* **Inputs**: Email (string), Password (string).
* **Outputs**: Displays error banners or redirects to the dashboard on success.
* **User Actions**: Submit credentials or click links to registration page.
* **API Calls**: `POST /api/auth/login` (passes payload email and password).
* **Validation**: Email validation checks input structure, and password field checks password length.
* **Error Handling**: Displays error toast if credentials do not match or fields are missing.
* **Loading Behaviour**: Disables input forms and displays loading indicator on submit button.
* **Navigation Rules**: Redirects to `/dashboard` (or `/admin` based on user role) on success.

### 3.2 Register Page
* **Route**: `/register`
* **Purpose**: Register a new user profile.
* **UI Components**: Registration form, input validation highlights, submit button.
* **Inputs**: Full Name, Email, Password, Password Confirmation.
* **Outputs**: Redirects to the login screen on success.
* **API Calls**: `POST /api/auth/register` (passes name, email, and password).
* **Validation**: Password must be at least 8 characters, and the email must match standard regex patterns.
* **Error Handling**: Displays error banners if the email is already registered.
* **Loading Behaviour**: Disables submit actions during API requests.
* **Navigation Rules**: Redirects to `/login` with success banner after 1.5 seconds.

---

## 4. User Dashboard Specification
* **Route**: `/dashboard`
* **Purpose**: The main interactive interface for checking road risks and statistics.
* **UI Components**: Google Maps container, stats cards (weather state, risk metrics), prediction history preview table, risk charts (distribution, trends).
* **Inputs**: Coordinates bounding box changes from map panning actions.
* **Outputs**: Interactive heatmap overlays, custom pins, safety charts, and history sub-logs.
* **User Actions**: Pan/zoom map, click pins, toggle heatmap layer, click details links on charts.
* **API Calls**:
  * `GET /api/hotspots?north=&south=&east=&west=` (Fetches visible markers).
  * `GET /api/predictions/history?page=1&size=5` (Fetches recent query logs).
* **Validation**: Restricts API queries to visible map coordinate bounds.
* **Error Handling**: Displays alert banner at top of view if Google Maps script fails to load.
* **Loading Behaviour**: Renders pulsing skeleton blocks for cards and displays progress indicator on the map.
* **Navigation Rules**: Requires authentication. Redirects to `/login` if session is missing or expired.

---

## 5. AI Risk Prediction Page
* **Route**: `/predict`
* **Purpose**: Evaluate road accident risks based on user inputs.
* **UI Components**: Form input selectors, submit buttons, risk display cards, meter indicators.
* **Inputs**: Weather, Traffic Density, Road Type, Average Speed, Time of Day.
* **Outputs**: Risk score (0-100), risk category (Low, Medium, High, Critical), accident probability (%).
* **User Actions**: Select environmental inputs, input average speeds, click "Assess Route Risk".
* **API Calls**: `POST /api/predict` (Transmits input parameters, returns evaluation details).
* **Validation**: Average speed must be a positive number between 0.0 and 200.0 km/h.
* **Error Handling**: Form validation errors block submissions; API failures display error toasts.
* **Loading Behaviour**: Disables controls and displays loading indicator on submit button.
* **Navigation Rules**: Requires authentication.

---

## 6. Prediction History Log
* **Route**: `/history`
* **Purpose**: List historical prediction logs queried by the user.
* **UI Components**: Log history table, paginator controllers, filter select inputs.
* **Inputs**: Page number adjustments, filters (weather, risk category).
* **Outputs**: Paginated tabular log history.
* **User Actions**: Adjust page indexes, apply filters, clear query history.
* **API Calls**: `GET /api/predictions/history?page=&size=` (Retrieves user history logs).
* **Validation**: Index values must be positive integers.
* **Error Handling**: Displays empty state illustrations if no logs match selected filters.
* **Loading Behaviour**: Renders skeleton grids for table rows during data fetching.
* **Navigation Rules**: Requires authentication.

---

## 7. User Profile Specification
* **Route**: `/profile`
* **Purpose**: Manage profile details.
* **UI Components**: Profile card layout, editing panels, save buttons.
* **Inputs**: Full Name (string).
* **Outputs**: Updates user name in application headers.
* **User Actions**: Edit display name, click "Save Changes".
* **API Calls**:
  * `GET /api/profile` (Retrieves user profile details).
  * `PUT /api/profile` (Updates user display name).
* **Validation**: Full Name must be between 2 and 100 characters.
* **Error Handling**: Displays error toast if update fails.
* **Loading Behaviour**: Disables form inputs during update requests.
* **Navigation Rules**: Requires authentication.

---

## 8. Admin Console Pages

### 8.1 Admin Dashboard
* **Route**: `/admin`
* **Purpose**: Core monitor interface for system statistics and logs.
* **UI Components**: System stats cards, active connection charts, query volume summaries.
* **API Calls**: `GET /api/admin/stats` (Retrieves system statistics).

### 8.2 Dataset Management
* **Route**: `/admin/dataset`
* **Purpose**: Manage training datasets.
* **UI Components**: Drag-and-drop file uploader, file parsing log summaries.
* **Inputs**: CSV training files.
* **API Calls**: `POST /api/admin/dataset/upload` (Uploads CSV file as multipart form data).
* **Validation**: File extension must be `.csv`, content type must be `text/csv`, and file size must be under 10MB.

### 8.3 User Management
* **Route**: `/admin/users`
* **Purpose**: Monitor registered user profiles.
* **UI Components**: User list table, search input, status indicators.
* **API Calls**: `GET /api/admin/users?page=&size=` (Retrieves user listings).

---

## 9. Settings Page Specification
* **Route**: `/settings`
* **Purpose**: Modify account configurations.
* **UI Components**: Settings panels, language selection dropdowns, change password controls.
* **Inputs**: Old Password, New Password, Language Selection.
* **API Calls**: `PUT /api/profile/password` (Updates password, future implementation).
* **Validation**: Passwords must be at least 8 characters.

---

## 10. Fallback 404 Page
* **Route**: Fallback wildcard (`*`)
* **Purpose**: Display error page if user navigates to an invalid path.
* **UI Components**: Illustrated 404 card, link back to home or dashboard.
* **User Actions**: Click "Return to Dashboard".
* **Navigation Rules**: Accessible to all visitors.

---

## 11. Assumptions, Risks & Mitigation

### 11.1 Assumptions
* The frontend client successfully captures and stores JWT token expirations to prevent invalid API requests.

### 11.2 Page Interface Risks & Mitigation
* **Risk**: High latency when loading dashboard cards if multiple endpoints are called simultaneously.
  * *Mitigation*: Run data fetches in parallel using `Promise.all` in the dashboard configuration script.

---

## 12. Best Practices
* **Verify JWT**: Check token validity before rendering pages that require authentication.
* **Handle Errors Gracefully**: Intercept API errors to prevent page crashes.

## 13. Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-07-27 | Frontend Architect | Initial page design specifications, including inputs, outputs, validation, and APIs. |

---

## 14. References
1. *React Router DOM Web Guide*: https://reactrouter.com/en/main
2. *W3C Page Navigation Standards*: https://www.w3.org/WAI/patterns/
3. *Axios Interceptors Configurations*: https://axios-http.com/docs/interceptors
