# Local Development Setup Guide

## Project: SafeRoute AI
### AI-Powered Road Accident Hotspot Prediction System

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Approved |
| **Author** | SafeRoute AI Lead DevOps & Setup Engineer |
| **Date** | 2026-07-27 |
| **Intended Audience** | Onboarding Developers, QA Engineers, System Integrators |

---

## Table of Contents
1. [System Requirements](#1-system-requirements)
2. [Workspace Overview](#2-workspace-overview)
3. [Google Maps API Configuration](#3-google-maps-api-configuration)
4. [Backend Environment Setup](#4-backend-environment-setup)
5. [Database Configuration & Migrations](#5-database-configuration--migrations)
6. [Machine Learning Model Initialization](#6-machine-learning-model-initialization)
7. [Frontend Environment Setup](#7-frontend-environment-setup)
8. [Running the Application](#8-running-the-application)
9. [Troubleshooting Guide](#9-troubleshooting-guide)
10. [Assumptions, Risks & Mitigation](#10-assumptions-risks--mitigation)
11. [Best Practices](#11-best-practices)
12. [Revision History](#12-revision-history)
13. [References](#13-references)

---

## 1. System Requirements
Before installation, verify your environment meets the minimum standards.

* **Operating System**: Windows 10/11, macOS Ventura+, or Ubuntu 22.04 LTS.
* **Core Runtimes**:
  * Python `3.11.x`
  * Node.js `^20.x` (includes npm `^10.x`)
  * PostgreSQL `^16.x`
* **Hardware Allocations**: Minimum 8GB RAM (16GB recommended), 5GB free disk space.

---

## 2. Workspace Overview
We follow a unified monorepo folder layout. Detailed directory layouts are found in the companion document [PROJECT_STRUCTURE.md](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/PROJECT_STRUCTURE.md).

---

## 3. Google Maps API Configuration
SafeRoute AI visualizes accident hotspot predictions on Google Maps. Follow these steps to obtain API credentials:

1. **Access Google Cloud Console**: Navigate to https://console.cloud.google.com/.
2. **Create/Select Project**: Select an active project or create one named `SafeRoute-AI`.
3. **Enable APIs**: Navigate to APIs & Services > Library, search for and enable:
   * **Maps JavaScript API**
   * **Geocoding API** (used for address validations)
4. **Create API Key**: Go to APIs & Services > Credentials, click `+ Create Credentials`, and choose `API key`.
5. **Secure API Key**: Restrict access to prevent unauthorized usage. Add HTTP referrer restrictions pointing to local dev endpoints:
   * `http://localhost:5173/*`
6. **Set Environment Variable**: Copy your generated key for the frontend environment configuration.

---

## 4. Backend Environment Setup

1. Open a terminal and navigate to the project directory:
   ```bash
   cd "C:\Users\rghos\OneDrive - Vivekananda Institute of Professional Studies\PROJECTS\SafeRoute AI"
   ```
2. Navigate to the backend directory and create a Python virtual environment:
   ```bash
   cd backend
   python -m venv venv
   ```
3. Activate the virtual environment:
   * **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```
4. Install backend dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
5. Copy environment template files:
   * Copy `backend/.env.example` to `backend/.env`
   * Configure environment variables (for parameter definitions, see [ENVIRONMENT_VARIABLES.md](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/ENVIRONMENT_VARIABLES.md)).

---

## 5. Database Configuration & Migrations

1. **Create PostgreSQL Database**:
   Open pgAdmin or run using `psql` to create the database:
   ```sql
   CREATE DATABASE saferoute_db;
   CREATE USER saferoute_user WITH PASSWORD 'secure_dev_password';
   GRANT ALL PRIVILEGES ON DATABASE saferoute_db TO saferoute_user;
   ```
2. **Apply Database Migrations**:
   Alembic handles schema deployments. Run migrations from the backend folder:
   ```bash
   alembic upgrade head
   ```
3. **Seed Mock Database Records**:
   Run seed scripts to load initial admin profile settings and mock accident hotspots:
   ```bash
   python scripts/seed_db.py
   ```

---

## 6. Machine Learning Model Initialization

1. **Verify Training Dataset**: Ensure a base training dataset exists at `backend/ml/data/accident_training.csv`.
2. **Run Model Training Script**:
   Before booting the API server, train the initial Random Forest model:
   ```bash
   python ml/train.py
   ```
   * **Output**: This script trains the model and generates two essential files inside `backend/ml/models/`:
     * `model.joblib` (Trained Random Forest model binary)
     * `scaler.joblib` (Numerical feature scaling pipeline weights)
3. **Verification**: Confirm both files are present in the directory.

---

## 7. Frontend Environment Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install client dependencies (this will install React, Vite, Framer Motion, Sonner, and Lucide React packages):
   ```bash
   npm install
   ```
   *Note: If installing manually on a clean build, ensure you run:*
   ```bash
   npm install framer-motion sonner lucide-react
   ```
3. Copy environment template files:
   * Copy `frontend/.env.example` to `frontend/.env`
4. Edit `frontend/.env` to configure your API endpoint and Google Maps credentials:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api
   VITE_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_GOOGLE_MAPS_KEY
   ```

---

## 8. Running the Application

### 8.1 Step 1: Start Backend Server
Ensure virtual environment is active, then run:
```bash
cd backend
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
* The API documentation will be available locally at: http://localhost:8000/docs.

### 8.2 Step 2: Start Frontend client
In a new terminal window, navigate to the frontend folder and run:
```bash
cd frontend
npm run dev
```
* Open your browser and navigate to: http://localhost:5173/.

---

## 9. Troubleshooting Guide

### 9.1 Database Connection Errors
* **Symptom**: `sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) connection to server at "127.0.0.1" failed.`
* **Fix**: Verify the PostgreSQL service is running on your machine. On Windows, check the Services application (`services.msc`) and ensure the `postgresql-x64` service status is set to "Running". Double-check the credentials in `backend/.env`.

### 9.2 Blank Google Map Screen
* **Symptom**: Map area displays blank or presents a pop-up error stating: "This page can't load Google Maps correctly."
* **Fix**: Open browser developers tools (F12) and inspect the console logs. Verify the Maps API Key is correct, has active billing enabled in Google Cloud Console, and supports the Maps JavaScript API.

### 9.3 Model Load Failures
* **Symptom**: `FileNotFoundError: [Errno 2] No such file or directory: 'backend/ml/models/model.joblib'`
* **Fix**: Ensure you have executed the training script before running the API server: `python ml/train.py`.

---

## 10. Assumptions, Risks & Mitigation

### 10.1 Assumptions
* Developers possess basic familiarity with running virtual environments and standard git operations.

### 10.2 Risks & Mitigation
* **Risk**: Conflicting package versions during installation due to global python packages overlaps.
  * *Mitigation*: Ensure developers activate the local python virtualenv (`venv`) before executing python scripts.

---

## 11. Best Practices
* **Separate Console Tabs**: Keep backend API terminal and frontend client terminal logs open in distinct tabs for easier debugging.
* **Keep Secrets Safe**: Under no circumstances commit changes to `.env` configuration files to version control repositories.

## 12. Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-07-27 | DevOps Engineer | Initial setup guide covering frontend, backend, database migrations, and ML steps. |

---

## 13. References
1. *PostgreSQL 16 Installation Manual*: https://www.postgresql.org/download/
2. *Google Maps API Key Guidelines*: https://developers.google.com/maps/documentation/javascript/get-api-key
3. *Vite Build Configurations*: https://vite.dev/config/
