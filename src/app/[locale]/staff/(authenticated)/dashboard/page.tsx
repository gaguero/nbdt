'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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

interface PulseData {
  occupancy: {
    total: number;
    occupied: number;
    percentage: number;
    arriving: number;
    departing: number;
    byCategory: { label: string; occupied: number; total: number }[];
  };
  arrivals: { count: number; nextGuest: string | null; nextTime: string | null };
  departures: { count: number; billed: number; pending: number };
  openRequests: { count: number; highPriority: number };
  unreadMessages: { total: number; assigned: number; open: number };
  modules: {
    arrivals: number; transfers: number; tours: number;
    orders: number; dinners: number; unread: number;
    requests: number; pendingBills: number;
  };
  recentActivity: { type: string; title: string; description: string; meta: string; time: string }[];
  comingUpToday: { type: string; title: string; description: string; meta: string; time: string }[];
}

const POLL_INTERVAL = 30_000;

const dotColors: Record<string, string> = {
  message: '#4A90D9',
  order: 'var(--sage)',
  transfer: 'var(--gold)',
  request: 'var(--terra)',
  checkin: 'var(--gold)',
  checkout: 'var(--sage)',
  tour: 'var(--sage)',
  dinner: 'var(--gold)',
  departure: '#4A90D9',
};

const feedTitle: Record<string, string> = {
  message: 'New message',
  order: 'Order placed',
  transfer: 'Transfer update',
  request: 'Special request',
  checkin: 'Check-in completed',
  checkout: 'Check-out',
  tour: 'Tour',
  dinner: 'Romantic dinner',
  departure: 'Departure',
};

function occupancyBadge(pct: number): { label: string; bg: string; border: string; color: string } {
  if (pct >= 95) return { label: 'Full', bg: 'rgba(236,108,75,0.14)', border: 'rgba(236,108,75,0.25)', color: 'var(--terra)' };
  if (pct >= 80) return { label: 'Near Full', bg: 'rgba(78,94,62,0.14)', border: 'rgba(78,94,62,0.2)', color: 'var(--sage)' };
  if (pct >= 50) return { label: 'Moderate', bg: 'rgba(170,142,103,0.14)', border: 'rgba(170,142,103,0.2)', color: 'var(--gold)' };
  return { label: 'Low', bg: 'rgba(124,142,103,0.12)', border: 'rgba(124,142,103,0.2)', color: 'var(--muted-dim)' };
}

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
    <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,142,103,0.14)', borderRadius: 14, padding: '12px 14px', boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', gap: 4 }}>
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

function ModuleTile({
  href,
  icon: Icon,
  name,
  desc,
  accent,
  accentFaint,
  stats,
}: {
  href: string;
  icon: React.ElementType;
  name: string;
  desc: string;
  accent: string;
  accentFaint: string;
  stats: { num: number | string; lbl: string }[];
}) {
  return (
    <Link
      href={href}
      style={{ background: 'var(--surface)', border: '1px solid rgba(124,142,103,0.14)', borderRadius: 14, padding: '14px 15px', boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', overflow: 'hidden', textDecoration: 'none', transition: 'border-color 0.22s ease, transform 0.22s ease' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(124,142,103,0.14)'; e.currentTarget.style.transform = 'translateY(0)'; }}
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

function FeedItem({ dot, text, meta, time }: { dot: string; text: React.ReactNode; meta: string; time: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 16px', borderBottom: '1px solid rgba(124,142,103,0.06)' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot, marginTop: 5, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.45 }}>{text}</div>
        <div style={{ fontSize: 9, color: 'var(--muted-dim)', marginTop: 1 }}>{meta}</div>
      </div>
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--muted-dim)', flexShrink: 0, marginTop: 3 }}>{time}</span>
    </div>
  );
}

function EmptyFeed({ message }: { message: string }) {
  return (
    <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 11, color: 'var(--muted-dim)', fontStyle: 'italic' }}>
      {message}
    </div>
  );
}

