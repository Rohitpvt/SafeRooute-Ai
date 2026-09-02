# Reusable Component Library Design

## Project: SafeRoute AI
### AI-Powered Road Accident Hotspot Prediction System

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Frozen |
| **Author** | SafeRoute AI Lead Component Architect |
| **Date** | 2026-07-27 |
| **Intended Audience** | Frontend Developers, Component Engineers, UI Designers |

---

## Table of Contents
1. [Core Design Architecture](#1-core-design-architecture)
2. [Layout Components: Navbar, Sidebar & Card](#2-layout-components-navbar-sidebar--card)
3. [Interactive Inputs: Button, Form, Modal & Toast](#3-interactive-inputs-button-form-modal--toast)
4. [Safety Widgets: Risk Badge, Risk Indicator & Map Legend](#4-safety-widgets-risk-badge-risk-indicator--map-legend)
5. [Data Layouts: Table, Pagination & Charts](#5-data-layouts-table-pagination--charts)
6. [Maps & Special Containers](#6-maps--special-containers)
7. [System Loaders: Loader & Skeleton Loader](#7-system-loaders-loader--skeleton-loader)
8. [Assumptions, Risks & Mitigation](#8-assumptions-risks--mitigation)
9. [Best Practices](#9-best-practices)
10. [Revision History](#10-revision-history)
11. [References](#10-references)

---

## 1. Core Design Architecture
This Component Library defines the reusable React components for the SafeRoute AI frontend. Each component is designed with:
* **Strict Type Safety**: Documented props with React PropTypes validation checks.
* **Built-in Accessibility**: Includes aria attributes and supports keyboard navigation.
* **Tailwind CSS Styling**: Styled using Tailwind classes, avoiding inline styles.

---

## 2. Layout Components: Navbar, Sidebar & Card

### 2.1 Component: `Card`
* **Purpose**: General container panel used across dashboards.
* **Props**:
  | Name | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `title` | String | No | Panel header title. |
  | `children` | Node | Yes | Inner content nodes. |
  | `className`| String | No | Custom styling utility tags. |
* **States**: None.
* **Accessibility**: Includes role `region` and `aria-label` when `title` is set.
* **Responsive Behaviour**: Flex layouts that scale to fill parent widths.

### 2.2 Component: `Navbar`
* **Purpose**: Application header containing branding and profile selectors.
* **Props**:
  | Name | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `user` | Object | Yes | Logged-in user information payload. |
  | `onLogout` | Function | Yes | Callback function triggered on logout. |
* **States**: `isOpen` (boolean state managing profile dropdown visibility).
* **Accessibility**: Header uses `<nav>` tags, menu button has `aria-expanded`, and links include descriptive `aria-label` tags.
* **Responsive Behaviour**: Flex layout that shifts navigation items to a hamburger menu on screens under 768px wide.

---

## 3. Interactive Inputs: Button, Form, Modal & Toast

### 3.1 Component: `Button`
* **Purpose**: General interactive button.
* **Props**:
  | Name | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `label` | String | Yes | Button label text. |
  | `variant` | String | No | Styling variation: `'primary'`, `'secondary'`, or `'danger'`. |
  | `isDisabled`| Boolean | No | Disables click actions. |
  | `isLoading` | Boolean | No | Disables actions and displays loading spinner. |
  | `onClick` | Function | Yes | Callback function triggered on click. |
* **States**: None (monitors hover/focus styles).
* **Accessibility**: Standard `<button>` tag supports keyboard focus outlines.
* **Responsive Behaviour**: Scale text and paddings dynamically using Tailwind breakpoints.

### 3.2 Component: `Toast`
* **Purpose**: Display brief system status alerts.
* **Props**:
  | Name | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `message` | String | Yes | Notification message text. |
  | `type` | String | No | Toast notification type: `'success'`, `'error'`, or `'warning'`. |
  | `onClose` | Function | Yes | Callback function to dismiss the toast. |
* **States**: None.
* **Accessibility**: Uses role `alert` with `aria-live="assertive"` for immediate screen reader announcements.

---

## 4. Safety Widgets: Risk Badge, Risk Indicator & Map Legend

### 4.1 Component: `RiskBadge`
* **Purpose**: Color-coded label displaying risk categorizations.
* **Props**:
  | Name | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `score` | Number | Yes | Numeric risk rating (0-100). |
* **States**: None.
* **Accessibility**: Includes descriptive title tags (e.g., `title="Risk Category: Critical"`).

```jsx
// Color mapping logic for the component
const getRiskStyles = (score) => {
  if (score <= 25) return { text: 'Low', bg: 'bg-green-500/10 text-green-500' };
  if (score <= 50) return { text: 'Medium', bg: 'bg-yellow-500/10 text-yellow-500' };
  if (score <= 75) return { text: 'High', bg: 'bg-orange-500/10 text-orange-500' };
  return { text: 'Critical', bg: 'bg-red-500/10 text-red-500' };
};
```

### 4.2 Component: `RiskIndicator`
* **Purpose**: Large animated dial displaying safety metrics.
* **Props**:
  | Name | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `score` | Number | Yes | Numeric risk rating (0-100). |
* **States**: `animatedValue` (numeric state managing progress counter animations).
* **Accessibility**: Displays numerical values in readable tags (`aria-valuenow`).

---

## 5. Data Layouts: Table, Pagination & Charts

### 5.1 Component: `Table`
* **Purpose**: Responsive table for log history.
* **Props**:
  | Name | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `headers` | Array | Yes | Table column header titles. |
  | `data` | Array | Yes | Data array mapping columns to rows. |
  | `renderRow` | Function | Yes | Row render callback. |
* **States**: None.
* **Responsive Behaviour**: Table wraps in a horizontal scroll container on mobile viewports to prevent layout overflow.

---

## 6. Maps & Special Containers

### 6.1 Component: `GoogleMapContainer`
* **Purpose**: Mounts the Google Map canvas and manages markers.
* **Props**:
  | Name | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `apiKey` | String | Yes | Google Maps API key. |
  | `center` | Object | Yes | Center point coordinates: `{lat: Float, lng: Float}`. |
  | `zoom` | Number | Yes | Zoom level configuration. |
* **States**: `mapInstance` (stores the initialized Google Map object).
* **Accessibility**: Maps container contains alternative description tags: `aria-label="Interactive Map of Accident Hotspots"`.

---

## 7. System Loaders: Loader & Skeleton Loader

### 7.1 Component: `SkeletonLoader`
* **Purpose**: Renders pulsing placeholders during data fetching.
* **Props**:
  | Name | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `type` | String | No | Layout variations: `'table'`, `'card'`, or `'chart'`. |
  | `count` | Number | No | Number of placeholder items to render. |
* **States**: None.
* **Accessibility**: Includes `aria-busy="true"` and `aria-label="Loading content"`.

---

## 8. Assumptions, Risks & Mitigation

### 8.1 Assumptions
* Interactive charts scale automatically based on parent container sizes.

### 8.2 Component Library Risks & Mitigation
* **Risk**: Layout issues with composite components on small screen viewports.
  * *Mitigation*: Run automated layout audits using responsive simulation tools in the testing pipeline.

---

## 9. Best Practices
* **Separate Layouts**: Keep presentation logic distinct from state configurations.
* **Enforce Design Tokens**: Build components using the design tokens defined in [UI_UX_SPECIFICATION.md](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/UI_UX_SPECIFICATION.md).

## 10. Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-07-27 | Component Architect | Initial component library design, including props, states, and responsive actions. |

---

## 11. References
1. *React Prop-Types Documentation*: https://reactjs.org/docs/typechecking-with-proptypes.html
2. *W3C WAI-ARIA Authoring Practices*: https://www.w3.org/WAI/ARIA/apg/
3. *Tailwind CSS Utility Class Reference*: https://tailwindcss.com/docs
