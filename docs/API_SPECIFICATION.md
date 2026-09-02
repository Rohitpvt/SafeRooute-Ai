# REST API Endpoints Specification

## Project: SafeRoute AI
### AI-Powered Road Accident Hotspot Prediction System

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Approved |
| **Author** | SafeRoute AI Backend Architecture Team |
| **Date** | 2026-07-27 |
| **Intended Audience** | Frontend Developers, Backend Developers, ML Engineers, Integration Testers |

---

## Table of Contents
1. [General Concepts & Headers](#1-general-concepts--headers)
2. [Global Error Payloads](#2-global-error-payloads)
3. [Authentication Endpoints](#3-authentication-endpoints)
4. [Prediction & Model Endpoints](#4-prediction--model-endpoints)
5. [Route Preview & Segmentation Endpoints](#5-route-preview--segmentation-endpoints)
6. [User Profile Endpoints](#6-user-profile-endpoints)
7. [Hotspot Visualization Endpoints](#7-hotspot-visualization-endpoints)
8. [Admin & Management Endpoints](#8-admin--management-endpoints)
9. [Rate Limiting Policies](#9-rate-limiting-policies)
10. [References](#10-references)

---

## 1. General Concepts & Headers
All requests must be issued to HTTPS endpoints. The API payload format for both inputs and outputs is strictly JSON.

### 1.1 Base URL
* Local Dev: `http://localhost:8000/api`
* Production: `https://api.saferouteai.com/api` (mock URL)

### 1.2 Mandatory Request Headers
* **Content-Type**: `application/json` (Required for all `POST` / `PUT` requests).
* **Authorization**: `Bearer <JWT_TOKEN>` (Required for all protected endpoints).

---

## 2. Global Error Payloads
When an API request fails, the backend returns a structured error object.

### 2.1 Standard Error Response Structure
```json
{
  "detail": {
    "error_code": "STRING_IDENTIFIER",
    "message": "Human readable summary of the error context.",
    "timestamp": "2026-07-27T03:57:00Z"
  }
}
```

---

## 3. Authentication Endpoints

### 3.1 POST `/auth/register`
* **Purpose**: Register a new commuter, officer, or admin account.
* **Authentication**: None required.
* **Request Body**:
  | Parameter | Type | Required | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `email` | String | Yes | Must be a valid email format, max 255 chars. | Login username. |
  | `password` | String | Yes | Minimum 8 characters, must contain 1 digit. | Secure password. |
  | `full_name` | String | Yes | Min 2 chars, max 100 chars. | User's full name. |
* **Success Response (HTTP 201 Created)**:
  ```json
  {
    "id": "7ac98fb5-48fa-4e78-9e67-ea217983692d",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user",
    "created_at": "2026-07-27T03:57:00Z"
  }
  ```
* **Error Responses**:
  * `400 Bad Request` (Validation errors):
    ```json
    {
      "detail": {
        "error_code": "VALIDATION_FAILED",
        "message": "Password is too weak. Minimum 8 characters required.",
        "timestamp": "2026-07-27T03:57:00Z"
      }
    }
    ```
  * `409 Conflict` (Email already registered):
    ```json
    {
      "detail": {
        "error_code": "EMAIL_ALREADY_EXISTS",
        "message": "An account with this email address already exists.",
        "timestamp": "2026-07-27T03:57:00Z"
      }
    }
    ```

---

### 3.2 POST `/auth/login`
* **Purpose**: Verify user credentials and return a signed JSON Web Token (JWT) session.
* **Authentication**: None required.
* **Request Body**:
  | Parameter | Type | Required | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `email` | String | Yes | Valid email template format. | Registration email. |
  | `password` | String | Yes | Non-empty string. | Password sequence. |
* **Success Response (HTTP 200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3YWM5OGZiNS...",
    "token_type": "bearer",
    "role": "user",
    "expires_in": 86400
  }
  ```
* **Error Responses**:
  * `401 Unauthorized` (Invalid email or password):
    ```json
    {
      "detail": {
        "error_code": "INVALID_CREDENTIALS",
        "message": "Incorrect email or password.",
        "timestamp": "2026-07-27T03:57:00Z"
      }
    }
    ```

---

## 4. Prediction & Model Endpoints

### 4.1 POST `/predict`
* **Purpose**: Query the Random Forest classifier to predict road segment risk levels using inputs.
* **Authentication**: Required (`user` or `admin`).
* **Request Body**:
  | Parameter | Type | Required | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `weather` | String | Yes | Must be in `['Clear', 'Rainy', 'Snowy', 'Foggy', 'Windy']` | Environmental weather state. |
  | `traffic_density` | String | Yes | Must be in `['Low', 'Medium', 'High', 'Jammed']` | Congestion rating. |
  | `road_type` | String | Yes | Must be in `['Highway', 'Arterial', 'Local', 'Expressway']` | Road build classification. |
  | `average_speed` | Float | Yes | Must be >= 0.0 and <= 200.0 (km/h) | Average velocity on segments. |
  | `time_of_day` | String | Yes | Must be in `['Morning', 'Afternoon', 'Evening', 'Night']` | Hour block parameters. |
* **Success Response (HTTP 200 OK)**:
  ```json
  {
    "log_id": "c138f322-1f48-433b-bd9d-ef81e4b3da55",
    "risk_score": 68,
    "risk_category": "High",
    "accident_probability": 0.684,
    "created_at": "2026-07-27T03:57:00Z"
  }
  ```
* **Error Responses**:
  * `400 Bad Request` (Invalid input range or category):
    ```json
    {
      "detail": {
        "error_code": "INVALID_INPUT_PARAMETERS",
        "message": "average_speed must be between 0.0 and 200.0 km/h.",
        "timestamp": "2026-07-27T03:57:00Z"
      }
    }
    ```

---

### 4.2 GET `/predictions/history`
* **Purpose**: Retrieve historical prediction queries executed by the logged-in user.
* **Authentication**: Required (`user` or `admin`).
* **Query Parameters**:
  * `page` (Integer, Optional, Default: 1, Min: 1)
  * `size` (Integer, Optional, Default: 10, Min: 1, Max: 100)
* **Success Response (HTTP 200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "c138f322-1f48-433b-bd9d-ef81e4b3da55",
        "weather": "Rainy",
        "traffic_density": "High",
        "road_type": "Highway",
        "average_speed": 85.5,
        "time_of_day": "Evening",
        "risk_score": 68,
        "risk_category": "High",
        "accident_probability": 0.684,
        "created_at": "2026-07-27T03:57:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "size": 10,
    "pages": 1
  }
  ```

---

## 5. User Profile Endpoints

### 5.1 GET `/profile`
* **Purpose**: Fetch profile properties of the active authenticated user session.
* **Authentication**: Required (`user` or `admin`).
* **Success Response (HTTP 200 OK)**:
  ```json
  {
    "id": "7ac98fb5-48fa-4e78-9e67-ea217983692d",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user",
    "created_at": "2026-07-27T03:57:00Z",
    "is_active": true
  }
  ```

---

### 5.2 PUT `/profile`
* **Purpose**: Update profile information (specifically display name).
* **Authentication**: Required (`user` or `admin`).
* **Request Body**:
  | Parameter | Type | Required | Validation Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `full_name` | String | Yes | Min 2 chars, max 100 chars. | Updated profile name. |
* **Success Response (HTTP 200 OK)**:
  ```json
  {
    "id": "7ac98fb5-48fa-4e78-9e67-ea217983692d",
    "email": "user@example.com",
    "full_name": "Johnathan Doe",
    "role": "user",
    "updated_at": "2026-07-27T03:57:00Z"
  }
  ```

---

## 6. Hotspot Visualization Endpoints

### 6.1 GET `/hotspots`
* **Purpose**: Fetch list of road hotspot coordinates and risk levels within bounding boxes to display map overlays.
* **Authentication**: Required (`user` or `admin`).
* **Query Parameters**:
  * `north` (Float, Required, Range: -90.0 to 90.0) - Latitude bounding box North.
  * `south` (Float, Required, Range: -90.0 to 90.0) - Latitude bounding box South.
  * `east` (Float, Required, Range: -180.0 to 180.0) - Longitude bounding box East.
  * `west` (Float, Required, Range: -180.0 to 180.0) - Longitude bounding box West.
* **Success Response (HTTP 200 OK)**:
  ```json
  [
    {
      "id": "a50c1840-7e8e-4a6c-9418-8a033f9e9d6d",
      "latitude": 28.6139,
      "longitude": 77.2090,
      "road_name": "Connaught Place Ring Rd",
      "risk_score": 82,
      "risk_category": "Critical",
      "historical_accident_count": 14
    }
  ]
  ```

---

## 7. Admin & Management Endpoints

### 7.1 GET `/admin/users`
* **Purpose**: List registered application users.
* **Authentication**: Required (`admin` role strictly).
* **Query Parameters**:
  * `page` (Integer, Optional, Default: 1)
  * `size` (Integer, Optional, Default: 20)
* **Success Response (HTTP 200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "7ac98fb5-48fa-4e78-9e67-ea217983692d",
        "email": "user@example.com",
        "full_name": "John Doe",
        "role": "user",
        "is_active": true,
        "created_at": "2026-07-27T03:57:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "size": 20
  }
  ```

---

### 7.2 GET `/admin/logs`
* **Purpose**: Retrieve system-wide prediction logs generated by all users (for auditing).
* **Authentication**: Required (`admin` role strictly).
* **Query Parameters**:
  * `page` (Integer, Optional, Default: 1)
  * `size` (Integer, Optional, Default: 20)
* **Success Response (HTTP 200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "c138f322-1f48-433b-bd9d-ef81e4b3da55",
        "user_id": "7ac98fb5-48fa-4e78-9e67-ea217983692d",
        "user_email": "user@example.com",
        "weather": "Rainy",
        "traffic_density": "High",
        "road_type": "Highway",
        "average_speed": 85.5,
        "time_of_day": "Evening",
        "risk_score": 68,
        "risk_category": "High",
        "created_at": "2026-07-27T03:57:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "size": 20
  }
  ```

---

### 7.3 POST `/admin/dataset/upload`
* **Purpose**: Upload a CSV training file containing historical parameters to append data profiles.
* **Authentication**: Required (`admin` role strictly).
* **Headers**: `Content-Type: multipart/form-data`
* **Request Body**: Binary file upload (file field name: `file`).
* **Success Response (HTTP 202 Accepted)**:
  ```json
  {
    "message": "Dataset upload accepted for processing.",
    "filename": "delhi_accident_data_2026.csv",
    "records_count": 4500,
    "status": "processing"
  }
  ```

---

### 7.4 GET `/admin/stats`
* **Purpose**: Compute high-level dashboard summaries representing system operations.
* **Authentication**: Required (`admin` role strictly).
* **Success Response (HTTP 200 OK)**:
  ```json
  {
    "total_predictions_issued": 18450,
    "total_registered_users": 340,
    "risk_score_distribution": {
      "Low": 8900,
      "Medium": 5120,
      "High": 2900,
      "Critical": 1530
    },
    "model_accuracy_f1": 0.842,
    "db_active_connections": 4
  }
  ```

---

## 8. Rate Limiting Policies
To protect server resources, rate-limiting limits are applied globally:
* **Anonymous Endpoints (`/auth/login`, `/auth/register`)**: Limit of 5 requests per minute per IP address. Exceeding requests return `429 Too Many Requests`.
* **Authenticated Predictions (`/predict`, `/hotspots`)**: Limit of 60 requests per minute per User ID.
* **Standard Read Queries (`/predictions/history`, `/profile`)**: Limit of 120 requests per minute per User ID.

---

## 9. Assumptions, Risks & Mitigation

### 9.1 Assumptions
* JWT authorization is verified at backend using shared signature configurations without requiring DB lookups for every request.

### 9.2 Risks & Mitigation
* **Risk**: Excessive dataset size uploads blocking FastAPI execution loop during CSV verification.
  * *Mitigation*: Run dataset parsing in background thread pools using FastAPI's built-in `BackgroundTasks`.

---

## 10. Best Practices
* **Standard Status Codes**: Adhere to exact standards. Do not return success codes (`200`) for payloads with failure properties.
* **Strict Parameter Sanitization**: Reject requests with unexpected fields. Raise validation exceptions in Pydantic.

## 11. Future Extensions
* **WebSockets Integration**: Implement push updates via WebSockets when risk categories for pre-defined hot-markers shift based on real-time weather changes.

## 12. Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-07-27 | API Design Lead | Initial REST API specifications mapping auth, predictions, and admin panels. |

---

## 13. References
1. *RFC 7519 JSON Web Token Specification*: https://datatracker.ietf.org/doc/html/rfc7519
2. *HTTP Status Code Registry*: https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml
3. *FastAPI FastAPI BackgroundTasks*: https://fastapi.tiangolo.com/tutorial/background-tasks/
