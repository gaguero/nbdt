# Dashboard Unification — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the static HTML dashboard with a real Next.js page, unify all navigation inside the app, and ensure every page is accessible from the shared sidebar.

**Architecture:** The existing `src/app/[locale]/staff/(authenticated)/dashboard/page.tsx` currently just redirects to `/dashboard.html`. We replace it with a full React component that mirrors the home.html design: Property Pulse grid, module tiles (linking to Next.js routes), and bottom feeds. The shared sidebar in `layout.tsx` points Dashboard → `/[locale]/staff/dashboard`. Static HTML files remain in `/public/` but are no longer navigation targets.

**Tech Stack:** Next.js 15 App Router, React, Tailwind CSS, inline CSS vars (V13 Slate Botanical tokens), Heroicons

---

### Task 1: Rewrite the dashboard page

**Files:**
- Modify: `src/app/[locale]/staff/(authenticated)/dashboard/page.tsx`

**What to build** (mirrors home.html exactly, using existing design tokens):

The page is a client component with 3 sections:
1. **Property Pulse** — 3-col grid: Occupancy card | 2×2 stat cards | Rain radar iframe
2. **Module Tiles** — 4-col grid linking to Next.js routes
3. **Bottom Feeds** — 2-col: Recent Activity | Coming Up Today

All data is static/placeholder for now (same numbers as home.html). Use `useEffect` for the animated occupancy bars and live clock is already in the layout header.

**Full implementation:**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
  ArrowUpTrayIcon,
  NewspaperIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  ShoppingCartIcon,
  Cog6ToothIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

// ── Occupancy bars animate on mount ────────────────────────────────────────
function OccBar({ label, fill, count }: { label: string; fill: string; count: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      if (ref.current) ref.current.style.width = fill;
    }, 250);
    return () => clearTimeout(t);
  }, [fill]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ fontSize: 10, color: 'var(--muted-dim)', width: 60, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: 'rgba(124,142,103,0.15)', borderRadius: 10, overflow: 'hidden' }}>
        <div
          ref={ref}
          style={{ height: '100%', background: 'linear-gradient(90deg, var(--sage), rgba(78,94,62,0.6))', borderRadius: 10, width: 0, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </div>
      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--muted-dim)', width: 24, textAlign: 'right', flexShrink: 0 }}>{count}</span>
    </div>
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  iconColor,
  iconBg,
  num,
  numColor,
  label,
  hint,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  num: number | string;
  numColor: string;
  label: string;
  hint: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid rgba(124,142,103,0.14)',
        borderRadius: 14,
        padding: '12px 14px',
        boxShadow: 'var(--card-shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: iconBg, color: iconColor, flexShrink: 0 }}>
          <Icon style={{ width: 14, height: 14, strokeWidth: 1.8 }} />
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-gelasio), Georgia, serif', fontSize: 30, fontWeight: 700, lineHeight: 1, color: numColor }}>{num}</div>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'var(--muted-dim)' }}>{label}</div>
      <div style={{ fontSize: 10, color: 'var(--muted-dim)', marginTop: 2 }}>{hint}</div>
    </div>
  );
}

