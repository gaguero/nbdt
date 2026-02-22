# Logo Branding + Color Palette System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Saturate every surface of the staff system with the Nayara leaf logo, and add a live color-palette switcher to the Settings page.

**Architecture:** A new `ThemeContext` wraps the staff layout, reads a palette name from `PropertyConfigContext` (`settings.brand.colors.palette`), and sets a `data-palette` attribute on `<html>`. CSS variable overrides in `globals.css` do the rest — zero runtime style injection. Logo placements are surgical edits to the sidebar, login, loading screen, and Toast component. The palette picker in Settings PUTs to the existing `/api/admin/property-config` endpoint (already has a `PUT` handler and deep-merge logic).

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, CSS custom properties, `/brand_assets/` local images

---

## Task 1: Add Palette CSS Variable Sets to globals.css

**Files:**
- Modify: `src/styles/globals.css` — append after the closing `}` of `:root { ... }` block (after line 61), still inside `@layer base`

**What:** Define 4 additional palette overrides via `[data-palette="X"]` attribute selectors on `:root`. The existing `:root` block stays as the `botanical` default — no changes there.

**Step 1: Add palette blocks**

Append this immediately after the closing `}` of the `:root` block on line 61, still inside `@layer base { ... }`:

```css
  /* ── Palette: Ocean (Nayara steel-blue, logo-inspired) ────── */
  [data-palette="ocean"] {
    --bg:         #c2d2dc;
    --surface:    #dde8ef;
    --elevated:   #cfdde6;
    --gold:       #8fa8b8;
    --gold-dark:  #6a8fa3;
    --sage:       #3a6070;
    --forest:     #274a5a;
    --terra:      #d4654a;
    --charcoal:   #1a2b35;
    --sidebar-bg: #0d1e2b;
    --muted:      rgba(26,43,53,0.80);
    --muted-dim:  rgba(26,43,53,0.55);
    --separator:  rgba(58,96,112,0.18);
    --card-shadow: 0 2px 12px rgba(58,96,112,0.10), 0 1px 3px rgba(26,43,53,0.06);
    --card-shadow-hover: 0 8px 28px rgba(58,96,112,0.14), 0 2px 8px rgba(26,43,53,0.08);
    --modal-shadow: 0 28px 80px rgba(13,30,43,0.32), 0 4px 20px rgba(26,43,53,0.14);
  }

  /* ── Palette: Midnight (charcoal + champagne) ──────────────── */
  [data-palette="midnight"] {
    --bg:         #2a2a2a;
    --surface:    #333333;
    --elevated:   #3d3d3d;
    --gold:       #c9a96e;
    --gold-dark:  #b8944f;
    --sage:       #7a9e7e;
    --forest:     #4a6e4e;
    --terra:      #e07055;
    --charcoal:   #f0ede8;
    --sidebar-bg: #1a1a1a;
    --muted:      rgba(240,237,232,0.85);
    --muted-dim:  rgba(240,237,232,0.55);
    --separator:  rgba(201,169,110,0.18);
    --card-shadow: 0 2px 12px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15);
    --card-shadow-hover: 0 8px 28px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2);
    --modal-shadow: 0 28px 80px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.3);
  }

  /* ── Palette: Desert (warm sand + rust) ────────────────────── */
  [data-palette="desert"] {
    --bg:         #d4c4a8;
    --surface:    #ede0c8;
    --elevated:   #e4d4b4;
    --gold:       #c47c3a;
    --gold-dark:  #aa6a28;
    --sage:       #7a5e3a;
    --forest:     #5a4020;
    --terra:      #d4502a;
    --charcoal:   #2a1a0a;
    --sidebar-bg: #1a0e04;
    --muted:      rgba(42,26,10,0.80);
    --muted-dim:  rgba(42,26,10,0.55);
    --separator:  rgba(122,94,58,0.18);
    --card-shadow: 0 2px 12px rgba(122,94,58,0.12), 0 1px 3px rgba(42,26,10,0.07);
    --card-shadow-hover: 0 8px 28px rgba(122,94,58,0.16), 0 2px 8px rgba(42,26,10,0.09);
    --modal-shadow: 0 28px 80px rgba(26,14,4,0.35), 0 4px 20px rgba(42,26,10,0.15);
  }

  /* ── Palette: Slate (cool gray + silver) ───────────────────── */
  [data-palette="slate"] {
    --bg:         #bec8cc;
    --surface:    #d8e0e4;
    --elevated:   #ccd4d8;
    --gold:       #7a9aaa;
    --gold-dark:  #5a7a8a;
    --sage:       #4a6070;
    --forest:     #2a4050;
    --terra:      #cc5c44;
    --charcoal:   #1a2830;
    --sidebar-bg: #0e1820;
    --muted:      rgba(26,40,48,0.80);
    --muted-dim:  rgba(26,40,48,0.55);
    --separator:  rgba(74,96,112,0.18);
    --card-shadow: 0 2px 12px rgba(74,96,112,0.10), 0 1px 3px rgba(26,40,48,0.06);
    --card-shadow-hover: 0 8px 28px rgba(74,96,112,0.14), 0 2px 8px rgba(26,40,48,0.08);
    --modal-shadow: 0 28px 80px rgba(14,24,32,0.32), 0 4px 20px rgba(26,40,48,0.14);
  }

  /* ── Logo animations (shared across all palettes) ──────────── */
  @keyframes nayara-breathe {
    0%, 100% { transform: scale(1); opacity: 0.9; }
    50% { transform: scale(1.05); opacity: 1; }
  }
  @keyframes nayara-float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }
  @keyframes nayara-spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes nayara-spin-ccw {
    from { transform: rotate(0deg); }
    to { transform: rotate(-360deg); }
  }
  @keyframes nayara-pulse-ring {
    0% { transform: scale(0.92); opacity: 0.7; }
    50% { transform: scale(1.2); opacity: 0; }
    100% { transform: scale(0.92); opacity: 0; }
  }

  .nayara-logo-breathe { animation: nayara-breathe 4s ease-in-out infinite; }
  .nayara-logo-float   { animation: nayara-float 5s ease-in-out infinite; }
  .nayara-logo-spin    { animation: nayara-spin-slow 20s linear infinite; }
  .nayara-logo-spin-ccw { animation: nayara-spin-ccw 15s linear infinite; }
```

