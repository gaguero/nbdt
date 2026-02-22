'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGuestDrawer } from '@/contexts/GuestDrawerContext';
import { TransferModal } from '../transfers/TransferModal';
import { TourBookingModal } from '../tour-bookings/TourBookingModal';
import { SpecialRequestModal } from '../special-requests/SpecialRequestModal';
import { RomanticDinnerModal } from '../romantic-dinners/RomanticDinnerModal';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

/* ─── Design tokens ─── */
const T = {
  surface:   'var(--surface)',
  elevated:  'var(--elevated)',
  gold:      'var(--gold)',
  goldFaint: 'rgba(170,142,103,0.15)',
  sage:      'var(--sage)',
  sageFaint: 'rgba(78,94,62,0.14)',
  terra:     'var(--terra)',
  charcoal:  'var(--charcoal)',
  muted:     'var(--muted)',
  mutedDim:  'var(--muted-dim)',
  separator: 'var(--separator)',
  cardShadow:'var(--card-shadow)',
  sidebarBg: 'var(--sidebar-bg)',
};

/* ─── Helpers ─── */
function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function getDateForOffset(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}
function fmtFull(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
/** Format ISO date to compact display "Feb 22" */
function fmtDate(raw: string | null | undefined): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ─── Status badge ─── */
const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  completed:   { bg: 'rgba(34,197,94,0.12)',   color: '#16a34a',          dot: '#16a34a' },
  confirmed:   { bg: 'rgba(59,130,246,0.12)',   color: '#2563eb',          dot: '#2563eb' },
  'en-route':  { bg: 'rgba(234,179,8,0.12)',    color: '#ca8a04',          dot: '#ca8a04' },
  'CHECKED IN':{ bg: 'rgba(59,130,246,0.12)',   color: '#2563eb',          dot: '#2563eb' },
  pending:     { bg: 'rgba(107,114,128,0.12)',  color: '#6b7280',          dot: '#9ca3af' },
  cancelled:   { bg: 'rgba(107,114,128,0.12)',  color: '#6b7280',          dot: '#9ca3af' },
  no_show:     { bg: 'rgba(107,114,128,0.12)',  color: '#6b7280',          dot: '#9ca3af' },
  open:        { bg: 'rgba(234,179,8,0.12)',    color: '#ca8a04',          dot: '#ca8a04' },
  resolved:    { bg: 'rgba(34,197,94,0.12)',    color: '#16a34a',          dot: '#16a34a' },
  high:        { bg: 'rgba(236,108,75,0.12)',   color: 'var(--terra)',     dot: 'var(--terra)' },
  medium:      { bg: 'rgba(234,179,8,0.12)',    color: '#ca8a04',          dot: '#ca8a04' },
  low:         { bg: 'rgba(78,94,62,0.12)',     color: 'var(--sage)',      dot: 'var(--sage)' },
  normal:      { bg: 'rgba(78,94,62,0.12)',     color: 'var(--sage)',      dot: 'var(--sage)' },
};
function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, background: s.bg, color: s.color, fontSize:10, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap', flexShrink:0 }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background: s.dot, flexShrink:0 }} />
      {status.replace(/_/g,' ')}
    </span>
  );
}

/* ─── Animated counter ─── */
function AnimCounter({ target, duration = 900 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(e * target));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);
  return <>{val}</>;
}

/* ─── Occupancy bar ─── */
function OccBar({ label, fill, count }: { label: string; fill: string; count: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => { if (ref.current) ref.current.style.width = fill; }, 300);
    return () => clearTimeout(t);
  }, [fill]);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
      <span style={{ fontSize:10, color: T.mutedDim, width:58, flexShrink:0 }}>{label}</span>
      <div style={{ flex:1, height:4, background:'rgba(124,142,103,0.15)', borderRadius:10, overflow:'hidden' }}>
        <div ref={ref} style={{ height:'100%', background:`linear-gradient(90deg, var(--sage), rgba(78,94,62,0.5))`, borderRadius:10, width:0, transition:'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
      <span style={{ fontSize:9, fontWeight:600, color: T.mutedDim, width:24, textAlign:'right', flexShrink:0 }}>{count}</span>
    </div>
  );
}

/* ─── Brief row ─── */
function BriefRow({ name, sub, time, status }: { name: string; sub?: string; time?: string; status?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'5px 0', borderBottom:`1px solid rgba(124,142,103,0.06)` }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:600, color: T.charcoal, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
        {sub && <div style={{ fontSize:10, color: T.mutedDim }}>{sub}</div>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
        {time && <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, fontWeight:700, color: T.sage, background: T.sageFaint, padding:'2px 6px', borderRadius:5 }}>{time}</span>}
        {status && <StatusBadge status={status} />}
      </div>
    </div>
  );
}