// ── Module tile ─────────────────────────────────────────────────────────────
function ModuleTile({
  href,
  icon: Icon,
  name,
  desc,
  accent,
  accentFaint,
  accentGlow,
  stats,
}: {
  href: string;
  icon: React.ElementType;
  name: string;
  desc: string;
  accent: string;
  accentFaint: string;
  accentGlow: string;
  stats: { num: number | string; lbl: string }[];
}) {
  return (
    <Link
      href={href}
      style={{
        background: 'var(--surface)',
        border: `1px solid rgba(124,142,103,0.14)`,
        borderRadius: 14,
        padding: '14px 15px',
        boxShadow: 'var(--card-shadow)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
        overflow: 'hidden',
        textDecoration: 'none',
        transition: 'border-color 0.22s ease, transform 0.22s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = accent;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(124,142,103,0.14)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: accentFaint, color: accent }}>
        <Icon style={{ width: 18, height: 18, strokeWidth: 1.6 }} />
      </div>
      <div style={{ fontFamily: 'var(--font-gelasio), Georgia, serif', fontStyle: 'italic', fontSize: 14, fontWeight: 700, color: 'var(--charcoal)' }}>{name}</div>
      <div style={{ fontSize: 10, color: 'var(--muted-dim)', lineHeight: 1.5 }}>{desc}</div>
      <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
        {stats.map(s => (
          <div key={s.lbl}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 700, color: accent, lineHeight: 1 }}>{s.num}</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted-dim)' }}>{s.lbl}</div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 14, right: 14, color: accent }}>
        <ArrowTopRightOnSquareIcon style={{ width: 14, height: 14, strokeWidth: 2 }} />
      </div>
    </Link>
  );
}

// ── Feed item ───────────────────────────────────────────────────────────────
function FeedItem({ dot, text, meta, time }: { dot: string; text: React.ReactNode; meta: string; time: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 16px', borderBottom: '1px solid rgba(124,142,103,0.06)', cursor: 'default' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot, marginTop: 5, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.45 }}>{text}</div>
        <div style={{ fontSize: 9, color: 'var(--muted-dim)', marginTop: 1 }}>{meta}</div>
      </div>
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--muted-dim)', flexShrink: 0, marginTop: 3 }}>{time}</span>
    </div>
  );
}

// ── Main dashboard ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const locale = useLocale();

  const today = new Date().toLocaleDateString(locale === 'es' ? 'es-CR' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div style={{ padding: '14px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── PROPERTY PULSE ── */}
      <div>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted-dim)', marginBottom: 8 }}>
          Property Pulse — {today}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 280px', gap: 10, alignItems: 'stretch' }}>

          {/* Occupancy */}
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,142,103,0.14)', borderRadius: 14, padding: '14px 16px', boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontFamily: 'var(--font-gelasio), Georgia, serif', fontStyle: 'italic', fontSize: 11, color: 'var(--muted-dim)' }}>Tonight&apos;s Occupancy</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-gelasio), Georgia, serif', fontSize: 42, fontWeight: 700, color: 'var(--gold)', lineHeight: 1 }}>
                  89<span style={{ fontSize: 18, color: 'var(--muted-dim)' }}>%</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted-dim)', marginTop: -4 }}>33 of 37 villas · +4 arriving · −3 departing</div>
              </div>
              <span style={{ background: 'rgba(78,94,62,0.14)', border: '1px solid rgba(78,94,62,0.2)', color: 'var(--sage)', fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20 }}>Near Full</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <OccBar label="Overwater" fill="80%" count="8/10" />
              <OccBar label="Garden" fill="83%" count="5/6" />
              <OccBar label="Beach" fill="75%" count="3/4" />
              <OccBar label="Suite" fill="100%" count="2/2" />
            </div>
          </div>

          {/* 2×2 stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 10 }}>
            <StatCard icon={ArrowUpTrayIcon} iconColor="var(--gold)" iconBg="rgba(170,142,103,0.15)" num={4} numColor="var(--gold)" label="Arrivals Today" hint={<>Next: <strong style={{ color: 'var(--gold)' }}>Martínez</strong> · 2:00 PM</>} />
            <StatCard icon={NewspaperIcon} iconColor="var(--sage)" iconBg="rgba(78,94,62,0.14)" num={3} numColor="var(--sage)" label="Departures" hint={<><span style={{ color: 'var(--sage)', fontWeight: 600 }}>2 billed</span> · 1 pending</>} />
            <StatCard icon={ExclamationTriangleIcon} iconColor="var(--terra)" iconBg="rgba(236,108,75,0.12)" num={3} numColor="var(--terra)" label="Open Requests" hint={<strong style={{ color: 'var(--terra)' }}>2 high priority</strong>} />
            <StatCard icon={ChatBubbleLeftRightIcon} iconColor="#4A90D9" iconBg="rgba(74,144,217,0.10)" num={12} numColor="#4A90D9" label="Unread Messages" hint={<><span style={{ color: 'var(--sage)', fontWeight: 600 }}>5 assigned</span> · 7 open</>} />
          </div>

          {/* Rain radar */}
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,142,103,0.14)', borderRadius: 14, boxShadow: 'var(--card-shadow)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 12px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--separator)', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-gelasio), Georgia, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--sage)' }}>Rain Radar</span>
              <span style={{ fontSize: 9, color: 'var(--muted-dim)', letterSpacing: '0.04em' }}>Bocas del Toro · Live</span>
            </div>
            <iframe
              src="https://embed.windy.com/embed2.html?lat=9.341&lon=-82.253&detailLat=9.341&detailLon=-82.253&width=280&height=220&zoom=8&level=surface&overlay=rain&product=ecmwf&menu=&message=&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1"
              style={{ flex: 1, border: 'none', width: '100%', minHeight: 180, display: 'block' }}
              title="Rain Radar"
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* ── MODULE TILES ── */}
      <div>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted-dim)', marginBottom: 8 }}>Modules</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          <ModuleTile href={`/${locale}/staff/reservations`} icon={CalendarDaysIcon} name="Concierge" desc="Arrivals, departures, transfers, tours & guest requests." accent="var(--gold)" accentFaint="rgba(170,142,103,0.15)" accentGlow="rgba(170,142,103,0.30)" stats={[{ num: 4, lbl: 'Arrivals' }, { num: 8, lbl: 'Transfers' }, { num: 6, lbl: 'Tours' }]} />
          <ModuleTile href={`/${locale}/staff/orders`} icon={ShoppingCartIcon} name="Food & Beverage" desc="Orders, menus, romantic dinners & restaurant covers." accent="var(--sage)" accentFaint="rgba(78,94,62,0.14)" accentGlow="rgba(78,94,62,0.28)" stats={[{ num: 7, lbl: 'Orders' }, { num: 3, lbl: 'Dinners' }]} />
          <ModuleTile href={`/${locale}/staff/messages`} icon={ChatBubbleLeftRightIcon} name="Communications" desc="WhatsApp, SMS, email threads & guest inbox." accent="#4A90D9" accentFaint="rgba(74,144,217,0.10)" accentGlow="rgba(74,144,217,0.15)" stats={[{ num: 12, lbl: 'Unread' }, { num: 5, lbl: 'Requests' }]} />
          <ModuleTile href={`/${locale}/staff/users`} icon={Cog6ToothIcon} name="Admin" desc="Billing, vendors, staff & system settings." accent="var(--terra)" accentFaint="rgba(236,108,75,0.10)" accentGlow="rgba(236,108,75,0.13)" stats={[{ num: 2, lbl: 'Pending Bills' }]} />
        </div>
      </div>

      {/* ── BOTTOM FEEDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,142,103,0.14)', borderRadius: 14, boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-gelasio), Georgia, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--sage)' }}>Recent Activity</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--gold)' }}>See all</span>
          </div>
          <FeedItem dot="var(--terra)" text={<><strong>Billing flagged</strong> — Villa Garden 2 checkout overdue</>} meta="Admin · Billing" time="8:39" />
          <FeedItem dot="#4A90D9" text={<><strong>New message</strong> from García family — dietary request</>} meta="Communications · WhatsApp" time="8:31" />
          <FeedItem dot="var(--gold)" text={<><strong>Transfer confirmed</strong> — Martínez · Liberia → Nayara</>} meta="Concierge · Transfers" time="8:15" />
          <FeedItem dot="var(--sage)" text={<><strong>Order placed</strong> — Villa Overwater 5 · Breakfast for 2</>} meta="F&B · Orders" time="8:02" />
          <FeedItem dot="var(--terra)" text={<><strong>Special request</strong> — Flower arrangement, Villa Suite 1</>} meta="Concierge · Requests" time="7:58" />
          <FeedItem dot="var(--gold)" text={<><strong>Check-in completed</strong> — Johnson family · Villa Beach 2</>} meta="Concierge · Arrivals" time="7:44" />
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,142,103,0.14)', borderRadius: 14, boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-gelasio), Georgia, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--sage)' }}>Coming Up Today</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--gold)' }}>Full calendar</span>
          </div>
          <FeedItem dot="var(--gold)" text={<><strong>Martínez</strong> arrival — transfer from Liberia</>} meta="Concierge · Transfer confirmed" time="2:00 PM" />
          <FeedItem dot="var(--sage)" text={<><strong>Kayak tour</strong> — 6 guests · Bocas Town circuit</>} meta="Concierge · Tours" time="3:30 PM" />
          <FeedItem dot="#4A90D9" text={<><strong>Williams family</strong> departure — flight 6:15 PM</>} meta="Concierge · Billing pending" time="4:00 PM" />
          <FeedItem dot="var(--sage)" text={<><strong>Sunset cocktails</strong> — 12 in-house guests · Bar</>} meta="F&B · Orders open" time="5:30 PM" />
          <FeedItem dot="var(--gold)" text={<><strong>Romantic dinner</strong> — García · Overwater deck</>} meta="F&B · Vendor confirmed" time="7:00 PM" />
        </div>
      </div>

    </div>
  );
}
```

---

### Task 2: Update sidebar — Dashboard links to Next.js route, not static HTML

**Files:**
- Modify: `src/app/[locale]/staff/layout.tsx`

**Step 1:** Change `dashboardHref` to use the locale-aware Next.js route:

```ts
const dashboardHref = `/${locale}/staff/dashboard`;
```

**Step 2:** Change the Dashboard `RailIcon` `onClick` back to `router.push` (since it's now a proper Next.js route):

```tsx
onClick={() => { closePanel(); setActiveGroup(null); router.push(dashboardHref); }}
```

**Step 3:** Change logo `<a>` back to `<Link>` with the new route:

```tsx
<Link
  href={dashboardHref}
  className="flex items-center justify-center rounded-full transition-shadow"
  style={{ ... same styles ... textDecoration: 'none' }}
  ...
>
  N
</Link>
```

---

### Task 3: Verify build and commit

**Step 1:** Run build:
```bash
npm run build
```
Expected: clean build, no errors

**Step 2:** Commit:
```bash
git add src/app/[locale]/staff/(authenticated)/dashboard/page.tsx \
        src/app/[locale]/staff/layout.tsx
git commit -m "feat: unify dashboard into Next.js app — remove static HTML dependency"
```

**Step 3:** Push to master:
```bash
git push origin master
```
