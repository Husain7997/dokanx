# DokanX Brand System

## Overview
The DokanX brand system is a comprehensive design framework that ensures consistent visual identity across all frontend applications (web, mobile, and POS).

## Color Palette

### Primary Color
- **Hex:** #0B1E3C (Deep Navy Blue)
- **HSL:** 219° 69% 14%
- **Usage:** Primary brand color for main actions, headers, and primary content

### Accent Gradient
- **Start:** #FF7A00 (Vibrant Orange)
- **End:** #FFA500 (Bright Orange)
- **Direction:** 135° (top-left to bottom-right)
- **Usage:** CTAs, highlights, visual accents, logo icon

### Supporting Colors

| Color | Hex | HSL | Usage |
|-------|-----|-----|-------|
| Background | #F4F7FB | 216° 45% 98% | Page backgrounds |
| Surface | #FFFFFF | 0° 0% 100% | Cards, containers |
| Text Primary | #0B1E3C | 219° 69% 14% | Main text content |
| Text Muted | #5F6F86 | 215° 14% 52% | Secondary text |
| Border | #D7DFEA | 216° 24% 87% | Dividers, borders |
| Mono | #111111 | 0° 0% 7% | Monochrome logo, print |

## Logo Variants

### Icon Variant
- **Size Range:** 36px - 64px (sm, md, lg)
- **Usage:** App headers, favicons, compact spaces
- **Files:** `/assets/logo/icon.svg`
- **Min Clear Space:** None (icon only)

### Full Variant
- **Size Range:** 126px × 38px to 216px × 64px (sm, md, lg)
- **Usage:** Navigation bars, page headers, marketing
- **Files:** `/assets/logo/full.svg`
- **Min Clear Space:** 8px-16px depending on size

### Mono Variant
- **Size Range:** 126px × 38px to 216px × 64px (sm, md, lg)
- **Usage:** Receipts, prints, monochrome applications
- **Files:** `/assets/logo/mono.svg`
- **Min Clear Space:** 8px-16px depending on size

## Logo Placement Guidelines

| Page/Screen | Logo Variant | Size | Position |
|-------------|-------------|------|----------|
| Navigation Bar | full | md | Top-left |
| App Header | icon | sm | Next to title |
| Sidebar | full | md | Top section |
| Login/Auth | full | lg | Center |
| Receipt | mono | sm | Header |
| POS Interface | icon | md | Top bar |
| Mobile Headers | icon | sm | Left/center |
| Footer | icon | sm | Left section |

## Component Library

### Logo Component
```tsx
import { Logo } from "@dokanx/ui/components/ui/logo";

// Icon variant (app headers)
<Logo variant="icon" size="sm" />

// Full variant (nav bars)
<Logo variant="full" size="md" className="max-w-xs" />

// Mono variant (receipts)
<Logo variant="mono" size="sm" />
```

**Props:**
- `variant`: "icon" | "full" | "mono"
- `size`: "sm" | "md" | "lg"
- `decorative`: boolean (for screen readers)
- Standard HTML img attributes supported

### Button Component
```tsx
import { Button } from "@dokanx/ui/components/ui/button";

// Primary button
<Button variant="primary" size="md">
  Create Order
</Button>

// Secondary button
<Button variant="secondary">
  Cancel
</Button>

// Loading state
<Button loading={isLoading} loadingText="Processing">
  Submit
</Button>
```

**Variants:**
- `primary` / `default`: Main brand color, white text
- `secondary`: Outline style, secondary color
- `danger`: Red background for destructive actions
- `outline`: Border style
- `ghost`: No background

**Sizes:**
- `sm`: 36px height, compact padding
- `md`: 40px height, standard padding
- `lg`: 48px height, large padding

## Spacing Rules

### Clear Space (Minimum padding around logo)
- **Small:** 8px (icon: 0px)
- **Medium:** 12px (icon: 0px)
- **Large:** 16px (icon: 0px)

Icon variant requires no clear space as it's already self-contained.

### Typography Scale
- **Heading XL:** 36px (2.25rem)
- **Heading LG:** 30px (1.875rem)
- **Heading MD:** 24px (1.5rem)
- **Body LG:** 18px (1.125rem)
- **Body:** 16px (1rem)
- **Caption:** 14px (0.875rem)

### Layout Spacing
- **XS:** 4px
- **SM:** 8px
- **MD:** 16px
- **LG:** 24px
- **XL:** 32px
- **2XL:** 48px

## Implementation Status

### ✅ Web Applications
- **admin-panel** ✓ Complete
- **merchant-dashboard** ✓ Complete
- **storefront-web** ✓ Complete
- **developer-portal** ✓ Complete

### ✅ Components
- Logo component with all variants ✓
- Button component with all variants ✓
- Theme CSS variables ✓
- Tailwind integration ✓

### 🔄 Ongoing
- Mobile app (React Native) theming
- POS system integration
- Brand compliance audits

## Theme Variables

The design system uses CSS custom properties (variables) for theming:

```css
--primary: #0B1E3C
--accent: #FF7A00 to #FFA500
--background: #F4F7FB
--surface: #FFFFFF
--text: #0B1E3C
--border: #D7DFEA
```

These are automatically applied across all Tailwind-configured apps through the shared preset.

## Dark Mode

Dark mode is supported and automatically inverts colors:
- Background becomes darker
- Text becomes lighter
- Accent colors remain vibrant

Toggle via `data-theme="dark"` attribute or CSS class.

## Accessibility

- All colors meet WCAG AA contrast ratios
- Logo alt text automatically generated
- Button focus states clearly defined
- Motion respects `prefers-reduced-motion`

## Best Practices

### ✅ DO
- Use Logo component for all branding
- Maintain clear space around full/mono logos
- Use primary color for main CTAs
- Use accent gradient for highlights
- Respect spacing rules

### ❌ DON'T
- Stretch or distort logos
- Use colors outside the palette
- Mix logo variants on same page
- Add drop shadows to logos
- Rotate or skew logos

## Migration Checklist

- [x] Update brand colors in theme
- [x] Create logo component
- [x] Create button components
- [x] Generate logo SVG assets
- [x] Update admin-panel
- [x] Update merchant-dashboard
- [x] Update storefront-web
- [x] Update developer-portal
- [x] Add theme documentation
- [x] Add component examples
- [ ] Mobile app integration
- [ ] POS system styling
- [ ] Analytics dashboard theme
- [ ] Email templates

## Resources

- **Logo Files:** `public/assets/logo/`
- **Theme Config:** `@dokanx/config/tailwind-preset.cjs`
- **Component Source:** `@dokanx/ui/src/components/ui/`
- **CSS Variables:** `@dokanx/ui/src/styles.css`

## Support

For brand-related questions or implementations, refer to:
1. This document
2. Component source code
3. Existing app implementations
4. Design system package