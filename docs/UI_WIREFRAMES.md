# User Interface Low-Fidelity Wireframes

## Project: SafeRoute AI
### AI-Powered Road Accident Hotspot Prediction System

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Frozen |
| **Author** | SafeRoute AI Lead UI Designer |
| **Date** | 2026-07-27 |
| **Intended Audience** | Frontend Developers, UI Designers, QA Validation Team |

---

## Table of Contents
1. [General Layout Structure](#1-general-layout-structure)
2. [Desktop Layout: Dashboard & Maps](#2-desktop-layout-dashboard--maps)
3. [Component: Prediction Form & Output](#3-component-prediction-form--output)
4. [Component: Admin Console & CSV Uploader](#4-component-admin-console--csv-uploader)
5. [Authentication: Login & Register Wireframes](#5-authentication-login--register-wireframes)
6. [Profile, Settings & 404 Wireframes](#6-profile-settings--404-wireframes)
7. [Responsive Mobile & Tablet Viewport Mockups](#7-responsive-mobile--tablet-viewport-mockups)
8. [Assumptions, Risks & Mitigation](#8-assumptions-risks--mitigation)
9. [Best Practices](#9-best-practices)
10. [Revision History](#10-revision-history)
11. [References](#11-references)

---

## 1. General Layout Structure
SafeRoute AI uses a **responsive grid layout**:
* **Desktop**: Features a persistent left sidebar for navigation and a main content area that resizes dynamically.
* **Mobile**: Collapses the sidebar into a hamburger menu, and sections stack vertically.

---

## 2. Desktop Layout: Dashboard & Maps

Below is the low-fidelity ASCII layout for the primary desktop dashboard:

```text
+------------------------------------------------------------------------------------+
| [Brand Logo] SafeRoute AI | Header Options: [Welcome User] [Settings] [Logout]     |
+------------------------------------------------------------------------------------+
| Sidebar       | Main Dashboard Area                                                |
|               |                                                                    |
| [Home]        | +----------------------------------------------------------------+ |
| [Map]         | | [Stats Summary Widget: Clear Weather | Medium Traffic | DevOK] | |
| [Predict]     | +----------------------------------------------------------------+ |
| [History]     |                                                                    |
| [Admin]       | +------------------------------------+ +-------------------------+ |
|               | | Google Map Container Layer         | | Charts: Risk Trends     | |
|               | |                                    | |                         | |
|               | |  [Search Coordinates Input]        | |  |    /\  High          | |
|               | |                                    | |  |   /  \               | |
|               | |   (Low-Risk Pin)                   | |  |  /    \ Medium       | |
|               | |                    (Critical Pin)  | |  +------------->        | |
|               | |                                    | |    Mon  Tue  Wed        | |
|               | |                                    | +-------------------------+ |
|               | |  [Toggle Heatmap]  [Legend Overlay]| | History Preview         | |
|               | |  ( Green:Low | Yellow:Med | Red:Cr)| | Date | Speed | Risk     | |
|               | +------------------------------------+ +-------------------------+ |
+------------------------------------------------------------------------------------+
```

---

## 3. Component: Prediction Form & Output

Layout for the AI risk prediction form:

```text
+------------------------------------------------------------------------------------+
| Sidebar       | AI Route Risk Evaluator Page                                       |
|               |                                                                    |
| [Home]        | +------------------------------------+ +-------------------------+ |
| [Map]         | | Risk Simulation Form               | | Prediction Results      | |
| [Predict]     | |                                    | |                         | |
| [History]     | | Weather Condition:                 | |   +-----------------+   | |
| [Admin]       | | [ Clear   | v ]                    | |   |  Risk Rating    |   | |
|               | |                                    | |   |      68         |   | |
|               | | Traffic Congestion:                | |   |     High        |   | |
|               | | [ Medium  | v ]                    | |   +-----------------+   | |
|               | |                                    | |                         | |
|               | | Road Classification:               | |  Accident Probability:  | |
|               | | [ Highway | v ]                    | |  68.4%                  | |
|               | |                                    | |                         | |
|               | | Average Velocity:                  | |  Parameters Logged      | |
|               | | [ 85.5      ] km/h                 | |  ID: c138f322-1f4...    | |
|               | |                                    | |                         | |
|               | | Time Block of Query:               | |  [View Historical Logs] | |
|               | | [ Evening | v ]                    | |                         | |
|               | |                                    | |                         | |
|               | | [ Assess Route Risk Button ]       | |                         | |
|               | +------------------------------------+ +-------------------------+ |
+------------------------------------------------------------------------------------+
```

---

## 4. Component: Admin Console & CSV Uploader

Layout for the administrative dashboard:

```text
+------------------------------------------------------------------------------------+
| Sidebar       | Admin Operations Control Panel                                     |
|               |                                                                    |
| [Home]        | +----------------------------------------------------------------+ |
| [Map]         | | Global Stats: Total Queries: 18450 | Users: 340 | F1-Score: 84%| |
| [Predict]     | +----------------------------------------------------------------+ |
| [History]     |                                                                    |
| [Admin]       | +------------------------------------+ +-------------------------+ |
|               | | Training Dataset Management        | | User Directory Audit    | |
|               | |                                    | |                         | |
|               | |  +------------------------------+  | | Email | Name | Status   | |
|               | |  | Drag & Drop CSV Dataset File |  | | usr@1 | John | Active   | |
|               | |  |                              |  | | usr@2 | Emma | Blocked  | |
|               | |  | [Select File Button]         |  | | usr@3 | David| Active   | |
|               | |  +------------------------------+  | |                         | |
|               | |                                    | | [Search User Name]      | |
|               | |  [ Process Dataset Upload ]        | |                         | |
|               | +------------------------------------+ +-------------------------+ |
+------------------------------------------------------------------------------------+
```

---

## 5. Authentication: Login & Register Wireframes

Layouts for the unauthenticated entry views:

```text
       Login Card Interface Mockup                 Registration Card Mockup
   +---------------------------------+        +---------------------------------+
   | SafeRoute AI - Sign In          |        | SafeRoute AI - Register         |
   |                                 |        |                                 |
   | Email Address:                  |        | Display Name:                   |
   | [ john.doe@example.com        ] |        | [ John Doe                    ] |
   |                                 |        |                                 |
   | Account Password:               |        | Email Address:                  |
   | [ **********                  ] |        | [ john.doe@example.com        ] |
   |                                 |        |                                 |
   | [ Sign In Button ]              |        | Password (Min 8 characters):    |
   |                                 |        | [ **********                  ] |
   | Don't have an account?          |        |                                 |
   | [ Register Here Link ]          |        | Confirm Password:               |
   |                                 |        | [ **********                  ] |
   |                                 |        |                                 |
   |                                 |        | [ Create Account Button ]       |
   |                                 |        |                                 |
   |                                 |        | Already registered?             |
   |                                 |        | [ Sign In Link ]                |
   +---------------------------------+        +---------------------------------+
```

---

## 6. Profile, Settings & 404 Wireframes

### 6.1 Profile & Settings layouts
```text
   +--------------------------------------------------------------------------------+
   | Update Profile Metadata                  Account Configurations                |
   |                                                                                |
   | Full Name:                               Select System Language:               |
   | [ John Doe                     ]         [ English                    | v ]    |
   |                                                                                |
   | Account Role:                            Update Password:                      |
   | Standard User (user)                     [ Old Password ]                      |
   |                                          [ New Password ]                      |
   |                                                                                |
   | [ Save Profile Changes Button ]          [ Update Password Button ]            |
   +--------------------------------------------------------------------------------+
```

### 6.2 Wildcard Route Page (404 Page)
```text
   +--------------------------------------------------------------------------------+
   |                                                                                |
   |                                   [!] 404                                      |
   |                                                                                |
   |                            Page Not Found Error                                |
   |                                                                                |
   |            The requested path does not exist on SafeRoute AI.                  |
   |                                                                                |
   |                       [ Return to Dashboard Button ]                           |
   |                                                                                |
   +--------------------------------------------------------------------------------+
```

---

## 7. Responsive Mobile & Tablet Viewport Mockups

### 7.1 Mobile viewports (<= 480px width)
Sections stack vertically, and the navigation collapses into a hamburger menu:
```text
   +───────────────────────────────+
   | [=] SafeRoute AI          (o) |  <-- [=] Hamburger Menu, (o) Profile
   +───────────────────────────────+
   | System Risk: High (68)        |
   +───────────────────────────────+
   | Google Maps Container Layer   |
   |                               |
   | [ Search coordinates ]        |
   |                               |
   |       (Critical pin)          |
   |                               |
   | [Toggle Heatmap]              |
   +───────────────────────────────+
   | Risk Trends Graph             |
   |  |   /\                       |
   |  |  /  \                      |
   |  +-------->                   |
   +───────────────────────────────+
   | Footer Info                   |
   +───────────────────────────────+
```

---

## 8. Assumptions, Risks & Mitigation

### 8.1 Assumptions
* Responsive mobile layouts prioritize rendering the Google Map container over other dashboard widgets.

### 8.2 Layout Risks & Mitigation
* **Risk**: Text elements or chart labels overlapping on small screens.
  * *Mitigation*: Set explicit minimum widths for elements and use CSS media queries to hide secondary metadata on smaller screens.

---

## 9. Best Practices
* **Responsive-First Design**: Develop layouts starting with mobile viewports to ensure clean rendering on smaller screens.
* **Consistent Layouts**: Use the styling variables defined in [UI_UX_SPECIFICATION.md](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/UI_UX_SPECIFICATION.md).

## 10. Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-07-27 | UI Lead | Initial low-fidelity layouts for mobile, tablet, and desktop viewports. |

---

## 11. References
1. *Balsamiq Wireframing Principles*: https://balsamiq.com/learn/articles/low-fidelity-wireframes/
2. *Tailwind CSS Responsive Utilities Reference*: https://tailwindcss.com/docs/responsive-design
