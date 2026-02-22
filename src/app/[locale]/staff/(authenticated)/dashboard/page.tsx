'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useGuestDrawer } from '@/contexts/GuestDrawerContext';
import { usePropertyConfig } from '@/contexts/PropertyConfigContext';
import { localDateString } from '@/lib/dates';
import { TransferModal } from '../transfers/TransferModal';

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

function toLocalDate(d: Date) {
  return localDateString(d);
}

interface DashData {
  arrivals:   any[];
  departures: any[];
  inhouse:    any[];
  requests:   any[];
  conversations: any[];
  transfers:  any[];
  tours:      any[];
  orders:     number;
}

const EMPTY_DATA: DashData = { arrivals:[], departures:[], inhouse:[], requests:[], conversations:[], transfers:[], tours:[], orders: 0 };

export default function DashboardPage() {
  const locale = useLocale();
  const { openGuest } = useGuestDrawer();
  const { config } = usePropertyConfig();
  const [data, setData] = useState<DashData>(EMPTY_DATA);
  const [editingTransfer, setEditingTransfer] = useState<any | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  const today = new Date().toLocaleDateString(locale === 'es' ? 'es-CR' : 'en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  const fetchDashboardData = useCallback(() => {
    const date = toLocalDate(new Date());
    Promise.all([
      fetch(`/api/reservations?filter=arrivals&date=${date}`).then(r => r.json()),
      fetch(`/api/reservations?filter=departures&date=${date}`).then(r => r.json()),
      fetch(`/api/reservations?filter=checked_in&date=${date}`).then(r => r.json()),
      fetch(`/api/special-requests?filter=today`).then(r => r.json()),
      fetch(`/api/conversations`).then(r => r.json()),
      fetch(`/api/transfers?date_from=${date}&date_to=${date}`).then(r => r.json()),
      fetch(`/api/tour-bookings?date_from=${date}&date_to=${date}`).then(r => r.json()),
    ]).then(([arr, dep, inh, req, convs, trans, tours]) => {
      setData({
        arrivals:      arr.reservations   ?? [],
        departures:    dep.reservations   ?? [],
        inhouse:       inh.reservations   ?? [],
        requests:      req.special_requests ?? [],
        conversations: convs.conversations ?? [],
        transfers:     trans.transfers    ?? [],
        tours:         tours.tour_bookings ?? [],
        orders:        0,
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const unreadMsgs   = data.conversations.reduce((s: number, c: any) => s + parseInt(c.unread_count || '0'), 0);
  const openRequests = data.requests.filter((r: any) => r.status !== 'resolved' && r.status !== 'cancelled').length;
  const inhouseCount = data.inhouse.length;
  const totalVillas  = config?.settings?.rooms?.totalUnits ?? 37;
  const occPct       = totalVillas > 0 ? Math.round((inhouseCount / totalVillas) * 100) : 0;
  const occLabel     = occPct >= 90 ? 'Near Full' : occPct >= 70 ? 'High' : occPct >= 40 ? 'Moderate' : 'Low';

  const nextArrival  = data.arrivals[0];
  const highPriReqs  = data.requests.filter((r: any) => r.priority === 'high').length;
  const assignedConvs = data.conversations.filter((c: any) => c.assigned_staff_id).length;

  return (
    <div style={{ padding: '14px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

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
                  {occPct}<span style={{ fontSize: 18, color: 'var(--muted-dim)' }}>%</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted-dim)', marginTop: -4 }}>
                  {inhouseCount} of {totalVillas} villas · +{data.arrivals.length} arriving · −{data.departures.length} departing
                </div>
              </div>
              <span style={{ background: 'rgba(78,94,62,0.14)', border: '1px solid rgba(78,94,62,0.2)', color: 'var(--sage)', fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20 }}>{occLabel}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <OccBar label="Occupied" fill={`${occPct}%`} count={`${inhouseCount}/${totalVillas}`} />
              <OccBar label="Arrivals" fill={`${Math.round((data.arrivals.length / totalVillas) * 100)}%`} count={`${data.arrivals.length}`} />
              <OccBar label="Departures" fill={`${Math.round((data.departures.length / totalVillas) * 100)}%`} count={`${data.departures.length}`} />
            </div>
          </div>

          {/* 2x2 stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 10 }}>
            <StatCard
              icon={ArrowUpTrayIcon} iconColor="var(--gold)" iconBg="rgba(170,142,103,0.15)"
              num={data.arrivals.length} numColor="var(--gold)" label="Arrivals Today"
              hint={nextArrival ? <>Next: <strong style={{ color: 'var(--gold)' }}>{nextArrival.guest_name || nextArrival.opera_guest_name}</strong></> : <>No arrivals today</>}
            />
            <StatCard
              icon={NewspaperIcon} iconColor="var(--sage)" iconBg="rgba(78,94,62,0.14)"
              num={data.departures.length} numColor="var(--sage)" label="Departures"
              hint={<>{data.departures.length} checking out today</>}
            />
            <StatCard
              icon={ExclamationTriangleIcon} iconColor="var(--terra)" iconBg="rgba(236,108,75,0.12)"
              num={openRequests} numColor="var(--terra)" label="Open Requests"
              hint={highPriReqs > 0 ? <strong style={{ color: 'var(--terra)' }}>{highPriReqs} high priority</strong> : <>No high priority</>}
            />
            <StatCard
              icon={ChatBubbleLeftRightIcon} iconColor="#4A90D9" iconBg="rgba(74,144,217,0.10)"
              num={unreadMsgs} numColor="#4A90D9" label="Unread Messages"
              hint={<><span style={{ color: 'var(--sage)', fontWeight: 600 }}>{assignedConvs} assigned</span> · {data.conversations.length - assignedConvs} open</>}
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
          <ModuleTile
            href={`/${locale}/staff/concierge`} icon={CalendarDaysIcon} name="Concierge"
            desc="Arrivals, departures, transfers, tours & guest requests."
            accent="var(--gold)" accentFaint="rgba(170,142,103,0.15)"
            stats={[{ num: data.arrivals.length, lbl: 'Arrivals' }, { num: data.transfers.length, lbl: 'Transfers' }, { num: data.tours.length, lbl: 'Tours' }]}
          />
          <ModuleTile
            href={`/${locale}/staff/orders`} icon={ShoppingCartIcon} name="Food & Beverage"
            desc="Orders, menus, romantic dinners & restaurant covers."
            accent="var(--sage)" accentFaint="rgba(78,94,62,0.14)"
            stats={[{ num: data.orders, lbl: 'Orders' }]}
          />
          <ModuleTile
            href={`/${locale}/staff/messages`} icon={ChatBubbleLeftRightIcon} name="Communications"
            desc="WhatsApp, SMS, email threads & guest inbox."
            accent="#4A90D9" accentFaint="rgba(74,144,217,0.10)"
            stats={[{ num: unreadMsgs, lbl: 'Unread' }, { num: openRequests, lbl: 'Requests' }]}
          />
          <ModuleTile
            href={`/${locale}/staff/users`} icon={Cog6ToothIcon} name="Admin"
            desc="Billing, vendors, staff & system settings."
            accent="var(--terra)" accentFaint="rgba(236,108,75,0.10)"
            stats={[{ num: 0, lbl: 'Pending Bills' }]}
          />
        </div>
      </div>

      {/* BOTTOM FEEDS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

        {/* Upcoming arrivals */}
        <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,142,103,0.14)', borderRadius: 14, boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-gelasio), Georgia, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--sage)' }}>Arrivals Today</span>
            <Link href={`/${locale}/staff/reservations`} style={{ fontSize: 10, fontWeight: 600, color: 'var(--gold)', textDecoration: 'none' }}>See all</Link>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {data.arrivals.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12, color: 'var(--muted-dim)', fontStyle: 'italic' }}>No arrivals today</div>
            ) : (
              data.arrivals.slice(0, 6).map((r: any) => (
                <div key={r.id} style={{ cursor: r.guest_id ? 'pointer' : 'default' }}>
                  <FeedItem
                    dot="var(--gold)"
                    text={
                      <>
                        <strong
                          onClick={() => r.guest_id && openGuest(r.guest_id)}
                          style={{ cursor: r.guest_id ? 'pointer' : 'default', color: r.guest_id ? 'var(--sage)' : 'inherit', textDecoration: r.guest_id ? 'underline' : 'none', textDecorationColor: 'rgba(78,94,62,0.3)' }}
                        >
                          {r.guest_name || r.opera_guest_name || '—'}
                        </strong>
                        {' '}arrival — {r.room || 'Room TBD'}
                      </>
                    }
                    meta={`Concierge · ${r.transfer_booked ? 'Transfer confirmed' : 'No transfer'}`}
                    time={r.room || '—'}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coming up: transfers + tours */}
        <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,142,103,0.14)', borderRadius: 14, boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-gelasio), Georgia, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--sage)' }}>Coming Up Today</span>
            <Link href={`/${locale}/staff/concierge`} style={{ fontSize: 10, fontWeight: 600, color: 'var(--gold)', textDecoration: 'none' }}>Full view</Link>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {data.transfers.slice(0, 3).map((t: any) => (
              <div key={`t-${t.id}`} onClick={() => { setEditingTransfer(t); setTransferModalOpen(true); }} style={{ cursor: 'pointer' }}>
                <FeedItem
                  dot="var(--gold)"
                  text={<><strong>{t.guest_name || '—'}</strong> transfer — {t.origin} → {t.destination}</>}
                  meta={`Concierge · Transfers · ${t.vendor_name || '—'}`}
                  time={t.time?.slice(0, 5) || '—'}
                />
              </div>
            ))}
            {data.tours.slice(0, 3).map((t: any) => (
              <FeedItem
                key={`tour-${t.id}`}
                dot="var(--sage)"
                text={<><strong>{t.name_en || '—'}</strong> — {t.guest_name || '—'}</>}
                meta={`Concierge · Tours · ${t.vendor_name || t.legacy_vendor_name || '—'}`}
                time={t.start_time?.slice(0, 5) || '—'}
              />
            ))}
            {data.transfers.length === 0 && data.tours.length === 0 && (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12, color: 'var(--muted-dim)', fontStyle: 'italic' }}>Nothing scheduled today</div>
            )}
          </div>
        </div>
      </div>

      <TransferModal
        isOpen={transferModalOpen}
        onClose={() => { setTransferModalOpen(false); setEditingTransfer(null); }}
        transfer={editingTransfer}
        onSuccess={() => { setTransferModalOpen(false); setEditingTransfer(null); fetchDashboardData(); }}
      />
    </div>
  );
}
