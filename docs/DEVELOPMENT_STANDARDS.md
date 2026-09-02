# Development Standards & Coding Conventions

## Project: SafeRoute AI
### AI-Powered Road Accident Hotspot Prediction System

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Frozen |
| **Author** | SafeRoute AI Lead Architect |
| **Date** | 2026-07-27 |
| **Intended Audience** | Backend Developers, Frontend Developers, ML Engineers, QA, Reviewers |

---

## Table of Contents
1. [General Naming Conventions](#1-general-naming-conventions)
2. [React Frontend Standards](#2-react-frontend-standards)
3. [FastAPI Backend Standards](#3-fastapi-backend-standards)
4. [Database & SQL Standards](#4-database--sql-standards)
5. [Git Workflow & Commit Rules](#5-git-workflow--commit-rules)
6. [Error Handling & Logging Guidelines](#6-error-handling--logging-guidelines)
7. [Security & Performance Guidelines](#7-security--performance-guidelines)
8. [Assumptions, Risks & Mitigation](#8-assumptions-risks--mitigation)
9. [Best Practices](#9-best-practices)
10. [Revision History](#10-revision-history)
11. [References](#11-references)

---

## 1. General Naming Conventions
To maintain codebase consistency, developers must follow these naming rules:
* **Classes**: PascalCase (`UserPredictionLog`, `Navbar`).
* **Variables & Functions**: snake_case in Python backend code (`user_id`, `calculate_score`), camelCase in JavaScript frontend code (`userId`, `calculateScore`).
* **Constants**: UPPERCASE_SNAKE (`MAX_DATABASE_CONNECTIONS`, `JWT_TOKEN_EXPIRY`).
* **Database Objects**: Lowercase snake_case for tables (`prediction_logs`), columns (`risk_score`), and indexes (`idx_users_email`).

---

## 2. React Frontend Standards
* **Functional Components**: Build all components using functional styles and React Hooks. Class components are not allowed.
* **ESLint Verification**: Code must pass ESLint tests configured with the Airbnb styling guidelines.
* **Component Prop Validation**: Document and validate all props using React PropTypes to ensure type safety.
* **Inline CSS Restrictions**: Style elements using Tailwind CSS classes. Avoid inline styles:
  ```jsx
  // Correct Tailwind application
  <div className="p-4 bg-gray-800 rounded-lg shadow-md" />
  ```

---

## 3. FastAPI Backend Standards
* **Function Type Hints**: Explicit type hints are mandatory for all backend function parameters and return types.
* **Dependency Injection**: Utilize FastAPI's `Depends` module to inject database sessions and verify user permissions.
* **Async Requests**: Define endpoints as asynchronous (`async def`) when they interact with the database or external APIs, preventing blocking actions.
* **API Versioning**: Prefix all endpoint paths with `/api/v1` (e.g., `/api/v1/predict`) to support versioning.

---

## 4. Database & SQL Standards
* **Parameterization**: Write database interactions using SQLAlchemy's ORM API. Concatenated SQL strings are strictly blocked to prevent SQL injection.
* **Transaction Isolation**: Wrap database operations in transactional blocks using the DB session context manager, ensuring updates rollback if an operation fails.
* **Audit Columns**: Verify that all tables include `created_at` and `updated_at` timestamps, configured to update automatically at the database level.

---

## 5. Git Workflow & Commit Rules

### 5.1 Commit Formatting
Commit messages must follow the Conventional Commits specification: `<type>(<scope>): <subject>`.
* **feat**: Introducing new features (e.g., `feat(auth): add JWT generation`).
* **fix**: Code corrections (e.g., `fix(predict): correct speed validation check`).
* **docs**: Documentation updates.
* **test**: Adding or updating unit tests.

### 5.2 Pull Request Guidelines
* Code changes must be reviewed and approved by at least one reviewer before merging into the integration branches.
* Automated testing and lint check pipelines must pass before pull requests can be merged.

---

## 6. Error Handling & Logging Guidelines

### 6.1 FastAPI Exception Handling
* Catch exceptions globally using FastAPI exception handlers, returning a structured JSON response instead of raw stack traces:
  ```json
  {
    "detail": {
      "error_code": "RESOURCE_NOT_FOUND",
      "message": "The requested prediction record was not found.",
      "timestamp": "2026-07-27T10:35:00Z"
    }
  }
  ```

### 6.2 Logging Standards
* Log events using Python's standard `logging` library, configuring JSON format in production.
* **PII Protection**: Do not log sensitive user information (e.g., passwords, emails, raw JWT strings) to console outputs or log files.

---

## 7. Security & Performance Guidelines
* **Secrets Management**: Load API credentials, database passwords, and JWT signing keys from environment variables. Do not commit secrets to the code repository.
* **Database Connections**: Configure connection pooling in SQLAlchemy (`pool_size=20`, `max_overflow=10`) to optimize connection reuse.
* **Bundle Optimization**: Use lazy loading (`React.lazy`) to defer loading larger components (like the Google Maps module) until they are rendered, optimizing initial page load times.

---

## 8. Assumptions, Risks & Mitigation

### 8.1 Assumptions
* Developers configure their local IDEs to format code using Black and ESLint on save.

### 8.2 Development Risks & Mitigation
* **Risk**: Inconsistencies in formatting across developers, leading to cluttered Git diffs.
  * *Mitigation*: Run formatting checks as pre-commit tasks using Husky to standardize styles.

---

## 9. Best Practices
* **Keep Code Clean**: Adhere to PEP 8 standards on the backend and ESLint guidelines on the frontend.
* **Run Tests Regularly**: Run test suites locally before submitting pull requests to identify issues early.

## 10. Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-07-27 | Lead Architect | Initial development standards, coding styles, Git workflow, and error handling guidelines. |

---

## 11. References
1. *PEP 8 Coding Style Guidelines*: https://peps.python.org/pep-0008/
2. *Airbnb React JSX Styling Reference*: https://github.com/airbnb/javascript/tree/master/react
3. *OWASP Secure Coding Principles*: https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/
