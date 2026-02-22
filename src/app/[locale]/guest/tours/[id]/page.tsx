'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGuestAuth } from '@/contexts/GuestAuthContext';

interface Schedule {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity_remaining: number;
  override_price: string | null;
}

export default function TourDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const tourId = params.id as string;
  const isEs = locale === 'es';
  const { guest } = useGuestAuth();

  const [product, setProduct] = useState<any>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const [numGuests, setNumGuests] = useState(1);
  const [bookingMode, setBookingMode] = useState('shared');
  const [specialRequests, setSpecialRequests] = useState('');
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    fetch(`/api/guest/tours/${tourId}`)
      .then(r => r.json())
      .then(d => {
        setProduct(d.product);
        setSchedules(d.schedules || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tourId]);

  const handleBook = async () => {
    if (!selectedSchedule && schedules.length > 0) return;
    setBookingStatus('submitting');
    setBookingError('');

    try {
      const res = await fetch('/api/guest/tour-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          product_id: tourId,
          schedule_id: selectedSchedule,
          num_guests: numGuests,
          booking_mode: bookingMode,
          special_requests: specialRequests || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Booking failed');
      }

      setBookingStatus('success');
    } catch (err: any) {
      setBookingError(err.message);
      setBookingStatus('error');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-sm" style={{ color: '#9CA3AF' }}>
        {isEs ? 'Cargando...' : 'Loading...'}
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-sm" style={{ color: '#9CA3AF' }}>{isEs ? 'Tour no encontrado' : 'Tour not found'}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm font-medium" style={{ color: '#4E5E3E' }}>
          {isEs ? 'Volver' : 'Go Back'}
        </button>
      </div>
    );
  }

  const name = isEs ? (product.name_es || product.name_en) : (product.name_en || product.name_es);
  const desc = isEs ? (product.description_es || product.description_en) : (product.description_en || product.description_es);
  const meetingPoint = isEs ? (product.meeting_point_es || product.meeting_point_en) : (product.meeting_point_en || product.meeting_point_es);

  const images = Array.isArray(product.images) ? product.images : [];
  const heroImg = images[0] || `https://placehold.co/600x300/1a2e12/FAFAF7?text=${encodeURIComponent(name.slice(0, 20))}`;

  const formatDuration = (mins: number) => {
    if (!mins) return '';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h} ${isEs ? 'horas' : 'hours'}`;
  };

  const formatDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString(isEs ? 'es-CR' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  if (bookingStatus === 'success') {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(78,94,62,0.1)' }}>
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#4E5E3E">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: '#1a2e12' }}>
          {isEs ? 'Solicitud Enviada' : 'Booking Requested'}
        </h2>
        <p className="text-sm mb-6" style={{ color: '#6B7F5A' }}>
          {isEs
            ? 'Nuestro equipo de conserjería confirmará su reserva a la brevedad.'
            : 'Our concierge team will confirm your booking shortly.'
          }
        </p>
        <button onClick={() => router.push(`/${locale}/guest/bookings`)}
          className="px-6 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: '#4E5E3E' }}>
          {isEs ? 'Ver Mis Reservas' : 'View My Bookings'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Hero image */}
      <div className="relative h-56">
        <img src={heroImg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
        <button onClick={() => router.back()}
          className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-white text-xl font-semibold drop-shadow-lg">{name}</h1>
          {product.location && (
            <p className="text-white/70 text-sm mt-0.5">{product.location}</p>
          )}
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Info pills */}
        <div className="flex flex-wrap gap-2">
          {product.duration_minutes > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(78,94,62,0.1)', color: '#4E5E3E' }}>
              {formatDuration(product.duration_minutes)}
            </span>
          )}
          {product.requires_boat && (
            <span className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(78,150,200,0.1)', color: '#4E96C8' }}>
              {isEs ? 'En Bote' : 'By Boat'}
            </span>
          )}
          {product.booking_mode !== 'private' && product.price_per_person && (
            <span className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(170,142,103,0.1)', color: '#AA8E67' }}>
              ${parseFloat(product.price_per_person).toFixed(0)}/{isEs ? 'persona' : 'person'}
            </span>
          )}
          {product.booking_mode !== 'shared' && product.price_private && (
            <span className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(170,142,103,0.1)', color: '#AA8E67' }}>
              ${parseFloat(product.price_private).toFixed(0)} {isEs ? 'privado' : 'private'}
            </span>
          )}
        </div>

        {/* Description */}
        {desc && (
          <div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#1a2e12' }}>
              {isEs ? 'Descripción' : 'Description'}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: '#6B7F5A' }}>{desc}</p>
          </div>
        )}

        {/* Meeting point */}
        {meetingPoint && (
          <div className="rounded-xl p-3.5" style={{ background: 'rgba(78,94,62,0.06)', border: '1px solid rgba(78,94,62,0.12)' }}>
            <p className="text-xs font-medium" style={{ color: '#4E5E3E' }}>
              {isEs ? 'Punto de encuentro' : 'Meeting Point'}
            </p>
            <p className="text-sm mt-0.5" style={{ color: '#1a2e12' }}>{meetingPoint}</p>
          </div>
        )}

        {/* Booking section */}
        {guest && (
          <div className="space-y-4 pt-2">
            <h3 className="text-base font-semibold" style={{ color: '#1a2e12' }}>
              {isEs ? 'Reservar Este Tour' : 'Book This Tour'}
            </h3>

            {/* Schedule selector */}
            {schedules.length > 0 ? (
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: '#6B7F5A' }}>
                  {isEs ? 'Fecha y Hora' : 'Date & Time'}
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {schedules.map(s => (
                    <button key={s.id}
                      onClick={() => setSelectedSchedule(s.id)}
                      className="flex items-center justify-between rounded-xl p-3 text-left transition-colors"
                      style={{
                        background: selectedSchedule === s.id ? 'rgba(78,94,62,0.1)' : '#fff',
                        border: `1px solid ${selectedSchedule === s.id ? '#4E5E3E' : '#e5e2db'}`,
                      }}>
                      <div>
                        <span className="text-sm font-medium" style={{ color: '#1a2e12' }}>
                          {formatDate(s.date)}
                        </span>
                        <span className="text-sm ml-2" style={{ color: '#6B7F5A' }}>
                          {s.start_time?.slice(0, 5)}
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>
                        {s.capacity_remaining} {isEs ? 'disponibles' : 'spots left'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                {isEs ? 'Horarios a confirmar con el concierge' : 'Schedule to be confirmed with concierge'}
              </p>
            )}

            {/* Mode selector */}
            {product.booking_mode === 'either' && (
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: '#6B7F5A' }}>
                  {isEs ? 'Modalidad' : 'Mode'}
                </label>
                <div className="flex gap-2">
                  {['shared', 'private'].map(mode => (
                    <button key={mode}
                      onClick={() => setBookingMode(mode)}
                      className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                      style={{
                        background: bookingMode === mode ? '#4E5E3E' : '#fff',
                        color: bookingMode === mode ? '#fff' : '#6B7F5A',
                        border: `1px solid ${bookingMode === mode ? '#4E5E3E' : '#e5e2db'}`,
                      }}>
                      {mode === 'shared' ? (isEs ? 'Compartido' : 'Shared') : (isEs ? 'Privado' : 'Private')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Guests count */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: '#6B7F5A' }}>
                {isEs ? 'Número de Personas' : 'Number of Guests'}
              </label>
              <div className="flex items-center gap-3">
                <button onClick={() => setNumGuests(Math.max(1, numGuests - 1))}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-medium"
                  style={{ border: '1px solid #e5e2db', color: '#6B7F5A' }}>
                  −
                </button>
                <span className="text-lg font-semibold w-8 text-center" style={{ color: '#1a2e12' }}>{numGuests}</span>
                <button onClick={() => setNumGuests(Math.min(product.max_guests_per_booking || 10, numGuests + 1))}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-medium"
                  style={{ border: '1px solid #e5e2db', color: '#6B7F5A' }}>
                  +
                </button>
              </div>
            </div>

            {/* Special requests */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: '#6B7F5A' }}>
                {isEs ? 'Solicitudes Especiales' : 'Special Requests'}
              </label>
              <textarea
                value={specialRequests}
                onChange={e => setSpecialRequests(e.target.value)}
                placeholder={isEs ? 'Opcional: alergias, equipamiento especial...' : 'Optional: allergies, special equipment...'}
                rows={2}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
                style={{ background: '#fff', border: '1px solid #e5e2db', color: '#1a2e12' }}
              />
            </div>

            {bookingError && (
              <div className="rounded-xl px-4 py-3 text-sm"
                style={{ background: 'rgba(236,108,75,0.1)', border: '1px solid rgba(236,108,75,0.3)', color: '#EC6C4B' }}>
                {bookingError}
              </div>
            )}

            <button
              onClick={handleBook}
              disabled={bookingStatus === 'submitting' || (schedules.length > 0 && !selectedSchedule)}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#4E5E3E', boxShadow: '0 4px 12px rgba(78,94,62,0.25)' }}>
              {bookingStatus === 'submitting'
                ? (isEs ? 'Enviando...' : 'Submitting...')
                : (isEs ? 'Solicitar Reserva' : 'Request Booking')
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
