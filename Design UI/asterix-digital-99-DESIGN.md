---
version: 1.0.0
name: Asterix Design System
description: A premium digital studio system optimized for high-conversion agency and tech services landing pages.
colors:
  background: "#050505"
  surface: "#0F0F0F"
  primary: "#F97316"
  primary-hover: "#FB923C"
  text-main: "#FFFFFF"
  text-muted: "rgba(255, 255, 255, 0.6)"
  text-dim: "rgba(255, 255, 255, 0.4)"
  border: "rgba(255, 255, 255, 0.1)"
  accent-glow: "rgba(249, 115, 22, 0.2)"
typography:
  display:
    fontFamily: "Geist"
    fontSize: "72px"
    fontWeight: 500
    lineHeight: "1"
  heading:
    fontFamily: "Geist"
    fontSize: "36px"
    fontWeight: 500
    lineHeight: "1.2"
  serif-accent:
    fontFamily: "Instrument Serif"
    fontSize: "72px"
    fontWeight: 400
    fontStyle: "italic"
  body:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1.6"
  caption:
    fontFamily: "Geist Mono"
    fontSize: "12px"
    fontWeight: 500
    letterSpacing: "0.05em"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "48px"
  section: "96px"
rounded:
  sm: "4px"
  md: "8px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
components:
  nav:
    background: "rgba(0, 0, 0, 0.5)"
    blur: "12px"
    border: "rgba(255, 255, 255, 0.05)"
  button-primary:
    background: "#F97316"
    text: "#000000"
    radius: "9999px"
  button-secondary:
    background: "rgba(255, 255, 255, 0.05)"
    border: "rgba(255, 255, 255, 0.1)"
    radius: "9999px"
  card-feature:
    background: "rgba(255, 255, 255, 0.05)"
    border: "rgba(255, 255, 255, 0.1)"
    padding: "32px"
  pricing-card-highlight:
    border: "rgba(249, 115, 22, 0.5)"
    background: "rgba(255, 255, 255, 0.04)"
motion:
  duration: "800ms"
  easing: "ease-out"
---

## Overview
Asterix is a high-contrast visual system designed for premium digital experiences. It utilizes a "Darkness and Light" philosophy, where a deep black background provides a canvas for vibrant orange accents and crisp typography. The system emphasizes technical precision and modern luxury.

## Colors
- **Primary Base**: #050505 (Pure Dark Background).
- **Brand Accent**: #F97316 (Asterix Orange) for calls to action and interactive states.
- **Depth Surfaces**: #0F0F0F used for cards and grouped content to create subtle layering.
- **Overlays**: Semi-transparent white (5-10%) for glassmorphism effects.

## Typography
- **Primary Font**: Geist (Sans-serif) for professional, technical headlines and UI.
- **Secondary Font**: Inter for long-form readability.
- **Stylistic Font**: Instrument Serif (Italic) for editorial flair in hero sections.
- **Monospace**: Geist Mono for technical labels and pricing units.

## Spacing
- Utilizes a standard 8px grid system.
- Section spacing is generous (96px+) to allow elements to breathe against the dark background.
- Consistent inner card padding of 32px.

## Layout
- **Grid**: 12-column responsive grid with a 1280px max-width container.
- **Bento Grid**: Used for feature highlights and portfolio showcases.
- **Alignment**: Center-aligned hero sections with left-aligned detailed content.

## Elevation & Depth
- Depth is achieved via borders and gradients rather than shadows.
- **Glows**: Radial orange gradients (opacity 10-20%) used behind major components to simulate backlighting.
- **Borders**: 1px solid borders in low-opacity white (10%) are the primary separator.

## Shapes
- **Cards**: Large rounded corners (24px) for modern approachability.
- **Buttons**: Fully rounded (Pill) for distinct interactivity.
- **Icons**: Enclosed in 8px rounded squares or subtle circular backgrounds.

## Components
- **Navigation**: Sticky top bar with 12px backdrop blur and minimal borders.
- **Interactive Buttons**: Custom animated "Generate" style buttons with letter-staggered hover effects.
- **Badges**: Pill-shaped with low-opacity backgrounds (10% fill) and high-contrast text.
- **Marquee**: Seamless horizontal scrolls for social proof/logos.

## Motion
- **Entrance**: Fade-up animations for cards and text blocks on scroll.
- **Hover**: Subtle scaling (102%) and border color transitions (from muted white to brand orange).
- **Pulse**: Ping animations for status indicators (e.g., "Accepting Clients").

## Do's and Don'ts
- **Do**: Use high-contrast orange for the most important action only.
- **Do**: Mix Instrument Serif with Geist for headlines.
- **Don't**: Use solid white backgrounds; use translucent white over black for surfaces.
- **Don't**: Use heavy box shadows; favor border-gradients or back-glows.

## Accessibility
- Text contrast must exceed 4.5:1 for body copy.
- Interactive elements must have a minimum focus state outline or distinct background shift.
- All brand icons should include aria-labels for screen readers.