**Step 2: Verify no build errors**

```bash
cd /c/Users/jovy2/nayara-ordering-system && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors (this is pure CSS, TS won't care)

**Step 3: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat: add 4 color palette CSS variable sets + logo animation keyframes"
```

---

## Task 2: Create ThemeContext — read palette from PropertyConfig, apply to <html>

**Files:**
- Create: `src/contexts/ThemeContext.tsx`
- Modify: `src/app/[locale]/staff/layout.tsx` — wrap `PropertyConfigProvider` with `ThemeProvider`

**Step 1: Create `src/contexts/ThemeContext.tsx`**

```tsx
'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { usePropertyConfig } from '@/contexts/PropertyConfigContext';

type PaletteName = 'botanical' | 'ocean' | 'midnight' | 'desert' | 'slate';

interface ThemeContextType {
  palette: PaletteName;
}

const ThemeContext = createContext<ThemeContextType>({ palette: 'botanical' });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { config } = usePropertyConfig();
  const palette = (config?.settings?.brand?.colors?.palette as PaletteName) ?? 'botanical';

  useEffect(() => {
    if (palette === 'botanical') {
      document.documentElement.removeAttribute('data-palette');
    } else {
      document.documentElement.setAttribute('data-palette', palette);
    }
  }, [palette]);

  return (
    <ThemeContext.Provider value={{ palette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

**Step 2: Wrap StaffLayoutContent with ThemeProvider**

In `src/app/[locale]/staff/layout.tsx`, find the `export default function StaffLayout` at the bottom (line 617–625) and modify it:

OLD:
```tsx
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <PropertyConfigProvider>
      <GuestDrawerProvider>
        <StaffLayoutContent>{children}</StaffLayoutContent>
      </GuestDrawerProvider>
    </PropertyConfigProvider>
  );
}
```

NEW:
```tsx
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <PropertyConfigProvider>
      <ThemeProvider>
        <GuestDrawerProvider>
          <StaffLayoutContent>{children}</StaffLayoutContent>
        </GuestDrawerProvider>
      </ThemeProvider>
    </PropertyConfigProvider>
  );
}
```

Also add the import at the top of the file:
```tsx
import { ThemeProvider } from '@/contexts/ThemeContext';
```

**Step 3: Verify TS**
```bash
cd /c/Users/jovy2/nayara-ordering-system && npx tsc --noEmit 2>&1 | head -20
```

**Step 4: Commit**
```bash
git add src/contexts/ThemeContext.tsx src/app/[locale]/staff/layout.tsx
git commit -m "feat: add ThemeProvider — applies data-palette to <html> from PropertyConfig"
```

---

## Task 3: Logo in the Sidebar — Rail logo + leaf decoration + panel header

**Files:**
- Modify: `src/app/[locale]/staff/layout.tsx`

**What:** Three places in the sidebar:
1. **Rail logo area** (lines 215–238): Replace the gold "N" circle with the actual round logo image + pulse-ring on hover
2. **Leaf decoration** (lines 274–279): Replace the SVG leaf with the logo image at low opacity + slow spin
3. **Panel header** (lines 318–329): Add the round logo mark next to the group label

**Step 1: Replace the rail logo "N" circle (lines 215–238)**

Find this block:
```tsx
          {/* Logo */}
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{ height: 64, borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Link
              href={dashboardHref}
              className="flex items-center justify-center rounded-full transition-shadow"
              style={{
                width: 38,
                height: 38,
                background: 'linear-gradient(135deg, var(--gold) 0%, #8a7352 100%)',
                fontFamily: "var(--font-gelasio), Georgia, serif",
                fontStyle: 'italic',
                fontWeight: 700,
                fontSize: 14,
                color: '#fff',
                textDecoration: 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 16px rgba(170,142,103,0.35)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              N
            </Link>
          </div>
```

Replace with:
```tsx
          {/* Logo */}
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{ height: 64, borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Link
              href={dashboardHref}
              className="relative flex items-center justify-center"
              style={{ width: 44, height: 44, textDecoration: 'none' }}
              onMouseEnter={e => {
                const ring = e.currentTarget.querySelector('.logo-hover-ring') as HTMLElement | null;
                if (ring) ring.style.opacity = '1';
              }}
              onMouseLeave={e => {
                const ring = e.currentTarget.querySelector('.logo-hover-ring') as HTMLElement | null;
                if (ring) ring.style.opacity = '0';
              }}
            >
              {/* Hover pulse ring */}
              <span
                className="logo-hover-ring absolute inset-0 rounded-full"
                style={{
                  border: '1.5px solid rgba(170,142,103,0.5)',
                  boxShadow: '0 0 14px rgba(170,142,103,0.25)',
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                  pointerEvents: 'none',
                }}
              />
              <img
                src="/brand_assets/nayara-logo-round.png"
                alt="Nayara"
                width={38}
                height={38}
                style={{ display: 'block', filter: 'brightness(1.1)' }}
              />
            </Link>
          </div>
```

**Step 2: Replace leaf SVG decoration (lines 274–279)**

Find:
```tsx
          {/* Leaf decoration */}
          <div className="flex justify-center py-3" style={{ opacity: 0.12 }}>
            <svg viewBox="0 0 24 24" fill="#4E5E3E" style={{ width: 24, height: 24 }}>
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
            </svg>
          </div>
```

Replace with:
```tsx
          {/* Logo watermark decoration */}
          <div className="flex justify-center py-3">
            <img
              src="/brand_assets/nayara-logo-round.png"
              alt=""
              width={28}
              height={28}
              className="nayara-logo-spin"
              style={{ opacity: 0.1, display: 'block' }}
            />
          </div>
```

**Step 3: Add logo mark to panel header (lines 318–329)**

Find inside the panel header `<div>`:
```tsx
                <span
                  className="font-bold italic"
                  style={{
                    fontFamily: "var(--font-gelasio), Georgia, serif",
                    fontSize: 15,
                    color: 'var(--gold)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentGroup.label}
                </span>
```

Replace with:
```tsx
                <div className="flex items-center gap-2">
                  <img
                    src="/brand_assets/nayara-logo-round.png"
                    alt=""
                    width={20}
                    height={20}
                    style={{ opacity: 0.55, display: 'block', flexShrink: 0 }}
                  />
                  <span
                    className="font-bold italic"
                    style={{
                      fontFamily: "var(--font-gelasio), Georgia, serif",
                      fontSize: 15,
                      color: 'var(--gold)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {currentGroup.label}
                  </span>
                </div>
```

**Step 4: Add logo mark to top header** (right side, between the time display and the bell icon)

Find the `<div className="flex items-center gap-3">` on the right side of the header (around line 447). It contains the time span, bell button, and avatar link. Add a centered logo watermark to the LEFT side of the header, showing on desktop only. Find this block:

```tsx
              <span
                className="hidden lg:block italic"
                style={{
                  fontFamily: "var(--font-gelasio), Georgia, serif",
                  fontSize: 15,
                  color: 'var(--charcoal)',
                }}
              >
                {ls('Good morning', 'Buenos días')}
              </span>
```

Replace with:
```tsx
              <span
                className="hidden lg:block italic"
                style={{
                  fontFamily: "var(--font-gelasio), Georgia, serif",
                  fontSize: 15,
                  color: 'var(--charcoal)',
                }}
              >
                {ls('Good morning', 'Buenos días')}
              </span>
              <span
                className="hidden lg:flex items-center gap-1.5"
                style={{ opacity: 0.35, marginLeft: 8 }}
              >
                <img
                  src="/brand_assets/nayara-logo-round.png"
                  alt=""
                  width={16}
                  height={16}
                  className="nayara-logo-breathe"
                  style={{ display: 'block' }}
                />
              </span>
```

**Step 5: Verify TS**
```bash
cd /c/Users/jovy2/nayara-ordering-system && npx tsc --noEmit 2>&1 | head -20
```

**Step 6: Commit**
```bash
git add src/app/[locale]/staff/layout.tsx
git commit -m "feat: replace sidebar N-logo and leaf decoration with Nayara round mark"
```

---

## Task 4: Redesign Login Page with Logo

**Files:**
- Modify: `src/app/[locale]/staff/login/page.tsx`

**What:** Full visual redesign. Keep all functionality identical (same form, same API call, same error handling). Apply the botanical design system + floating logo above the card + logo divider + logo in submit button + background watermark.

**Step 1: Replace the entire JSX return block**

The current return block starts at line 55. Replace from `return (` to the final `);` with:

```tsx
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* Background watermark logos */}
      <img
        src="/brand_assets/nayara-logo-round.png"
        alt=""
        className="nayara-logo-spin"
        style={{
          position: 'absolute',
          width: 480,
          height: 480,
          top: -120,
          right: -120,
          opacity: 0.04,
          pointerEvents: 'none',
        }}
      />
      <img
        src="/brand_assets/nayara-logo-round.png"
        alt=""
        style={{
          position: 'absolute',
          width: 280,
          height: 280,
          bottom: -80,
          left: -80,
          opacity: 0.035,
          pointerEvents: 'none',
          transform: 'rotate(45deg)',
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Floating logo above card */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
            {/* Pulse rings */}
            <span
              style={{
                position: 'absolute',
                inset: -10,
                borderRadius: '50%',
                border: '1.5px solid rgba(170,142,103,0.3)',
                animation: 'nayara-pulse-ring 2.8s ease-out infinite',
              }}
            />
            <span
              style={{
                position: 'absolute',
                inset: -10,
                borderRadius: '50%',
                border: '1.5px solid rgba(170,142,103,0.2)',
                animation: 'nayara-pulse-ring 2.8s ease-out 0.9s infinite',
              }}
            />
            <img
              src="/brand_assets/nayara-logo-round.png"
              alt="Nayara"
              className="nayara-logo-float"
              style={{
                width: 72,
                height: 72,
                display: 'block',
                position: 'relative',
                filter: 'drop-shadow(0 8px 20px rgba(170,142,103,0.25))',
              }}
            />
          </div>
          <h2
            style={{
              fontFamily: "var(--font-gelasio), Georgia, serif",
              fontStyle: 'italic',
              fontSize: 14,
              color: 'var(--muted-dim)',
              letterSpacing: '0.08em',
              textTransform: 'none',
              fontWeight: 400,
            }}
          >
            Nayara Bocas del Toro
          </h2>
        </div>

        {/* Card */}
        <div
          className="nayara-card"
          style={{ padding: '32px 28px' }}
        >
          {/* Logo divider header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--separator)' }} />
            <img
              src="/brand_assets/nayara-logo-round.png"
              alt=""
              style={{ width: 24, height: 24, opacity: 0.5 }}
            />
            <div style={{ flex: 1, height: 1, background: 'var(--separator)' }} />
          </div>

          <h1
            className="text-center"
            style={{
              fontFamily: "var(--font-gotham), Montserrat, sans-serif",
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: '0.1em',
              color: 'var(--charcoal)',
              marginBottom: 4,
              textTransform: 'uppercase',
            }}
          >
            {t('title', { defaultValue: 'Staff Login' })}
          </h1>
          <p
            className="text-center"
            style={{
              fontSize: 12,
              color: 'var(--muted-dim)',
              marginBottom: 28,
              letterSpacing: '0.04em',
            }}
          >
            {t('subtitle', { defaultValue: 'Sign in to access the staff portal' })}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                style={{
                  background: 'rgba(236,108,75,0.08)',
                  border: '1px solid rgba(236,108,75,0.25)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: 'var(--terra)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <img src="/brand_assets/nayara-logo-round.png" alt="" style={{ width: 16, height: 16, opacity: 0.5 }} />
                {error}
              </div>
            )}

            <div>
              <label className="nayara-label" htmlFor="email">
                {t('email', { defaultValue: 'Email' })}
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder={t('emailPlaceholder', { defaultValue: 'Enter your email' })}
                className="w-full"
              />
            </div>

            <div>
              <label className="nayara-label" htmlFor="password">
                {t('password', { defaultValue: 'Password' })}
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder={t('passwordPlaceholder', { defaultValue: 'Enter your password' })}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between" style={{ paddingTop: 4 }}>
              <div className="flex items-center gap-2">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  style={{ accentColor: 'var(--gold)' }}
                />
                <label
                  htmlFor="remember-me"
                  style={{ fontSize: 12, color: 'var(--muted-dim)', cursor: 'pointer' }}
                >
                  {t('rememberMe', { defaultValue: 'Remember me' })}
                </label>
              </div>
              <a
                href="#"
                style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-dark)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--gold)')}
              >
                {t('forgotPassword', { defaultValue: 'Forgot password?' })}
              </a>
            </div>

            {/* Submit button with logo */}
            <button
              type="submit"
              disabled={loading}
              className="nayara-btn nayara-btn-primary w-full"
              style={{ marginTop: 8, height: 44, fontSize: 13, position: 'relative', overflow: 'hidden' }}
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <img
                    src="/brand_assets/nayara-logo-round.png"
                    alt=""
                    className="nayara-logo-spin"
                    style={{ width: 18, height: 18, filter: 'brightness(3)', opacity: 0.8 }}
                  />
                  {t('signingIn', { defaultValue: 'Signing in...' })}
                </span>
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  <img
                    src="/brand_assets/nayara-logo-round.png"
                    alt=""
                    style={{ width: 18, height: 18, filter: 'brightness(3)' }}
                  />
                  {t('signIn', { defaultValue: 'Sign in' })}
                </span>
              )}
            </button>
          </form>

          {/* Footer logo divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--separator)' }} />
            <img
              src="/brand_assets/nayara-logo-round.png"
              alt=""
              className="nayara-logo-breathe"
              style={{ width: 16, height: 16, opacity: 0.25 }}
            />
            <div style={{ flex: 1, height: 1, background: 'var(--separator)' }} />
          </div>
        </div>
      </div>
    </div>
  );
```

**Step 2: Verify TS**
```bash
cd /c/Users/jovy2/nayara-ordering-system && npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**
```bash
git add src/app/[locale]/staff/login/page.tsx
git commit -m "feat: redesign login page with Nayara logo — floating mark, dividers, branded button"
```

---

## Task 5: Brand the Auth Loading Screen

**Files:**
- Modify: `src/app/[locale]/staff/(authenticated)/layout.tsx`

**What:** Replace the generic blue spinner + "Loading..." text with the dual-spin logo animation from the showcase.

**Step 1: Replace the `isLoading` return block (lines 39–48)**

Find:
```tsx
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
```

Replace with:
```tsx
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg)' }}
      >
        <div className="flex flex-col items-center gap-5">
          {/* Dual-spin logo */}
          <div style={{ position: 'relative', width: 96, height: 96 }}>
            {/* Outer slow spin ring */}
            <img
              src="/brand_assets/nayara-logo-round.png"
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: 96,
                height: 96,
                opacity: 0.18,
                animation: 'nayara-spin-slow 20s linear infinite',
              }}
            />
            {/* Inner counter-spin logo */}
            <img
              src="/brand_assets/nayara-logo-round.png"
              alt="Loading"
              style={{
                position: 'absolute',
                inset: 16,
                width: 64,
                height: 64,
                animation: 'nayara-spin-ccw 12s linear infinite',
              }}
            />
          </div>
          <p
            style={{
              fontFamily: "var(--font-gelasio), Georgia, serif",
              fontStyle: 'italic',
              fontSize: 13,
              color: 'var(--muted-dim)',
              letterSpacing: '0.08em',
            }}
          >
            Loading your workspace…
          </p>
        </div>
      </div>
    );
  }
```

**Step 2: Verify TS**
```bash
cd /c/Users/jovy2/nayara-ordering-system && npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**
```bash
git add src/app/[locale]/staff/(authenticated)/layout.tsx
git commit -m "feat: replace loading screen with branded dual-spin Nayara logo animation"
```

---

## Task 6: Add Logo Mark to Toast Notifications

**Files:**
- Modify: `src/components/ui/Toast.tsx`

**What:** Replace the generic SVG variant icons with the Nayara round mark. The logo replaces the icon entirely — the left-border accent color already communicates success/error/warning/info. The logo adds identity.

**Step 1: Remove the `variantIcon` function (lines 38–59)**

Delete the entire `const variantIcon = ...` function.

**Step 2: Replace the icon usage in the JSX (line 102)**

Find:
```tsx
        <div className="flex-shrink-0">{variantIcon(variant)}</div>
```

Replace with:
```tsx
        <div className="flex-shrink-0" style={{ position: 'relative' }}>
          <img
            src="/brand_assets/nayara-logo-round.png"
            alt=""
            style={{ width: 28, height: 28, display: 'block' }}
          />
          {/* Small variant dot indicator */}
          <span
            style={{
              position: 'absolute',
              bottom: 1,
              right: 1,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: s.iconColor,
              border: '1.5px solid var(--surface)',
            }}
          />
        </div>
```

**Step 3: Verify TS**
```bash
cd /c/Users/jovy2/nayara-ordering-system && npx tsc --noEmit 2>&1 | head -20
```

**Step 4: Commit**
```bash
git add src/components/ui/Toast.tsx
git commit -m "feat: replace toast variant icons with Nayara logo mark + color dot indicator"
```

---

## Task 7: Add Palette Picker to Settings Page — configuration module

**Files:**
- Modify: `src/app/[locale]/staff/(authenticated)/settings/page.tsx`

**What:** In the `configuration` module section of the settings page, add a visual palette grid. Each palette shows a color swatch preview + name + logo mark. Clicking applies it immediately (optimistic, then saves to DB via PUT `/api/admin/property-config`). Add a logo-watermark header to the configuration section.

**Step 1: Find the `configuration` module render location**

Search the settings page for where `activeModule === 'configuration'` (or equivalent) renders its content. The settings page uses a `ModuleKey` type and renders different content per module.

**Step 2: Add `PALETTES` constant near the top of the file** (after the imports, before the component)

```tsx
const PALETTES = [
  {
    key: 'botanical',
    name: 'Botanical',
    desc: 'Warm tan, cream & sage — the original',
    bg: '#C8BDA8',
    surface: '#F2EBE0',
    accent: '#AA8E67',
    sidebar: '#0E1A09',
  },
  {
    key: 'ocean',
    name: 'Ocean',
    desc: 'Steel blue & navy — logo inspired',
    bg: '#c2d2dc',
    surface: '#dde8ef',
    accent: '#8fa8b8',
    sidebar: '#0d1e2b',
  },
  {
    key: 'midnight',
    name: 'Midnight',
    desc: 'Deep charcoal & champagne gold',
    bg: '#2a2a2a',
    surface: '#333333',
    accent: '#c9a96e',
    sidebar: '#1a1a1a',
  },
  {
    key: 'desert',
    name: 'Desert',
    desc: 'Warm sand & terracotta',
    bg: '#d4c4a8',
    surface: '#ede0c8',
    accent: '#c47c3a',
    sidebar: '#1a0e04',
  },
  {
    key: 'slate',
    name: 'Slate',
    desc: 'Cool gray & silver',
    bg: '#bec8cc',
    surface: '#d8e0e4',
    accent: '#7a9aaa',
    sidebar: '#0e1820',
  },
] as const;

type PaletteKey = typeof PALETTES[number]['key'];
```

**Step 3: Add palette state and save function**

Inside the main settings page component, add state for the current palette and a save handler. Add near the top of the component body (with other `useState` calls):

```tsx
  const [activePalette, setActivePalette] = useState<PaletteKey>('botanical');
  const [paletteSaving, setPaletteSaving] = useState(false);
```

Add a `useEffect` to sync palette from PropertyConfig (add the import `usePropertyConfig` from `@/contexts/PropertyConfigContext` if not already imported):

```tsx
  const { config, refresh: refreshConfig } = usePropertyConfig();

  useEffect(() => {
    const saved = config?.settings?.brand?.colors?.palette as PaletteKey | undefined;
    if (saved) setActivePalette(saved);
  }, [config]);
```

Add the save handler:
```tsx
  const handlePaletteSave = async (paletteKey: PaletteKey) => {
    setActivePalette(paletteKey);
    // Apply immediately via data-palette attribute
    if (paletteKey === 'botanical') {
      document.documentElement.removeAttribute('data-palette');
    } else {
      document.documentElement.setAttribute('data-palette', paletteKey);
    }
    setPaletteSaving(true);
    try {
      const current = config?.settings ?? {};
      await fetch('/api/admin/property-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...current,
            brand: {
              ...current.brand,
              colors: {
                ...(current.brand?.colors ?? {}),
                palette: paletteKey,
              },
            },
          },
        }),
      });
      await refreshConfig();
    } finally {
      setPaletteSaving(false);
    }
  };
```

**Step 4: Add the palette picker JSX inside the `configuration` module**

Find the section that renders when the active module is `'configuration'`. Add this block somewhere visible (e.g., as the first section, before existing configuration toggles):

```tsx
                {/* ── Color Palette ─────────────────────────────────────────── */}
                <div style={{ marginBottom: 32 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 20,
                      position: 'relative',
                    }}
                  >
                    <img
                      src="/brand_assets/nayara-logo-round.png"
                      alt=""
                      className="nayara-logo-breathe"
                      style={{ width: 32, height: 32, flexShrink: 0 }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          fontFamily: 'var(--font-gotham), Montserrat, sans-serif',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--charcoal)',
                        }}
                      >
                        Color Palette
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted-dim)', marginTop: 2 }}>
                        Changes apply instantly across the entire staff portal
                      </div>
                    </div>
                    {paletteSaving && (
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <img
                          src="/brand_assets/nayara-logo-round.png"
                          alt=""
                          className="nayara-logo-spin"
                          style={{ width: 16, height: 16, opacity: 0.5 }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--muted-dim)' }}>Saving…</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                    {PALETTES.map(p => {
                      const isActive = activePalette === p.key;
                      return (
                        <button
                          key={p.key}
                          onClick={() => handlePaletteSave(p.key)}
                          style={{
                            border: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                            borderRadius: 12,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            background: 'transparent',
                            padding: 0,
                            position: 'relative',
                            boxShadow: isActive ? 'var(--card-shadow-hover)' : 'var(--card-shadow)',
                            transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease',
                            transform: isActive ? 'translateY(-2px)' : 'none',
                            textAlign: 'left',
                          }}
                          onMouseEnter={e => {
                            if (!isActive) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={e => {
                            if (!isActive) (e.currentTarget as HTMLButtonElement).style.transform = 'none';
                          }}
                        >
                          {/* Swatch preview */}
                          <div style={{ background: p.bg, height: 72, position: 'relative', overflow: 'hidden' }}>
                            {/* Mini sidebar strip */}
                            <div
                              style={{
                                position: 'absolute',
                                left: 0, top: 0, bottom: 0,
                                width: 16,
                                background: p.sidebar,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                paddingTop: 6,
                                gap: 4,
                              }}
                            >
                              <img
                                src="/brand_assets/nayara-logo-round.png"
                                alt=""
                                style={{ width: 10, height: 10, opacity: 0.7 }}
                              />
                              <div style={{ width: 6, height: 3, borderRadius: 2, background: p.accent, opacity: 0.7 }} />
                              <div style={{ width: 6, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
                              <div style={{ width: 6, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
                            </div>
                            {/* Content area preview */}
                            <div style={{ marginLeft: 18, padding: '8px 8px 0' }}>
                              <div style={{ background: p.surface, borderRadius: 4, padding: '5px 6px' }}>
                                <div style={{ width: '60%', height: 4, borderRadius: 2, background: p.accent, marginBottom: 3 }} />
                                <div style={{ width: '85%', height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.12)', marginBottom: 2 }} />
                                <div style={{ width: '70%', height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.08)' }} />
                              </div>
                            </div>
                            {/* Active logo mark */}
                            {isActive && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  background: p.accent,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <img
                                  src="/brand_assets/nayara-logo-round.png"
                                  alt=""
                                  style={{ width: 14, height: 14, filter: 'brightness(3)' }}
                                />
                              </div>
                            )}
                          </div>
                          {/* Label */}
                          <div
                            style={{
                              background: p.surface,
                              padding: '8px 10px 10px',
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: p.bg === '#2a2a2a' ? '#f0ede8' : '#1a1a1a',
                                letterSpacing: '0.04em',
                                marginBottom: 2,
                              }}
                            >
                              {p.name}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: p.bg === '#2a2a2a' ? 'rgba(240,237,232,0.5)' : 'rgba(26,26,26,0.45)',
                                lineHeight: 1.4,
                              }}
                            >
                              {p.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
```

**Step 5: Add `usePropertyConfig` import** if not already present at the top of settings/page.tsx:
```tsx
import { usePropertyConfig } from '@/contexts/PropertyConfigContext';
```

**Step 6: Verify TS**
```bash
cd /c/Users/jovy2/nayara-ordering-system && npx tsc --noEmit 2>&1 | head -20
```

**Step 7: Commit**
```bash
git add src/app/[locale]/staff/(authenticated)/settings/page.tsx
git commit -m "feat: add visual palette picker to settings configuration module with live preview"
```

---

## Task 8: Screenshot & Verify

**Step 1: Make sure dev server is running**
```bash
# Check if already running; start if not
curl -s http://localhost:3000 > /dev/null && echo "running" || (cd /c/Users/jovy2/nayara-ordering-system && node serve.mjs &)
```

**Step 2: Screenshot login page**
```bash
node screenshot.mjs http://localhost:3000/en/staff/login login-branded
```
Read `temporary screenshots/screenshot-N-login-branded.png` — verify: floating logo, pulse rings, logo divider, logo in submit button, background watermarks, botanical color scheme.

**Step 3: Screenshot sidebar (need to be logged in — screenshot dashboard)**
Take screenshot of the dashboard to verify sidebar logo changes.

**Step 4: Screenshot settings > configuration**
Navigate to settings and screenshot the palette picker section.

**Step 5: Fix any visual issues found and commit**
```bash
git add -A
git commit -m "fix: visual polish from screenshot review"
```

---

## Summary of Files Modified

| File | Change |
|------|--------|
| `src/styles/globals.css` | 4 palette variable sets + logo animation keyframes |
| `src/contexts/ThemeContext.tsx` | NEW — reads palette, sets `data-palette` on `<html>` |
| `src/app/[locale]/staff/layout.tsx` | Logo in rail, panel header, top header; ThemeProvider wrap |
| `src/app/[locale]/staff/login/page.tsx` | Full branded redesign — floating logo, pulse rings, dividers |
| `src/app/[locale]/staff/(authenticated)/layout.tsx` | Branded dual-spin loading screen |
| `src/components/ui/Toast.tsx` | Logo mark replaces variant icons |
| `src/app/[locale]/staff/(authenticated)/settings/page.tsx` | Palette picker grid in configuration module |
