'use client';

import { useState, useEffect, useRef } from 'react';

/* ─── Design tokens (match globals.css V13 Slate Botanical) ─── */
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

/* ─── Placeholder service data (same as concierge.html) ─── */
const SERVICE_DATA: Record<string, { headers: string[]; yesterday: any[][]; today: any[][]; tomorrow: any[][] }> = {
  transfers: {
    headers: ['Guest / Villa', 'Route', 'Time', 'Driver', 'Status'],
    yesterday: [
      ['The Peterson Family', 'Villa 2', 'Airport → Resort', '10:00', 'Carlos M.', 'completed'],
      ['Mr. & Mrs. Laurent', 'Villa 8', 'Resort → Airport', '08:30', 'Luis R.', 'completed'],
      ['Sarah Mitchell', 'Villa 5', 'Marina → Resort', '15:00', 'Ana P.', 'completed'],
    ],
    today: [
      ['The Harrington Family', 'Villa 12', 'Marina → Resort', '14:30', 'Carlos M.', 'confirmed'],
      ['Dr. & Mrs. Chen', 'Villa 7', 'Airport → Resort', '16:00', 'Luis R.', 'en-route'],
      ['The Morrison Group', 'Villa 3', 'Resort → Airport', '11:00', 'Ana P.', 'completed'],
      ['Sophia & James Webb', 'Villa 15', 'Marina → Resort', '17:30', 'Carlos M.', 'pending'],
      ['The Nakamura Family', 'Villa 9', 'Resort → Marina', '09:00', 'Luis R.', 'completed'],
      ['Isabella Rodriguez', 'Villa 4', 'Airport → Resort', '18:45', 'Ana P.', 'confirmed'],
      ['The O\'Brien Party', 'Villa 11', 'Marina → Resort', '20:00', 'Carlos M.', 'pending'],
      ['Mr. & Mrs. Delacroix', 'Villa 6', 'Resort → Airport', '07:30', 'Luis R.', 'completed'],
    ],
    tomorrow: [
      ['The Williams Family', 'Villa 10', 'Airport → Resort', '11:00', 'Ana P.', 'confirmed'],
      ['Elena Vasquez', 'Villa 13', 'Marina → Resort', '14:00', 'Carlos M.', 'confirmed'],
      ['The Park Family', 'Villa 2', 'Resort → Airport', '08:00', 'Luis R.', 'pending'],
    ],
  },
  tours: {
    headers: ['Tour Name', 'Time', 'Guide', 'Capacity', 'Status'],
    yesterday: [
      ['Mangrove Kayak', '08:00', 'Marco V.', '6/8', 'completed'],
      ['Coral Reef Dive', '10:30', 'Sofia A.', '4/6', 'completed'],
      ['Sunset Catamaran', '17:00', 'Marco V.', '10/12', 'completed'],
    ],
    today: [
      ['Dolphin Bay Snorkel', '08:00', 'Marco V.', '6/8', 'en-route'],
      ['Red Frog Beach Hike', '09:30', 'Sofia A.', '4/6', 'confirmed'],
      ['Starfish Beach Kayak', '11:00', 'Marco V.', '8/10', 'pending'],
      ['Chocolate Farm Tour', '10:00', 'Sofia A.', '5/8', 'completed'],
      ['Night Jungle Walk', '19:00', 'Carlos B.', '3/6', 'confirmed'],
      ['Catamaran Sunset', '17:30', 'Marco V.', '12/12', 'confirmed'],
    ],
    tomorrow: [
      ['Bird Watching', '06:30', 'Carlos B.', '3/6', 'confirmed'],
      ['Scuba Intro', '09:00', 'Marco V.', '4/4', 'confirmed'],
      ['Island Hop', '11:00', 'Sofia A.', '8/10', 'pending'],
    ],
  },
  arrivals: {
    headers: ['Guest / Villa', 'ETA', 'Transfer', 'Notes'],
    yesterday: [
      ['The Harrington Family', 'Villa 12', '14:30', 'completed', 'Early check-in'],
    ],
    today: [
      ['Dr. & Mrs. Chen', 'Villa 7', '16:00', 'en-route', 'Anniversary setup'],
      ['Sophia & James Webb', 'Villa 15', '17:30', 'pending', 'Honeymoon pkg'],
      ['Isabella Rodriguez', 'Villa 4', '18:45', 'confirmed', 'Vegan menu req'],
      ['The O\'Brien Party', 'Villa 11', '20:00', 'pending', 'Group of 6'],
    ],
    tomorrow: [
      ['The Williams Family', 'Villa 10', '11:00', 'confirmed', 'Family suite'],
      ['Elena Vasquez', 'Villa 13', '14:00', 'confirmed', 'VIP welcome'],
    ],
  },
  departures: {
    headers: ['Guest / Villa', 'Checkout', 'Transfer', 'Billing'],
    yesterday: [
      ['The Kim Group', 'Villa 14', '12:00', 'completed', 'confirmed'],
    ],
    today: [
      ['The Morrison Group', 'Villa 3', '11:00', 'completed', 'confirmed'],
      ['The Nakamura Family', 'Villa 9', '09:00', 'completed', 'confirmed'],
      ['Mr. & Mrs. Delacroix', 'Villa 6', '07:30', 'completed', 'pending'],
    ],
    tomorrow: [
      ['The Park Family', 'Villa 2', '08:00', 'pending', 'pending'],
    ],
  },
  requests: {
    headers: ['Request', 'Guest', 'Dept', 'Priority', 'Age'],
    yesterday: [
      ['Extra towels requested', 'Kim Group', 'Housekeeping', 'low', '1d'],
    ],
    today: [
      ['Late checkout — Sunday', 'Harrington', 'Concierge', 'high', '2m'],
      ['Extra candles for beach dinner', 'Dr. Chen', 'F&B', 'medium', '14m'],
      ['Champagne chilled by 18:30', 'Webb', 'F&B', 'medium', '1h'],
      ['Spa availability tomorrow AM', 'Rodriguez', 'Spa', 'low', '2h'],
      ['Vegan menu options for dinner', 'Rodriguez', 'F&B', 'medium', '3h'],
    ],
    tomorrow: [
      ['Airport transfer confirmation', 'Park Family', 'Concierge', 'high', '—'],
    ],
  },
  conversations: {
    headers: ['Guest', 'Channel', 'Last Message', 'Unread'],
    yesterday: [
      ['The Kim Group', 'WhatsApp', 'Thank you for the welcome basket!', '0'],
    ],
    today: [
      ['The Harrington Family', 'WhatsApp', 'Could we arrange a late check-out on Sunday?', '3'],
      ['Dr. Chen', 'WhatsApp', 'Please ensure the beach setup has extra candles', '2'],
      ['Nakamura Family', 'SMS', 'Thank you for the wonderful stay', '1'],
      ['James Webb', 'WhatsApp', 'We would love a bottle of champagne chilled by 18:30', '2'],
      ['Isabella Rodriguez', 'WhatsApp', 'Is there spa availability for tomorrow morning?', '1'],
    ],
    tomorrow: [
      ['The Williams Family', 'WhatsApp', 'Excited for our arrival tomorrow!', '0'],
    ],
  },
  dinners: {
    headers: ['Villa / Guest', 'Time', 'Location', 'Vendor', 'Status'],
    yesterday: [
      ['Villa 8 · Laurent', 'Anniversary', '20:00', 'Garden Terrace', 'In-house', 'completed'],
    ],
    today: [
      ['Villa 12 · Harrington', 'Anniversary', '19:30', 'Overwater Terrace', 'In-house', 'confirmed'],
      ['Villa 7 · Chen', 'Proposal', '20:00', 'Beach Torches', 'In-house', 'confirmed'],
      ['Villa 15 · Webb', 'Honeymoon', '19:00', 'Garden Pavilion', 'In-house', 'pending'],
    ],
    tomorrow: [
      ['Villa 10 · Williams', 'Celebration', '19:30', 'Overwater Terrace', 'In-house', 'pending'],
    ],
  },
};