export default function DashboardPage() {
  const locale = useLocale();
  const [data, setData] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);

  const todayDate = new Date().toISOString().split('T')[0];

  const today = new Date().toLocaleDateString(locale === 'es' ? 'es-CR' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const fetchPulse = useCallback(() => {
    fetch(`/api/admin/dashboard-pulse?date=${todayDate}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => {
        setData(d);
        if (isFirstLoad.current) {
          setLoading(false);
          isFirstLoad.current = false;
        }
      })
      .catch(() => {
        if (isFirstLoad.current) {
          setLoading(false);
          isFirstLoad.current = false;
        }
      });
  }, [todayDate]);

  useEffect(() => {
    fetchPulse();
    const interval = setInterval(fetchPulse, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPulse]);

  const d = data;
  const occ = d?.occupancy;
  const badge = occupancyBadge(occ?.percentage ?? 0);

  return (
    <div style={{ padding: '14px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14, opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>

      {/* PROPERTY PULSE */}
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
                  {occ?.percentage ?? 0}<span style={{ fontSize: 18, color: 'var(--muted-dim)' }}>%</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted-dim)', marginTop: -4 }}>
                  {occ?.occupied ?? 0} of {occ?.total ?? 0} villas · +{occ?.arriving ?? 0} arriving · &minus;{occ?.departing ?? 0} departing
                </div>
              </div>
              <span style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color, fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20 }}>
                {badge.label}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {(occ?.byCategory ?? []).map(cat => {
                const pct = cat.total > 0 ? Math.round((cat.occupied / cat.total) * 100) : 0;
                return (
                  <OccBar
                    key={cat.label}
                    label={cat.label}
                    fill={`${pct}%`}
                    count={`${cat.occupied}/${cat.total}`}
                  />
                );
              })}
              {(!occ || occ.byCategory.length === 0) && !loading && (
                <div style={{ fontSize: 10, color: 'var(--muted-dim)', fontStyle: 'italic' }}>No occupancy data</div>
              )}
            </div>
          </div>

          {/* 2x2 stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 10 }}>
            <StatCard
              icon={ArrowUpTrayIcon}
              iconColor="var(--gold)"
              iconBg="rgba(170,142,103,0.15)"
              num={d?.arrivals.count ?? 0}
              numColor="var(--gold)"
              label="Arrivals Today"
              hint={d?.arrivals.nextGuest
                ? <>Next: <strong style={{ color: 'var(--gold)' }}>{d.arrivals.nextGuest}</strong>{d.arrivals.nextTime ? ` · ${d.arrivals.nextTime}` : ''}</>
                : <span>&mdash;</span>}
            />
            <StatCard
              icon={NewspaperIcon}
              iconColor="var(--sage)"
              iconBg="rgba(78,94,62,0.14)"
              num={d?.departures.count ?? 0}
              numColor="var(--sage)"
              label="Departures"
              hint={d
                ? <><span style={{ color: 'var(--sage)', fontWeight: 600 }}>{d.departures.billed} billed</span> · {d.departures.pending} pending</>
                : <span>&mdash;</span>}
            />
            <StatCard
              icon={ExclamationTriangleIcon}
              iconColor="var(--terra)"
              iconBg="rgba(236,108,75,0.12)"
              num={d?.openRequests.count ?? 0}
              numColor="var(--terra)"
              label="Open Requests"
              hint={d?.openRequests.highPriority
                ? <strong style={{ color: 'var(--terra)' }}>{d.openRequests.highPriority} high priority</strong>
                : <span>&mdash;</span>}
            />
            <StatCard
              icon={ChatBubbleLeftRightIcon}
              iconColor="#4A90D9"
              iconBg="rgba(74,144,217,0.10)"
              num={d?.unreadMessages.total ?? 0}
              numColor="#4A90D9"
              label="Unread Messages"
              hint={d
                ? <><span style={{ color: 'var(--sage)', fontWeight: 600 }}>{d.unreadMessages.assigned} assigned</span> · {d.unreadMessages.open} open</>
                : <span>&mdash;</span>}
            />
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

      {/* MODULE TILES */}
      <div>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted-dim)', marginBottom: 8 }}>Modules</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          <ModuleTile href={`/${locale}/staff/reservations`} icon={CalendarDaysIcon} name="Concierge" desc="Arrivals, departures, transfers, tours & guest requests." accent="var(--gold)" accentFaint="rgba(170,142,103,0.15)" stats={[{ num: d?.modules.arrivals ?? 0, lbl: 'Arrivals' }, { num: d?.modules.transfers ?? 0, lbl: 'Transfers' }, { num: d?.modules.tours ?? 0, lbl: 'Tours' }]} />
          <ModuleTile href={`/${locale}/staff/orders`} icon={ShoppingCartIcon} name="Food & Beverage" desc="Orders, menus, romantic dinners & restaurant covers." accent="var(--sage)" accentFaint="rgba(78,94,62,0.14)" stats={[{ num: d?.modules.orders ?? 0, lbl: 'Orders' }, { num: d?.modules.dinners ?? 0, lbl: 'Dinners' }]} />
          <ModuleTile href={`/${locale}/staff/messages`} icon={ChatBubbleLeftRightIcon} name="Communications" desc="WhatsApp, SMS, email threads & guest inbox." accent="#4A90D9" accentFaint="rgba(74,144,217,0.10)" stats={[{ num: d?.modules.unread ?? 0, lbl: 'Unread' }, { num: d?.modules.requests ?? 0, lbl: 'Requests' }]} />
          <ModuleTile href={`/${locale}/staff/users`} icon={Cog6ToothIcon} name="Admin" desc="Billing, vendors, staff & system settings." accent="var(--terra)" accentFaint="rgba(236,108,75,0.10)" stats={[{ num: d?.modules.pendingBills ?? 0, lbl: 'Pending Bills' }]} />
        </div>
      </div>

      {/* BOTTOM FEEDS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,142,103,0.14)', borderRadius: 14, boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-gelasio), Georgia, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--sage)' }}>Recent Activity</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--gold)' }}>See all</span>
          </div>
          {d?.recentActivity && d.recentActivity.length > 0
            ? d.recentActivity.map((item, i) => (
                <FeedItem
                  key={i}
                  dot={dotColors[item.type] || 'var(--muted-dim)'}
                  text={<><strong>{feedTitle[item.type] || item.type}</strong> — {item.title}{item.description ? ` · ${item.description}` : ''}</>}
                  meta={item.meta}
                  time={item.time}
                />
              ))
            : !loading && <EmptyFeed message="No recent activity" />}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,142,103,0.14)', borderRadius: 14, boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-gelasio), Georgia, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--sage)' }}>Coming Up Today</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--gold)' }}>Full calendar</span>
          </div>
          {d?.comingUpToday && d.comingUpToday.length > 0
            ? d.comingUpToday.map((item, i) => (
                <FeedItem
                  key={i}
                  dot={dotColors[item.type] || 'var(--muted-dim)'}
                  text={<><strong>{item.title}</strong>{item.description ? ` — ${item.description}` : ''}</>}
                  meta={item.meta}
                  time={item.time}
                />
              ))
            : !loading && <EmptyFeed message="Nothing scheduled for today" />}
        </div>
      </div>

    </div>
  );
}
