'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';

interface Trip {
  id: string;
  assignment_type: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  boat_name: string;
  boat_type: string;
  boat_capacity: number;
  tour_name_en: string;
  tour_name_es: string;
  tour_location: string;
  meeting_point_en: string;
  meeting_point_es: string;
  duration_minutes: number;
  transfer_origin: string;
  transfer_destination: string;
  num_passengers: number;
  tour_pax_count: number;
  tour_passengers: Array<{ name: string; num_guests: number }> | null;
  notes: string;
}

const STATUS_ACTIONS: Record<string, { next: string; label_en: string; label_es: string; color: string }> = {
  scheduled: { next: 'departed', label_en: 'Depart', label_es: 'Zarpar', color: '#4E96C8' },
  departed: { next: 'in_progress', label_en: 'Arrived', label_es: 'Llegada', color: '#D9AA3C' },
  in_progress: { next: 'completed', label_en: 'Complete', label_es: 'Completar', color: '#4E5E3E' },
};

const STATUS_LABELS: Record<string, { en: string; es: string; color: string }> = {
  scheduled: { en: 'Scheduled', es: 'Programado', color: '#D9AA3C' },
  departed: { en: 'Departed', es: 'En Camino', color: '#4E96C8' },
  in_progress: { en: 'In Progress', es: 'En Progreso', color: '#4E96C8' },
  completed: { en: 'Completed', es: 'Completado', color: '#4E5E3E' },
};

export default function CaptainDayView() {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'today' | 'week'>('today');

  const fetchTrips = () => {
    setLoading(true);
    fetch(`/api/captain/trips?filter=${filter}`)
      .then(r => r.json())
      .then(d => { setTrips(d.trips || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchTrips(); }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await fetch('/api/captain/trips', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      fetchTrips();
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString(locale === 'es' ? 'es-CR' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--charcoal)' }}>
            {ls('My Trips', 'Mis Viajes')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-dim)' }}>
            {formatDate(today)}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilter('today')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={filter === 'today'
              ? { background: 'var(--sage)', color: '#fff' }
              : { background: 'var(--elevated)', color: 'var(--muted-dim)' }
            }>
            {ls('Today', 'Hoy')}
          </button>
          <button onClick={() => setFilter('week')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={filter === 'week'
              ? { background: 'var(--sage)', color: '#fff' }
              : { background: 'var(--elevated)', color: 'var(--muted-dim)' }
            }>
            {ls('Week', 'Semana')}
          </button>
        </div>
      </div>

      {/* Trip cards */}
      {loading ? (
        <div className="text-center py-16" style={{ color: 'var(--muted-dim)' }}>Loading...</div>
      ) : trips.length === 0 ? (
        <div className="text-center py-16 nayara-card">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: 'rgba(78,94,62,0.08)' }}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--sage)">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p style={{ color: 'var(--muted-dim)' }}>
            {ls('No trips scheduled', 'No hay viajes programados')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map(trip => {
            const isTour = trip.assignment_type === 'tour';
            const stLabel = STATUS_LABELS[trip.status] || STATUS_LABELS.scheduled;
            const action = STATUS_ACTIONS[trip.status];
            const passengers = Array.isArray(trip.tour_passengers) ? trip.tour_passengers.filter(p => p) : [];
            const paxCount = isTour ? (trip.tour_pax_count || 0) : (trip.num_passengers || 0);

            return (
              <div key={trip.id} className="nayara-card overflow-hidden">
                {/* Time + status header */}
                <div className="flex items-center justify-between px-5 py-3"
                  style={{ background: 'var(--elevated)', borderBottom: '1px solid var(--separator)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black" style={{ color: 'var(--charcoal)' }}>
                      {trip.start_time?.slice(0, 5)}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--muted-dim)' }}>
                      – {trip.end_time?.slice(0, 5)}
                    </span>
                    {filter === 'week' && trip.date !== today && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md"
                        style={{ background: 'rgba(170,142,103,0.1)', color: '#AA8E67' }}>
                        {formatDate(trip.date)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md"
                    style={{ background: `${stLabel.color}15`, color: stLabel.color }}>
                    {locale === 'es' ? stLabel.es : stLabel.en}
                  </span>
                </div>

                <div className="p-5 space-y-3">
                  {/* Title */}
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: isTour ? 'rgba(78,94,62,0.1)' : 'rgba(170,142,103,0.1)', color: isTour ? '#4E5E3E' : '#AA8E67' }}>
                        {isTour ? 'Tour' : 'Transfer'}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg" style={{ color: 'var(--charcoal)' }}>
                      {isTour
                        ? (locale === 'es' ? trip.tour_name_es : trip.tour_name_en) || 'Tour'
                        : `${trip.transfer_origin || '?'} → ${trip.transfer_destination || '?'}`
                      }
                    </h3>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--muted-dim)' }}>
                        {ls('Boat', 'Bote')}
                      </div>
                      <div className="font-medium" style={{ color: 'var(--charcoal)' }}>{trip.boat_name}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--muted-dim)' }}>
                        {ls('Passengers', 'Pasajeros')}
                      </div>
                      <div className="font-medium" style={{ color: 'var(--charcoal)' }}>{paxCount} pax</div>
                    </div>
                    {isTour && trip.tour_location && (
                      <div className="col-span-2">
                        <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--muted-dim)' }}>
                          {ls('Meeting Point', 'Punto de Encuentro')}
                        </div>
                        <div className="font-medium text-sm" style={{ color: 'var(--charcoal)' }}>
                          {locale === 'es' ? (trip.meeting_point_es || trip.meeting_point_en) : (trip.meeting_point_en || trip.meeting_point_es) || trip.tour_location}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Passenger list (for tours) */}
                  {isTour && passengers.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--muted-dim)' }}>
                        {ls('Guest List', 'Lista de Huéspedes')}
                      </div>
                      <div className="space-y-1">
                        {passengers.map((p, i) => (
                          <div key={i} className="flex items-center justify-between text-sm py-1 px-2 rounded"
                            style={{ background: 'var(--elevated)' }}>
                            <span style={{ color: 'var(--charcoal)' }}>{p.name || ls('Guest', 'Huésped')}</span>
                            <span className="text-xs" style={{ color: 'var(--muted-dim)' }}>{p.num_guests} pax</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {trip.notes && (
                    <div className="text-xs italic rounded-lg p-2"
                      style={{ background: 'rgba(170,142,103,0.06)', color: 'var(--muted-dim)' }}>
                      {trip.notes}
                    </div>
                  )}

                  {/* Action button */}
                  {action && trip.date <= today && (
                    <button
                      onClick={() => updateStatus(trip.id, action.next)}
                      disabled={updatingId === trip.id}
                      className="w-full py-3 rounded-xl font-bold text-white text-sm transition-opacity disabled:opacity-50"
                      style={{ background: action.color, boxShadow: `0 4px 12px ${action.color}40` }}>
                      {updatingId === trip.id ? '...' : (locale === 'es' ? action.label_es : action.label_en)}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