const KPI_DEFS = [
  { key: 'arrivals',     label: 'Arrivals',    svc: 'arrivals',   today: 4, yesterday: 1, tomorrow: 2 },
  { key: 'inhouse',      label: 'In-House',    svc: null,         today: 34, yesterday: 31, tomorrow: 34 },
  { key: 'departures',   label: 'Departures',  svc: 'departures', today: 3, yesterday: 1, tomorrow: 1 },
  { key: 'transfers',    label: 'Transfers',   svc: 'transfers',  today: 8, yesterday: 3, tomorrow: 3 },
  { key: 'tours',        label: 'Tours',       svc: 'tours',      today: 6, yesterday: 3, tomorrow: 3 },
  { key: 'requests',     label: 'Requests',    svc: 'requests',   today: 5, yesterday: 1, tomorrow: 1 },
  { key: 'messages',     label: 'Messages',    svc: 'conversations', today: 12, yesterday: 4, tomorrow: 3 },
  { key: 'dinners',      label: 'Dinners',     svc: 'dinners',    today: 3, yesterday: 1, tomorrow: 1 },
];

/* ─── Status badge ─── */
const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  completed: { bg: 'rgba(34,197,94,0.12)', color: '#16a34a', dot: '#16a34a' },
  confirmed: { bg: 'rgba(59,130,246,0.12)', color: '#2563eb', dot: '#2563eb' },
  'en-route': { bg: 'rgba(234,179,8,0.12)', color: '#ca8a04', dot: '#ca8a04' },
  pending:   { bg: 'rgba(107,114,128,0.12)', color: '#6b7280', dot: '#9ca3af' },
  high:      { bg: 'rgba(236,108,75,0.12)', color: 'var(--terra)', dot: 'var(--terra)' },
  medium:    { bg: 'rgba(234,179,8,0.12)', color: '#ca8a04', dot: '#ca8a04' },
  low:       { bg: 'rgba(78,94,62,0.12)', color: 'var(--sage)', dot: 'var(--sage)' },
};
function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  const label = { completed: 'Completed', confirmed: 'Confirmed', 'en-route': 'En Route', pending: 'Pending', high: 'High', medium: 'Medium', low: 'Low' }[status] ?? status;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, background: s.bg, color: s.color, fontSize:10, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap', flexShrink:0 }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background: s.dot, flexShrink:0 }} />
      {label}
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