/* ─── Brief card wrapper ─── */
function BriefCard({ title, badge, onClick, children }: { title: string; badge?: string; onClick?: () => void; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: T.surface, border:`1px solid ${hovered && onClick ? 'rgba(124,142,103,0.32)' : 'rgba(124,142,103,0.14)'}`, borderRadius:14, padding:0, boxShadow: T.cardShadow, display:'flex', flexDirection:'column', gap:0, cursor: onClick ? 'pointer' : 'default', transition:'border-color 0.2s' }}
    >
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2, padding:'12px 14px 0' }}>
        <span style={{ fontFamily:'var(--font-gelasio), Georgia, serif', fontStyle:'italic', fontSize:13, color: T.sage, fontWeight:600 }}>{title}</span>
        {badge && <span style={{ background: T.sageFaint, color: T.sage, fontSize:9, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', padding:'2px 7px', borderRadius:20 }}>{badge}</span>}
      </div>
      <div style={{ flex:1, overflowY:'auto', maxHeight:220, padding:'0 14px 12px', display:'flex', flexDirection:'column', gap:8 }}>
        {children}
      </div>
    </div>
  );
}

/* ─── HoverRow ─── */
function HoverRow({ children, tooltip, onClick }: { children: React.ReactNode; tooltip: React.ReactNode; onClick?: () => void }) {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  return (
    <div
      style={{ position: 'relative', cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      onMouseEnter={() => { timer.current = setTimeout(() => setShow(true), 400); }}
      onMouseLeave={() => { clearTimeout(timer.current); setShow(false); }}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: T.surface, border: '1px solid rgba(124,142,103,0.22)',
          borderRadius: 10, padding: '10px 14px', marginTop: 2,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          fontSize: 11, color: T.muted, lineHeight: 1.6,
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

/* ─── ClickableGuest ─── */
function ClickableGuest({ name, guestId, openGuest }: { name: string; guestId?: string; openGuest: (id: string) => void }) {
  if (!guestId) return <span style={{ fontSize: 13, fontWeight: 600, color: T.charcoal }}>{name || '—'}</span>;
  return (
    <span
      onClick={(e) => { e.stopPropagation(); openGuest(guestId); }}
      style={{ fontSize: 13, fontWeight: 600, color: T.sage, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(78,94,62,0.3)', textUnderlineOffset: '2px' }}
    >
      {name || '—'}
    </span>
  );
}

/* ─── ClickableVendor ─── */
function ClickableVendor({ name, vendorId, locale }: { name: string; vendorId?: string; locale: string }) {
  if (!vendorId || !name) return <span style={{ fontSize: 11, color: T.muted }}>{name || '—'}</span>;
  return (
    <Link
      href={`/${locale}/staff/vendors?id=${vendorId}`}
      onClick={(e) => e.stopPropagation()}
      style={{ fontSize: 11, color: T.gold, textDecoration: 'none' }}
      onMouseEnter={(e) => { (e.target as HTMLElement).style.textDecoration = 'underline'; }}
      onMouseLeave={(e) => { (e.target as HTMLElement).style.textDecoration = 'none'; }}
    >
      {name}
    </Link>
  );
}

/* ─── Data types ─── */
interface LiveData {
  arrivals:   any[];
  departures: any[];
  inhouse:    any[];
  transfers:  any[];
  tours:      any[];
  requests:   any[];
  conversations: any[];
  dinners:    any[];
}

const EMPTY: LiveData = { arrivals:[], departures:[], inhouse:[], transfers:[], tours:[], requests:[], conversations:[], dinners:[] };

/* ─── Detail panel content ─── */
function DetailContent({
  panelKey, data, onRowClick, openGuest, locale,
}: {
  panelKey: string; data: LiveData;
  onRowClick: (type: string, record: any) => void;
  openGuest: (id: string) => void;
  locale: string;
}) {
  const scrollStyle: React.CSSProperties = { maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' };

  if (panelKey === 'arrivals') {
    const rows = data.arrivals;
    if (!rows.length) return <EmptyState />;
    return (
      <div style={scrollStyle}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              {['Guest', 'Room', 'Arrival', 'Nights', 'Transfer', 'Notes'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <HoverRow
                  key={r.id}
                  tooltip={
                    <div style={{ display:'grid', gridTemplateColumns:'80px 1fr', gap:'2px 8px' }}>
                      {r.nights && <><span style={{ fontWeight:700 }}>Nights:</span><span>{r.nights}</span></>}
                      {r.persons && <><span style={{ fontWeight:700 }}>Persons:</span><span>{r.persons}</span></>}
                      {r.room_category && <><span style={{ fontWeight:700 }}>Category:</span><span>{r.room_category}</span></>}
                      <span style={{ fontWeight:700 }}>Transfer:</span><span>{r.transfer_booked ? 'Booked' : 'None'}</span>
                      <span style={{ fontWeight:700 }}>Tour:</span><span>{r.tour_booked ? 'Booked' : 'None'}</span>
                      {r.opera_guest_name && <><span style={{ fontWeight:700 }}>Opera:</span><span>{r.opera_guest_name}</span></>}
                    </div>
                  }
                >
                  <tr style={{ borderBottom:`1px solid rgba(124,142,103,0.06)` }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,142,103,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={tdStyle}><ClickableGuest name={r.guest_name || r.opera_guest_name || '—'} guestId={r.guest_id} openGuest={openGuest} /></td>
                    <td style={tdStyle}><span style={{ fontSize:11, color: T.mutedDim, fontStyle:'italic' }}>{r.room || '—'}</span></td>
                    <td style={tdStyle}><span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color: T.charcoal, background: T.elevated, padding:'2px 7px', borderRadius:6 }}>{fmtDate(r.arrival)}</span></td>
                    <td style={tdStyle}><span style={{ fontSize:11, color: T.muted }}>{r.nights ?? '—'}</span></td>
                    <td style={tdStyle}><StatusBadge status={r.transfer_booked ? 'confirmed' : 'pending'} /></td>
                    <td style={tdStyle}><span style={{ fontSize:11, color: T.muted }}>{r.notes || '—'}</span></td>
                  </tr>
                </HoverRow>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (panelKey === 'departures') {
    const rows = data.departures;
    if (!rows.length) return <EmptyState />;
    return (
      <div style={scrollStyle}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              {['Guest', 'Room', 'Departure', 'Nights', 'Transfer', 'Status'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <HoverRow
                  key={r.id}
                  tooltip={
                    <div style={{ display:'grid', gridTemplateColumns:'80px 1fr', gap:'2px 8px' }}>
                      {r.nights && <><span style={{ fontWeight:700 }}>Nights:</span><span>{r.nights}</span></>}
                      {r.persons && <><span style={{ fontWeight:700 }}>Persons:</span><span>{r.persons}</span></>}
                      {r.room_category && <><span style={{ fontWeight:700 }}>Category:</span><span>{r.room_category}</span></>}
                      <span style={{ fontWeight:700 }}>Transfer:</span><span>{r.transfer_booked ? 'Booked' : 'None'}</span>
                      <span style={{ fontWeight:700 }}>Tour:</span><span>{r.tour_booked ? 'Booked' : 'None'}</span>
                      {r.status && <><span style={{ fontWeight:700 }}>Status:</span><span>{r.status}</span></>}
                    </div>
                  }
                >
                  <tr style={{ borderBottom:`1px solid rgba(124,142,103,0.06)` }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,142,103,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={tdStyle}><ClickableGuest name={r.guest_name || r.opera_guest_name || '—'} guestId={r.guest_id} openGuest={openGuest} /></td>
                    <td style={tdStyle}><span style={{ fontSize:11, color: T.mutedDim, fontStyle:'italic' }}>{r.room || '—'}</span></td>
                    <td style={tdStyle}><span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color: T.charcoal, background: T.elevated, padding:'2px 7px', borderRadius:6 }}>{fmtDate(r.departure)}</span></td>
                    <td style={tdStyle}><span style={{ fontSize:11, color: T.muted }}>{r.nights ?? '—'}</span></td>
                    <td style={tdStyle}><StatusBadge status={r.transfer_booked ? 'confirmed' : 'pending'} /></td>
                    <td style={tdStyle}><StatusBadge status={r.status?.toLowerCase() || 'pending'} /></td>
                  </tr>
                </HoverRow>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (panelKey === 'transfers') {
    const rows = data.transfers;
    if (!rows.length) return <EmptyState />;
    return (
      <div style={scrollStyle}>
        {rows.map((r: any) => (
          <HoverRow
            key={r.id}
            onClick={() => onRowClick('transfer', r)}
            tooltip={
              <div style={{ display:'grid', gridTemplateColumns:'80px 1fr', gap:'2px 8px' }}>
                {r.flight_number && <><span style={{ fontWeight:700 }}>Flight:</span><span>{r.flight_number}</span></>}
                {r.transfer_type && <><span style={{ fontWeight:700 }}>Type:</span><span>{r.transfer_type}</span></>}
                {r.vendor_status && <><span style={{ fontWeight:700 }}>Vendor:</span><span>{r.vendor_status}</span></>}
                {r.price && <><span style={{ fontWeight:700 }}>Price:</span><span>${r.price}</span></>}
                {r.notes && <><span style={{ fontWeight:700 }}>Notes:</span><span>{r.notes}</span></>}
                {r.num_passengers && <><span style={{ fontWeight:700 }}>Pax:</span><span>{r.num_passengers}</span></>}
              </div>
            }
          >
            <div
              style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom:`1px solid rgba(124,142,103,0.06)` }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,142,103,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ flex:1, minWidth:0 }}>
                <ClickableGuest name={r.guest_name || '—'} guestId={r.guest_id} openGuest={openGuest} />
                {r.flight_number && <span style={{ fontSize:10, color: T.mutedDim, marginLeft:6 }}>{r.flight_number}</span>}
              </div>
              <div style={{ fontSize:12, color: T.muted, minWidth:100 }}>
                <div>{r.origin || '—'}</div>
                <div style={{ color: T.mutedDim }}>→ {r.destination || '—'}</div>
              </div>
              <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color: T.charcoal, background: T.elevated, padding:'2px 7px', borderRadius:6, flexShrink:0 }}>{r.time?.slice(0,5) || '—'}</span>
              <ClickableVendor name={r.vendor_name || '—'} vendorId={r.vendor_id} locale={locale} />
              <StatusBadge status={r.guest_status || 'pending'} />
            </div>
          </HoverRow>
        ))}
      </div>
    );
  }

  if (panelKey === 'tours') {
    const rows = data.tours;
    if (!rows.length) return <EmptyState />;
    return (
      <div style={scrollStyle}>
        {rows.map((r: any) => (
          <HoverRow
            key={r.id}
            onClick={() => onRowClick('tour', r)}
            tooltip={
              <div style={{ display:'grid', gridTemplateColumns:'100px 1fr', gap:'2px 8px' }}>
                {r.booking_mode && <><span style={{ fontWeight:700 }}>Mode:</span><span>{r.booking_mode}</span></>}
                {r.num_guests && <><span style={{ fontWeight:700 }}>Guests:</span><span>{r.num_guests}</span></>}
                {r.total_price && <><span style={{ fontWeight:700 }}>Price:</span><span>${r.total_price}</span></>}
                {r.special_requests && <><span style={{ fontWeight:700 }}>Requests:</span><span>{r.special_requests}</span></>}
                {(r.vendor_name || r.legacy_vendor_name) && <><span style={{ fontWeight:700 }}>Vendor:</span><span>{r.vendor_name || r.legacy_vendor_name}</span></>}
                {r.legacy_activity_name && <><span style={{ fontWeight:700 }}>Legacy:</span><span>{r.legacy_activity_name}</span></>}
              </div>
            }
          >
            <div
              style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom:`1px solid rgba(124,142,103,0.06)` }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,142,103,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color: T.charcoal }}>{r.name_en || '—'}</div>
                <ClickableGuest name={r.guest_name || '—'} guestId={r.guest_id} openGuest={openGuest} />
              </div>
              <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color: T.charcoal, background: T.elevated, padding:'2px 7px', borderRadius:6, flexShrink:0 }}>{r.start_time?.slice(0,5) || '—'}</span>
              <ClickableVendor name={r.vendor_name || r.legacy_vendor_name || '—'} vendorId={r.vendor_id} locale={locale} />
              <span style={{ fontSize:11, color: T.muted }}>{r.num_passengers ?? '—'} pax</span>
              <StatusBadge status={r.guest_status || 'pending'} />
            </div>
          </HoverRow>
        ))}
      </div>
    );
  }

  if (panelKey === 'requests') {
    const rows = data.requests;
    if (!rows.length) return <EmptyState />;
    return (
      <div style={scrollStyle}>
        {rows.map((r: any) => (
          <HoverRow
            key={r.id}
            onClick={() => onRowClick('request', r)}
            tooltip={
              <div style={{ display:'grid', gridTemplateColumns:'100px 1fr', gap:'2px 8px' }}>
                {r.internal_notes && <><span style={{ fontWeight:700 }}>Notes:</span><span>{r.internal_notes}</span></>}
                {r.assigned_to_name && <><span style={{ fontWeight:700 }}>Assigned:</span><span>{r.assigned_to_name}</span></>}
                {r.resolved_at && <><span style={{ fontWeight:700 }}>Resolved:</span><span>{r.resolved_at}</span></>}
                {r.check_in && <><span style={{ fontWeight:700 }}>Check-in:</span><span>{r.check_in}</span></>}
                {r.check_out && <><span style={{ fontWeight:700 }}>Check-out:</span><span>{r.check_out}</span></>}
              </div>
            }
          >
            <div
              style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, padding:'10px 20px', borderBottom:`1px solid ${T.separator}` }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,142,103,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color: T.charcoal, marginBottom:2 }}>{r.request || '—'}</div>
                <div style={{ fontSize:11, color: T.mutedDim }}>
                  <ClickableGuest name={r.guest_name || '—'} guestId={r.guest_id} openGuest={openGuest} />
                  {' · '}{r.department || '—'}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                <StatusBadge status={r.priority || 'normal'} />
                <StatusBadge status={r.status || 'pending'} />
              </div>
            </div>
          </HoverRow>
        ))}
      </div>
    );
  }

  if (panelKey === 'messages') {
    const rows = data.conversations;
    if (!rows.length) return <EmptyState />;
    return (
      <div style={scrollStyle}>
        {rows.map((r: any) => {
          const name = r.guest_name || '—';
          const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
          const ch = (r.channel_label_en || '').toLowerCase();
          const chColor: Record<string,string> = { whatsapp:'#25D366', sms: T.gold, email:'#4A90D9', app: T.sage };
          const unread = parseInt(r.unread_count || '0');
          return (
            <HoverRow
              key={r.id}
              tooltip={
                <div style={{ display:'grid', gridTemplateColumns:'80px 1fr', gap:'2px 8px' }}>
                  {r.status && <><span style={{ fontWeight:700 }}>Status:</span><span>{r.status}</span></>}
                  {r.last_message_at && <><span style={{ fontWeight:700 }}>Last msg:</span><span>{r.last_message_at}</span></>}
                  {r.assigned_staff_name && <><span style={{ fontWeight:700 }}>Assigned:</span><span>{r.assigned_staff_name}</span></>}
                </div>
              }
            >
              <div
                style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px', borderBottom:`1px solid ${T.separator}` }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,142,103,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width:32, height:32, borderRadius:'50%', background: T.sageFaint, color: T.sage, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{initials}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <ClickableGuest name={name} guestId={r.guest_id} openGuest={openGuest} />
                  <div style={{ fontSize:11, color: T.mutedDim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.last_message_preview || r.status}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                  {r.channel_label_en && <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color: chColor[ch] ?? T.mutedDim, border:`1px solid ${chColor[ch] ?? T.mutedDim}`, borderRadius:3, padding:'1px 5px' }}>{r.channel_label_en}</span>}
                  {unread > 0 && <span style={{ background:'var(--terra)', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10 }}>{unread}</span>}
                </div>
              </div>
            </HoverRow>
          );
        })}
      </div>
    );
  }

  if (panelKey === 'dinners') {
    const rows = data.dinners;
    if (!rows.length) return <EmptyState />;
    return (
      <div style={scrollStyle}>
        {rows.map((r: any) => (
          <HoverRow
            key={r.id}
            onClick={() => onRowClick('dinner', r)}
            tooltip={
              <div style={{ display:'grid', gridTemplateColumns:'80px 1fr', gap:'2px 8px' }}>
                {r.notes && <><span style={{ fontWeight:700 }}>Notes:</span><span>{r.notes}</span></>}
                {r.num_guests && <><span style={{ fontWeight:700 }}>Guests:</span><span>{r.num_guests}</span></>}
                {r.vendor_name && <><span style={{ fontWeight:700 }}>Vendor:</span><span>{r.vendor_name}</span></>}
                {r.billed_date && <><span style={{ fontWeight:700 }}>Billed:</span><span>{r.billed_date}</span></>}
                {r.paid_date && <><span style={{ fontWeight:700 }}>Paid:</span><span>{r.paid_date}</span></>}
              </div>
            }
          >
            <div
              style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom:`1px solid rgba(124,142,103,0.06)` }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,142,103,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ flex:1, minWidth:0 }}>
                <ClickableGuest name={r.guest_name || '—'} guestId={r.guest_id} openGuest={openGuest} />
                <div style={{ fontSize:11, color: T.mutedDim }}>{r.location || '—'}</div>
              </div>
              <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color: T.charcoal, background: T.elevated, padding:'2px 7px', borderRadius:6, flexShrink:0 }}>{r.time?.slice(0,5) || '—'}</span>
              <span style={{ fontSize:11, color: T.muted }}>{r.num_guests ?? '—'} guests</span>
              <ClickableVendor name={r.vendor_name || '—'} vendorId={r.vendor_id} locale={locale} />
              <StatusBadge status={r.status || 'pending'} />
            </div>
          </HoverRow>
        ))}
      </div>
    );
  }

  return null;
}

