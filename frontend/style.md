# ScratchMyAi Design System

This document outlines the core styling conventions, variables, and components used in the **ScratchMyAi** frontend. Future development must align with these specifications to maintain the intended aesthetic.

## Design Philosophy
The application embodies a **warm, library-inspired, minimalist aesthetic**. It uses high-contrast text on soft off-white and warm gray backgrounds. The UI leverages subtle borders, slight background color shifts on hover, and soft drop shadows to create an elevated but clean environment. The design is deliberately typography-driven, utilizing distinct font families (Serif for titles, Sans for UI, Mono for code) to distinguish different types of content clearly.

## Color Palette

### Backgrounds
- **Base (App Background):** `#f8f7f4`
- **Surface (Cards, Panels):** `#ffffff`
- **Elevated (Dropdowns, Popovers):** `#f3f2ee`
- **Hover States:** `#eeeee8`
- **Active / Pressed:** `#e8e7e2`

### Borders
- **Subtle:** `#e8e7e2`
- **Default:** `#dddcd7`
- **Strong:** `#c8c7c2`

### Text
- **Primary:** `#1c1917` (stone-900)
- **Secondary:** `#57534e` (stone-600)
- **Tertiary:** `#78716c` (stone-500)
- **Muted:** `#a8a29e` (stone-400)

### Accents
- **Default / Text:** `#7c3aed` (violet-600)
- **Hover:** `#6d28d9` (violet-700)
- **Muted:** `rgba(124, 58, 237, 0.08)`

### Semantic
- **Success:** `#22c55e`
- **Warning:** `#eab308`
- **Error:** `#ef4444`
- **Info:** `#3b82f6`

---

## Typography

### Font Families
- **Sans (UI & Body text):** `var(--font-inter), system-ui, -apple-system, sans-serif`
- **Serif (Paper Titles & Headings):** `var(--font-source-serif), 'Source Serif 4', Georgia, serif`
- **Mono (Code Blocks):** `var(--font-jetbrains), 'JetBrains Mono', 'Fira Code', monospace`

### Typography Scale
- **xs:** `0.75rem` (12px), Line Height: `1rem`
- **sm:** `0.8125rem` (13px), Line Height: `1.25rem`
- **base:** `0.875rem` (14px), Line Height: `1.5rem`
- **lg / h3:** `1rem` (16px), Line Height: `1.5rem`, Weight: 600
- **xl / h2:** `1.125rem` (18px), Line Height: `1.75rem`, Weight: 600
- **2xl / h1:** `1.25rem` (20px) to `1.5rem` (24px), Line Height: `2rem`, Weight: 600
- **3xl:** `1.875rem` (30px), Line Height: `2.25rem`

---

## Spacing & Layout

- **Base Grid / Flow:** Flex and Grid utilities via Tailwind.
- **Top Bar Height:** `48px`
- **Sidebar Width:** `280px`
- **Right Panel Width:** `420px`

### Border Radii
- **sm:** `0.375rem` (6px)
- **md:** `0.5rem` (8px)
- **lg (Buttons/Inputs):** `0.75rem` (12px)
- **xl (Cards):** `1rem` (16px)
- **full:** `9999px`

---

## UI Components

### Buttons
All buttons share the base classes: `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50`.
- **Default:** `bg-violet-600 text-white hover:bg-violet-700`
- **Outline:** `border border-[#dddcd7] bg-transparent text-[#44403c] hover:bg-[#f3f2ee] hover:text-[#1c1917]`
- **Ghost:** `text-[#44403c] hover:bg-[#f3f2ee] hover:text-[#1c1917]`
- **Destructive:** `bg-red-600 text-white hover:bg-red-700`

### Inputs
- **Default State:** `h-9 w-full flex rounded-lg border border-[#dddcd7] bg-[#f8f7f4] px-3 py-1 text-sm text-[#1c1917] shadow-sm transition-colors placeholder:text-[#a8a29e]`
- **Focus State:** `focus-visible:border-[#c8c7c2] focus-visible:bg-[#f3f2ee] focus-visible:outline-none`
- **Disabled State:** `disabled:cursor-not-allowed disabled:opacity-50`

### Cards
- **Container:** `rounded-xl border border-[#e8e7e2] bg-white text-[#1c1917] shadow-lg`
- **Header:** `flex flex-col gap-1.5 p-4`
- **Content:** `px-4 pb-4`
- **Footer:** `flex items-center border-t border-[#e8e7e2] px-4 py-3`

---

## Motion & Transitions

### Timings & Easing
Based on standard configuration arrays:
- **Fast:** `duration: 0.15s` | `ease: [0.4, 0, 0.2, 1]`
- **Normal:** `duration: 0.2s` | `ease: [0.4, 0, 0.2, 1]`
- **Slow:** `duration: 0.3s` | `ease: [0.4, 0, 0.2, 1]`
- **Spring (Framer Motion):** `stiffness: 400`, `damping: 30`

### Custom Keyframes
- **Slide Up/Down and Fade:** standard `0.15s ease` animations for popovers, Context Menus, and dropdowns.
- **Shimmer:** Skeleton loading animation shifting a linear gradient over `1.5s ease-in-out infinite`.
- **Pulse Subtle:** `3s ease-in-out infinite` animation looping opacity between `0.4` and `0.55` (used for frontier nodes).

---

## Assets & Iconography
- **Icons:** Standardized usage of the `lucide-react` library.
- **Custom Branding/Watermark:** Uses `url("/horse.png")` inserted via the `.react-flow__pane::before` pseudo-element with `50%` size, `0.14` opacity, configured as a centralized, non-repeating background overlay.
