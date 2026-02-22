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
  PlusIcon,
  XMarkIcon,
  MapPinIcon,
  StarIcon,
  ClipboardDocumentListIcon,
  BuildingOfficeIcon,
  BoltIcon,
  TicketIcon,
  HeartIcon,
  UserGroupIcon,
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
  const l = s.toLowerCase().trim();
  if (l === 'checked in') return 'Checked In';
  if (l === 'checked out') return 'Checked Out';
  if (l === 'reserved') return 'Reserved';
  if (l === 'cancelled') return 'Cancelled';
  return s;
}
function statusColor(s: string | null | undefined): { bg: string; text: string } {
  const l = (s || '').toLowerCase().trim();
  if (l === 'checked in' || l === 'confirmed' || l === 'completed') return { bg: 'rgba(78,94,62,0.15)', text: 'var(--sage)' };
  if (l === 'reserved') return { bg: 'rgba(170,142,103,0.15)', text: 'var(--gold)' };
  if (l === 'high') return { bg: 'rgba(236,108,75,0.14)', text: 'var(--terra)' };
  return { bg: 'rgba(124,142,103,0.10)', text: 'var(--muted-dim)' };
}
function toLocalDate(d: Date) { return localDateString(d); }

/* ─── Shared sub-components ─── */
function OccBar({ label, fill, count }: { label: string; fill: string; count: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => { if (ref.current) ref.current.style.width = fill; }, 250);
    return () => clearTimeout(t);
  }, [fill]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ fontSize: 10, color: 'var(--muted-dim)', width: 64, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 5, background: 'rgba(124,142,103,0.15)', borderRadius: 10, overflow: 'hidden' }}>
        <div ref={ref} style={{ height: '100%', background: 'linear-gradient(90deg,var(--sage),rgba(78,94,62,0.55))', borderRadius: 10, width: 0, transition: 'width 1.1s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--muted-dim)', width: 34, textAlign: 'right', flexShrink: 0 }}>{count}</span>
    </div>
  );
}
function GuestRow({ name, room, status, hasTransfer, date, onGuestClick }: {
  name: string; room: string; status: string; hasTransfer?: boolean; date?: string; onGuestClick?: () => void;
}) {
  const sc = statusColor(status);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderBottom: '1px solid rgba(124,142,103,0.06)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span onClick={onGuestClick} style={{ fontSize: 12, fontWeight: 600, color: onGuestClick ? 'var(--sage)' : 'var(--charcoal)', cursor: onGuestClick ? 'pointer' : 'default', textDecoration: onGuestClick ? 'underline' : 'none', textDecorationColor: 'rgba(78,94,62,0.3)', textUnderlineOffset: 2 }}>
          {name}
        </span>
        {date && <div style={{ fontSize: 10, color: 'var(--muted-dim)' }}>{date}</div>}
      </div>
      <span style={{ fontFamily: 'var(--fs-mono)', fontSize: 11, fontWeight: 600, color: 'var(--gold)', flexShrink: 0, minWidth: 32, textAlign: 'center' }}>{room || '—'}</span>
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 10, background: sc.bg, color: sc.text, flexShrink: 0 }}>{fmtStatus(status)}</span>
      {hasTransfer !== undefined && <span style={{ fontSize: 9, color: hasTransfer ? 'var(--sage)' : 'var(--muted-dim)', flexShrink: 0 }}>{hasTransfer ? '✓' : '○'}</span>}
    </div>
  );
}
function TransferRow({ guestName, origin, destination, time, status, onClick }: {
  guestName: string; origin: string; destination: string; time: string; status: string; onClick?: () => void;
}) {
  const sc = statusColor(status);
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderBottom: '1px solid rgba(124,142,103,0.06)', cursor: onClick ? 'pointer' : 'default' }}>
      <span style={{ fontFamily: 'var(--fs-mono)', fontSize: 11, fontWeight: 600, color: 'var(--gold)', flexShrink: 0, minWidth: 38 }}>{time}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{guestName}</div>
        <div style={{ fontSize: 10, color: 'var(--muted-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{origin} → {destination}</div>
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 10, background: sc.bg, color: sc.text, flexShrink: 0 }}>{fmtStatus(status)}</span>
    </div>
  );
}

/* ─── Widget catalog ─── */
export type WidgetId =
  | 'occupancy' | 'stats' | 'weather' | 'modules'
  | 'arrivals' | 'departures' | 'inhouse' | 'transfers' | 'tours'
  | 'requests' | 'messages' | 'orders' | 'dinners' | 'activity' | 'quicklinks';

interface WidgetMeta {
  id: WidgetId;
  name: string;
  desc: string;
  icon: React.ElementType;
  defaultColSpan: number;
  category: string;
}

