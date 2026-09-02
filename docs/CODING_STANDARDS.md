# Coding Standards & Guidelines

## Project: SafeRoute AI
### AI-Powered Road Accident Hotspot Prediction System

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Approved |
| **Author** | SafeRoute AI Lead Architect |
| **Date** | 2026-07-27 |
| **Intended Audience** | Backend Developers, Frontend Developers, ML Engineers, Code Reviewers |

---

## Table of Contents
1. [Backend Coding Standards (Python/FastAPI)](#1-backend-coding-standards-pythonfastapi)
2. [Frontend Coding Standards (React/JS)](#2-frontend-coding-standards-reactjs)
3. [Machine Learning Code Standards](#3-machine-learning-code-standards)
4. [Git commit & Branching Conventions](#4-git-commit--branching-conventions)
5. [Assumptions, Risks & Mitigation](#5-assumptions-risks--mitigation)
6. [Best Practices](#6-best-practices)
7. [Revision History](#7-revision-history)
8. [References](#8-references)

---

## 1. Backend Coding Standards (Python/FastAPI)

### 1.1 Python Code Style (PEP 8)
* Enforce code formatting using **Black** with a maximum line length of `88` characters.
* Import sorting must follow **isort** formatting rules.
* Linting must pass standard **Flake8** syntax audits.

### 1.2 Naming Conventions
* **Variables & Functions**: snake_case (`user_id`, `calculate_risk_score`).
* **Classes**: PascalCase (`UserPredictionLog`, `PredictionService`).
* **Constants**: UPPERCASE_SNAKE (`JWT_TOKEN_EXPIRATION_HOURS`, `DEFAULT_SPEED_LIMIT`).

### 1.3 Type Hints
Explicit type hints are mandatory for all function parameters and return types.
```python
from uuid import UUID
from app.schemas.prediction import PredictionPayload, PredictionResult

async def evaluate_risk(
    user_id: UUID,
    payload: PredictionPayload
) -> PredictionResult:
    # Business logic here
    pass
```

### 1.4 Docstring Specifications
All modules, classes, and public functions must document inputs, outputs, and behaviors using Google Style docstrings:
```python
def transform_features(raw_speed: float, traffic: str) -> list[float]:
    """Scales and encodes raw parameters for prediction engine processing.

    Args:
        raw_speed: Numeric average speed in km/h.
        traffic: Traffic density categorizations.

    Returns:
        List containing encoded numeric feature arrays.
    """
```

---

## 2. Frontend Coding Standards (React/JS)

### 2.1 React & JavaScript Conventions
* **Variables & Functions**: camelCase (`activeUser`, `handleMarkerClick`).
* **Components**: PascalCase (`DashboardCard`, `MapView`).
* **Hooks**: camelCase prefix with `use` (`useAuthContext`, `useMapState`).
* Code style is enforced using **ESLint** configured with the Airbnb style guide.

### 2.2 Component Architecture & State Rules
* Break down interfaces into small components with a single, clear responsibility.
* Limit inline styling. Always style components using Tailwind utility classes or custom classes in `index.css`.
* Manage component state locally unless it needs to be shared globally (e.g., authentication status, active map coordinates).

```jsx
import React from 'react';
import PropTypes from 'prop-types';

export const RiskCard = ({ score, category }) => {
  const isHigh = score > 50;
  return (
    <div className={`p-4 rounded-lg ${isHigh ? 'bg-red-500' : 'bg-green-500'}`}>
      <span className="text-white">Risk: {category} ({score})</span>
    </div>
  );
};

RiskCard.propTypes = {
  score: PropTypes.number.isRequired,
  category: PropTypes.string.isRequired,
};
```

---

## 3. Machine Learning Code Standards
* **Reproducibility**: Explicitly define seed configurations (`random_state=42`) on all data splitting and model training runs.
* **Pipeline Encapsulation**: Use Scikit-Learn pipelines to coordinate features, scaling operations, and model runs, preventing data leakage during validations.
* **Artifact Versioning**: Save serialized models using the format `model_v{version}.joblib` to track changes over time.

---

## 4. Git commit & Branching Conventions

### 4.1 Commit Message Format
Commit messages must follow the Conventional Commits specification: `<type>(<scope>): <subject>`.
* **feat**: Introducing new features (e.g., `feat(auth): add password strength validation`).
* **fix**: Resolving code bugs (e.g., `fix(map): resolve coordinate loading issues`).
* **docs**: Document updates (e.g., `docs(setup): update setup guide steps`).
* **test**: Adding or updating unit tests (e.g., `test(predict): add prediction validation checks`).

### 4.2 Branching Model (GitFlow)
* **`main`**: The production branch. Direct commits are strictly blocked.
* **`develop`**: The integration branch. Features merge here before release testing.
* **`feature/*`**: Development branches for specific tasks (e.g., `feature/TS1-03-auth-endpoints`).
* **`bugfix/*`**: Branches for resolving defects identified in staging or production.

---

## 5. Assumptions, Risks & Mitigation

### 5.1 Assumptions
* Code reviews are required for all pull requests before merging changes into `develop` or `main`.

### 5.2 Development Risks & Mitigation
* **Risk**: Inconsistencies in code formatting across developers, leading to noisy git diffs.
  * *Mitigation*: Configure pre-commit hooks using **Husky** to format code automatically before commits are finalized.

---

## 6. Best Practices
* **Keep Pull Requests Small**: Keep pull requests focused on a single task to simplify reviews.
* **Write Self-Documenting Code**: Choose descriptive variable and function names to reduce the need for inline comments.

## 7. Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-07-27 | Lead Architect | Initial release defining Python, React, ML, and Git standards. |

---

## 8. References
1. *PEP 8 Style Guide for Python Code*: https://peps.python.org/pep-0008/
2. *Airbnb JavaScript Style Guide*: https://github.com/airbnb/javascript
3. *Conventional Commits Specification*: https://www.conventionalcommits.org/
