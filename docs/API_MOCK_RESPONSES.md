# API Mock Responses Catalog

## Project: SafeRoute AI
### AI-Powered Road Accident Hotspot Prediction System

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Frozen |
| **Author** | SafeRoute AI Lead Integrations Engineer |
| **Date** | 2026-07-27 |
| **Intended Audience** | Frontend Developers, Integration Testers, Backend Developers |

---

## Table of Contents
1. [Catalog Purpose](#1-catalog-purpose)
2. [Authentication Endpoints Mock Responses](#2-authentication-endpoints-mock-responses)
3. [Prediction Endpoints Mock Responses](#3-prediction-endpoints-mock-responses)
4. [User Profile Endpoints Mock Responses](#4-user-profile-endpoints-mock-responses)
5. [Maps Hotspot Coordinates Mock Responses](#5-maps-hotspot-coordinates-mock-responses)
6. [Admin Console Endpoints Mock Responses](#6-admin-console-endpoints-mock-responses)
7. [System Error Mock Responses](#7-system-error-mock-responses)
8. [Assumptions, Risks & Mitigation](#8-assumptions-risks--mitigation)
9. [Best Practices](#9-best-practices)
10. [Revision History](#10-revision-history)
11. [References](#11-references)

---

## 1. Catalog Purpose
This catalog documents mock JSON responses for all SafeRoute AI API endpoints. The frontend team should use these mock responses to simulate backend API interactions during early-stage development.

---

## 2. Authentication Endpoints Mock Responses

### 2.1 Endpoint: `POST /api/auth/register`

#### Success Response (HTTP 201 Created)
```json
{
  "id": "7ac98fb5-48fa-4e78-9e67-ea217983692d",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "user",
  "created_at": "2026-07-27T10:15:00Z"
}
```

#### Validation Error (HTTP 400 Bad Request)
```json
{
  "detail": {
    "error_code": "VALIDATION_FAILED",
    "message": "Password is too weak. Minimum 8 characters required.",
    "timestamp": "2026-07-27T10:15:30Z"
  }
}
```

---

### 2.2 Endpoint: `POST /api/auth/login`

#### Success Response (HTTP 200 OK)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3YWM5OGZiNS...",
  "token_type": "bearer",
  "role": "user",
  "expires_in": 86400
}
```

---

## 3. Prediction Endpoints Mock Responses

### 3.1 Endpoint: `POST /api/predict`

#### Success Response (HTTP 200 OK)
```json
{
  "log_id": "c138f322-1f48-433b-bd9d-ef81e4b3da55",
  "risk_score": 68,
  "risk_category": "High",
  "accident_probability": 0.684,
  "created_at": "2026-07-27T10:20:00Z"
}
```

#### Validation Error (HTTP 400 Bad Request)
```json
{
  "detail": {
    "error_code": "INVALID_SPEED_VALUE",
    "message": "average_speed must be between 0.0 and 200.0 km/h.",
    "timestamp": "2026-07-27T10:20:15Z"
  }
}
```

---

### 3.2 Endpoint: `GET /api/predictions/history`

#### Success Response (HTTP 200 OK)
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
      "created_at": "2026-07-27T10:20:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "size": 10,
  "pages": 1
}
```

---

## 4. User Profile Endpoints Mock Responses

### 4.1 Endpoint: `GET /api/profile`

#### Success Response (HTTP 200 OK)
```json
{
  "id": "7ac98fb5-48fa-4e78-9e67-ea217983692d",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "user",
  "created_at": "2026-07-27T10:15:00Z",
  "is_active": true
}
```

---

## 5. Maps Hotspot Coordinates Mock Responses

### 5.1 Endpoint: `GET /api/hotspots`

#### Success Response (HTTP 200 OK)
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
  },
  {
    "id": "b20d3940-8e8e-4a6c-9418-8a033f9e9d6e",
    "latitude": 28.6250,
    "longitude": 77.2150,
    "road_name": "Barakhamba Road Crossing",
    "risk_score": 45,
    "risk_category": "Medium",
    "historical_accident_count": 5
  }
]
```

---

## 6. Admin Console Endpoints Mock Responses

### 6.1 Endpoint: `GET /api/admin/stats`

#### Success Response (HTTP 200 OK)
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

### 6.2 Endpoint: `POST /api/admin/dataset/upload`

#### Success Response (HTTP 202 Accepted)
```json
{
  "message": "Dataset upload accepted for processing.",
  "filename": "delhi_accident_data_2026.csv",
  "records_count": 4500,
  "status": "processing"
}
```

---

## 7. System Error Mock Responses

### 7.1 Authentication Failure (HTTP 401 Unauthorized)
```json
{
  "detail": {
    "error_code": "TOKEN_EXPIRED",
    "message": "Your JWT session token has expired. Please log in again.",
    "timestamp": "2026-07-27T10:30:00Z"
  }
}
```

### 7.2 Permission Error (HTTP 403 Forbidden)
```json
{
  "detail": {
    "error_code": "INSUFFICIENT_PERMISSIONS",
    "message": "You do not have permission to access administrative resources.",
    "timestamp": "2026-07-27T10:31:00Z"
  }
}
```

### 7.3 Server Error (HTTP 500 Internal Server Error)
```json
{
  "detail": {
    "error_code": "DATABASE_DISCONNECTED",
    "message": "Unable to establish database connection. Please try again later.",
    "timestamp": "2026-07-27T10:32:00Z"
  }
}
```

---

## 8. Assumptions, Risks & Mitigation

### 8.1 Assumptions
* The frontend parsing services intercept HTTP error codes to display appropriate user notifications.

### 8.2 Catalog Risks & Mitigation
* **Risk**: Changes to backend API schemas during development, rendering mock data inconsistent.
  * *Mitigation*: Ensure API schema updates are reflected in this catalog to maintain consistency.

---

## 9. Best Practices
* **Use Realistic Data**: Keep mock coordinates and string variables realistic to simplify frontend testing.
* **Match Headers**: Ensure mock responses mirror the HTTP headers returned by the production API.

## 10. Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-07-27 | Integrations Engineer | Initial release of mock JSON responses catalog. |

---

## 11. References
1. *RFC 8259 The JavaScript Object Notation (JSON) Data Format*: https://datatracker.ietf.org/doc/html/rfc8259
2. *HTTP API Design Guidelines*: https://geemus.gitbooks.io/http-api-design/content/en/
