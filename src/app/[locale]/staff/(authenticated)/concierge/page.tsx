'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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
      style={{ background: T.surface, border:`1px solid ${hovered && onClick ? 'rgba(124,142,103,0.32)' : 'rgba(124,142,103,0.14)'}`, borderRadius:14, padding:'12px 14px', boxShadow: T.cardShadow, display:'flex', flexDirection:'column', gap:8, cursor: onClick ? 'pointer' : 'default', transition:'border-color 0.2s' }}
    >
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2 }}>
        <span style={{ fontFamily:'var(--font-gelasio), Georgia, serif', fontStyle:'italic', fontSize:13, color: T.sage, fontWeight:600 }}>{title}</span>
        {badge && <span style={{ background: T.sageFaint, color: T.sage, fontSize:9, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', padding:'2px 7px', borderRadius:20 }}>{badge}</span>}
      </div>
      {children}
    </div>
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
function DetailContent({ panelKey, data }: { panelKey: string; data: LiveData }) {
  if (panelKey === 'arrivals') {
    const rows = data.arrivals;
    if (!rows.length) return <EmptyState />;
    return (
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            {['Guest', 'Room', 'Arrival', 'Transfer', 'Notes'].map(h => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} style={{ borderBottom:`1px solid rgba(124,142,103,0.06)` }}>
                <td style={tdStyle}><span style={{ fontSize:13, fontWeight:600, color: T.charcoal }}>{r.guest_name || r.opera_guest_name || '—'}</span></td>
                <td style={tdStyle}><span style={{ fontSize:11, color: T.mutedDim, fontStyle:'italic' }}>{r.room || '—'}</span></td>
                <td style={tdStyle}><span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color: T.charcoal, background: T.elevated, padding:'2px 7px', borderRadius:6 }}>{r.arrival || '—'}</span></td>
                <td style={tdStyle}><StatusBadge status={r.transfer_booked ? 'confirmed' : 'pending'} /></td>
                <td style={tdStyle}><span style={{ fontSize:11, color: T.muted }}>{r.notes || '—'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (panelKey === 'departures') {
    const rows = data.departures;
    if (!rows.length) return <EmptyState />;
    return (
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            {['Guest', 'Room', 'Departure', 'Transfer', 'Status'].map(h => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} style={{ borderBottom:`1px solid rgba(124,142,103,0.06)` }}>
                <td style={tdStyle}><span style={{ fontSize:13, fontWeight:600, color: T.charcoal }}>{r.guest_name || r.opera_guest_name || '—'}</span></td>
                <td style={tdStyle}><span style={{ fontSize:11, color: T.mutedDim, fontStyle:'italic' }}>{r.room || '—'}</span></td>
                <td style={tdStyle}><span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color: T.charcoal, background: T.elevated, padding:'2px 7px', borderRadius:6 }}>{r.departure || '—'}</span></td>
                <td style={tdStyle}><StatusBadge status={r.transfer_booked ? 'confirmed' : 'pending'} /></td>
                <td style={tdStyle}><StatusBadge status={r.status?.toLowerCase() || 'pending'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (panelKey === 'transfers') {
    const rows = data.transfers;
    if (!rows.length) return <EmptyState />;
    return (
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            {['Guest', 'Route', 'Time', 'Vendor', 'Status'].map(h => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} style={{ borderBottom:`1px solid rgba(124,142,103,0.06)` }}>
                <td style={tdStyle}>
                  <div style={{ fontSize:13, fontWeight:600, color: T.charcoal }}>{r.guest_name || '—'}</div>
                  {r.flight_number && <div style={{ fontSize:10, color: T.mutedDim }}>{r.flight_number}</div>}
                </td>
                <td style={tdStyle}>
                  <div style={{ fontSize:12, color: T.muted }}>{r.origin || '—'}</div>
                  <div style={{ fontSize:11, color: T.mutedDim }}>→ {r.destination || '—'}</div>
                </td>
                <td style={tdStyle}><span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color: T.charcoal, background: T.elevated, padding:'2px 7px', borderRadius:6 }}>{r.time?.slice(0,5) || '—'}</span></td>
                <td style={tdStyle}><span style={{ fontSize:11, color: T.muted }}>{r.vendor_name || '—'}</span></td>
                <td style={tdStyle}><StatusBadge status={r.guest_status || 'pending'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (panelKey === 'tours') {
    const rows = data.tours;
    if (!rows.length) return <EmptyState />;
    return (
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            {['Tour', 'Guest', 'Time', 'Vendor', 'Pax', 'Status'].map(h => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} style={{ borderBottom:`1px solid rgba(124,142,103,0.06)` }}>
                <td style={tdStyle}><span style={{ fontSize:13, fontWeight:600, color: T.charcoal }}>{r.name_en || '—'}</span></td>
                <td style={tdStyle}><span style={{ fontSize:12, color: T.muted }}>{r.guest_name || '—'}</span></td>
                <td style={tdStyle}><span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color: T.charcoal, background: T.elevated, padding:'2px 7px', borderRadius:6 }}>{r.start_time?.slice(0,5) || '—'}</span></td>
                <td style={tdStyle}><span style={{ fontSize:11, color: T.muted }}>{r.vendor_name || r.legacy_vendor_name || '—'}</span></td>
                <td style={tdStyle}><span style={{ fontSize:11, color: T.muted }}>{r.num_passengers ?? '—'}</span></td>
                <td style={tdStyle}><StatusBadge status={r.guest_status || 'pending'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (panelKey === 'requests') {
    const rows = data.requests;
    if (!rows.length) return <EmptyState />;
    return (
      <div style={{ display:'flex', flexDirection:'column' }}>
        {rows.map((r: any) => (
          <div key={r.id} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, padding:'10px 20px', borderBottom:`1px solid ${T.separator}` }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color: T.charcoal, marginBottom:2 }}>{r.request || '—'}</div>
              <div style={{ fontSize:11, color: T.mutedDim }}>{r.guest_name || '—'} · {r.department || '—'}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <StatusBadge status={r.priority || 'normal'} />
              <StatusBadge status={r.status || 'pending'} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (panelKey === 'messages') {
    const rows = data.conversations;
    if (!rows.length) return <EmptyState />;
    return (
      <div style={{ display:'flex', flexDirection:'column' }}>
        {rows.map((r: any) => {
          const name = r.guest_name || '—';
          const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
          const ch = (r.channel_label_en || '').toLowerCase();
          const chColor: Record<string,string> = { whatsapp:'#25D366', sms: T.gold, email:'#4A90D9', app: T.sage };
          const unread = parseInt(r.unread_count || '0');
          return (
            <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px', borderBottom:`1px solid ${T.separator}` }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background: T.sageFaint, color: T.sage, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{initials}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color: T.charcoal }}>{name}</div>
                <div style={{ fontSize:11, color: T.mutedDim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.last_message_preview || r.status}</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                {r.channel_label_en && <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color: chColor[ch] ?? T.mutedDim, border:`1px solid ${chColor[ch] ?? T.mutedDim}`, borderRadius:3, padding:'1px 5px' }}>{r.channel_label_en}</span>}
                {unread > 0 && <span style={{ background:'var(--terra)', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10 }}>{unread}</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (panelKey === 'dinners') {
    const rows = data.dinners;
    if (!rows.length) return <EmptyState />;
    return (
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            {['Guest', 'Time', 'Location', 'Guests', 'Vendor', 'Status'].map(h => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} style={{ borderBottom:`1px solid rgba(124,142,103,0.06)` }}>
                <td style={tdStyle}><span style={{ fontSize:13, fontWeight:600, color: T.charcoal }}>{r.guest_name || '—'}</span></td>
                <td style={tdStyle}><span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color: T.charcoal, background: T.elevated, padding:'2px 7px', borderRadius:6 }}>{r.time?.slice(0,5) || '—'}</span></td>
                <td style={tdStyle}><span style={{ fontSize:12, color: T.muted }}>{r.location || '—'}</span></td>
                <td style={tdStyle}><span style={{ fontSize:12, color: T.muted }}>{r.num_guests ?? '—'}</span></td>
                <td style={tdStyle}><span style={{ fontSize:11, color: T.muted }}>{r.vendor_name || '—'}</span></td>
                <td style={tdStyle}><StatusBadge status={r.status || 'pending'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
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
            <DetailContent panelKey={activePanel} data={data} />
          </div>
        )}

        {/* ── DAY BRIEF GRID ── */}
        {!activePanel && (
          <>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.16em', textTransform:'uppercase', color: T.mutedDim, marginBottom:10 }}>{offsetLabel} — {dateLabel}</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>

              {/* Arrivals */}
              <BriefCard title="Arrivals" badge={String(kpi.arrivals)} onClick={() => openPanel('arrivals')}>
                {data.arrivals.slice(0, 4).map((r: any) => (
                  <BriefRow key={r.id} name={r.guest_name || r.opera_guest_name || '—'} sub={r.room} time={r.arrival} status={r.status?.toLowerCase()} />
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
                {data.departures.slice(0, 4).map((r: any) => (
                  <BriefRow key={r.id} name={r.guest_name || r.opera_guest_name || '—'} sub={r.room} time={r.departure} status={r.status?.toLowerCase()} />
                ))}
                {!data.departures.length && <div style={{ fontSize:11, color: T.mutedDim, fontStyle:'italic', padding:'4px 0' }}>None today</div>}
              </BriefCard>

              {/* Transfers */}
              <BriefCard title="Transfers" badge={String(kpi.transfers)} onClick={() => openPanel('transfers')}>
                {data.transfers.slice(0, 4).map((r: any) => (
                  <BriefRow key={r.id} name={r.guest_name || '—'} sub={`${r.origin || ''} → ${r.destination || ''}`} time={r.time?.slice(0,5)} status={r.guest_status} />
                ))}
                {data.transfers.length > 4 && <div style={{ fontSize:11, color: T.gold, fontWeight:600, paddingTop:4 }}>+{data.transfers.length - 4} more →</div>}
                {!data.transfers.length && <div style={{ fontSize:11, color: T.mutedDim, fontStyle:'italic', padding:'4px 0' }}>None today</div>}
              </BriefCard>

              {/* Tours */}
              <BriefCard title="Tours" badge={String(kpi.tours)} onClick={() => openPanel('tours')}>
                {data.tours.slice(0, 4).map((r: any) => (
                  <BriefRow key={r.id} name={r.name_en || '—'} sub={r.guest_name} time={r.start_time?.slice(0,5)} status={r.guest_status} />
                ))}
                {data.tours.length > 4 && <div style={{ fontSize:11, color: T.gold, fontWeight:600, paddingTop:4 }}>+{data.tours.length - 4} more →</div>}
                {!data.tours.length && <div style={{ fontSize:11, color: T.mutedDim, fontStyle:'italic', padding:'4px 0' }}>None today</div>}
              </BriefCard>

              {/* Special Requests */}
              <BriefCard title="Special Requests" badge={String(kpi.requests)} onClick={() => openPanel('requests')}>
                {data.requests.slice(0, 4).map((r: any) => (
                  <div key={r.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6, padding:'4px 0', borderBottom:`1px solid rgba(124,142,103,0.06)` }}>
                    <span style={{ fontSize:12, fontWeight:500, color: T.charcoal, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.request || '—'}</span>
                    <StatusBadge status={r.priority || 'normal'} />
                  </div>
                ))}
                {!data.requests.length && <div style={{ fontSize:11, color: T.mutedDim, fontStyle:'italic', padding:'4px 0' }}>None today</div>}
              </BriefCard>

              {/* Conversations */}
              <BriefCard title="Messages" badge={`${kpi.messages} unread`} onClick={() => openPanel('messages')}>
                {data.conversations.slice(0, 4).map((r: any) => {
                  const name = r.guest_name || '—';
                  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                  const unread = parseInt(r.unread_count || '0');
                  return (
                    <div key={r.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', borderBottom:`1px solid rgba(124,142,103,0.06)` }}>
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
                {data.dinners.slice(0, 4).map((r: any) => (
                  <BriefRow key={r.id} name={r.guest_name || '—'} sub={r.location} time={r.time?.slice(0,5)} status={r.status} />
                ))}
                {!data.dinners.length && <div style={{ fontSize:11, color: T.mutedDim, fontStyle:'italic', padding:'4px 0' }}>None today</div>}
              </BriefCard>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