type DateOffset = -1 | 0 | 1;
const OFFSET_KEY: Record<number, 'yesterday' | 'today' | 'tomorrow'> = { '-1': 'yesterday', 0: 'today', 1: 'tomorrow' };

function getDateForOffset(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}
function fmtFull(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function getRows(svc: string | null, offset: number): any[][] {
  if (!svc) return [];
  const key = OFFSET_KEY[offset] ?? 'today';
  return (SERVICE_DATA[svc] as any)?.[key] ?? [];
}

/* ─── Detail panel table ─── */
function DetailTable({ svc, offset }: { svc: string; offset: number }) {
  const rows = getRows(svc, offset);
  const headers = SERVICE_DATA[svc]?.headers ?? [];
  if (!rows.length) return (
    <div style={{ padding:'32px 16px', textAlign:'center', color: T.mutedDim, fontSize:13, fontStyle:'italic' }}>
      No records for this date
    </div>
  );
  if (svc === 'requests') {
    return (
      <div style={{ display:'flex', flexDirection:'column' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, padding:'10px 20px', borderBottom: `1px solid ${T.separator}` }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color: T.charcoal, marginBottom:2 }}>{r[0]}</div>
              <div style={{ fontSize:11, color: T.mutedDim }}>{r[1]} · {r[2]}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <StatusBadge status={r[3]} />
              <span style={{ fontFamily:'DM Mono,monospace', fontSize:10, color: T.mutedDim }}>{r[4]}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (svc === 'conversations') {
    return (
      <div style={{ display:'flex', flexDirection:'column' }}>
        {rows.map((r, i) => {
          const initials = r[0].split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
          const chColor: Record<string,string> = { whatsapp:'#25D366', sms: T.gold, email:'#4A90D9', app: T.sage };
          const ch = (r[1] ?? '').toLowerCase();
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px', borderBottom:`1px solid ${T.separator}` }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background: T.sageFaint, color: T.sage, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{initials}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color: T.charcoal }}>{r[0]}</div>
                <div style={{ fontSize:11, color: T.mutedDim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r[2]}</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color: chColor[ch] ?? T.mutedDim, border:`1px solid ${chColor[ch] ?? T.mutedDim}`, borderRadius:3, padding:'1px 5px' }}>{r[1]}</span>
                {r[3] !== '0' && <span style={{ background:'var(--terra)', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10 }}>{r[3]}</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', minWidth:420 }}>
        <thead>
          <tr>
            {headers.map((h: string) => (
              <th key={h} style={{ textAlign:'left', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color: T.mutedDim, padding:'8px 16px', borderBottom:`1px solid ${T.separator}`, whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom:`1px solid rgba(124,142,103,0.06)` }}>
              {r.map((cell: any, ci: number) => {
                const isLast = ci === r.length - 1;
                const isSecond = ci === 1;
                const isTime = ci === 2 && ['transfers','arrivals','departures','dinners'].includes(svc);
                const isTourTime = ci === 1 && svc === 'tours';
                return (
                  <td key={ci} style={{ padding:'10px 16px', verticalAlign:'middle' }}>
                    {isLast ? <StatusBadge status={cell} /> :
                     isSecond && ['arrivals','departures','transfers','dinners'].includes(svc) ?
                       <span style={{ fontSize:10, color: T.mutedDim, fontStyle:'italic' }}>{cell}</span> :
                     (isTime || isTourTime) ?
                       <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color: T.charcoal, background: T.elevated, padding:'2px 7px', borderRadius:6 }}>{cell}</span> :
                     ci === 0 ?
                       <span style={{ fontSize:13, fontWeight:600, color: T.charcoal }}>{cell}</span> :
                       <span style={{ fontSize:12, color: T.muted }}>{cell}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Brief card row ─── */
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

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function ConciergePage() {
  const [offset, setOffset] = useState<number>(0);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const dateObj = getDateForOffset(offset);
  const dateLabel = fmtFull(dateObj);
  const key = OFFSET_KEY[offset] ?? 'today';

  const kpiValues: Record<string, number> = {};
  KPI_DEFS.forEach(k => {
    kpiValues[k.key] = k[key] ?? 0;
  });

  function openPanel(panelKey: string) {
    setActivePanel(prev => prev === panelKey ? null : panelKey);
  }

  const prefixMap: Record<string, string> = { yesterday: 'Yesterday', today: 'Today', tomorrow: 'Tomorrow' };
  const briefDateLabel = `${prefixMap[key] ?? ''} — ${dateLabel}`;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--bg)', overflow:'hidden' }}>

      {/* ── HEADER ── */}
      <div style={{ height:42, minHeight:42, background:'var(--bg)', borderBottom:`1px solid rgba(124,142,103,0.12)`, display:'flex', alignItems:'center', gap:14, padding:'0 20px', flexShrink:0 }}>
        {/* Date nav */}
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
      </div>

      {/* ── KPI STRIP ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:0, background: T.sidebarBg, borderBottom:`1px solid rgba(255,255,255,0.07)`, flexShrink:0 }}>
        {KPI_DEFS.map((k, i) => {
          const val = kpiValues[k.key];
          const isActive = activePanel === k.key;
          return (
            <button key={k.key} onClick={() => k.svc ? openPanel(k.key) : undefined}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, padding:'10px 6px', border:'none', borderRight: i < 7 ? '1px solid rgba(255,255,255,0.06)' : 'none', background: isActive ? 'rgba(78,94,62,0.25)' : 'transparent', cursor: k.svc ? 'pointer' : 'default', position:'relative', transition:'background 0.15s' }}
              onMouseEnter={e => { if (k.svc && !isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              {isActive && <span style={{ position:'absolute', bottom:0, left:'20%', right:'20%', height:2, background:'var(--sage)', borderRadius:2 }} />}
              <span style={{ fontFamily:'var(--font-gelasio), Georgia, serif', fontSize:24, fontWeight:700, lineHeight:1, color: isActive ? 'var(--sage)' : T.gold }}>
                <AnimCounter key={`${k.key}-${offset}`} target={val} />
              </span>
              <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color: isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)' }}>{k.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 16px 20px' }}>

        {/* ── DETAIL PANEL (when a KPI tile is active) ── */}
        {activePanel && (() => {
          const def = KPI_DEFS.find(k => k.key === activePanel);
          if (!def || !def.svc) return null;
          const rows = getRows(def.svc, offset);
          return (
            <div style={{ background: T.surface, border:`1px solid rgba(124,142,103,0.18)`, borderRadius:14, boxShadow: T.cardShadow, overflow:'hidden', marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 20px', borderBottom:`1px solid ${T.separator}` }}>
                <span style={{ fontFamily:'var(--font-gelasio), Georgia, serif', fontStyle:'italic', fontSize:16, color: T.sage, flex:1 }}>{def.label}</span>
                <span style={{ background: T.sageFaint, color: T.sage, fontSize:10, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', padding:'2px 9px', borderRadius:20 }}>{rows.length} {key}</span>
                <button onClick={() => setActivePanel(null)}
                  style={{ width:28, height:28, borderRadius:8, border:`1px solid rgba(124,142,103,0.2)`, background:'transparent', cursor:'pointer', color: T.mutedDim, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, lineHeight:1 }}>
                  ×
                </button>
              </div>
              <DetailTable svc={def.svc} offset={offset} />
            </div>
          );
        })()}

        {/* ── DAY BRIEF GRID ── */}
        {!activePanel && (
          <>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.16em', textTransform:'uppercase', color: T.mutedDim, marginBottom:10 }}>{briefDateLabel}</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>

              {/* Arrivals */}
              <BriefCard title="Arrivals" badge={String(kpiValues.arrivals)} onClick={() => openPanel('arrivals')}>
                {getRows('arrivals', offset).slice(0, 4).map((r, i) => (
                  <BriefRow key={i} name={r[0]} sub={r[1]} time={r[2]} status={r[3]} />
                ))}
              </BriefCard>

              {/* In-House */}
              <BriefCard title="In-House Guests" badge="Tonight">
                <div style={{ textAlign:'center', marginBottom:8 }}>
                  <span style={{ fontFamily:'var(--font-gelasio), Georgia, serif', fontSize:36, fontWeight:700, color: T.gold, lineHeight:1 }}>
                    <AnimCounter key={`inhouse-${offset}`} target={kpiValues.inhouse} />
                  </span>
                  <div style={{ fontSize:10, color: T.mutedDim, marginTop:2 }}>
                    <span style={{ color: T.sage, fontWeight:600 }}>+{kpiValues.arrivals} arriving</span> · <span style={{ color:'var(--terra)', fontWeight:600 }}>-{kpiValues.departures} departing</span>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <OccBar label="Overwater" fill="80%" count="8/10" />
                  <OccBar label="Garden" fill="83%" count="5/6" />
                  <OccBar label="Beach" fill="75%" count="3/4" />
                  <OccBar label="Suite" fill="100%" count="2/2" />
                </div>
              </BriefCard>

              {/* Departures */}
              <BriefCard title="Departures" badge={String(kpiValues.departures)} onClick={() => openPanel('departures')}>
                {getRows('departures', offset).slice(0, 4).map((r, i) => (
                  <BriefRow key={i} name={r[0]} sub={r[1]} time={r[2]} status={r[3]} />
                ))}
              </BriefCard>

              {/* Transfers */}
              <BriefCard title="Transfers" badge={String(kpiValues.transfers)} onClick={() => openPanel('transfers')}>
                {getRows('transfers', offset).slice(0, 4).map((r, i) => (
                  <BriefRow key={i} name={r[0]} sub={r[1]} time={r[3]} status={r[5]} />
                ))}
                {getRows('transfers', offset).length > 4 && (
                  <div style={{ fontSize:11, color: T.gold, fontWeight:600, paddingTop:4 }}>+{getRows('transfers', offset).length - 4} more →</div>
                )}
              </BriefCard>

              {/* Tours */}
              <BriefCard title="Tours" badge={String(kpiValues.tours)} onClick={() => openPanel('tours')}>
                {getRows('tours', offset).slice(0, 4).map((r, i) => (
                  <BriefRow key={i} name={r[0]} time={r[1]} status={r[4]} />
                ))}
                {getRows('tours', offset).length > 4 && (
                  <div style={{ fontSize:11, color: T.gold, fontWeight:600, paddingTop:4 }}>+{getRows('tours', offset).length - 4} more →</div>
                )}
              </BriefCard>

              {/* Special Requests */}
              <BriefCard title="Special Requests" badge={String(kpiValues.requests)} onClick={() => openPanel('requests')}>
                {getRows('requests', offset).slice(0, 4).map((r, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6, padding:'4px 0', borderBottom:`1px solid rgba(124,142,103,0.06)` }}>
                    <span style={{ fontSize:12, fontWeight:500, color: T.charcoal, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r[0]}</span>
                    <StatusBadge status={r[3]} />
                  </div>
                ))}
              </BriefCard>

              {/* Conversations */}
              <BriefCard title="Messages" badge={`${kpiValues.messages} unread`} onClick={() => openPanel('messages')}>
                {getRows('conversations', offset).slice(0, 4).map((r, i) => {
                  const initials = r[0].split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', borderBottom:`1px solid rgba(124,142,103,0.06)` }}>
                      <div style={{ width:24, height:24, borderRadius:'50%', background: T.sageFaint, color: T.sage, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, flexShrink:0 }}>{initials}</div>
                      <span style={{ fontSize:12, fontWeight:600, color: T.charcoal, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r[0]}</span>
                      {r[3] !== '0' && <span style={{ background:'var(--terra)', color:'#fff', fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:10, flexShrink:0 }}>{r[3]}</span>}
                    </div>
                  );
                })}
              </BriefCard>

              {/* Dinners */}
              <BriefCard title="Romantic Dinners" badge={String(kpiValues.dinners)} onClick={() => openPanel('dinners')}>
                {getRows('dinners', offset).slice(0, 4).map((r, i) => (
                  <BriefRow key={i} name={r[0]} sub={r[2]} time={r[1]} status={r[5]} />
                ))}
              </BriefCard>

            </div>
          </>
        )}
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
