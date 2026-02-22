'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';

interface Assignment {
  id: string;
  boat_id: string;
  boat_name: string;
  boat_type: string;
  captain_first_name: string;
  captain_last_name: string;
  assignment_type: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  tour_name_en: string;
  tour_name_es: string;
  transfer_origin: string;
  transfer_destination: string;
  guest_name: string;
}

interface Boat {
  id: string;
  name: string;
  type: string;
  capacity: number;
  status: string;
  today_assignments: number;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#D9AA3C',
  departed: '#4E96C8',
  in_progress: '#4E96C8',
  completed: '#4E5E3E',
  cancelled: '#9CA3AF',
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 5); // 5:00 to 18:00

export default function FleetDashboardPage() {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/fleet/boats?status=active').then(r => r.json()),
      fetch(`/api/fleet/assignments?date=${date}`).then(r => r.json()),
    ]).then(([boatData, assignData]) => {
      setBoats(boatData.boats || []);
      setAssignments(assignData.assignments || []);
      setLoading(false);
    });
  }, [date]);

  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const getAssignmentsForBoat = (boatId: string) =>
    assignments.filter(a => a.boat_id === boatId);

  const unassignedCount = assignments.filter(a => !a.captain_first_name).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--charcoal)' }}>
            {ls('Fleet Operations', 'Operaciones de Flota')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-dim)' }}>
            {ls('Boat and captain assignments', 'Asignaciones de botes y capitanes')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm border"
            style={{ borderColor: 'var(--separator)', background: 'var(--surface)', color: 'var(--charcoal)' }} />
          <Link href={`/${locale}/staff/fleet/boats`}
            className="px-3 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--elevated)', color: 'var(--charcoal)' }}>
            {ls('Boats', 'Botes')}
          </Link>
          <Link href={`/${locale}/staff/fleet/captains`}
            className="px-3 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--elevated)', color: 'var(--charcoal)' }}>
            {ls('Captains', 'Capitanes')}
          </Link>
        </div>
      </div>

      {/* Alert banner */}
      {unassignedCount > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-2"
          style={{ background: 'rgba(217,170,60,0.1)', border: '1px solid rgba(217,170,60,0.3)' }}>
          <span className="text-sm font-medium" style={{ color: '#B8941E' }}>
            {unassignedCount} {ls('assignments need a captain', 'asignaciones necesitan capitán')}
          </span>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: ls('Active Boats', 'Botes Activos'), value: boats.filter(b => b.status === 'active').length, color: '#4E5E3E' },
          { label: ls("Today's Trips", 'Viajes Hoy'), value: assignments.length, color: '#4E96C8' },
          { label: ls('Captains On Duty', 'Capitanes en Servicio'), value: new Set(assignments.filter(a => a.captain_first_name).map(a => a.captain_first_name + a.captain_last_name)).size, color: '#AA8E67' },
          { label: ls('Completed', 'Completados'), value: assignments.filter(a => a.status === 'completed').length, color: '#6B7F5A' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--separator)' }}>
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs font-medium" style={{ color: 'var(--muted-dim)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Timeline view */}
      {loading ? (
        <div className="text-center py-16" style={{ color: 'var(--muted-dim)' }}>Loading...</div>
      ) : boats.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--separator)' }}>
          <p style={{ color: 'var(--muted-dim)' }}>{ls('No boats registered', 'No hay botes registrados')}</p>
          <Link href={`/${locale}/staff/fleet/boats`}
            className="inline-block mt-3 text-sm font-medium px-4 py-2 rounded-lg"
            style={{ background: 'var(--elevated)', color: 'var(--charcoal)' }}>
            {ls('Add Boats', 'Agregar Botes')}
          </Link>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--separator)' }}>
          <div className="overflow-x-auto">
            <div style={{ minWidth: 900 }}>
              {/* Time header */}
              <div className="flex border-b" style={{ borderColor: 'var(--separator)' }}>
                <div className="w-40 flex-shrink-0 px-4 py-2 text-xs font-black uppercase tracking-wider"
                  style={{ color: 'var(--muted-dim)', background: 'var(--elevated)' }}>
                  {ls('Boat', 'Bote')}
                </div>
                <div className="flex-1 flex">
                  {HOURS.map(h => (
                    <div key={h} className="flex-1 text-center text-[10px] font-medium py-2"
                      style={{ color: 'var(--muted-dim)', borderLeft: '1px solid var(--separator)' }}>
                      {h}:00
                    </div>
                  ))}
                </div>
              </div>

              {/* Boat rows */}
              {boats.map(boat => {
                const boatAssignments = getAssignmentsForBoat(boat.id);
                return (
                  <div key={boat.id} className="flex border-b" style={{ borderColor: 'var(--separator)', minHeight: 56 }}>
                    <div className="w-40 flex-shrink-0 px-4 py-3 flex items-center gap-2"
                      style={{ background: 'var(--elevated)' }}>
                      <div>
                        <div className="text-sm font-bold" style={{ color: 'var(--charcoal)' }}>{boat.name}</div>
                        <div className="text-[10px]" style={{ color: 'var(--muted-dim)' }}>
                          {boat.type} · {boat.capacity} pax
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 relative">
                      {/* Grid lines */}
                      {HOURS.map(h => (
                        <div key={h} className="absolute top-0 bottom-0"
                          style={{ left: `${((h - 5) / 14) * 100}%`, borderLeft: '1px solid var(--separator)' }} />
                      ))}

                      {/* Assignment blocks */}
                      {boatAssignments.map(a => {
                        const startMin = timeToMinutes(a.start_time);
                        const endMin = timeToMinutes(a.end_time);
                        const startPct = ((startMin - 300) / (14 * 60)) * 100; // 300 = 5:00
                        const widthPct = ((endMin - startMin) / (14 * 60)) * 100;

                        const label = a.assignment_type === 'tour'
                          ? (locale === 'es' ? a.tour_name_es : a.tour_name_en) || 'Tour'
                          : `${a.transfer_origin || '?'} → ${a.transfer_destination || '?'}`;

                        return (
                          <div key={a.id}
                            className="absolute top-1 bottom-1 rounded-lg px-2 py-1 overflow-hidden cursor-pointer hover:brightness-110 transition-all"
                            style={{
                              left: `${Math.max(0, startPct)}%`,
                              width: `${Math.min(widthPct, 100 - startPct)}%`,
                              background: STATUS_COLORS[a.status] || '#9CA3AF',
                              opacity: a.status === 'completed' ? 0.6 : 0.85,
                              minWidth: 40,
                            }}>
                            <div className="text-[10px] font-bold text-white truncate">{label}</div>
                            <div className="text-[9px] text-white/70 truncate">
                              {a.captain_first_name
                                ? `${a.captain_first_name} ${a.captain_last_name?.charAt(0) || ''}.`
                                : ls('No captain', 'Sin capitán')
                              }
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Assignment list */}
      {assignments.length > 0 && (
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider mb-3" style={{ color: 'var(--muted-dim)' }}>
            {ls("Today's Assignments", 'Asignaciones de Hoy')}
          </h2>
          <div className="space-y-2">
            {assignments.map(a => (
              <div key={a.id} className="rounded-xl p-3 flex items-center gap-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--separator)' }}>
                <div className="w-2 h-10 rounded-full" style={{ background: STATUS_COLORS[a.status] || '#9CA3AF' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold" style={{ color: 'var(--charcoal)' }}>
                    {a.assignment_type === 'tour'
                      ? (locale === 'es' ? a.tour_name_es : a.tour_name_en) || 'Tour'
                      : `Transfer: ${a.transfer_origin || '?'} → ${a.transfer_destination || '?'}`
                    }
                  </div>
                  <div className="text-xs" style={{ color: 'var(--muted-dim)' }}>
                    {a.start_time?.slice(0, 5)} – {a.end_time?.slice(0, 5)} · {a.boat_name} ·{' '}
                    {a.captain_first_name
                      ? `Capt. ${a.captain_first_name}`
                      : ls('No captain assigned', 'Sin capitán')
                    }
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md"
                  style={{ background: `${STATUS_COLORS[a.status]}20`, color: STATUS_COLORS[a.status] }}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
