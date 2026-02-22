'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useGuestAuth } from '@/contexts/GuestAuthContext';

interface Booking {
  id: string;
  name_en: string;
  name_es: string;
  schedule_date: string;
  start_time: string;
  num_guests: number;
  guest_status: string;
  booking_mode: string;
  duration_minutes: number;
  location: string;
  meeting_point_en: string;
  meeting_point_es: string;
  special_requests: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label_en: string; label_es: string }> = {
  pending: { bg: 'rgba(170,142,103,0.15)', text: '#AA8E67', label_en: 'Pending', label_es: 'Pendiente' },
  confirmed: { bg: 'rgba(78,94,62,0.12)', text: '#4E5E3E', label_en: 'Confirmed', label_es: 'Confirmado' },
  completed: { bg: 'rgba(78,94,62,0.08)', text: '#6B7F5A', label_en: 'Completed', label_es: 'Completado' },
  cancelled: { bg: 'rgba(156,163,175,0.1)', text: '#9CA3AF', label_en: 'Cancelled', label_es: 'Cancelado' },
  no_show: { bg: 'rgba(236,108,75,0.1)', text: '#EC6C4B', label_en: 'No Show', label_es: 'No Show' },
};

export default function GuestBookingsPage() {
  const params = useParams();
  const locale = params.locale as string;
  const isEs = locale === 'es';
  const { guest } = useGuestAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchBookings = () => {
    setLoading(true);
    fetch('/api/guest/tour-bookings', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setBookings(d.bookings || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (guest) fetchBookings();
  }, [guest]);

  const handleCancel = async (id: string) => {
    if (!confirm(isEs ? 'Cancelar esta reserva?' : 'Cancel this booking?')) return;
    setCancellingId(id);
    try {
      await fetch('/api/guest/tour-bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, action: 'cancel' }),
      });
      fetchBookings();
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const dateStr = d.includes('T') ? d.split('T')[0] : d;
    const date = new Date(dateStr + 'T12:00:00');
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString(isEs ? 'es-CR' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-lg mx-auto px-5 py-5">
      <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: '#AA8E67', letterSpacing: '0.15em' }}>
        {isEs ? 'Mis actividades' : 'My activities'}
      </p>
      <h1 className="text-[22px] font-semibold mb-5" style={{ color: '#1a2e12', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
        {isEs ? 'Reservas' : 'Bookings'}
      </h1>

      {loading ? (
        <div className="text-center py-20 text-sm" style={{ color: '#B0B0A8' }}>
          {isEs ? 'Cargando...' : 'Loading...'}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20">
          <svg className="h-12 w-12 mx-auto mb-3 opacity-15" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="#AA8E67">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <p className="text-sm" style={{ color: '#B0B0A8' }}>
            {isEs ? 'No tienes reservas' : 'You have no bookings yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => {
            const st = STATUS_STYLES[b.guest_status] || STATUS_STYLES.pending;
            return (
              <div key={b.id} className="rounded-2xl p-4"
                style={{ background: '#fff', border: '1px solid rgba(170,142,103,0.1)' }}>
                <div className="flex items-start justify-between mb-2.5">
                  <h3 className="font-semibold text-sm" style={{ color: '#1a2e12', fontFamily: 'Georgia, serif' }}>
                    {isEs ? (b.name_es || b.name_en) : (b.name_en || b.name_es)}
                  </h3>
                  <span className="text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                    style={{ background: st.bg, color: st.text, letterSpacing: '0.05em' }}>
                    {isEs ? st.label_es : st.label_en}
                  </span>
                </div>
                <div className="text-xs space-y-1" style={{ color: '#8B7D6B' }}>
                  <div className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    {formatDate(b.schedule_date)} {b.start_time && `· ${b.start_time.slice(0, 5)}`}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    {b.num_guests} {isEs ? 'personas' : 'guests'} · {b.booking_mode === 'private' ? (isEs ? 'Privado' : 'Private') : (isEs ? 'Compartido' : 'Shared')}
                  </div>
                  {b.special_requests && (
                    <p className="italic text-[11px] mt-1.5 pl-5" style={{ color: '#B0B0A8' }}>"{b.special_requests}"</p>
                  )}
                </div>
                {b.guest_status === 'pending' && (
                  <button
                    onClick={() => handleCancel(b.id)}
                    disabled={cancellingId === b.id}
                    className="mt-3 text-[11px] font-medium px-4 py-1.5 rounded-full transition-colors"
                    style={{ color: '#EC6C4B', background: 'rgba(236,108,75,0.06)', border: '1px solid rgba(236,108,75,0.15)' }}>
                    {cancellingId === b.id ? '...' : (isEs ? 'Cancelar Reserva' : 'Cancel Booking')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
