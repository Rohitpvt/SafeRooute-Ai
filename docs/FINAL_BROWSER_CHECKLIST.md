# Quality Assurance Browser & Functional Checklist

## Project: SafeRoute AI
### AI-Powered Road Accident Hotspot Prediction System

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Approved |
| **Author** | SafeRoute AI QA & Release Validation Lead |
| **Date** | 2026-07-27 |
| **Intended Audience** | QA Engineers, Frontend Engineers, Release Managers |

---

## Table of Contents
1. [Scope & Target Environments](#1-scope--target-environments)
2. [Functional Verification Checklist](#2-functional-verification-checklist)
3. [Responsive Layout & Viewport Verification](#3-responsive-layout--viewport-verification)
4. [Accessibility (WCAG 2.1 AA) Checklist](#4-accessibility-wcag-21-aa-checklist)
5. [Security & Network Header Auditing](#5-security--network-header-auditing)
6. [Performance Threshold Auditing](#6-performance-threshold-auditing)
7. [Defect Reporting & Severity Criteria](#7-defect-reporting--severity-criteria)
8. [Assumptions, Risks & Mitigation](#8-assumptions-risks--mitigation)
9. [Best Practices](#9-best-practices)
10. [Revision History](#10-revision-history)
11. [References](#11-references)

---

## 1. Scope & Target Environments
This checklist details the browser testing steps required to certify SafeRoute AI releases for production. The QA team must verify system behavior across the following browser configurations:

* **Google Chrome**: Version `120.x` or higher (Desktop & Android emulation).
* **Apple Safari**: Version `17.x` or higher (Desktop & iOS mobile Safari).
* **Mozilla Firefox**: Version `121.x` or higher.
* **Microsoft Edge**: Version `120.x` or higher.

---

## 2. Functional Verification Checklist

### 2.1 Authentication & Session Management

| Check ID | Action Steps | Expected Behavior | Chrome | Edge | Firefox | Safari |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **QA-AUTH-01** | Open `/dashboard` without an active session. | Redirects user to `/login` immediately. | [ ] | [ ] | [ ] | [ ] |
| **QA-AUTH-02** | Enter invalid email format in the registration form. | Displays error: "Invalid email address format." | [ ] | [ ] | [ ] | [ ] |
| **QA-AUTH-03** | Log in with valid credentials. | Saves the JWT in local session storage and redirects user to dashboard. | [ ] | [ ] | [ ] | [ ] |
| **QA-AUTH-04** | Click the "Logout" button. | Clears local session storage and redirects user to `/login`. | [ ] | [ ] | [ ] | [ ] |

### 2.2 Google Maps & Risk Visualizations

| Check ID | Action Steps | Expected Behavior | Chrome | Edge | Firefox | Safari |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **QA-MAP-01** | Load `/dashboard` and verify the map rendering. | Google Map canvas loads successfully and displays centered on coordinates. | [ ] | [ ] | [ ] | [ ] |
| **QA-MAP-02** | Toggle the "Heatmap Layer" option. | Google Heatmap layer renders, showing accident concentration density. | [ ] | [ ] | [ ] | [ ] |
| **QA-MAP-03** | Inspect marker pin colors. | Pins are colored based on risk level: Low (Green), Medium (Yellow), High (Orange), Critical (Red). | [ ] | [ ] | [ ] | [ ] |
| **QA-MAP-04** | Click a risk marker pin. | An information popup displays containing details for the road segment. | [ ] | [ ] | [ ] | [ ] |

### 2.3 AI Prediction Interface & User Profile

| Check ID | Action Steps | Expected Behavior | Chrome | Edge | Firefox | Safari |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **QA-PRED-01** | Leave input fields empty on the prediction page. | The "Assess Route Risk" button is disabled. | [ ] | [ ] | [ ] | [ ] |
| **QA-PRED-02** | Enter a negative speed value. | Displays validation error: "Speed must be a positive number." | [ ] | [ ] | [ ] | [ ] |
| **QA-PRED-03** | Submit prediction with valid inputs. | Displays the risk score, risk category card, and adds the query to history. | [ ] | [ ] | [ ] | [ ] |

### 2.4 Administrative Control Panel

| Check ID | Action Steps | Expected Behavior | Chrome | Edge | Firefox | Safari |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **QA-ADM-01** | Access `/admin` using a standard user account. | Access is denied; redirects to user dashboard with an alert toast. | [ ] | [ ] | [ ] | [ ] |
| **QA-ADM-02** | Upload a non-CSV file format. | Displays validation error: "Only CSV file formats are supported." | [ ] | [ ] | [ ] | [ ] |
| **QA-ADM-03** | Upload a valid CSV training dataset. | Processes the upload and displays message: "Dataset accepted for processing." | [ ] | [ ] | [ ] | [ ] |

---

## 3. Responsive Layout & Viewport Verification
To ensure a consistent user experience, verify layouts against the following viewport resolutions:

* **Mobile (375px - 480px width)**: Elements scale down cleanly, side navigation collapses into a hamburger menu, and maps fill the screen.
* **Tablet (768px - 1024px width)**: Grid layouts adjust automatically from 3-columns to 2-columns, and map elements remain responsive.
* **Desktop (1200px - 1920px width)**: Displays side navigation, charts, and maps side-by-side in grid structures.

---

## 4. Accessibility (WCAG 2.1 AA) Checklist
* **Color Contrast**: All text elements must achieve a minimum color contrast ratio of `4.5:1` against their background.
* **Keyboard Navigability**: Users must be able to tab through interactive components in a logical order, with visible focus outlines on active elements.
* **Screen Reader Support**: Ensure images have descriptive `alt` tags and interactive controls have appropriate `aria-label` definitions.

---

## 5. Security & Network Header Auditing
Verify that the production API gateway response contains the following security headers:
* `Strict-Transport-Security: max-age=31536000; includeSubDomains` (Force HTTPS)
* `X-Frame-Options: DENY` (Prevent clickjacking)
* `X-Content-Type-Options: nosniff` (Prevent MIME-sniffing)

---

## 6. Performance Threshold Auditing
During testing, verify that the application meets the following performance standards:
* **Time to Interactive (TTI)**: Must be under `2.2s` under normal network conditions.
* **Bundle Sizes**: Minimize bundle sizes, keeping the main vendor JS chunk under `250KB` (gzipped).

---

## 7. Defect Reporting & Severity Criteria

| Severity | Criteria | Example Defect | Block Release? |
| :--- | :--- | :--- | :--- |
| **Critical** | Blockers that crash the application or compromise security. | Security bypass allowing standard users to view admin data. | Yes |
| **Major** | Major functional failures with no clear workaround. | Google Map failing to load or markers not rendering. | Yes |
| **Minor** | UI formatting bugs or spelling errors with simple workarounds. | Graph labels clipping on small mobile screen views. | No |

---

## 8. Assumptions, Risks & Mitigation

### 8.1 Assumptions
* Testers have active Google Maps developer console access to inspect API quota status.

### 8.2 Testing Risks & Mitigation
* **Risk**: Browser security extensions blocking Google Maps scripts, causing false failures during QA.
  * *Mitigation*: Run QA checks in clean incognito windows without extensions enabled.

---

## 9. Best Practices
* **Test on Real Devices**: Always verify layouts on real mobile screens when possible, rather than relying solely on browser responsive emulation tools.

## 10. Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-07-27 | QA Validation Lead | Initial functional and responsive QA checklist release. |

---

## 11. References
1. *WCAG 2.1 Accessibility Guidelines*: https://www.w3.org/TR/WCAG21/
2. *Lighthouse Performance Testing Tools*: https://developer.chrome.com/docs/lighthouse/overview
3. *OWASP API Security Top 10 Checklist*: https://owasp.org/www-project-api-security/
