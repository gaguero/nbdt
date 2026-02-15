# Nayara Ordering System - Component Library

This document provides an overview of all UI components and layout components built for the Nayara Ordering System.

## UI Components (`src/components/ui/`)

### Button Component
**Location:** `src/components/ui/Button.tsx`

A versatile button component with multiple variants and states.

**Features:**
- 5 Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`
- 3 Sizes: `sm`, `md`, `lg`
- Loading state with spinner animation
- Disabled state
- Full width option
- TypeScript props with full type safety

**Usage:**
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md">Click Me</Button>
<Button variant="outline" isLoading>Processing...</Button>
<Button variant="danger" fullWidth>Delete</Button>
```

---

### Card Component
**Location:** `src/components/ui/Card.tsx`

A flexible card container with optional header, body, and footer sections.

**Features:**
- Clean design with shadows and borders
- Optional hover effect
- Composable sections: `CardHeader`, `CardBody`, `CardFooter`
- Responsive padding and spacing

**Usage:**
```tsx
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui';

<Card hover>
  <CardHeader>
    <h3>Card Title</h3>
  </CardHeader>
  <CardBody>
    <p>Card content goes here</p>
  </CardBody>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

---

### Input Component
**Location:** `src/components/ui/Input.tsx`

Form input component with label, error, and helper text support.

**Features:**
- All HTML input types supported: `text`, `email`, `password`, `number`, etc.
- Optional label
- Error message display with icon
- Helper text for additional guidance
- Focus states matching theme colors
- Full width option

**Usage:**
```tsx
import { Input } from '@/components/ui';

<Input
  label="Email Address"
  type="email"
  placeholder="you@example.com"
  helperText="We'll never share your email"
/>

<Input
  label="Password"
  type="password"
  error="Password must be at least 8 characters"
/>
```

---

### Modal Component
**Location:** `src/components/ui/Modal.tsx`

A responsive modal dialog with backdrop blur.

**Features:**
- Backdrop with blur effect
- Close button (always visible)
- Optional title
- 4 Sizes: `sm`, `md`, `lg`, `xl`
- Close on backdrop click (configurable)
- Close on Escape key
- Prevents body scroll when open
- Smooth animations

**Usage:**
```tsx
import { Modal } from '@/components/ui';
import { useState } from 'react';

const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  size="md"
>
  <p>Are you sure you want to proceed?</p>
  <div className="flex gap-4 mt-4">
    <Button onClick={() => setIsOpen(false)}>Cancel</Button>
    <Button variant="primary">Confirm</Button>
  </div>
</Modal>
```

---

### Toast Component
**Location:** `src/components/ui/Toast.tsx`

Notification toast with auto-dismiss functionality.

**Features:**
- 4 Variants: `success`, `error`, `warning`, `info`
- Auto-dismiss after 5 seconds (configurable)
- Manual close button
- Smooth enter/exit animations
- Custom hook for easy usage: `useToast()`

**Usage:**
```tsx
import { useToast } from '@/components/ui';

function MyComponent() {
  const { showToast, ToastContainer } = useToast();

  const handleClick = () => {
    showToast('Order placed successfully!', 'success');
  };

  return (
    <>
      <Button onClick={handleClick}>Place Order</Button>
      <ToastContainer />
    </>
  );
}
```

---

## i18n Components (`src/components/i18n/`)

### LanguageSwitcher Component
**Location:** `src/components/i18n/LanguageSwitcher.tsx`

Language toggle component for switching between English and Spanish.

**Features:**
- Toggle between EN/ES
- Visual active state
- Loading state during transition
- Integrates with next-intl routing
- Persists language preference via URL

**Usage:**
```tsx
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';

<LanguageSwitcher />
```

---

## Layout Components (`src/components/layout/`)

### Navbar Component
**Location:** `src/components/layout/Navbar.tsx`

Main navigation bar with language switcher and cart icon.

**Features:**
- Sticky header with scroll effect
- Language switcher integration
- Shopping cart icon with item count badge
- Responsive mobile menu
- Translatable navigation items
- Brand logo area

**Usage:**
```tsx
import Navbar from '@/components/layout/Navbar';

<Navbar cartItemCount={3} />
```

---

### Footer Component
**Location:** `src/components/layout/Footer.tsx`

Site footer with links and contact information.

**Features:**
- 3-column responsive layout
- Quick links section
- Contact information
- Privacy policy and terms links
- Dynamic copyright year
- Fully translatable

**Usage:**
```tsx
import Footer from '@/components/layout/Footer';

<Footer />
```

---

## Translation Files (`messages/`)

The component library uses next-intl for internationalization. Translation files are located in the `messages/` directory:

- `messages/en.json` - English translations
- `messages/es.json` - Spanish translations

**Current translation keys:**
```json
{
  "navigation": {
    "language": "Language / Idioma",
    "cart": "Shopping Cart / Carrito",
    "home": "Home / Inicio",
    "menu": "Menu / Menú",
    "orders": "My Orders / Mis Órdenes"
  },
  "footer": {
    "description": "...",
    "quickLinks": "Quick Links / Enlaces Rápidos",
    "contact": "Contact / Contacto",
    "copyright": "Copyright text",
    "privacyPolicy": "Privacy Policy / Política de Privacidad",
    "termsOfService": "Terms of Service / Términos de Servicio"
  }
}
```

---

## Design System Integration

All components are built to integrate seamlessly with the Nayara brand design system defined in `tailwind.config.ts`:

### Color Palette
- **Primary:** Forest Green (`#1F3D2F`)
- **Accent:** Gold (`#D5A20D`)
- **Background:** Cream (`#FAF7F2`)
- **Status colors:** Amber, Blue, Purple, Green, Red for order statuses

### Typography
- **Heading Font:** Playfair Display (serif)
- **Body Font:** Lato / Open Sans (sans-serif)
- **Font Sizes:** h1, h2, h3, body, caption, button

### Spacing
- **Section:** 5rem (80px)
- **Content:** 2rem (32px)
- **Content Wide:** 4rem (64px)

### Border Radius
- **Button:** 6px
- **Card:** 8px

### Shadows
- **Card:** Subtle elevation
- **Card Hover:** Enhanced elevation
- **Button:** Light shadow for depth
- **Focus:** Accent color ring

---

## Component Import Pattern

All UI components can be imported from a single entry point:

```tsx
import {
  Button,
  Card, CardHeader, CardBody, CardFooter,
  Input,
  Modal,
  Toast, useToast
} from '@/components/ui';
```

Or import individually:
```tsx
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
```

---

## Next Steps

1. Create page layouts using these components
2. Build menu item cards using the Card component
3. Implement order forms using Input and Button components
4. Add order status modals using Modal component
5. Show order confirmations using Toast notifications

---

## Development Notes

- All components are built with TypeScript for type safety
- Components follow React best practices with proper prop types
- Animations use Tailwind's utility classes and custom keyframes
- Components are fully accessible with ARIA labels
- Responsive design built-in with mobile-first approach
- All components use the brand color palette from Tailwind config
