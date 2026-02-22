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
  ArrowsPointingOutIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { useGuestDrawer } from '@/contexts/GuestDrawerContext';
import { usePropertyConfig } from '@/contexts/PropertyConfigContext';
import { localDateString } from '@/lib/dates';
import { TransferModal } from '../transfers/TransferModal';

/* ─── Helpers ─── */

function fmtDate(raw: string | Date | null | undefined): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtStatus(s: string | null | undefined): string {
  if (!s) return '—';
  const lower = s.toLowerCase().trim();
  if (lower === 'checked in') return 'Checked In';
  if (lower === 'checked out') return 'Checked Out';
  if (lower === 'reserved') return 'Reserved';
  if (lower === 'cancelled') return 'Cancelled';
  return s;
}

function statusColor(s: string | null | undefined): { bg: string; text: string } {
  const lower = (s || '').toLowerCase().trim();
  if (lower === 'checked in') return { bg: 'rgba(78,94,62,0.15)', text: 'var(--sage)' };
  if (lower === 'reserved') return { bg: 'rgba(170,142,103,0.15)', text: 'var(--gold)' };
  if (lower === 'confirmed') return { bg: 'rgba(78,94,62,0.15)', text: 'var(--sage)' };
  return { bg: 'rgba(124,142,103,0.10)', text: 'var(--muted-dim)' };
}

function OccBar({ label, fill, count }: { label: string; fill: string; count: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => { if (ref.current) ref.current.style.width = fill; }, 250);
    return () => clearTimeout(t);
  }, [fill]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ fontSize: 10, color: 'var(--muted-dim)', width: 60, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: 'rgba(124,142,103,0.15)', borderRadius: 10, overflow: 'hidden' }}>
        <div ref={ref} style={{ height: '100%', background: 'linear-gradient(90deg, var(--sage), rgba(78,94,62,0.6))', borderRadius: 10, width: 0, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--muted-dim)', width: 30, textAlign: 'right', flexShrink: 0 }}>{count}</span>
    </div>
  );
}

function StatCard({ icon: Icon, iconColor, iconBg, num, numColor, label, hint }: {
  icon: React.ElementType; iconColor: string; iconBg: string;
  num: number | string; numColor: string; label: string; hint: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: iconBg, color: iconColor, flexShrink: 0 }}>
          <Icon style={{ width: 14, height: 14, strokeWidth: 1.8 }} />
        </div>
      </div>
      <div style={{ fontFamily: 'var(--fs-subheading)', fontSize: 30, fontWeight: 700, lineHeight: 1, color: numColor }}>{num}</div>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'var(--muted-dim)' }}>{label}</div>
      <div style={{ fontSize: 10, color: 'var(--muted-dim)', marginTop: 2 }}>{hint}</div>
    </div>
  );
}