const WIDGET_CATALOG: WidgetMeta[] = [
  { id: 'occupancy',  name: 'Occupancy',       desc: 'Tonight\'s occupancy % with per-villa-type bars',   icon: BuildingOfficeIcon,          defaultColSpan: 1, category: 'Property' },
  { id: 'stats',      name: 'Stats Overview',  desc: 'Arrivals, departures, requests & messages at a glance', icon: BoltIcon,                defaultColSpan: 2, category: 'Property' },
  { id: 'weather',    name: 'Rain Radar',       desc: 'Live rain radar for Bocas del Toro',                icon: MapPinIcon,                   defaultColSpan: 1, category: 'Property' },
  { id: 'modules',    name: 'Module Tiles',     desc: 'Quick-launch cards for all portal modules',         icon: ArrowTopRightOnSquareIcon,    defaultColSpan: 4, category: 'Navigation' },
  { id: 'quicklinks', name: 'Quick Links',      desc: 'Shortcut buttons to key sections',                  icon: StarIcon,                    defaultColSpan: 1, category: 'Navigation' },
  { id: 'arrivals',   name: 'Arrivals Feed',    desc: 'Today\'s arriving guests with room & status',        icon: ArrowUpTrayIcon,             defaultColSpan: 1, category: 'Concierge' },
  { id: 'departures', name: 'Departures Feed',  desc: 'Today\'s departing guests',                         icon: NewspaperIcon,                defaultColSpan: 1, category: 'Concierge' },
  { id: 'inhouse',    name: 'In-House Guests',  desc: 'All currently checked-in guests',                   icon: UserGroupIcon,                defaultColSpan: 1, category: 'Concierge' },
  { id: 'transfers',  name: 'Transfers & Tours',desc: 'Today\'s transfers and tour bookings',              icon: TicketIcon,                   defaultColSpan: 2, category: 'Concierge' },
  { id: 'tours',      name: 'Tours Today',      desc: 'Active tour bookings for today',                    icon: TicketIcon,                   defaultColSpan: 1, category: 'Concierge' },
  { id: 'requests',   name: 'Open Requests',    desc: 'Pending special requests from guests',              icon: ExclamationTriangleIcon,      defaultColSpan: 1, category: 'Operations' },
  { id: 'messages',   name: 'Unread Messages',  desc: 'Recent unread guest conversations',                 icon: ChatBubbleLeftRightIcon,      defaultColSpan: 1, category: 'Operations' },
  { id: 'orders',     name: 'Active Orders',    desc: 'F&B orders currently pending or in preparation',    icon: ShoppingCartIcon,             defaultColSpan: 1, category: 'Operations' },
  { id: 'dinners',    name: 'Romantic Dinners', desc: 'Romantic dinner bookings for today',                icon: HeartIcon,                   defaultColSpan: 1, category: 'Operations' },
  { id: 'activity',   name: 'Recent Activity',  desc: 'Live feed of recent actions across the property',   icon: ClipboardDocumentListIcon,    defaultColSpan: 2, category: 'Property' },
];

interface WidgetLayout { id: WidgetId; row: number; col: number; colSpan: number; }

const DEFAULT_LAYOUT: WidgetLayout[] = [
  { id: 'occupancy',  row: 0, col: 1, colSpan: 1 },
  { id: 'stats',      row: 0, col: 2, colSpan: 2 },
  { id: 'weather',    row: 0, col: 4, colSpan: 1 },
  { id: 'modules',    row: 1, col: 1, colSpan: 4 },
  { id: 'arrivals',   row: 2, col: 1, colSpan: 1 },
  { id: 'departures', row: 2, col: 2, colSpan: 1 },
  { id: 'transfers',  row: 2, col: 3, colSpan: 2 },
];

/* ─── Per-user persistence ─── */
const STORAGE_KEY = 'nbdt-dashboard-layout-v2';

function loadLayoutLocal(): WidgetLayout[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length > 0) return p; }
  } catch { /* */ }
  return null;
}
function saveLayoutLocal(l: WidgetLayout[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(l)); } catch { /* */ }
}

