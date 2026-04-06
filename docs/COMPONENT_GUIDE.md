# DokanX Component Usage Guide

## Logo Component

### Basic Usage
```tsx
import { Logo } from "@dokanx/ui/components/ui/logo";

// Display full brand logo in navigation
<Logo variant="full" size="md" />

// Display icon only in compact spaces
<Logo variant="icon" size="sm" />
```

### Usage Patterns by Screen

#### Navigation Bar / APP Shell
```tsx
<aside className="border-r border-border">
  <div className="p-6">
    <Logo variant="full" size="md" className="max-w-full" />
  </div>
  {/* Navigation items */}
</aside>
```

#### Page Header
```tsx
<header className="border-b border-border px-6 py-4">
  <div className="flex items-center gap-3">
    <Logo variant="icon" size="sm" />
    <h1>Merchant Dashboard</h1>
  </div>
</header>
```

#### Authentication Pages
```tsx
<div className="flex min-h-screen flex-col items-center justify-center">
  <Logo variant="full" size="lg" className="mb-8" />
  <form>{/* Login form */}</form>
</div>
```

#### Receipts / Invoices
```tsx
<div className="receipt">
  <Logo variant="mono" size="sm" className="mb-4" />
  <p className="receipt-number">Receipt #12345</p>
  {/* Receipt content */}
</div>
```

#### Mobile App Headers
```tsx
<View style={styles.headerBar}>
  <Image
    source={require("./assets/logo-icon.png")}
    style={styles.mobileLogoIcon}
  />
</View>
```

### Size Dimensions Reference

| Variant | Size | Dimensions |
|---------|------|------------|
| icon | sm | 36×36 |
| icon | md | 48×48 |
| icon | lg | 64×64 |
| full | sm | 126×38 |
| full | md | 162×48 |
| full | lg | 216×64 |
| mono | sm | 126×38 |
| mono | md | 162×48 |
| mono | lg | 216×64 |

## Button Component

### Basic Usage
```tsx
import { Button } from "@dokanx/ui/components/ui/button";

// Primary action button
<Button variant="primary">Create Order</Button>

// Secondary button
<Button variant="secondary">Cancel</Button>

// With loading state
<Button loading={isLoading}>Submit</Button>
```

### Common Patterns

#### Form Submission
```tsx
<form onSubmit={handleSubmit}>
  <input name="email" type="email" />
  <Button type="submit" loading={isSubmitting}>
    Sign Up
  </Button>
</form>
```

#### Action Bar
```tsx
<div className="flex gap-3">
  <Button variant="secondary">Go Back</Button>
  <Button variant="primary">Continue</Button>
</div>
```

#### Destructive Actions
```tsx
<Button variant="danger" onClick={handleDelete}>
  Delete Account
</Button>
```

#### Ghost Button (Minimal Style)
```tsx
<Button variant="ghost">Learn More</Button>
```

## Theming

### Accessing Brand Colors in Components

Use Tailwind classes:
```tsx
<div className="bg-primary text-primary-foreground">
  Primary color background
</div>

<div className="bg-accent text-accent-foreground">
  Accent color background
</div>
```

Or CSS variables directly:
```tsx
<div style={{ backgroundColor: "hsl(var(--primary))" }}>
  Using CSS variables
</div>
```

### Gradient Usage
```tsx
<div className="bg-gradient-to-r from-[#FF7A00] to-[#FFA500]">
  Gradient background
</div>
```

## Responsive Design

### Logo Sizing on Different Screens
```tsx
<Logo
  variant="full"
  size="sm"  // Mobile: 126×38
  className="md:hidden" // Hide on larger screens
/>
<Logo
  variant="full"
  size="md"  // Desktop: 162×48
  className="hidden md:block"
/>
```

### Button Sizing
```tsx
<Button size="sm" className="md:hidden">Mobile</Button>
<Button size="md" className="hidden md:inline-flex">Desktop</Button>
```

## Accessibility

### Logo with Alternative Text
```tsx
// Decorative logo (in nav with text)
<Logo variant="icon" size="sm" decorative />

// Logo as link indicator
<a href="/">
  <Logo variant="full" size="md" />
</a>
```

### Button Accessibility
```tsx
// Clear button label
<Button>Save Changes</Button>

// With aria-label for icon-only buttons
<Button aria-label="Open menu">
  <MenuIcon />
</Button>

// Disabled state
<Button disabled>Unavailable</Button>
```

## Dark Mode

### Automatic Dark Mode Support
```tsx
<Logo variant="full" size="md" /> {/* Auto-adjusts in dark mode */}
<Button>Click me</Button> {/* Colors adapt to dark theme */}
```

### Manual Dark Mode Toggle
```tsx
<div data-theme="dark">
  <Logo />
  <Button>Dark mode button</Button>
</div>
```

## Performance Tips

1. **Logo Optimization**
   - Use icon variant in high-repetition layouts
   - Lazy-load logos outside viewport

2. **Button Optimization**
   - Avoid unnecessary re-renders with memoization
   - Use size="sm" for more buttons per page

3. **Image Optimization**
   - SVG logos are lightweight (1-2KB each)
   - Logos are cached by browser
   - No additional HTTP requests needed

## Common Mistakes

❌ **Stretching logo**
```tsx
<Logo style={{ width: "200px", height: "50px" }} /> // Wrong!
```

✅ **Use responsive sizing**
```tsx
<Logo variant="full" size="md" />
```

---

❌ **Mixing multiple logo variants on one page**
```tsx
<Logo variant="icon" />
<Logo variant="full" />
<Logo variant="mono" />
```

✅ **Consistent variant usage**
```tsx
<Logo variant="full" /> {/* Navbar */}
<Logo variant="icon" /> {/* Header */}
```

---

❌ **Hardcoded colors**
```tsx
<div style={{ backgroundColor: "#FF7A00" }}>
```

✅ **Use theme colors**
```tsx
<div className="bg-accent">
```

## Troubleshooting

### Logo not displaying
- Check SVG file exists in `/public/assets/logo/`
- Verify variant name is correct ("icon", "full", or "mono")
- Check browser console for 404 errors

### Button styling issues
- Ensure Tailwind CSS is configured
- Check preset is imported in tailwind.config
- Verify styles.css is loaded

### Color inconsistencies
- Clear browser cache
- Check CSS variable definitions
- Verify dark mode toggle is working

## File Locations

- **Logo Component:** `apps/backend/packages/ui/src/components/ui/logo.tsx`
- **Button Component:** `apps/backend/packages/ui/src/components/ui/button.tsx`
- **Logo SVG Files:** `apps/frontend/{app}/public/assets/logo/`
- **Theme CSS:** `apps/backend/packages/ui/src/styles.css`
- **Brand Config:** `apps/backend/packages/ui/src/theme/dokanx-brand.ts`