function ModuleTile({ href, icon: Icon, name, desc, accent, accentFaint, stats }: {
  href: string; icon: React.ElementType; name: string; desc: string;
  accent: string; accentFaint: string; stats: { num: number | string; lbl: string }[];
}) {
  return (
    <Link href={href}
      style={{ background: 'var(--surface)', border: '1px solid rgba(124,142,103,0.14)', borderRadius: 14, padding: '14px 15px', boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', overflow: 'hidden', textDecoration: 'none', transition: 'border-color 0.22s ease, transform 0.22s ease' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(124,142,103,0.14)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: accentFaint, color: accent }}>
        <Icon style={{ width: 18, height: 18, strokeWidth: 1.6 }} />
      </div>
      <div style={{ fontFamily: 'var(--fs-subheading)', fontStyle: 'italic', fontSize: 14, fontWeight: 700, color: 'var(--charcoal)' }}>{name}</div>
      <div style={{ fontSize: 10, color: 'var(--muted-dim)', lineHeight: 1.5 }}>{desc}</div>
      <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
        {stats.map(s => (
          <div key={s.lbl}>
            <div style={{ fontFamily: 'var(--fs-mono)', fontSize: 16, fontWeight: 700, color: accent, lineHeight: 1 }}>{s.num}</div>
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

function GuestRow({ name, room, status, hasTransfer, onGuestClick }: {
  name: string; room: string; status: string; hasTransfer?: boolean; onGuestClick?: () => void;
}) {
  const sc = statusColor(status);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', borderBottom: '1px solid rgba(124,142,103,0.06)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span onClick={onGuestClick}
          style={{ fontSize: 12, fontWeight: 600, color: onGuestClick ? 'var(--sage)' : 'var(--charcoal)', cursor: onGuestClick ? 'pointer' : 'default', textDecoration: onGuestClick ? 'underline' : 'none', textDecorationColor: 'rgba(78,94,62,0.3)', textUnderlineOffset: '2px' }}>
          {name}
        </span>
      </div>
      <span style={{ fontFamily: 'var(--fs-mono)', fontSize: 11, fontWeight: 600, color: 'var(--gold)', flexShrink: 0, minWidth: 36, textAlign: 'center' }}>{room || '—'}</span>
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 10, background: sc.bg, color: sc.text, flexShrink: 0 }}>{fmtStatus(status)}</span>
      {hasTransfer !== undefined && (
        <span style={{ fontSize: 9, color: hasTransfer ? 'var(--sage)' : 'var(--muted-dim)', flexShrink: 0 }}>{hasTransfer ? '✓ Transfer' : 'No transfer'}</span>
      )}
    </div>
  );
}

function TransferRow({ guestName, origin, destination, time, status, onClick }: {
  guestName: string; origin: string; destination: string; time: string; status: string; onClick?: () => void;
}) {
  const sc = statusColor(status);
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', borderBottom: '1px solid rgba(124,142,103,0.06)', cursor: onClick ? 'pointer' : 'default' }}>
      <span style={{ fontFamily: 'var(--fs-mono)', fontSize: 11, fontWeight: 600, color: 'var(--gold)', flexShrink: 0, minWidth: 40 }}>{time}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{guestName}</div>
        <div style={{ fontSize: 10, color: 'var(--muted-dim)' }}>{origin} → {destination}</div>
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 10, background: sc.bg, color: sc.text, flexShrink: 0 }}>{fmtStatus(status)}</span>
    </div>
  );
}

function toLocalDate(d: Date) { return localDateString(d); }

/* ─── Widget layout types ─── */

type WidgetId = 'occupancy' | 'stats' | 'weather' | 'modules' | 'arrivals' | 'departures' | 'transfers';

interface WidgetLayout {
  id: WidgetId;
  col: number;   // 1-based column in a 4-col grid
  row: number;   // row index (for ordering)
  colSpan: number; // 1–4
}

const DEFAULT_LAYOUT: WidgetLayout[] = [
  { id: 'occupancy',  row: 0, col: 1, colSpan: 1 },
  { id: 'stats',      row: 0, col: 2, colSpan: 2 },
  { id: 'weather',    row: 0, col: 4, colSpan: 1 },
  { id: 'modules',    row: 1, col: 1, colSpan: 4 },
  { id: 'arrivals',   row: 2, col: 1, colSpan: 1 },
  { id: 'departures', row: 2, col: 2, colSpan: 1 },
  { id: 'transfers',  row: 2, col: 3, colSpan: 2 },
];

const STORAGE_KEY = 'nbdt-dashboard-layout';

function loadLayout(): WidgetLayout[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === DEFAULT_LAYOUT.length) return parsed;
    }
  } catch { /* noop */ }
  return DEFAULT_LAYOUT;
}

function saveLayout(layout: WidgetLayout[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); } catch { /* noop */ }
}

/* ─── Draggable Widget Shell ─── */