function EmptyState() {
  return <div style={{ padding:'32px 16px', textAlign:'center', color: T.mutedDim, fontSize:13, fontStyle:'italic' }}>No records for this date</div>;
}

const thStyle: React.CSSProperties = { textAlign:'left', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color: T.mutedDim, padding:'8px 16px', borderBottom:`1px solid var(--separator)`, whiteSpace:'nowrap' };
const tdStyle: React.CSSProperties = { padding:'10px 16px', verticalAlign:'middle' };

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function ConciergePage() {
  const [offset, setOffset] = useState<number>(0);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [data, setData] = useState<LiveData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const locale = useLocale();
  const router = useRouter();
  const { openGuest } = useGuestDrawer();
  const [modalState, setModalState] = useState<{ type: 'transfer' | 'tour' | 'request' | 'dinner'; record: any } | null>(null);

  const fetchAll = useCallback(async (off: number) => {
    setLoading(true);
    const date = toISO(getDateForOffset(off));

    try {
      const [
        arrivalsRes,
        departuresRes,
        inhouseRes,
        transfersRes,
        toursRes,
        requestsRes,
        convsRes,
        dinnersRes,
      ] = await Promise.all([
        fetch(`/api/reservations?filter=arrivals&date=${date}`).then(r => r.json()),
        fetch(`/api/reservations?filter=departures&date=${date}`).then(r => r.json()),
        fetch(`/api/reservations?filter=checked_in&date=${date}`).then(r => r.json()),
        fetch(`/api/transfers?date_from=${date}&date_to=${date}`).then(r => r.json()),
        fetch(`/api/tour-bookings?date_from=${date}&date_to=${date}`).then(r => r.json()),
        fetch(`/api/special-requests?date_from=${date}&date_to=${date}`).then(r => r.json()),
        fetch(`/api/conversations`).then(r => r.json()),
        fetch(`/api/romantic-dinners?date_from=${date}&date_to=${date}`).then(r => r.json()),
      ]);

      setData({
        arrivals:      arrivalsRes.reservations   ?? [],
        departures:    departuresRes.reservations  ?? [],
        inhouse:       inhouseRes.reservations     ?? [],
        transfers:     transfersRes.transfers      ?? [],
        tours:         toursRes.tour_bookings      ?? [],
        requests:      requestsRes.special_requests ?? [],
        conversations: convsRes.conversations      ?? [],
        dinners:       dinnersRes.romantic_dinners  ?? [],
      });
    } catch {
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(offset);
  }, [offset, fetchAll]);

  const dateObj   = getDateForOffset(offset);
  const dateLabel = fmtFull(dateObj);
  const offsetLabel = offset === -1 ? 'Yesterday' : offset === 0 ? 'Today' : 'Tomorrow';

  const kpi = {
    arrivals:      data.arrivals.length,
    departures:    data.departures.length,
    inhouse:       data.inhouse.length,
    transfers:     data.transfers.length,
    tours:         data.tours.length,
    requests:      data.requests.length,
    messages:      data.conversations.reduce((s: number, c: any) => s + parseInt(c.unread_count || '0'), 0),
    dinners:       data.dinners.length,
  };

  const KPI_DEFS = [
    { key: 'arrivals',   label: 'Arrivals',   val: kpi.arrivals,   hasPanel: true  },
    { key: 'inhouse',    label: 'In-House',   val: kpi.inhouse,    hasPanel: false },
    { key: 'departures', label: 'Departures', val: kpi.departures, hasPanel: true  },
    { key: 'transfers',  label: 'Transfers',  val: kpi.transfers,  hasPanel: true  },
    { key: 'tours',      label: 'Tours',      val: kpi.tours,      hasPanel: true  },
    { key: 'requests',   label: 'Requests',   val: kpi.requests,   hasPanel: true  },
    { key: 'messages',   label: 'Messages',   val: kpi.messages,   hasPanel: true  },
    { key: 'dinners',    label: 'Dinners',    val: kpi.dinners,    hasPanel: true  },
  ];

  function openPanel(key: string) {
    setActivePanel(prev => prev === key ? null : key);
  }

  const activeKpi = KPI_DEFS.find(k => k.key === activePanel);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--bg)', overflow:'hidden' }}>

      {/* ── HEADER ── */}
      <div style={{ height:42, minHeight:42, background:'var(--bg)', borderBottom:`1px solid rgba(124,142,103,0.12)`, display:'flex', alignItems:'center', gap:14, padding:'0 20px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          {([-1, 0, 1] as const).map(o => (
            <button key={o} onClick={() => { setOffset(o); setActivePanel(null); }}
              style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:7, border:'none', cursor:'pointer', background: offset === o ? 'var(--sage)' : 'rgba(78,94,62,0.08)', color: offset === o ? '#fff' : T.mutedDim, transition:'background 0.15s, color 0.15s' }}>
              {o === -1 ? 'Yesterday' : o === 0 ? 'Today' : 'Tomorrow'}
            </button>
          ))}
        </div>
        <span style={{ fontFamily:'var(--font-gelasio), Georgia, serif', fontStyle:'italic', fontSize:13, color: T.mutedDim }}>
          {dateLabel}
        </span>
        {loading && <span style={{ fontSize:10, color: T.mutedDim, marginLeft:'auto', letterSpacing:'0.06em' }}>Loading…</span>}
      </div>

      {/* ── KPI STRIP ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:0, background: T.sidebarBg, borderBottom:`1px solid rgba(255,255,255,0.07)`, flexShrink:0 }}>
        {KPI_DEFS.map((k, i) => {
          const isActive = activePanel === k.key;
          return (
            <button key={k.key} onClick={() => k.hasPanel ? openPanel(k.key) : undefined}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, padding:'10px 6px', border:'none', borderRight: i < 7 ? '1px solid rgba(255,255,255,0.06)' : 'none', background: isActive ? 'rgba(78,94,62,0.25)' : 'transparent', cursor: k.hasPanel ? 'pointer' : 'default', position:'relative', transition:'background 0.15s' }}
              onMouseEnter={e => { if (k.hasPanel && !isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              {isActive && <span style={{ position:'absolute', bottom:0, left:'20%', right:'20%', height:2, background:'var(--sage)', borderRadius:2 }} />}
              <span style={{ fontFamily:'var(--font-gelasio), Georgia, serif', fontSize:24, fontWeight:700, lineHeight:1, color: isActive ? 'var(--sage)' : T.gold }}>
                <AnimCounter key={`${k.key}-${offset}-${k.val}`} target={k.val} />
              </span>
              <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color: isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)' }}>{k.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 16px 20px' }}>

        {/* ── DETAIL PANEL ── */}
        {activePanel && activeKpi && (
          <div style={{ background: T.surface, border:`1px solid rgba(124,142,103,0.18)`, borderRadius:14, boxShadow: T.cardShadow, overflow:'hidden', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 20px', borderBottom:`1px solid ${T.separator}` }}>
              <span style={{ fontFamily:'var(--font-gelasio), Georgia, serif', fontStyle:'italic', fontSize:16, color: T.sage, flex:1 }}>{activeKpi.label}</span>
              <span style={{ background: T.sageFaint, color: T.sage, fontSize:10, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', padding:'2px 9px', borderRadius:20 }}>{activeKpi.val} {offsetLabel}</span>
              <button onClick={() => setActivePanel(null)}
                style={{ width:28, height:28, borderRadius:8, border:`1px solid rgba(124,142,103,0.2)`, background:'transparent', cursor:'pointer', color: T.mutedDim, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, lineHeight:1 }}>
                ×
              </button>
            </div>
            <DetailContent
              panelKey={activePanel}
              data={data}
              onRowClick={(type, record) => setModalState({ type: type as 'transfer' | 'tour' | 'request' | 'dinner', record })}
              openGuest={openGuest}
              locale={locale}
            />
          </div>
        )}

        {/* ── DAY BRIEF GRID ── */}
        {!activePanel && (
          <>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.16em', textTransform:'uppercase', color: T.mutedDim, marginBottom:10 }}>{offsetLabel} — {dateLabel}</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>

              {/* Arrivals */}
              <BriefCard title="Arrivals" badge={String(kpi.arrivals)} onClick={() => openPanel('arrivals')}>
                {data.arrivals.map((r: any) => (
                  <div key={r.id} onClick={(e) => { e.stopPropagation(); if (r.guest_id) openGuest(r.guest_id); }} style={{ cursor: r.guest_id ? 'pointer' : 'default' }}>
                    <BriefRow name={r.guest_name || r.opera_guest_name || '—'} sub={r.room} time={fmtDate(r.arrival)} status={r.status?.toLowerCase()} />
                  </div>
                ))}
                {!data.arrivals.length && <div style={{ fontSize:11, color: T.mutedDim, fontStyle:'italic', padding:'4px 0' }}>None today</div>}
              </BriefCard>

              {/* In-House */}
              <BriefCard title="In-House Guests" badge="Tonight">
                <div style={{ textAlign:'center', marginBottom:8 }}>
                  <span style={{ fontFamily:'var(--font-gelasio), Georgia, serif', fontSize:36, fontWeight:700, color: T.gold, lineHeight:1 }}>
                    <AnimCounter key={`inhouse-${offset}-${kpi.inhouse}`} target={kpi.inhouse} />
                  </span>
                  <div style={{ fontSize:10, color: T.mutedDim, marginTop:2 }}>
                    <span style={{ color: T.sage, fontWeight:600 }}>+{kpi.arrivals} arriving</span> · <span style={{ color:'var(--terra)', fontWeight:600 }}>-{kpi.departures} departing</span>
                  </div>
                </div>
              </BriefCard>

              {/* Departures */}
              <BriefCard title="Departures" badge={String(kpi.departures)} onClick={() => openPanel('departures')}>
                {data.departures.map((r: any) => (
                  <div key={r.id} onClick={(e) => { e.stopPropagation(); if (r.guest_id) openGuest(r.guest_id); }} style={{ cursor: r.guest_id ? 'pointer' : 'default' }}>
                    <BriefRow name={r.guest_name || r.opera_guest_name || '—'} sub={r.room} time={fmtDate(r.departure)} status={r.status?.toLowerCase()} />
                  </div>
                ))}
                {!data.departures.length && <div style={{ fontSize:11, color: T.mutedDim, fontStyle:'italic', padding:'4px 0' }}>None today</div>}
              </BriefCard>

              {/* Transfers */}
              <BriefCard title="Transfers" badge={String(kpi.transfers)} onClick={() => openPanel('transfers')}>
                {data.transfers.map((r: any) => (
                  <div key={r.id} onClick={(e) => { e.stopPropagation(); setModalState({ type: 'transfer', record: r }); }} style={{ cursor: 'pointer' }}>
                    <BriefRow name={r.guest_name || '—'} sub={`${r.origin || ''} → ${r.destination || ''}`} time={r.time?.slice(0,5)} status={r.guest_status} />
                  </div>
                ))}
                {!data.transfers.length && <div style={{ fontSize:11, color: T.mutedDim, fontStyle:'italic', padding:'4px 0' }}>None today</div>}
              </BriefCard>

              {/* Tours */}
              <BriefCard title="Tours" badge={String(kpi.tours)} onClick={() => openPanel('tours')}>
                {data.tours.map((r: any) => (
                  <div key={r.id} onClick={(e) => { e.stopPropagation(); setModalState({ type: 'tour', record: r }); }} style={{ cursor: 'pointer' }}>
                    <BriefRow name={r.name_en || '—'} sub={r.guest_name} time={r.start_time?.slice(0,5)} status={r.guest_status} />
                  </div>
                ))}
                {!data.tours.length && <div style={{ fontSize:11, color: T.mutedDim, fontStyle:'italic', padding:'4px 0' }}>None today</div>}
              </BriefCard>

              {/* Special Requests */}
              <BriefCard title="Special Requests" badge={String(kpi.requests)} onClick={() => openPanel('requests')}>
                {data.requests.map((r: any) => (
                  <div key={r.id} onClick={(e) => { e.stopPropagation(); setModalState({ type: 'request', record: r }); }} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6, padding:'4px 0', borderBottom:`1px solid rgba(124,142,103,0.06)`, cursor:'pointer' }}>
                    <span style={{ fontSize:12, fontWeight:500, color: T.charcoal, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.request || '—'}</span>
                    <StatusBadge status={r.priority || 'normal'} />
                  </div>
                ))}
                {!data.requests.length && <div style={{ fontSize:11, color: T.mutedDim, fontStyle:'italic', padding:'4px 0' }}>None today</div>}
              </BriefCard>

              {/* Conversations */}
              <BriefCard title="Messages" badge={`${kpi.messages} unread`} onClick={() => openPanel('messages')}>
                {data.conversations.map((r: any) => {
                  const name = r.guest_name || '—';
                  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                  const unread = parseInt(r.unread_count || '0');
                  return (
                    <div key={r.id} onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/staff/messages`); }} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', borderBottom:`1px solid rgba(124,142,103,0.06)`, cursor:'pointer' }}>
                      <div style={{ width:24, height:24, borderRadius:'50%', background: T.sageFaint, color: T.sage, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, flexShrink:0 }}>{initials}</div>
                      <span style={{ fontSize:12, fontWeight:600, color: T.charcoal, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
                      {unread > 0 && <span style={{ background:'var(--terra)', color:'#fff', fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:10, flexShrink:0 }}>{unread}</span>}
                    </div>
                  );
                })}
                {!data.conversations.length && <div style={{ fontSize:11, color: T.mutedDim, fontStyle:'italic', padding:'4px 0' }}>No conversations</div>}
              </BriefCard>

              {/* Dinners */}
              <BriefCard title="Romantic Dinners" badge={String(kpi.dinners)} onClick={() => openPanel('dinners')}>
                {data.dinners.map((r: any) => (
                  <div key={r.id} onClick={(e) => { e.stopPropagation(); setModalState({ type: 'dinner', record: r }); }} style={{ cursor: 'pointer' }}>
                    <BriefRow name={r.guest_name || '—'} sub={r.location} time={r.time?.slice(0,5)} status={r.status} />
                  </div>
                ))}
                {!data.dinners.length && <div style={{ fontSize:11, color: T.mutedDim, fontStyle:'italic', padding:'4px 0' }}>None today</div>}
              </BriefCard>

            </div>
          </>
        )}
      </div>

      {/* ── MODALS ── */}
      <TransferModal
        isOpen={modalState?.type === 'transfer'}
        onClose={() => setModalState(null)}
        transfer={modalState?.type === 'transfer' ? modalState.record : undefined}
        onSuccess={() => { setModalState(null); fetchAll(offset); }}
      />
      <TourBookingModal
        isOpen={modalState?.type === 'tour'}
        onClose={() => setModalState(null)}
        booking={modalState?.type === 'tour' ? modalState.record : undefined}
        onSuccess={() => { setModalState(null); fetchAll(offset); }}
      />
      <SpecialRequestModal
        isOpen={modalState?.type === 'request'}
        onClose={() => setModalState(null)}
        request={modalState?.type === 'request' ? modalState.record : undefined}
        onSuccess={() => { setModalState(null); fetchAll(offset); }}
      />
      <RomanticDinnerModal
        isOpen={modalState?.type === 'dinner'}
        onClose={() => setModalState(null)}
        dinner={modalState?.type === 'dinner' ? modalState.record : undefined}
        onSuccess={() => { setModalState(null); fetchAll(offset); }}
      />
    </div>
  );
}
