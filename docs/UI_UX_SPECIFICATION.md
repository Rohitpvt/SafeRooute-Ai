# UI/UX Design System Specification

## Project: SafeRoute AI
### AI-Powered Road Accident Hotspot Prediction System

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Frozen |
| **Author** | SafeRoute AI Lead UI/UX Designer |
| **Date** | 2026-07-27 |
| **Intended Audience** | Frontend Developers, UI Designers, QA Engineers |

---

## Table of Contents
1. [Design Philosophy](#1-design-philosophy)
2. [Color Palette & Design Tokens](#2-color-palette--design-tokens)
3. [Typography & Text Styles](#3-typography--text-styles)
4. [Grid System & Responsive Breakpoints](#4-grid-system--responsive-breakpoints)
5. [Spacing & Elevation Systems](#5-spacing--elevation-systems)
6. [Interactive Component States](#6-interactive-component-states)
7. [System states: Loading, Empty, and Error](#7-system-states-loading-empty-and-error)
8. [Accessibility (WCAG 2.1 AA) Guidelines](#8-accessibility-wcag-21-aa-guidelines)
9. [Revision History](#9-revision-history)
10. [References](#10-references)

---

## 1. Design Philosophy
The SafeRoute AI design system is built to provide an **intuitive, clear, and high-contrast interface** that prioritizes driver awareness and safety:
* **Minimalist Architecture**: Reduce cognitive load by presenting safety data dynamically, avoiding cluttered screens.
* **Proactive Risk Highlights**: Use bold, color-coded indicators to convey danger levels immediately.
* **Responsive-First Design**: Ensure the interface works seamlessly on mobile screens used in vehicle mounts.

---

## 2. Color Palette & Design Tokens

To achieve a modern and highly aesthetic dark SaaS dashboard, the design system uses a curated dark palette with Indigo/Blue accents.

### 2.1 Core Palette

| Token Name | Hex Code / RGBA | Intended Usage |
| :--- | :--- | :--- |
| **`Primary-Background`** | `#09090B` | Deepest gray/black viewport background. |
| **`Secondary-Background`** | `#111827` | Slightly lighter shade for page panels and sidebars. |
| **`Card-Bg`** | `#18181B` | Dashboard container card backgrounds. |
| **`Border-Subtle`** | `rgba(255,255,255,0.06)` | Ultra-fine dividers and borders. |
| **`Primary-Accent`** | `#3B82F6` | Brand blue for action items, primary buttons. |
| **`Secondary-Accent`** | `#6366F1` | Indigo accent for gradients and chart lines. |
| **`Text-Primary`** | `#FFFFFF` | Core typography, white titles. |
| **`Text-Secondary`** | `#9CA3AF` | Muted slate grey for descriptions, details, labels. |
| **`Hover-Overlay`** | `rgba(255,255,255,0.04)` | Card hover active background overlay. |

### 2.2 Risk Category Indicators

| Risk Level | Hex Code | Equivalent HSL | UI Application |
| :--- | :--- | :--- | :--- |
| **Low Risk** | `#22C55E` | `hsl(142, 70%, 45%)` | Success green labels, chips, and safe marker pins. |
| **Medium Risk** | `#F59E0B` | `hsl(38, 92%, 50%)` | Amber labels and markers indicating caution. |
| **High Risk** | `#EF4444` | `hsl(0, 84%, 60%)` | Danger red labels indicating hazard. |
| **Critical Risk** | `#7F1D1D` | `hsl(0, 72%, 20%)` | Dark red indicators for critical hot zones. |

---

## 3. Typography & Text Styles
* **Font Family**: Google Fonts `Inter`, sans-serif.
* **Fallback Fonts**: `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Helvetica Neue`, Arial.

### Typography Hierarchy

| Style Name | Font Size (px) | Line Height (px) | Weight | Tailwind Class | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **H1 Headline** | `30` | `38` | Bold (700) | `text-3xl font-bold tracking-tight` | Header pages. |
| **H2 Section** | `22` | `28` | SemiBold (600) | `text-2xl font-semibold` | Page layouts sections. |
| **H3 Card** | `16` | `22` | Medium (500) | `text-base font-medium` | UI container titles. |
| **Body Regular** | `14` | `20` | Regular (400) | `text-sm font-normal` | Description values. |
| **Captions** | `12` | `16` | Regular (400) | `text-xs font-normal` | Muted metadata, badges. |

---

## 4. Grid System & Responsive Breakpoints

The responsive grid adapts layouts based on viewport width:

```text
  Mobile Breakpoint (<= 480px)
  ┌─────────────────────────────────┐
  │   [Navbar] (Collapsible Menu)   │
  │   [Main Panel: Single Column]   │
  └─────────────────────────────────┘

  Desktop Breakpoint (>= 1200px)
  ┌────────────────────────────────────────────────────────┐
  │ [Sidebar] │  [Header Widget]                           │
  │           │  [Grid: Left Map (8Col) | Right Stats(4Col)]│
  └────────────────────────────────────────────────────────┘
```

* **Mobile Viewports (<= 480px)**: 4-column layout with 16px page margins.
* **Tablet Viewports (768px - 1024px)**: 8-column layout with 24px margins.
* **Desktop Viewports (>= 1200px)**: 12-column grid system with 32px margins.

---

## 5. Spacing & Elevation Systems
* **Base Unit**: 8px grid system. Spacing tokens must use increments of the base unit:
  * `8px` (xs), `16px` (sm), `24px` (md), `32px` (lg), `48px` (xl).
* **Elevation & Shadow Tokens**:
  * **Level 1 (Cards)**: `box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.2)`
  * **Level 2 (Popups/Dropdowns)**: `box-shadow: 0px 10px 15px rgba(0, 0, 0, 0.4)`

---

## 6. Interactive Component States
* **Hover Transitions**: Apply transitions of 150ms with `cubic-bezier(0.4, 0, 0.2, 1)`:
  * Action buttons must scale down slightly (`transform: scale(0.98)`) and shift opacity when hovered.
* **Focus Outlines**: Active keyboard navigation elements must present a bold blue outline outline shadow:
  * `outline: 2px solid #3B82F6; outline-offset: 2px;`

---

## 7. System states: Loading, Empty, and Error

### 7.1 Loading States
* **Skeleton Loaders**: Render gray placeholders that pulse at a speed of 1.2s to indicate loading content.
* **Inline Spinner**: A circular loading spinner is displayed on primary actions while processes complete.

### 7.2 Empty States
* **Prediction History Widget**: If the log contains no records, display a simple road illustration with text: "No prediction logs found. Try assessing a route risk to get started."

### 7.3 Error States
* **Validation banners**: Present form validation issues immediately adjacent to the input field, using red warning text: "Speed value must be a positive number."

---

## 8. Accessibility (WCAG 2.1 AA) Guidelines
* **Contrast Compliance**: Ensure text colors maintain a contrast ratio of at least `4.5:1` against card backgrounds.
* **Aria Labels**: All buttons, form fields, and maps elements must include detailed `aria-label` tags.
* **Screen Reader Support**: Use semantic HTML tags (`<header>`, `<main>`, `<nav>`, `<button>`) to support screen readers.

---

## 9. Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-07-27 | UI/UX Lead | Initial release of design tokens, typography, colors, and accessibility standards. |

---

## 10. References
1. *Google Material Design Token Standards*: https://m3.material.io/
2. *W3C Web Content Accessibility Guidelines*: https://www.w3.org/WAI/standards-guidelines/wcag/
3. *Tailwind CSS Responsive Utilities*: https://tailwindcss.com/docs/responsive-design
