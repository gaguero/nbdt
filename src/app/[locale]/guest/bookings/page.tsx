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
  pending: { bg: 'rgba(217,170,60,0.12)', text: '#B8941E', label_en: 'Pending', label_es: 'Pendiente' },
  confirmed: { bg: 'rgba(78,94,62,0.12)', text: '#4E5E3E', label_en: 'Confirmed', label_es: 'Confirmado' },
  completed: { bg: 'rgba(78,94,62,0.08)', text: '#6B7F5A', label_en: 'Completed', label_es: 'Completado' },
  cancelled: { bg: 'rgba(156,163,175,0.12)', text: '#9CA3AF', label_en: 'Cancelled', label_es: 'Cancelado' },
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
    <div className="max-w-lg mx-auto px-4 py-5">
      <h1 className="text-xl font-semibold mb-4" style={{ color: '#1a2e12', fontFamily: 'var(--font-gelasio), Georgia, serif', fontStyle: 'italic' }}>
        {isEs ? 'Mis Reservas' : 'My Bookings'}
      </h1>

      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: '#9CA3AF' }}>
          {isEs ? 'Cargando...' : 'Loading...'}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: '#9CA3AF' }}>
          {isEs ? 'No tienes reservas' : 'You have no bookings'}
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => {
            const st = STATUS_STYLES[b.guest_status] || STATUS_STYLES.pending;
            return (
              <div key={b.id} className="rounded-xl p-4"
                style={{ background: '#fff', border: '1px solid #e5e2db' }}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm" style={{ color: '#1a2e12' }}>
                    {isEs ? (b.name_es || b.name_en) : (b.name_en || b.name_es)}
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                    style={{ background: st.bg, color: st.text }}>
                    {isEs ? st.label_es : st.label_en}
                  </span>
                </div>
                <div className="text-xs space-y-0.5" style={{ color: '#6B7F5A' }}>
                  <p>{formatDate(b.schedule_date)} {b.start_time && `· ${b.start_time.slice(0, 5)}`}</p>
                  <p>{b.num_guests} {isEs ? 'personas' : 'guests'} · {b.booking_mode === 'private' ? (isEs ? 'Privado' : 'Private') : (isEs ? 'Compartido' : 'Shared')}</p>
                  {b.special_requests && <p className="italic text-xs" style={{ color: '#9CA3AF' }}>"{b.special_requests}"</p>}
                </div>
                {b.guest_status === 'pending' && (
                  <button
                    onClick={() => handleCancel(b.id)}
                    disabled={cancellingId === b.id}
                    className="mt-3 text-xs font-medium px-3 py-1.5 rounded-lg"
                    style={{ color: '#EC6C4B', background: 'rgba(236,108,75,0.08)', border: '1px solid rgba(236,108,75,0.2)' }}>
                    {cancellingId === b.id ? '...' : (isEs ? 'Cancelar' : 'Cancel')}
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
