# LaundryLord Design System

## 1. Visual Theme & Atmosphere

LaundryLord should feel like premium operations software for real-world service businesses.

- Mood: calm, competent, elevated, trustworthy
- Personality: precise without feeling sterile, warm without feeling playful
- Overall direction: blend Apple-like restraint, Linear-like clarity, and hospitality-inspired warmth
- Density: medium-compact for workflows, but never cramped
- Impression: "serious software with taste"

The product should not look like a generic SaaS dashboard, a crypto trading app, or a dark neon developer tool. Favor confidence, rhythm, and strong hierarchy over decoration for decoration's sake.

## 2. Color Palette & Roles

### Core Palette

- `Canvas`: `#f7f4ee`
- `Canvas Glow`: `#fffdf8`
- `Surface`: `#fffdfa`
- `Surface Alt`: `#f1ebe0`
- `Ink`: `#171717`
- `Ink Soft`: `#5f5a52`
- `Line`: `#ddd4c6`
- `Line Strong`: `#bcae97`

### Brand & Semantic Palette

- `Primary`: `#1f6b63`
- `Primary Deep`: `#184f49`
- `Primary Soft`: `#dcebe8`
- `Gold`: `#b07a2a`
- `Success`: `#237a57`
- `Warning`: `#b76a1d`
- `Danger`: `#b24a3f`

### Usage Rules

- Use `Primary` as the main accent, not blue.
- Use `Gold` sparingly for emphasis and premium detail, never as the primary CTA color.
- Large backgrounds should stay warm-neutral, not flat white.
- Avoid loud rainbow gradients and overly saturated UI chrome.

## 3. Typography Rules

### Font Families

- Sans: `Manrope`
- Mono: `IBM Plex Mono`

### Hierarchy

- Page title: 32px / 700 / tight tracking
- Section title: 20px / 700
- Card title: 14px / 700 / slight tracking
- Body: 14px / 500
- Secondary body: 13px / 500
- Label / eyebrow: 11px / 700 / uppercase / generous tracking
- Metric display: 28px / 700

### Type Behavior

- Prefer sentence case over title case in body UI.
- Keep headings short and confident.
- Use mono only for money, dates, IDs, and operational data.
- Do not default to tiny text everywhere. Let important numbers breathe.

## 4. Component Stylings

### Buttons

- Primary buttons: deep teal fill, warm shadow, slightly pill-shaped radius
- Secondary buttons: warm neutral surface with stronger border
- Ghost buttons: minimal chrome, text-led
- Height: 40px default, 36px compact
- Weight: medium to semibold

### Cards

- Large rounded corners
- Soft warm surfaces with subtle inner highlight
- Thin, warm borders
- More padding than generic dashboards
- Shadow should feel diffuse and expensive, not heavy

### Inputs

- Slightly taller than default
- Warm surface fill
- Strong focus ring with soft tinted halo
- Placeholder text should be quiet but readable

### Tables & Data Lists

- Use soft row separators rather than hard boxed grids
- Give rows more vertical rhythm
- Add subtle hover backgrounds
- Numeric columns should be mono and visually aligned

### Navigation

- Sidebar should feel like a crafted control rail, not a default admin template
- Active nav items should look inset and intentional
- Brand block should feel premium and anchored

## 5. Layout Principles

- Use generous outer padding around key screens
- Keep content width intentionally constrained on large monitors
- Alternate between dense data zones and calm open space
- Hero pages should use layered backgrounds, not flat fills
- Each page needs one clear focal area

### Spacing Scale

- Tight: 4, 6, 8
- UI default: 12, 16, 20
- Section spacing: 24, 32
- Page spacing: 40, 56

## 6. Depth & Elevation

- Prefer layered surfaces over strong borders everywhere
- Use 1 to 2 shadow styles across the product
- Add subtle radial or linear light gradients to major containers
- Avoid glassmorphism unless used very lightly

## 7. Motion

- Keep motion restrained and purposeful
- Button and hover transitions: 150ms to 220ms
- Page reveal or hero reveal: 300ms to 500ms with soft ease
- Use tiny upward movement and opacity transitions, not bouncy scaling

## 8. Do's and Don'ts

### Do

- Use warm neutrals to separate the brand from generic dashboards
- Make key metrics look editorial and important
- Keep information architecture obvious
- Let high-value areas feel composed and curated

### Don't

- Don’t use generic blue-on-white SaaS styling
- Don’t cram every page edge-to-edge with cards
- Don’t rely on default `shadcn` styling without adaptation
- Don’t overuse gradients, blur, or neon effects

## 9. Responsive Behavior

- Mobile should preserve the premium feel, not collapse into a plain list of boxes
- Stack sections with strong spacing and clean section headers
- Buttons remain full-width only when it improves clarity
- Maintain 44px minimum tap targets on touch devices

## 10. Agent Prompt Guide

When generating or editing UI for LaundryLord:

- Use this file as the visual source of truth.
- Preserve product functionality and information density.
- Prefer premium operations software over startup landing-page trends.
- Make layouts feel intentional, warm, and high-trust.
- Update shared tokens and primitives before page-level styling.
- Avoid default `shadcn` appearance unless explicitly customized to match this design system.
