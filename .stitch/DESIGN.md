# Design System: BRF Garage
**Project ID:** `6413313512368067244`

## 1. Visual Theme & Atmosphere

Professional, clean, and airy SaaS product for Swedish housing associations. The aesthetic is minimalist and trustworthy — not corporate cold, but calm and structured. Subtle depth through soft shadows and tonal surface layers. No dark backgrounds in the main flows; light mode only.

## 2. Color Palette & Roles

| Name | Hex | Role |
|---|---|---|
| Deep Ocean Blue (Primary) | `#0053db` | Primary actions, links, focus rings, icons |
| Ocean Bright (Primary Container) | `#2563eb` | Gradient endpoint for buttons |
| Ocean Muted (Primary Dim) | `#0048c1` | Gradient hover state |
| Sky Tint (Primary Fixed) | `#dbe1ff` | Badges, chips, avatar backgrounds, selection |
| Dark Ocean (On Primary Fixed Variant) | `#003ea8` / `#0050d4` | Text on sky-tint backgrounds |
| Off-White (On Primary) | `#f8f7ff` / `#ffffff` | Text on primary buttons |
| Fog (Surface / Background) | `#f8f9fa` / `#f7f9fb` | Page background |
| Pure White (Surface Container Lowest) | `#ffffff` | Cards, inputs |
| Pale Fog (Surface Container Low) | `#f1f4f6` / `#f2f4f6` | Feature section bg, section separators |
| Cool Gray (Surface Container High) | `#e2e9ec` / `#e6e8ea` | Dividers, step connector lines, icon bg |
| Ink (On Surface) | `#2b3437` / `#191c1e` | Body headings and primary text |
| Slate (On Surface Variant) | `#586064` / `#434655` | Secondary text, captions, placeholders |
| Silver (Outline Variant) | `#abb3b7` / `#c3c6d7` | Input borders, separators |
| Crimson (Error) | `#9f403d` | Validation errors |

## 3. Typography Rules

- **Display / Headings** — Manrope, weight 700–800, tight tracking (`-0.02em` to `-0.03em`)
- **Body** — Inter, weight 400–500, relaxed line-height (1.65)
- **Labels / UI text** — Inter, weight 500–600
- **Micro labels** — Inter, `0.6875rem`, uppercase, `tracking-widest`, weight 600
- **Font variables**: `var(--font-manrope)` for headings, `var(--font-inter)` for body

## 4. Component Styling

### Buttons
- **Primary**: `rounded-full`, gradient `from-primary to-primary-dim`, `text-on-primary`, `shadow-primary/10`, hover scale 1.01, active scale 0.98
- **Secondary / Outlined**: `rounded-xl`, `border-2 border-outline-variant`, transparent bg, `text-on-surface`
- **CTA Dark**: `rounded-xl`, `bg-on-surface`, `text-surface`, Manrope bold

### Inputs
- `px-5 py-4`, `rounded-lg`, `bg-surface-container-lowest`
- `border-2 border-outline-variant/20`, focus: `border-primary`
- Transition: all 200ms

### Cards
- `rounded-xl`, `bg-surface-container-lowest` (white), `shadow-[0_12px_32px_rgba(43,52,55,0.04)]`
- Internal padding: `p-8` to `p-12`

### Icons
- Material Symbols Outlined, `font-variation-settings: 'FILL' 0, 'wght' 400`
- Size: 18px (inline), 24px (standard), 32px (feature cards)
- Color: `primary` for actions, `on-surface-variant` for decorative

### Badges / Chips
- `rounded-full`, `bg-primary-fixed`, `text-on-primary-fixed-variant`
- Padding: `px-3 py-1` to `px-4 py-1.5`

## 5. Layout Principles

- Max content width: **1280px** (`max-w-7xl`), centered, `px-6` to `px-12`
- Section vertical padding: **72px–128px**
- 3-column feature grids with `gap-8`
- 2-column hero (text + image) on desktop, stacked on mobile
- Sticky/fixed nav with **glassmorphism**: `bg-surface/80 backdrop-blur-md`
- Elevation via box-shadow layering, not borders
- Generous whitespace — never cramped