function WidgetShell({
  widget, isEditing, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd,
  onResize, children,
}: {
  widget: WidgetLayout; isEditing: boolean;
  isDragOver: boolean;
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void; onDragEnd: () => void;
  onResize: (delta: number) => void;
  children: React.ReactNode;
}) {
  const gridColumn = `${widget.col} / span ${widget.colSpan}`;
  return (
    <div
      draggable={isEditing}
      onDragStart={isEditing ? onDragStart : undefined}
      onDragOver={isEditing ? onDragOver : undefined}
      onDrop={isEditing ? onDrop : undefined}
      onDragEnd={isEditing ? onDragEnd : undefined}
      style={{
        gridColumn,
        position: 'relative',
        borderRadius: 14,
        border: isEditing
          ? isDragOver ? '2px dashed var(--gold)' : '2px dashed rgba(124,142,103,0.3)'
          : '1px solid transparent',
        transition: 'border-color 0.15s ease',
      }}
    >
      {isEditing && (
        <>
          {/* Drag handle */}
          <div style={{
            position: 'absolute', top: 4, left: 4, zIndex: 10,
            width: 22, height: 22, borderRadius: 6,
            background: 'var(--sidebar-bg)', color: 'rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'grab', fontSize: 12,
          }}>
            <Bars3Icon style={{ width: 14, height: 14 }} />
          </div>
          {/* Resize buttons */}
          <div style={{
            position: 'absolute', top: 4, right: 4, zIndex: 10,
            display: 'flex', gap: 2,
          }}>
            {widget.colSpan > 1 && (
              <button onClick={() => onResize(-1)} style={{
                width: 20, height: 20, borderRadius: 5, border: 'none',
                background: 'var(--sidebar-bg)', color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer', fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>−</button>
            )}
            {widget.colSpan < 4 && (
              <button onClick={() => onResize(1)} style={{
                width: 20, height: 20, borderRadius: 5, border: 'none',
                background: 'var(--sidebar-bg)', color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer', fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>+</button>
            )}
          </div>
        </>
      )}
      {children}
    </div>
  );
}

/* ─── Main dashboard data ─── */

interface DashData {
  arrivals: any[]; departures: any[]; inhouse: any[];
  requests: any[]; conversations: any[];
  transfers: any[]; tours: any[]; orders: number;
}
const EMPTY_DATA: DashData = { arrivals: [], departures: [], inhouse: [], requests: [], conversations: [], transfers: [], tours: [], orders: 0 };

export default function DashboardPage() {
  const locale = useLocale();
  const { openGuest } = useGuestDrawer();
  const { config } = usePropertyConfig();
  const [data, setData] = useState<DashData>(EMPTY_DATA);
  const [editingTransfer, setEditingTransfer] = useState<any | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Widget layout
  const [layout, setLayout] = useState<WidgetLayout[]>(DEFAULT_LAYOUT);
  const [isEditing, setIsEditing] = useState(false);
  const [dragId, setDragId] = useState<WidgetId | null>(null);
  const [dragOverId, setDragOverId] = useState<WidgetId | null>(null);

  useEffect(() => { setLayout(loadLayout()); }, []);

  const updateLayout = (next: WidgetLayout[]) => {
    setLayout(next);
    saveLayout(next);
  };

  const handleDragStart = (id: WidgetId) => setDragId(id);
  const handleDragOver = (e: React.DragEvent, id: WidgetId) => { e.preventDefault(); setDragOverId(id); };
  const handleDrop = (targetId: WidgetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const next = [...layout];
    const srcIdx = next.findIndex(w => w.id === dragId);
    const tgtIdx = next.findIndex(w => w.id === targetId);
    if (srcIdx < 0 || tgtIdx < 0) return;
    // Swap positions
    const tmpRow = next[srcIdx].row; const tmpCol = next[srcIdx].col;
    const tmpSpan = next[srcIdx].colSpan;
    next[srcIdx] = { ...next[srcIdx], row: next[tgtIdx].row, col: next[tgtIdx].col, colSpan: next[tgtIdx].colSpan };
    next[tgtIdx] = { ...next[tgtIdx], row: tmpRow, col: tmpCol, colSpan: tmpSpan };
    updateLayout(next);
    setDragId(null); setDragOverId(null);
  };
  const handleDragEnd = () => { setDragId(null); setDragOverId(null); };

  const handleResize = (id: WidgetId, delta: number) => {
    const next = layout.map(w => {
      if (w.id !== id) return w;
      const newSpan = Math.max(1, Math.min(4, w.colSpan + delta));
      return { ...w, colSpan: newSpan };
    });
    updateLayout(next);
  };

  const resetLayout = () => {
    updateLayout(DEFAULT_LAYOUT);
  };

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
        arrivals: arr.reservations ?? [], departures: dep.reservations ?? [],
        inhouse: inh.reservations ?? [], requests: req.special_requests ?? [],
        conversations: convs.conversations ?? [], transfers: trans.transfers ?? [],
        tours: tours.tour_bookings ?? [], orders: 0,
      });
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const unreadMsgs = data.conversations.reduce((s: number, c: any) => s + parseInt(c.unread_count || '0'), 0);
  const openRequests = data.requests.filter((r: any) => r.status !== 'resolved' && r.status !== 'cancelled').length;
  const inhouseCount = data.inhouse.length;

  const cfgTotalUnits = config?.settings?.rooms?.totalUnits;
  const cfgCategorySum = (config?.settings?.rooms?.categories ?? []).reduce((sum: number, c: any) => sum + (c.total || 0), 0);
  const totalVillas = (cfgTotalUnits && cfgTotalUnits > 0) ? cfgTotalUnits : (cfgCategorySum > 0 ? cfgCategorySum : 37);

  const occPct = totalVillas > 0 ? Math.round((inhouseCount / totalVillas) * 100) : 0;
  const occLabel = occPct >= 90 ? 'Near Full' : occPct >= 70 ? 'High' : occPct >= 40 ? 'Moderate' : 'Low';
  const nextArrival = data.arrivals[0];
  const highPriReqs = data.requests.filter((r: any) => r.priority === 'high').length;
  const assignedConvs = data.conversations.filter((c: any) => c.assigned_staff_id).length;

  /* ─── Widget renderers ─── */

  const cardBase: React.CSSProperties = { background: 'var(--surface)', border: '1px solid rgba(124,142,103,0.14)', borderRadius: 14, boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' };

  function renderOccupancy() {
    return (
      <div style={{ ...cardBase, padding: '14px 16px', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--fs-subheading)', fontStyle: 'italic', fontSize: 11, color: 'var(--muted-dim)' }}>Tonight&apos;s Occupancy</div>
          <span style={{ background: 'rgba(78,94,62,0.14)', border: '1px solid rgba(78,94,62,0.2)', color: 'var(--sage)', fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20 }}>{occLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <div style={{ fontFamily: 'var(--fs-subheading)', fontSize: 42, fontWeight: 700, color: 'var(--gold)', lineHeight: 1 }}>
            {occPct}<span style={{ fontSize: 18, color: 'var(--muted-dim)' }}>%</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted-dim)' }}>
            {inhouseCount}/{totalVillas} · <span style={{ color: 'var(--sage)' }}>+{data.arrivals.length}</span> · <span style={{ color: 'var(--terra)' }}>−{data.departures.length}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {(() => {
            const categories = config?.settings?.rooms?.categories ?? [];
            const occByCategory = new Map<string, number>();
            for (const r of data.inhouse) {
              const cat = (r as any).room_category;
              if (cat) occByCategory.set(cat, (occByCategory.get(cat) || 0) + 1);
            }
            if (categories.length > 0) {
              return categories.map((cat: any) => {
                const occ = occByCategory.get(cat.name) || occByCategory.get(cat.code) || 0;
                const total = cat.total || 0;
                const pct = total > 0 ? Math.round((occ / total) * 100) : 0;
                return <OccBar key={cat.code || cat.name} label={cat.name || cat.code} fill={`${pct}%`} count={`${occ}/${total}`} />;
              });
            }
            if (occByCategory.size > 0) {
              return [...occByCategory.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([cat, occ]) => (
                <OccBar key={cat} label={cat} fill={`${Math.round((occ / totalVillas) * 100)}%`} count={`${occ}`} />
              ));
            }
            return <OccBar label="Total" fill={`${occPct}%`} count={`${inhouseCount}/${totalVillas}`} />;
          })()}
        </div>
      </div>
    );
  }

  function renderStats() {
    return (
      <div style={{ ...cardBase, padding: '12px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 10, flex: 1 }}>
          <StatCard icon={ArrowUpTrayIcon} iconColor="var(--gold)" iconBg="rgba(170,142,103,0.15)"
            num={data.arrivals.length} numColor="var(--gold)" label="Arrivals Today"
            hint={nextArrival ? <>Next: <strong style={{ color: 'var(--gold)' }}>{nextArrival.guest_name || nextArrival.opera_guest_name}</strong></> : <>No arrivals today</>}
          />
          <StatCard icon={NewspaperIcon} iconColor="var(--sage)" iconBg="rgba(78,94,62,0.14)"
            num={data.departures.length} numColor="var(--sage)" label="Departures"
            hint={<>{data.departures.length} checking out today</>}
          />
          <StatCard icon={ExclamationTriangleIcon} iconColor="var(--terra)" iconBg="rgba(236,108,75,0.12)"
            num={openRequests} numColor="var(--terra)" label="Open Requests"
            hint={highPriReqs > 0 ? <strong style={{ color: 'var(--terra)' }}>{highPriReqs} high priority</strong> : <>No high priority</>}
          />
          <StatCard icon={ChatBubbleLeftRightIcon} iconColor="#4A90D9" iconBg="rgba(74,144,217,0.10)"
            num={unreadMsgs} numColor="#4A90D9" label="Unread Messages"
            hint={<><span style={{ color: 'var(--sage)', fontWeight: 600 }}>{assignedConvs} assigned</span> · {data.conversations.length - assignedConvs} open</>}
          />
        </div>
      </div>
    );
  }

  function renderWeather() {
    return (
      <div style={{ ...cardBase }}>
        <div style={{ padding: '8px 12px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--separator)', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--fs-subheading)', fontStyle: 'italic', fontSize: 12, color: 'var(--sage)' }}>Rain Radar</span>
          <span style={{ fontSize: 9, color: 'var(--muted-dim)', letterSpacing: '0.04em' }}>Bocas del Toro · Live</span>
        </div>
        <iframe
          src="https://embed.windy.com/embed2.html?lat=9.341&lon=-82.253&detailLat=9.341&detailLon=-82.253&width=280&height=220&zoom=8&level=surface&overlay=rain&product=ecmwf&menu=&message=&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1"
          style={{ flex: 1, border: 'none', width: '100%', minHeight: 180, display: 'block' }}
          title="Rain Radar" loading="lazy"
        />
      </div>
    );
  }

  function renderModules() {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        <ModuleTile href={`/${locale}/staff/concierge`} icon={CalendarDaysIcon} name="Concierge"
          desc="Arrivals, departures, transfers, tours & guest requests."
          accent="var(--gold)" accentFaint="rgba(170,142,103,0.15)"
          stats={[{ num: data.arrivals.length, lbl: 'Arrivals' }, { num: data.transfers.length, lbl: 'Transfers' }, { num: data.tours.length, lbl: 'Tours' }]}
        />
        <ModuleTile href={`/${locale}/staff/orders`} icon={ShoppingCartIcon} name="Food & Beverage"
          desc="Orders, menus, romantic dinners & restaurant covers."
          accent="var(--sage)" accentFaint="rgba(78,94,62,0.14)"
          stats={[{ num: data.orders, lbl: 'Orders' }]}
        />
        <ModuleTile href={`/${locale}/staff/messages`} icon={ChatBubbleLeftRightIcon} name="Communications"
          desc="WhatsApp, SMS, email threads & guest inbox."
          accent="#4A90D9" accentFaint="rgba(74,144,217,0.10)"
          stats={[{ num: unreadMsgs, lbl: 'Unread' }, { num: openRequests, lbl: 'Requests' }]}
        />
        <ModuleTile href={`/${locale}/staff/users`} icon={Cog6ToothIcon} name="Admin"
          desc="Billing, vendors, staff & system settings."
          accent="var(--terra)" accentFaint="rgba(236,108,75,0.10)"
          stats={[{ num: 0, lbl: 'Pending Bills' }]}
        />
      </div>
    );
  }

  function renderArrivals() {
    return (
      <div style={cardBase}>
        <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--fs-subheading)', fontStyle: 'italic', fontSize: 13, color: 'var(--gold)' }}>Arrivals</span>
            <span style={{ fontFamily: 'var(--fs-mono)', fontSize: 11, fontWeight: 700, color: 'var(--gold)' }}>{data.arrivals.length}</span>
          </div>
          <Link href={`/${locale}/staff/reservations`} style={{ fontSize: 10, fontWeight: 600, color: 'var(--gold)', textDecoration: 'none' }}>See all</Link>
        </div>
        <div style={{ maxHeight: 340, overflowY: 'auto', flex: 1 }}>
          {data.arrivals.length === 0 ? (
            <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--muted-dim)', fontStyle: 'italic' }}>No arrivals today</div>
          ) : (
            data.arrivals.map((r: any) => (
              <GuestRow key={r.id} name={r.guest_name || r.opera_guest_name || '—'} room={r.room || '—'} status={r.status}
                hasTransfer={!!r.transfer_booked} onGuestClick={r.guest_id ? () => openGuest(r.guest_id) : undefined} />
            ))
          )}
        </div>
      </div>
    );
  }

  function renderDepartures() {
    return (
      <div style={cardBase}>
        <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--fs-subheading)', fontStyle: 'italic', fontSize: 13, color: 'var(--sage)' }}>Departures</span>
            <span style={{ fontFamily: 'var(--fs-mono)', fontSize: 11, fontWeight: 700, color: 'var(--sage)' }}>{data.departures.length}</span>
          </div>
          <Link href={`/${locale}/staff/reservations`} style={{ fontSize: 10, fontWeight: 600, color: 'var(--gold)', textDecoration: 'none' }}>See all</Link>
        </div>
        <div style={{ maxHeight: 340, overflowY: 'auto', flex: 1 }}>
          {data.departures.length === 0 ? (
            <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--muted-dim)', fontStyle: 'italic' }}>No departures today</div>
          ) : (
            data.departures.map((r: any) => (
              <GuestRow key={r.id} name={r.guest_name || r.opera_guest_name || '—'} room={r.room || '—'} status={r.status}
                onGuestClick={r.guest_id ? () => openGuest(r.guest_id) : undefined} />
            ))
          )}
        </div>
      </div>
    );
  }

  function renderTransfers() {
    return (
      <div style={cardBase}>
        <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--fs-subheading)', fontStyle: 'italic', fontSize: 13, color: 'var(--sage)' }}>Transfers</span>
            <span style={{ fontFamily: 'var(--fs-mono)', fontSize: 11, fontWeight: 700, color: 'var(--sage)' }}>{data.transfers.length}</span>
          </div>
          <Link href={`/${locale}/staff/concierge`} style={{ fontSize: 10, fontWeight: 600, color: 'var(--gold)', textDecoration: 'none' }}>Full view</Link>
        </div>
        <div style={{ maxHeight: 340, overflowY: 'auto', flex: 1 }}>
          {data.transfers.map((t: any) => (
            <TransferRow key={`t-${t.id}`} guestName={t.guest_name || '—'} origin={t.origin || '—'} destination={t.destination || '—'}
              time={t.time?.slice(0, 5) || '—'} status={t.guest_status || '—'}
              onClick={() => { setEditingTransfer(t); setTransferModalOpen(true); }} />
          ))}
          {data.tours.length > 0 && (
            <>
              <div style={{ padding: '6px 14px 4px', fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-dim)', borderTop: '1px solid var(--separator)' }}>
                Tours · {data.tours.length}
              </div>
              {data.tours.slice(0, 3).map((t: any) => (
                <TransferRow key={`tour-${t.id}`} guestName={t.guest_name || '—'} origin={t.name_en || 'Tour'}
                  destination={`${t.num_guests || '—'} guests`} time={t.start_time?.slice(0, 5) || '—'} status={t.guest_status || 'confirmed'} />
              ))}
            </>
          )}
          {data.transfers.length === 0 && data.tours.length === 0 && (
            <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--muted-dim)', fontStyle: 'italic' }}>Nothing scheduled today</div>
          )}
        </div>
      </div>
    );
  }

  const WIDGET_RENDERERS: Record<WidgetId, () => React.ReactNode> = {
    occupancy: renderOccupancy,
    stats: renderStats,
    weather: renderWeather,
    modules: renderModules,
    arrivals: renderArrivals,
    departures: renderDepartures,
    transfers: renderTransfers,
  };

  // Sort widgets by row then col for grid rendering
  const sortedLayout = [...layout].sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);

  // Group by row for proper CSS grid rendering
  const rows = new Map<number, WidgetLayout[]>();
  for (const w of sortedLayout) {
    if (!rows.has(w.row)) rows.set(w.row, []);
    rows.get(w.row)!.push(w);
  }

  return (
    <div style={{ padding: '14px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header with edit toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted-dim)' }}>
          Property Pulse — {today}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isEditing && (
            <button onClick={resetLayout}
              style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--separator)', background: 'transparent', color: 'var(--muted-dim)', cursor: 'pointer' }}>
              Reset
            </button>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: 'none',
              background: isEditing ? 'var(--gold)' : 'rgba(124,142,103,0.12)',
              color: isEditing ? '#fff' : 'var(--muted-dim)',
              cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase',
            }}
          >
            <ArrowsPointingOutIcon style={{ width: 12, height: 12 }} />
            {isEditing ? 'Done' : 'Edit Layout'}
          </button>
        </div>
      </div>

      {/* Widget grid — one CSS grid per row */}
      {[...rows.entries()].sort((a, b) => a[0] - b[0]).map(([rowIdx, widgets]) => (
        <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, alignItems: 'stretch' }}>
          {widgets.map(w => (
            <WidgetShell
              key={w.id}
              widget={w}
              isEditing={isEditing}
              isDragOver={dragOverId === w.id}
              onDragStart={() => handleDragStart(w.id)}
              onDragOver={(e) => handleDragOver(e, w.id)}
              onDrop={() => handleDrop(w.id)}
              onDragEnd={handleDragEnd}
              onResize={(delta) => handleResize(w.id, delta)}
            >
              {WIDGET_RENDERERS[w.id]()}
            </WidgetShell>
          ))}
        </div>
      ))}

      <TransferModal
        isOpen={transferModalOpen}
        onClose={() => { setTransferModalOpen(false); setEditingTransfer(null); }}
        transfer={editingTransfer}
        onSuccess={() => { setTransferModalOpen(false); setEditingTransfer(null); fetchDashboardData(); }}
      />
    </div>
  );
}