/* ─── Widget shell (drag + resize + remove) ─── */
function WidgetShell({ widget, isEditing, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd, onResize, onRemove, children }: {
  widget: WidgetLayout; isEditing: boolean; isDragOver: boolean;
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void; onDragEnd: () => void;
  onResize: (d: number) => void; onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      draggable={isEditing}
      onDragStart={isEditing ? onDragStart : undefined}
      onDragOver={isEditing ? onDragOver : undefined}
      onDrop={isEditing ? onDrop : undefined}
      onDragEnd={isEditing ? onDragEnd : undefined}
      style={{
        gridColumn: `${widget.col} / span ${widget.colSpan}`,
        position: 'relative', borderRadius: 14,
        border: isEditing ? (isDragOver ? '2px dashed var(--gold)' : '2px dashed rgba(124,142,103,0.28)') : '1px solid transparent',
        transition: 'border-color 0.15s ease',
        opacity: isDragOver ? 0.7 : 1,
      }}
    >
      {isEditing && (
        <>
          <div title="Drag to reorder" style={{ position: 'absolute', top: 4, left: 4, zIndex: 20, width: 22, height: 22, borderRadius: 6, background: 'var(--sidebar-bg)', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab' }}>
            <Bars3Icon style={{ width: 13, height: 13 }} />
          </div>
          <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 20, display: 'flex', gap: 2 }}>
            {widget.colSpan > 1 && (
              <button onClick={() => onResize(-1)} title="Shrink" style={{ width: 20, height: 20, borderRadius: 5, border: 'none', background: 'var(--sidebar-bg)', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
            )}
            {widget.colSpan < 4 && (
              <button onClick={() => onResize(1)} title="Expand" style={{ width: 20, height: 20, borderRadius: 5, border: 'none', background: 'var(--sidebar-bg)', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            )}
            <button onClick={onRemove} title="Remove widget" style={{ width: 20, height: 20, borderRadius: 5, border: 'none', background: 'rgba(200,60,60,0.85)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <XMarkIcon style={{ width: 11, height: 11 }} />
            </button>
          </div>
        </>
      )}
      {children}
    </div>
  );
}

/* ─── Widget picker drawer ─── */
function WidgetPicker({ activeIds, onAdd, onClose }: { activeIds: WidgetId[]; onAdd: (id: WidgetId) => void; onClose: () => void; }) {
  const available = WIDGET_CATALOG.filter(w => !activeIds.includes(w.id));
  const categories = [...new Set(WIDGET_CATALOG.map(w => w.category))];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}>
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.38)' }} />
      <div style={{ width: 340, background: 'var(--bg)', borderLeft: '1px solid var(--separator)', boxShadow: '-8px 0 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
          <div>
            <div style={{ fontFamily: 'var(--fs-subheading)', fontStyle: 'italic', fontSize: 16, fontWeight: 700, color: 'var(--charcoal)' }}>Widget Library</div>
            <div style={{ fontSize: 11, color: 'var(--muted-dim)', marginTop: 2 }}>{available.length} available · {activeIds.length} on dashboard</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--separator)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-dim)' }}>
            <XMarkIcon style={{ width: 14, height: 14 }} />
          </button>
        </div>
        <div style={{ padding: '12px 16px', flex: 1 }}>
          {categories.map(cat => {
            const catWidgets = WIDGET_CATALOG.filter(w => w.category === cat);
            return (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted-dim)', marginBottom: 8 }}>{cat}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {catWidgets.map(w => {
                    const added = activeIds.includes(w.id);
                    const Icon = w.icon;
                    return (
                      <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, border: `1px solid ${added ? 'rgba(124,142,103,0.25)' : 'var(--separator)'}`, background: added ? 'rgba(124,142,103,0.07)' : 'var(--surface)', transition: 'all 0.15s ease' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(124,142,103,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sage)', flexShrink: 0 }}>
                          <Icon style={{ width: 16, height: 16, strokeWidth: 1.6 }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--charcoal)' }}>{w.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--muted-dim)', lineHeight: 1.3 }}>{w.desc}</div>
                        </div>
                        {added ? (
                          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>On board</span>
                        ) : (
                          <button onClick={() => onAdd(w.id)}
                            style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'var(--gold)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <PlusIcon style={{ width: 13, height: 13 }} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {available.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 12, color: 'var(--muted-dim)', fontStyle: 'italic' }}>All widgets are on your dashboard</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Dashboard data ─── */
interface DashData {
  arrivals: any[]; departures: any[]; inhouse: any[];
  requests: any[]; conversations: any[];
  transfers: any[]; tours: any[]; orders: any[]; dinners: any[];
}
const EMPTY: DashData = { arrivals: [], departures: [], inhouse: [], requests: [], conversations: [], transfers: [], tours: [], orders: [], dinners: [] };

/* ─── Main page ─── */
export default function DashboardPage() {
  const locale = useLocale();
  const { openGuest } = useGuestDrawer();
  const { config } = usePropertyConfig();
  const [data, setData] = useState<DashData>(EMPTY);
  const [editingTransfer, setEditingTransfer] = useState<any | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);

  // Layout state
  const [layout, setLayout] = useState<WidgetLayout[]>(DEFAULT_LAYOUT);
  const [isEditing, setIsEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragId, setDragId] = useState<WidgetId | null>(null);
  const [dragOverId, setDragOverId] = useState<WidgetId | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load layout: API first, fallback localStorage, fallback default
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/user/settings');
        if (res.ok) {
          const json = await res.json();
          const saved = json.settings?.dashboardLayout;
          if (Array.isArray(saved) && saved.length > 0) {
            setLayout(saved); setLayoutReady(true); return;
          }
        }
      } catch { /* */ }
      const local = loadLayoutLocal();
      if (local) setLayout(local);
      setLayoutReady(true);
    })();
  }, []);

  // Persist layout: localStorage immediately + API debounced 1.5s
  const persistLayout = useCallback((next: WidgetLayout[]) => {
    setLayout(next);
    saveLayoutLocal(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboardLayout: next }),
      }).catch(() => {});
    }, 1500);
  }, []);

  // Drag handlers
  const handleDragStart = (id: WidgetId) => setDragId(id);
  const handleDragOver = (e: React.DragEvent, id: WidgetId) => { e.preventDefault(); setDragOverId(id); };
  const handleDrop = (targetId: WidgetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const next = [...layout];
    const si = next.findIndex(w => w.id === dragId);
    const ti = next.findIndex(w => w.id === targetId);
    if (si < 0 || ti < 0) return;
    const { row: sr, col: sc, colSpan: ss } = next[si];
    next[si] = { ...next[si], row: next[ti].row, col: next[ti].col, colSpan: next[ti].colSpan };
    next[ti] = { ...next[ti], row: sr, col: sc, colSpan: ss };
    persistLayout(next);
    setDragId(null); setDragOverId(null);
  };
  const handleDragEnd = () => { setDragId(null); setDragOverId(null); };

  const handleResize = (id: WidgetId, delta: number) => {
    persistLayout(layout.map(w => w.id !== id ? w : { ...w, colSpan: Math.max(1, Math.min(4, w.colSpan + delta)) }));
  };

  const handleRemove = (id: WidgetId) => {
    persistLayout(layout.filter(w => w.id !== id));
  };

  const handleAdd = (id: WidgetId) => {
    const meta = WIDGET_CATALOG.find(w => w.id === id)!;
    // Find max row and append at the end
    const maxRow = layout.length > 0 ? Math.max(...layout.map(w => w.row)) : -1;
    persistLayout([...layout, { id, row: maxRow + 1, col: 1, colSpan: meta.defaultColSpan }]);
  };

  const resetLayout = () => persistLayout(DEFAULT_LAYOUT);

  // Data fetching
  const fetchData = useCallback(() => {
    const date = toLocalDate(new Date());
    Promise.all([
      fetch(`/api/reservations?filter=arrivals&date=${date}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/reservations?filter=departures&date=${date}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/reservations?filter=checked_in&date=${date}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/special-requests?filter=today`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/conversations`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/transfers?date_from=${date}&date_to=${date}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/tour-bookings?date_from=${date}&date_to=${date}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/orders?status=pending,confirmed,preparing`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/romantic-dinners?date=${date}`).then(r => r.json()).catch(() => ({})),
    ]).then(([arr, dep, inh, req, convs, trans, tours, ords, dins]) => {
      setData({
        arrivals:      arr.reservations    ?? [],
        departures:    dep.reservations    ?? [],
        inhouse:       inh.reservations    ?? [],
        requests:      req.special_requests ?? [],
        conversations: convs.conversations ?? [],
        transfers:     trans.transfers     ?? [],
        tours:         tours.tour_bookings ?? [],
        orders:        ords.orders         ?? [],
        dinners:       dins.romantic_dinners ?? [],
      });
    });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Computed values
  const today = new Date().toLocaleDateString(locale === 'es' ? 'es-CR' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const unreadMsgs    = data.conversations.reduce((s: number, c: any) => s + parseInt(c.unread_count || '0'), 0);
  const openRequests  = data.requests.filter((r: any) => r.status !== 'resolved' && r.status !== 'cancelled').length;
  const inhouseCount  = data.inhouse.length;
  const cfgTotalUnits = config?.settings?.rooms?.totalUnits;
  const cfgCatSum     = (config?.settings?.rooms?.categories ?? []).reduce((s: number, c: any) => s + (c.total || 0), 0);
  const totalVillas   = (cfgTotalUnits && cfgTotalUnits > 0) ? cfgTotalUnits : (cfgCatSum > 0 ? cfgCatSum : 37);
  const occPct        = totalVillas > 0 ? Math.round((inhouseCount / totalVillas) * 100) : 0;
  const occLabel      = occPct >= 90 ? 'Near Full' : occPct >= 70 ? 'High' : occPct >= 40 ? 'Moderate' : 'Low';
  const nextArrival   = data.arrivals[0];
  const highPriReqs   = data.requests.filter((r: any) => r.priority === 'high').length;
  const assignedConvs = data.conversations.filter((c: any) => c.assigned_staff_id).length;
  const activeOrders  = data.orders.filter((o: any) => ['pending','confirmed','preparing'].includes(o.status)).length;

  /* ─── Card shell ─── */
  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid rgba(124,142,103,0.14)', borderRadius: 14, boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' };
  const feedHdr = (label: string, count: number | string, color: string, link?: string, linkLocale?: string) => (
    <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: 'var(--fs-subheading)', fontStyle: 'italic', fontSize: 13, color }}>{label}</span>
        <span style={{ fontFamily: 'var(--fs-mono)', fontSize: 11, fontWeight: 700, color }}>{count}</span>
      </div>
      {link && <Link href={link} style={{ fontSize: 10, fontWeight: 600, color: 'var(--gold)', textDecoration: 'none' }}>See all</Link>}
    </div>
  );

  /* ─── Widget renderers ─── */
  function W_Occupancy() {
    return (
      <div style={{ ...card, padding: '14px 16px', gap: 10 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(() => {
            const cats = config?.settings?.rooms?.categories ?? [];
            const occByCat = new Map<string, number>();
            for (const r of data.inhouse) { const c = (r as any).room_category; if (c) occByCat.set(c, (occByCat.get(c) || 0) + 1); }
            if (cats.length > 0) return cats.map((cat: any) => {
              const occ = occByCat.get(cat.name) || occByCat.get(cat.code) || 0;
              const tot = cat.total || 0;
              return <OccBar key={cat.code || cat.name} label={cat.name || cat.code} fill={tot > 0 ? `${Math.round(occ/tot*100)}%` : '0%'} count={`${occ}/${tot}`} />;
            });
            if (occByCat.size > 0) return [...occByCat.entries()].sort().map(([c, o]) => <OccBar key={c} label={c} fill={`${Math.round(o/totalVillas*100)}%`} count={`${o}`} />);
            return <OccBar label="Total" fill={`${occPct}%`} count={`${inhouseCount}/${totalVillas}`} />;
          })()}
        </div>
      </div>
    );
  }

  function W_Stats() {
    return (
      <div style={{ ...card, padding: '12px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 10, flex: 1 }}>
          {[
            { Icon: ArrowUpTrayIcon, color: 'var(--gold)', bg: 'rgba(170,142,103,0.15)', num: data.arrivals.length, lbl: 'Arrivals', hint: nextArrival ? <><strong style={{ color: 'var(--gold)' }}>{nextArrival.guest_name || nextArrival.opera_guest_name}</strong></> : <>No arrivals</> },
            { Icon: NewspaperIcon,   color: 'var(--sage)', bg: 'rgba(78,94,62,0.14)',   num: data.departures.length, lbl: 'Departures', hint: <>{data.departures.length} checking out</> },
            { Icon: ExclamationTriangleIcon, color: 'var(--terra)', bg: 'rgba(236,108,75,0.12)', num: openRequests, lbl: 'Open Requests', hint: highPriReqs > 0 ? <strong style={{ color: 'var(--terra)' }}>{highPriReqs} high priority</strong> : <>None high priority</> },
            { Icon: ChatBubbleLeftRightIcon, color: '#4A90D9', bg: 'rgba(74,144,217,0.10)', num: unreadMsgs, lbl: 'Unread', hint: <><span style={{ color: 'var(--sage)', fontWeight: 600 }}>{assignedConvs}</span> assigned</> },
          ].map(({ Icon, color, bg, num, lbl, hint }) => (
            <div key={lbl} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color }}><Icon style={{ width: 13, height: 13, strokeWidth: 1.8 }} /></div>
              </div>
              <div style={{ fontFamily: 'var(--fs-subheading)', fontSize: 28, fontWeight: 700, lineHeight: 1, color }}>{num}</div>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted-dim)' }}>{lbl}</div>
              <div style={{ fontSize: 10, color: 'var(--muted-dim)' }}>{hint}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function W_Weather() {
    return (
      <div style={card}>
        <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--fs-subheading)', fontStyle: 'italic', fontSize: 12, color: 'var(--sage)' }}>Rain Radar</span>
          <span style={{ fontSize: 9, color: 'var(--muted-dim)' }}>Bocas del Toro · Live</span>
        </div>
        <iframe src="https://embed.windy.com/embed2.html?lat=9.341&lon=-82.253&detailLat=9.341&detailLon=-82.253&width=280&height=220&zoom=8&level=surface&overlay=rain&product=ecmwf&menu=&message=&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1"
          style={{ flex: 1, border: 'none', width: '100%', minHeight: 180, display: 'block' }} title="Rain Radar" loading="lazy" />
      </div>
    );
  }

  function W_Modules() {
    const tiles = [
      { href: `/${locale}/staff/concierge`, Icon: CalendarDaysIcon, name: 'Concierge', desc: 'Arrivals, transfers, tours & requests', accent: 'var(--gold)', faint: 'rgba(170,142,103,0.15)', stats: [{ n: data.arrivals.length, l: 'Arrivals' }, { n: data.transfers.length, l: 'Transfers' }] },
      { href: `/${locale}/staff/orders`,    Icon: ShoppingCartIcon, name: 'Food & Beverage', desc: 'Orders, menus & dinners', accent: 'var(--sage)', faint: 'rgba(78,94,62,0.14)', stats: [{ n: activeOrders, l: 'Orders' }, { n: data.dinners.length, l: 'Dinners' }] },
      { href: `/${locale}/staff/messages`,  Icon: ChatBubbleLeftRightIcon, name: 'Communications', desc: 'WhatsApp & guest inbox', accent: '#4A90D9', faint: 'rgba(74,144,217,0.10)', stats: [{ n: unreadMsgs, l: 'Unread' }, { n: openRequests, l: 'Requests' }] },
      { href: `/${locale}/staff/users`,     Icon: Cog6ToothIcon, name: 'Admin', desc: 'Staff, billing & settings', accent: 'var(--terra)', faint: 'rgba(236,108,75,0.10)', stats: [{ n: 0, l: 'Bills' }] },
    ];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {tiles.map(({ href, Icon, name, desc, accent, faint, stats }) => (
          <Link key={name} href={href}
            style={{ background: 'var(--surface)', border: '1px solid rgba(124,142,103,0.14)', borderRadius: 14, padding: '14px 15px', boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', overflow: 'hidden', textDecoration: 'none', transition: 'border-color 0.22s, transform 0.22s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(124,142,103,0.14)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: faint, color: accent }}><Icon style={{ width: 18, height: 18, strokeWidth: 1.6 }} /></div>
            <div style={{ fontFamily: 'var(--fs-subheading)', fontStyle: 'italic', fontSize: 14, fontWeight: 700, color: 'var(--charcoal)' }}>{name}</div>
            <div style={{ fontSize: 10, color: 'var(--muted-dim)', lineHeight: 1.5 }}>{desc}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
              {stats.map(s => <div key={s.l}><div style={{ fontFamily: 'var(--fs-mono)', fontSize: 16, fontWeight: 700, color: accent, lineHeight: 1 }}>{s.n}</div><div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted-dim)' }}>{s.l}</div></div>)}
            </div>
            <div style={{ position: 'absolute', bottom: 14, right: 14, color: accent }}><ArrowTopRightOnSquareIcon style={{ width: 14, height: 14, strokeWidth: 2 }} /></div>
          </Link>
        ))}
      </div>
    );
  }

  function W_QuickLinks() {
    const links = [
      { href: `/${locale}/staff/concierge`, label: 'Concierge', color: 'var(--gold)' },
      { href: `/${locale}/staff/reservations`, label: 'Reservations', color: 'var(--sage)' },
      { href: `/${locale}/staff/transfers`, label: 'Transfers', color: 'var(--terra)' },
      { href: `/${locale}/staff/messages`, label: 'Messages', color: '#4A90D9' },
      { href: `/${locale}/staff/orders`, label: 'F&B Orders', color: 'var(--sage)' },
      { href: `/${locale}/staff/settings`, label: 'Settings', color: 'var(--muted-dim)' },
    ];
    return (
      <div style={{ ...card, padding: '12px 14px', gap: 8 }}>
        <div style={{ fontFamily: 'var(--fs-subheading)', fontStyle: 'italic', fontSize: 12, color: 'var(--muted-dim)', marginBottom: 4 }}>Quick Links</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {links.map(l => (
            <Link key={l.label} href={l.href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(124,142,103,0.06)', border: '1px solid var(--separator)', textDecoration: 'none', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,142,103,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(124,142,103,0.06)'}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal)' }}>{l.label}</span>
              <ArrowTopRightOnSquareIcon style={{ width: 10, height: 10, marginLeft: 'auto', color: 'var(--muted-dim)', strokeWidth: 2 }} />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  function W_Arrivals() {
    return (
      <div style={card}>
        {feedHdr('Arrivals', data.arrivals.length, 'var(--gold)', `/${locale}/staff/reservations`)}
        <div style={{ overflowY: 'auto', flex: 1, maxHeight: 340 }}>
          {data.arrivals.length === 0 ? <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--muted-dim)', fontStyle: 'italic' }}>No arrivals today</div>
            : data.arrivals.map((r: any) => <GuestRow key={r.id} name={r.guest_name || r.opera_guest_name || '—'} room={r.room || '—'} status={r.status} hasTransfer={!!r.transfer_booked} onGuestClick={r.guest_id ? () => openGuest(r.guest_id) : undefined} />)}
        </div>
      </div>
    );
  }

  function W_Departures() {
    return (
      <div style={card}>
        {feedHdr('Departures', data.departures.length, 'var(--sage)', `/${locale}/staff/reservations`)}
        <div style={{ overflowY: 'auto', flex: 1, maxHeight: 340 }}>
          {data.departures.length === 0 ? <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--muted-dim)', fontStyle: 'italic' }}>No departures today</div>
            : data.departures.map((r: any) => <GuestRow key={r.id} name={r.guest_name || r.opera_guest_name || '—'} room={r.room || '—'} status={r.status} onGuestClick={r.guest_id ? () => openGuest(r.guest_id) : undefined} />)}
        </div>
      </div>
    );
  }

  function W_InHouse() {
    return (
      <div style={card}>
        {feedHdr('In-House', inhouseCount, '#4A90D9', `/${locale}/staff/reservations`)}
        <div style={{ overflowY: 'auto', flex: 1, maxHeight: 340 }}>
          {data.inhouse.length === 0 ? <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--muted-dim)', fontStyle: 'italic' }}>No in-house guests</div>
            : data.inhouse.map((r: any) => <GuestRow key={r.id} name={r.guest_name || r.opera_guest_name || '—'} room={r.room || '—'} status={r.status} onGuestClick={r.guest_id ? () => openGuest(r.guest_id) : undefined} />)}
        </div>
      </div>
    );
  }

  function W_Transfers() {
    return (
      <div style={card}>
        {feedHdr('Transfers & Tours', data.transfers.length + data.tours.length, 'var(--sage)', `/${locale}/staff/concierge`)}
        <div style={{ overflowY: 'auto', flex: 1, maxHeight: 340 }}>
          {data.transfers.map((t: any) => <TransferRow key={`t-${t.id}`} guestName={t.guest_name || '—'} origin={t.origin || '—'} destination={t.destination || '—'} time={t.time?.slice(0,5) || '—'} status={t.guest_status || '—'} onClick={() => { setEditingTransfer(t); setTransferModalOpen(true); }} />)}
          {data.tours.length > 0 && <>
            <div style={{ padding: '5px 14px 3px', fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-dim)', borderTop: '1px solid var(--separator)' }}>Tours · {data.tours.length}</div>
            {data.tours.slice(0,4).map((t: any) => <TransferRow key={`tour-${t.id}`} guestName={t.guest_name || '—'} origin={t.name_en || 'Tour'} destination={`${t.num_guests || '—'} guests`} time={t.start_time?.slice(0,5) || '—'} status={t.guest_status || 'confirmed'} />)}
          </>}
          {data.transfers.length === 0 && data.tours.length === 0 && <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--muted-dim)', fontStyle: 'italic' }}>Nothing scheduled today</div>}
        </div>
      </div>
    );
  }

  function W_Tours() {
    return (
      <div style={card}>
        {feedHdr('Tours', data.tours.length, 'var(--gold)', `/${locale}/staff/tour-bookings`)}
        <div style={{ overflowY: 'auto', flex: 1, maxHeight: 340 }}>
          {data.tours.length === 0 ? <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--muted-dim)', fontStyle: 'italic' }}>No tours today</div>
            : data.tours.map((t: any) => <TransferRow key={t.id} guestName={t.guest_name || '—'} origin={t.name_en || 'Tour'} destination={`${t.num_guests || '—'} guests`} time={t.start_time?.slice(0,5) || '—'} status={t.guest_status || 'confirmed'} />)}
        </div>
      </div>
    );
  }

  function W_Requests() {
    const open = data.requests.filter((r: any) => r.status !== 'resolved' && r.status !== 'cancelled');
    return (
      <div style={card}>
        {feedHdr('Open Requests', open.length, 'var(--terra)', `/${locale}/staff/special-requests`)}
        <div style={{ overflowY: 'auto', flex: 1, maxHeight: 340 }}>
          {open.length === 0 ? <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--muted-dim)', fontStyle: 'italic' }}>All clear</div>
            : open.slice(0, 8).map((r: any) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 14px', borderBottom: '1px solid rgba(124,142,103,0.06)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.guest_name || '—'}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.request || r.description || '—'}</div>
                </div>
                {r.priority === 'high' && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--terra)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>High</span>}
              </div>
            ))}
        </div>
      </div>
    );
  }

  function W_Messages() {
    const unread = data.conversations.filter((c: any) => parseInt(c.unread_count || '0') > 0);
    return (
      <div style={card}>
        {feedHdr('Messages', unreadMsgs, '#4A90D9', `/${locale}/staff/messages`)}
        <div style={{ overflowY: 'auto', flex: 1, maxHeight: 340 }}>
          {unread.length === 0 ? <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--muted-dim)', fontStyle: 'italic' }}>No unread messages</div>
            : unread.slice(0, 8).map((c: any) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderBottom: '1px solid rgba(124,142,103,0.06)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal)' }}>{c.guest_name || 'Guest'}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.last_message || '—'}</div>
                </div>
                <span style={{ fontFamily: 'var(--fs-mono)', fontSize: 11, fontWeight: 700, color: '#4A90D9', background: 'rgba(74,144,217,0.12)', borderRadius: 20, padding: '1px 7px', flexShrink: 0 }}>{c.unread_count}</span>
              </div>
            ))}
        </div>
      </div>
    );
  }

  function W_Orders() {
    const active = data.orders.filter((o: any) => ['pending','confirmed','preparing'].includes(o.status));
    return (
      <div style={card}>
        {feedHdr('Active Orders', activeOrders, 'var(--sage)', `/${locale}/staff/orders`)}
        <div style={{ overflowY: 'auto', flex: 1, maxHeight: 340 }}>
          {active.length === 0 ? <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--muted-dim)', fontStyle: 'italic' }}>No active orders</div>
            : active.slice(0, 8).map((o: any) => {
              const sc = statusColor(o.status);
              return (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderBottom: '1px solid rgba(124,142,103,0.06)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal)' }}>{o.guest_name || o.order_number || '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted-dim)' }}>{o.order_number || ''}</div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 10, background: sc.bg, color: sc.text }}>{o.status}</span>
                </div>
              );
            })}
        </div>
      </div>
    );
  }

  function W_Dinners() {
    return (
      <div style={card}>
        {feedHdr('Romantic Dinners', data.dinners.length, '#e07a8a', `/${locale}/staff/romantic-dinners`)}
        <div style={{ overflowY: 'auto', flex: 1, maxHeight: 340 }}>
          {data.dinners.length === 0 ? <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--muted-dim)', fontStyle: 'italic' }}>No dinners today</div>
            : data.dinners.map((d: any) => {
              const sc = statusColor(d.status);
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderBottom: '1px solid rgba(124,142,103,0.06)' }}>
                  <span style={{ fontFamily: 'var(--fs-mono)', fontSize: 11, fontWeight: 600, color: 'var(--gold)', flexShrink: 0, minWidth: 38 }}>{d.time?.slice(0,5) || '—'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal)' }}>{d.guest_name || '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted-dim)' }}>{d.location || '—'}</div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 10, background: sc.bg, color: sc.text }}>{d.status}</span>
                </div>
              );
            })}
        </div>
      </div>
    );
  }

  function W_Activity() {
    // Combine recent items from multiple sources
    const items: { key: string; time: string; label: string; sub: string; color: string }[] = [];
    data.conversations.filter((c: any) => parseInt(c.unread_count || '0') > 0).slice(0, 3).forEach((c: any) => {
      items.push({ key: `msg-${c.id}`, time: '', label: c.guest_name || 'Guest', sub: `${c.unread_count} unread message${parseInt(c.unread_count) > 1 ? 's' : ''}`, color: '#4A90D9' });
    });
    data.requests.filter((r: any) => r.status === 'pending').slice(0, 3).forEach((r: any) => {
      items.push({ key: `req-${r.id}`, time: '', label: r.guest_name || 'Guest', sub: r.request || 'Special request pending', color: 'var(--terra)' });
    });
    data.arrivals.slice(0, 3).forEach((r: any) => {
      items.push({ key: `arr-${r.id}`, time: fmtDate(r.arrival), label: r.guest_name || r.opera_guest_name || 'Guest', sub: `Arriving · ${r.room || 'Room TBD'}`, color: 'var(--gold)' });
    });
    return (
      <div style={card}>
        {feedHdr('Activity', items.length, 'var(--muted-dim)')}
        <div style={{ overflowY: 'auto', flex: 1, maxHeight: 340 }}>
          {items.length === 0 ? <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--muted-dim)', fontStyle: 'italic' }}>All quiet</div>
            : items.map(it => (
              <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderBottom: '1px solid rgba(124,142,103,0.06)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: it.color, flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal)' }}>{it.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted-dim)' }}>{it.sub}</div>
                </div>
                {it.time && <span style={{ fontSize: 9, color: 'var(--muted-dim)', flexShrink: 0 }}>{it.time}</span>}
              </div>
            ))}
        </div>
      </div>
    );
  }

  const RENDERERS: Record<WidgetId, () => React.ReactNode> = {
    occupancy:  W_Occupancy,
    stats:      W_Stats,
    weather:    W_Weather,
    modules:    W_Modules,
    quicklinks: W_QuickLinks,
    arrivals:   W_Arrivals,
    departures: W_Departures,
    inhouse:    W_InHouse,
    transfers:  W_Transfers,
    tours:      W_Tours,
    requests:   W_Requests,
    messages:   W_Messages,
    orders:     W_Orders,
    dinners:    W_Dinners,
    activity:   W_Activity,
  };

  // Group layout into rows
  const rows = new Map<number, WidgetLayout[]>();
  for (const w of [...layout].sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col)) {
    if (!rows.has(w.row)) rows.set(w.row, []);
    rows.get(w.row)!.push(w);
  }

  if (!layoutReady) return null;

  return (
    <div style={{ padding: '14px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted-dim)' }}>
          Property Pulse — {today}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isEditing && <>
            <button onClick={() => setPickerOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--gold)', background: 'transparent', color: 'var(--gold)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <PlusIcon style={{ width: 11, height: 11 }} /> Add Widget
            </button>
            <button onClick={resetLayout}
              style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--separator)', background: 'transparent', color: 'var(--muted-dim)', cursor: 'pointer' }}>
              Reset
            </button>
          </>}
          <button onClick={() => setIsEditing(!isEditing)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: 'none', background: isEditing ? 'var(--gold)' : 'rgba(124,142,103,0.12)', color: isEditing ? '#fff' : 'var(--muted-dim)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <ArrowsPointingOutIcon style={{ width: 12, height: 12 }} />
            {isEditing ? 'Done' : 'Edit Layout'}
          </button>
        </div>
      </div>

      {/* Widget rows */}
      {[...rows.entries()].sort((a, b) => a[0] - b[0]).map(([rowIdx, widgets]) => (
        <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, alignItems: 'stretch' }}>
          {widgets.map(w => (
            <WidgetShell key={w.id} widget={w} isEditing={isEditing} isDragOver={dragOverId === w.id}
              onDragStart={() => handleDragStart(w.id)}
              onDragOver={e => handleDragOver(e, w.id)}
              onDrop={() => handleDrop(w.id)}
              onDragEnd={handleDragEnd}
              onResize={d => handleResize(w.id, d)}
              onRemove={() => handleRemove(w.id)}
            >
              {RENDERERS[w.id]?.()}
            </WidgetShell>
          ))}
        </div>
      ))}

      {layout.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 14, color: 'var(--muted-dim)', fontStyle: 'italic', marginBottom: 12 }}>Your dashboard is empty</div>
          <button onClick={() => { setIsEditing(true); setPickerOpen(true); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--gold)', color: '#fff', cursor: 'pointer' }}>
            <PlusIcon style={{ width: 14, height: 14 }} /> Add Widgets
          </button>
        </div>
      )}

      {/* Widget Picker */}
      {pickerOpen && (
        <WidgetPicker
          activeIds={layout.map(w => w.id)}
          onAdd={id => { handleAdd(id); }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <TransferModal
        isOpen={transferModalOpen}
        onClose={() => { setTransferModalOpen(false); setEditingTransfer(null); }}
        transfer={editingTransfer}
        onSuccess={() => { setTransferModalOpen(false); setEditingTransfer(null); fetchData(); }}
      />
    </div>
  );
}
