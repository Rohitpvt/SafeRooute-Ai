# SafeRoute AI - Accident Hotspot Prediction System

AI-Powered Road Accident Hotspot Prediction System that predicts accident-prone road locations using Machine Learning and visualizes the predictions on Google Maps.

---

## 1. Project Overview
SafeRoute AI is designed to improve road safety by identifying dangerous road segments under specific weather and traffic conditions before accidents occur. The system leverages a Random Forest classifier model backend and renders interactive maps overlays (colored risk markers, heatmaps) to users.

---

## 2. System Architecture
* **Frontend client**: Single Page Application built using React, Vite, Tailwind CSS, Axios, and Google Maps JavaScript API, hosted on Vercel CDN.
* **Backend API Gateway**: Stateless Python microservice built using FastAPI and SQLAlchemy, hosted inside Docker containers on Render/Railway.
* **Database Storage**: PostgreSQL 16 relational database server.
* **ML Inference pipeline**: Scikit-Learn pipeline running Random Forest classification, using joblib serialized models.

---

## 3. Directory Structure
```text
SafeRoute AI/
├── backend/               # FastAPI API codebase
│   ├── app/               # Application files (models, routers, schemas, database)
│   ├── ml/                # ML training scripts and serialized joblib models
│   ├── tests/             # Pytest test suites
│   ├── alembic/           # Alembic database migration environment
│   └── Dockerfile         # Backend deployment container file
├── frontend/              # React Vite client application code
│   ├── src/               # Component layouts, pages routing, and api services
│   ├── public/            # Favicon icons and branding logos
│   └── Dockerfile         # Frontend static hosting Nginx container file
├── docker-compose.yml     # Container orchestration configurations
└── pyproject.toml         # Python tool configurations (black, ruff)
```

---

## 4. Local Development Setup

### 4.1 Prerequisites
* Python `3.11.x`
* Node.js `^20.x` (with npm `^10.x`)
* PostgreSQL `16.x`

### 4.2 Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a python virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\Activate.ps1
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy env file and execute migrations:
   ```bash
   cp .env.example .env
   alembic upgrade head
   ```
5. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

### 4.3 Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
4. Run development client:
   ```bash
   npm run dev
   ```

---

## 5. Docker Containers Setup
To run the complete SafeRoute AI stack using Docker Compose:
```bash
# Start all containers in detached mode
docker-compose up -d --build

# Verify container statuses
docker-compose ps

# Access backend logs
docker-compose logs -f backend
```

---

## 6. Available Commands

| Target | Command | Description |
| :--- | :--- | :--- |
| **Backend** | `uvicorn app.main:app --reload` | Starts local FastAPI API reload server. |
| **Backend Tests**| `pytest` | Runs python unit test suites. |
| **Backend Lint** | `ruff check backend/` | Audits python style guidelines rules. |
| **Frontend** | `npm run dev` | Boots local client Vite development server. |
| **Frontend Build**| `npm run build` | Compiles client-side static resources to `/dist`. |
| **Frontend Lint**| `npm run lint` | Audits JavaScript code style lints. |
| **Docker** | `docker-compose up --build` | Re-builds and boots local system containers. |

---

## 7. Development Workflow & Branch Strategy
1. **Branch Hygiene**: Never commit directly to `main` or `develop`. Work on feature branches using prefix naming patterns: `feature/TS1-xxx` or `bugfix/TS2-xxx`.
2. **Commit Message Rules**: Enforce Conventional Commits specification formatting:
   * `feat(auth): add JWT signature checks`
   * `fix(predict): correct speed thresholds values`
3. **Merge Audits**: All PRs require passing CI validation pipeline check states and at least one approval reviews from architects.

---

## 8. License
Distributed under the MIT License. See `LICENSE` for details.
