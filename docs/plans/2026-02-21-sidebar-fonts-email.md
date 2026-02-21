# Sidebar Unification, Brand Fonts & Email Nav — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify the left sidebar as a shared component across all pages, update brand fonts to proper Google Font substitutes (Montserrat, Gelasio, Figtree), add Email + all missing pages to the nav, and ensure the Home button always links to `/home.html`.

**Architecture:** Three independent workstreams — (A) font swap, (B) nav/sidebar updates, (C) email styling verification. Fonts are changed in `src/lib/fonts.ts`, `tailwind.config.ts`, `globals.css`, and `layout.tsx`. Nav items are added in `src/app/[locale]/staff/layout.tsx`. The sidebar is already a shared component in the staff layout — static HTML pages (`home.html`, `concierge.html`, etc.) are outside Next.js scope and unaffected.

**Tech Stack:** Next.js 15 (App Router), Google Fonts via `next/font/google`, Tailwind CSS, TypeScript

---

### Task 1: Update `src/lib/fonts.ts` — swap to Montserrat + Gelasio + Figtree

**Files:**
- Modify: `src/lib/fonts.ts`

**Step 1: Replace fonts.ts with three proper Google Font imports**

```ts
import { Montserrat, Gelasio, Figtree } from 'next/font/google';

// Heading: Gotham Black substitute → Montserrat 900
// CSS: text-transform: uppercase; font-weight: 900; letter-spacing: 0.1em
export const gotham = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-gotham',
});

// Sub-heading: Georgia substitute → Gelasio (metrically compatible)
// CSS: font-style: italic; letter-spacing: 0.04em
export const gelasio = Gelasio({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-gelasio',
});

// Body: Proxima Nova substitute → Figtree
// CSS: font-weight: 300|600; letter-spacing: 0.04em
export const proximaNova = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-proxima-nova',
});
```

---

### Task 2: Update `src/app/[locale]/layout.tsx` — add Gelasio variable to `<body>`

**Files:**
- Modify: `src/app/[locale]/layout.tsx`

**Step 1:** Change import to include `gelasio`:
```ts
import { gotham, gelasio, proximaNova } from '@/lib/fonts';
```

**Step 2:** Add `gelasio.variable` to body className:
```tsx
<body className={`${gotham.variable} ${gelasio.variable} ${proximaNova.variable} antialiased`}>
```

---

### Task 3: Update `tailwind.config.ts` — font families for heading/subheading/body

**Files:**
- Modify: `tailwind.config.ts`

**Step 1:** Replace the `fontFamily` block:
```ts
fontFamily: {
  // Heading: Montserrat (Gotham substitute) — all-caps, tracked 100
  heading: ["var(--font-gotham)", "Montserrat", "Tahoma", "sans-serif"],
  // Sub-heading: Gelasio (Georgia substitute) — italic, tracked 40
  subheading: ["var(--font-gelasio)", "Georgia", "serif"],
  // Body: Figtree (Proxima Nova substitute) — light/semibold, tracked 40
  sans: ["var(--font-proxima-nova)", "Figtree", "Arial", "sans-serif"],
  // Monospace
  mono: ["DM Mono", "var(--font-geist-mono)", "Menlo", "monospace"],
},
```

Also remove the old V13 font aliases (`playfair`, `dm-sans`, `dm-mono`).

---

### Task 4: Update `src/styles/globals.css` — replace Google Fonts import + body/heading rules

**Files:**
- Modify: `src/styles/globals.css`

**Step 1:** Remove the old `@import url(...)` for DM Sans/Playfair/DM Mono at line 1 (fonts now come via `next/font/google` through the CSS variables).

**Step 2:** Update body font rule:
```css
body {
  background: var(--bg);
  color: var(--charcoal);
  font-family: var(--font-proxima-nova), Figtree, Arial, sans-serif;
  font-weight: 300;
  letter-spacing: 0.04em;
  font-feature-settings: "rlig" 1, "calt" 1;
}
```

**Step 3:** Update heading rules:
```css
h1, h2, h3, h4, h5, h6 {
  @apply uppercase;
  font-family: var(--font-gotham), Montserrat, Tahoma, sans-serif;
  font-weight: 900;
  letter-spacing: 0.1em;
}
```

**Step 4:** Add/update subheading class:
```css
.font-subheading {
  font-family: var(--font-gelasio), Georgia, serif;
  font-style: italic;
  letter-spacing: 0.04em;
  text-transform: none;
}
```

---

### Task 5: Update sidebar layout — fix Home link + add Email & missing pages to nav

**Files:**
- Modify: `src/app/[locale]/staff/layout.tsx`

**Step 1:** Change `dashboardHref` to point to `/home.html`:
```ts
const dashboardHref = '/home.html';
```

**Step 2:** Add `EnvelopeIcon` to heroicon imports:
```ts
import {
  // ... existing
  EnvelopeIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';
```

**Step 3:** Add Email to the `comms` group:
```ts
{
  key: 'comms',
  label: ls('Communications', 'Comunicaciones'),
  icon: ChatBubbleLeftRightIcon,
  items: [
    { name: ls('Messages', 'Mensajes'), href: `/${locale}/staff/messages`, icon: ChatBubbleLeftRightIcon },
    { name: ls('Email', 'Correo'), href: `/${locale}/staff/email`, icon: EnvelopeIcon },
  ],
},
```

**Step 4:** Add Profiles to the `concierge` group (after Guests):
```ts
{ name: ls('Profiles', 'Perfiles'), href: `/${locale}/staff/profiles`, icon: IdentificationIcon, permission: 'guests:read' },
```

**Step 5:** Update Dashboard `RailIcon` onClick to navigate to `/home.html`:
```ts
onClick={() => { closePanel(); setActiveGroup(null); window.location.href = '/home.html'; }}
```
(Use `window.location.href` since `/home.html` is a static file outside Next.js routing.)

**Step 6:** Update the Logo link to also go to `/home.html` using `<a>` instead of `<Link>`:
```tsx
<a href="/home.html" className="flex items-center justify-center rounded-full transition-shadow" ...>
```

---

### Task 6: Update inline font references in layout.tsx

**Files:**
- Modify: `src/app/[locale]/staff/layout.tsx`

**Step 1:** Replace all inline `fontFamily: "'Playfair Display', serif"` with `fontFamily: "var(--font-gelasio), Georgia, serif"` (for the italic sub-heading style used in panel header, top header greeting, etc.)

**Step 2:** Replace `fontFamily: "'DM Mono', monospace"` with `fontFamily: "'DM Mono', var(--font-geist-mono), monospace"` (keep DM Mono for the clock — it's still imported via CSS variable for monospace use).

---

### Task 7: Build verification

**Step 1:** Run `npm run build` and fix any errors.

**Step 2:** Commit all changes.
