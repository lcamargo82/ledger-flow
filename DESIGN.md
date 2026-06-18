---
name: LedgerFlow Enterprise
colors:
  surface: '#13121b'
  surface-dim: '#13121b'
  surface-bright: '#393842'
  surface-container-lowest: '#0e0d16'
  surface-container-low: '#1b1b24'
  surface-container: '#1f1f28'
  surface-container-high: '#2a2933'
  surface-container-highest: '#35343e'
  on-surface: '#e4e1ee'
  on-surface-variant: '#c7c4d8'
  inverse-surface: '#e4e1ee'
  inverse-on-surface: '#302f39'
  outline: '#918fa1'
  outline-variant: '#464555'
  surface-tint: '#c3c0ff'
  primary: '#c3c0ff'
  on-primary: '#1d00a5'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#4d44e3'
  secondary: '#bec6e0'
  on-secondary: '#283044'
  secondary-container: '#3f465c'
  on-secondary-container: '#adb4ce'
  tertiary: '#ffb695'
  on-tertiary: '#571f00'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#13121b'
  on-background: '#e4e1ee'
  surface-variant: '#35343e'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar_width: 260px
  header_height: 64px
  gutter: 24px
  margin_mobile: 16px
  margin_desktop: 32px
  card_padding: 24px
  unit: 4px
---

## Brand & Style

The design system is engineered for high-stakes financial environments where precision, security, and institutional trust are paramount. It targets C-suite executives and financial controllers who require a focused, "heads-down" workspace that minimizes cognitive load while maintaining a premium, high-tech aesthetic.

The visual style is **Corporate Modern with Minimalist influences**, drawing inspiration from industry leaders like Stripe and Linear. It utilizes a deep-space palette to reduce eye strain during extended use, punctuated by vibrant primary accents that guide the user toward key actions. The aesthetic leans into high-fidelity details: subtle borders, precise typography, and a "mechanical" feel that suggests a powerful, well-oiled machine.

## Colors

The palette is anchored in deep Zinc and Slate tones to create a multi-layered dark mode experience. 

- **Primary Indigo (#4F46E5):** Reserved strictly for primary actions, active navigation states, and critical brand moments.
- **Surface Hierarchy:** Uses a tiered approach where Background Primary (#09090B) acts as the canvas, and Surface/Cards (#18181B) act as the functional containers.
- **Semantic Clarity:** Status colors are high-chroma to ensure they stand out against the dark backgrounds, providing immediate visual feedback for financial audits and system health.
- **Text Contrast:** Text follows a strict hierarchy from White (Primary) to Slate (Muted) to ensure maximum readability in low-light environments.

## Typography

This design system uses a dual-font strategy. **Geist** is utilized for headings and interface labels to provide a technical, modern edge with its slightly condensed, geometric profile. **Inter** is used for all body text and data-heavy content to ensure maximum legibility across all screen sizes.

For Portuguese-BR localization, ensure that line heights are generous enough to accommodate common diacritics (e.g., ç, ã, ê) without clipping. Data tables should prioritize monospaced number variants within the font families to ensure financial columns align perfectly.

## Layout & Spacing

The layout utilizes a **Fixed-Fluid Hybrid** model. A fixed 260px sidebar provides persistent navigation, while the main content area utilizes a fluid grid that expands to fill the viewport.

- **Grid:** Use a 12-column grid for the main content area on desktop.
- **Breakpoints:**
  - Mobile: < 768px (4 columns, 16px margins)
  - Tablet: 768px - 1280px (8 columns, 24px margins)
  - Desktop: > 1280px (12 columns, 32px margins)
- **Spacing Rhythm:** Based on a 4px scale. Most components should use 16px (4 units) or 24px (6 units) for internal padding to maintain a spacious, premium feel.

## Elevation & Depth

Hierarchy in this design system is established through **Tonal Layering and Low-Contrast Outlines** rather than heavy shadows.

- **Level 0 (Base):** Background Primary (#09090B).
- **Level 1 (Cards/Containers):** Surface (#18181B) with a subtle 1px border (#27272A). 
- **Level 2 (Modals/Popovers):** Surface (#1F2937) with a more pronounced Slate border (#334155) and a subtle 20px blur background overlay.
- **Shadows:** Only used on Level 2 elements. Use a soft, high-diffusion shadow: `0 10px 15px -3px rgba(0, 0, 0, 0.5)`.
- **Interactive States:** Hovering over a card should slightly lighten its border color rather than increasing its elevation.

## Shapes

The shape language is **Soft and Professional**. A standard 0.25rem (4px) radius is used for small components like checkboxes and inputs. Larger components like cards and modals use a 0.5rem (8px) radius. This subtle rounding maintains the corporate "seriousness" while appearing modern and refined.

Buttons and badges should strictly follow the 0.25rem rule to maintain a crisp, sharp-edged look that aligns with financial dashboards.

## Components

### Buttons
- **Primary:** Background #4F46E5, Text #FFFFFF. Solid fill.
- **Secondary:** Background #1F2937, Border #334155, Text #F8FAFC.
- **Outline:** Transparent background, Border #27272A, Text #CBD5E1.
- **Ghost:** No background or border, Text #94A3B8. Transitions to Muted Indigo on hover.

### Enterprise Tables
- **Header:** Background #0F172A, Text #94A3B8 (Label-sm style).
- **Rows:** Border-bottom #27272A, hover state background #18181B.
- **Badges:** Use "Soft" primary or status colors (e.g., Soft Indigo #312E81 background with Indigo #6366F1 text) for roles and statuses.

### Input Fields
- **Default:** Background #09090B, Border #27272A, Text #F8FAFC.
- **Focus:** Border #4F46E5, Box-shadow ring (2px) in #4F46E5 at 20% opacity.
- **Placeholder:** Text #64748B.

### Sidebar & Header
- **Sidebar:** Fixed 260px. Darker than main content (#09090B). Active items use a vertical 2px Indigo line on the left edge.
- **Header:** 64px height, semi-transparent background with backdrop-blur (12px) to allow content to scroll underneath elegantly.

### Modals
- Centralized with a fixed width (max-width 560px for standard, 800px for large).
- Backdrop: #000000 at 60% opacity with 4px Gaussian blur.