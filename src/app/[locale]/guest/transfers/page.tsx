'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGuestAuth } from '@/contexts/GuestAuthContext';

interface Transfer {
  id: string;
  date: string;
  time: string;
  origin: string;
  destination: string;
  transfer_type: string;
  guest_status: string;
  num_passengers: number;
  flight_number: string;
  requires_boat: boolean;
  vendor_name: string;
  boat_name: string;
  notes: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label_en: string; label_es: string }> = {
  pending: { bg: 'rgba(217,170,60,0.12)', text: '#B8941E', label_en: 'Pending', label_es: 'Pendiente' },
  confirmed: { bg: 'rgba(78,94,62,0.12)', text: '#4E5E3E', label_en: 'Confirmed', label_es: 'Confirmado' },
  completed: { bg: 'rgba(78,94,62,0.08)', text: '#6B7F5A', label_en: 'Completed', label_es: 'Completado' },
  cancelled: { bg: 'rgba(156,163,175,0.12)', text: '#9CA3AF', label_en: 'Cancelled', label_es: 'Cancelado' },
  no_show: { bg: 'rgba(236,108,75,0.1)', text: '#EC6C4B', label_en: 'No Show', label_es: 'No Show' },
};

const TYPE_LABELS: Record<string, { en: string; es: string }> = {
  arrival: { en: 'Arrival', es: 'Llegada' },
  departure: { en: 'Departure', es: 'Salida' },
  inter_hotel: { en: 'Inter-Hotel', es: 'Inter-Hotel' },
  activity: { en: 'Activity', es: 'Actividad' },
};

export default function GuestTransfersPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const isEs = locale === 'es';
  const { guest } = useGuestAuth();

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // New transfer form state
  const [showForm, setShowForm] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newOrigin, setNewOrigin] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newPassengers, setNewPassengers] = useState(1);
  const [newNotes, setNewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTransfers = () => {
    setLoading(true);
    fetch('/api/guest/transfers', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setTransfers(d.transfers || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (guest) fetchTransfers();
  }, [guest]);

  const handleCancel = async (id: string) => {
    if (!confirm(isEs ? 'Cancelar este traslado?' : 'Cancel this transfer?')) return;
    setCancellingId(id);
    try {
      await fetch('/api/guest/transfers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, action: 'cancel' }),
      });
      fetchTransfers();
    } finally {
      setCancellingId(null);
    }
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/guest/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date: newDate,
          time: newTime || null,
          origin: newOrigin,
          destination: newDestination,
          num_passengers: newPassengers,
          notes: newNotes || null,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setNewDate(''); setNewTime(''); setNewOrigin(''); setNewDestination(''); setNewNotes(''); setNewPassengers(1);
        fetchTransfers();
      }
    } finally {
      setSubmitting(false);
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold" style={{ color: '#1a2e12', fontFamily: 'var(--font-gelasio), Georgia, serif', fontStyle: 'italic' }}>
          {isEs ? 'Mis Traslados' : 'My Transfers'}
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs font-medium px-3 py-1.5 rounded-xl"
          style={{ background: '#4E5E3E', color: '#fff' }}>
          {showForm ? (isEs ? 'Cerrar' : 'Close') : (isEs ? '+ Solicitar' : '+ Request')}
        </button>
      </div>

      {/* New transfer form */}
      {showForm && (
        <form onSubmit={handleSubmitNew} className="rounded-xl p-4 mb-4 space-y-3"
          style={{ background: '#fff', border: '1px solid #e5e2db' }}>
          <h3 className="text-sm font-semibold" style={{ color: '#1a2e12' }}>
            {isEs ? 'Solicitar Nuevo Traslado' : 'Request New Transfer'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider block mb-1" style={{ color: '#6B7F5A' }}>
                {isEs ? 'Fecha' : 'Date'}
              </label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid #e5e2db', color: '#1a2e12' }} />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider block mb-1" style={{ color: '#6B7F5A' }}>
                {isEs ? 'Hora Preferida' : 'Preferred Time'}
              </label>
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid #e5e2db', color: '#1a2e12' }} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider block mb-1" style={{ color: '#6B7F5A' }}>
              {isEs ? 'Origen' : 'Origin'}
            </label>
            <input type="text" value={newOrigin} onChange={e => setNewOrigin(e.target.value)} required
              placeholder={isEs ? 'Ej: Nayara Resort' : 'e.g. Nayara Resort'}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid #e5e2db', color: '#1a2e12' }} />
          </div>
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider block mb-1" style={{ color: '#6B7F5A' }}>
              {isEs ? 'Destino' : 'Destination'}
            </label>
            <input type="text" value={newDestination} onChange={e => setNewDestination(e.target.value)} required
              placeholder={isEs ? 'Ej: Aeropuerto Bocas' : 'e.g. Bocas Airport'}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid #e5e2db', color: '#1a2e12' }} />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#6B7F5A' }}>
              {isEs ? 'Pasajeros' : 'Passengers'}
            </label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setNewPassengers(Math.max(1, newPassengers - 1))}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                style={{ border: '1px solid #e5e2db', color: '#6B7F5A' }}>−</button>
              <span className="font-semibold text-sm w-6 text-center" style={{ color: '#1a2e12' }}>{newPassengers}</span>
              <button type="button" onClick={() => setNewPassengers(newPassengers + 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                style={{ border: '1px solid #e5e2db', color: '#6B7F5A' }}>+</button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider block mb-1" style={{ color: '#6B7F5A' }}>
              {isEs ? 'Notas' : 'Notes'}
            </label>
            <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
              style={{ border: '1px solid #e5e2db', color: '#1a2e12' }} />
          </div>
          <button type="submit" disabled={submitting}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#4E5E3E' }}>
            {submitting ? '...' : (isEs ? 'Enviar Solicitud' : 'Submit Request')}
          </button>
        </form>
      )}

      {/* Transfers list */}
      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: '#9CA3AF' }}>
          {isEs ? 'Cargando...' : 'Loading...'}
        </div>
      ) : transfers.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: '#9CA3AF' }}>
          {isEs ? 'No tienes traslados' : 'You have no transfers'}
        </div>
      ) : (
        <div className="space-y-3">
          {transfers.map(t => {
            const st = STATUS_STYLES[t.guest_status] || STATUS_STYLES.pending;
            const typeLabel = TYPE_LABELS[t.transfer_type] || { en: t.transfer_type, es: t.transfer_type };
            return (
              <div key={t.id} className="rounded-xl p-4"
                style={{ background: '#fff', border: '1px solid #e5e2db' }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(78,94,62,0.08)', color: '#4E5E3E' }}>
                      {isEs ? typeLabel.es : typeLabel.en}
                    </span>
                    {t.requires_boat && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(78,150,200,0.1)', color: '#4E96C8' }}>
                        Boat
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: st.bg, color: st.text }}>
                    {isEs ? st.label_es : st.label_en}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm" style={{ color: '#1a2e12' }}>{t.origin || '?'}</span>
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#9CA3AF">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                  </svg>
                  <span className="font-semibold text-sm" style={{ color: '#1a2e12' }}>{t.destination || '?'}</span>
                </div>

                <div className="text-xs" style={{ color: '#6B7F5A' }}>
                  <span>{formatDate(t.date)}</span>
                  {t.time && <span> · {t.time.slice(0, 5)}</span>}
                  <span> · {t.num_passengers} {isEs ? 'pax' : 'pax'}</span>
                  {t.flight_number && <span> · {isEs ? 'Vuelo' : 'Flight'}: {t.flight_number}</span>}
                  {t.boat_name && <span> · {t.boat_name}</span>}
                </div>

                {t.guest_status === 'pending' && (
                  <button
                    onClick={() => handleCancel(t.id)}
                    disabled={cancellingId === t.id}
                    className="mt-3 text-xs font-medium px-3 py-1.5 rounded-lg"
                    style={{ color: '#EC6C4B', background: 'rgba(236,108,75,0.08)', border: '1px solid rgba(236,108,75,0.2)' }}>
                    {cancellingId === t.id ? '...' : (isEs ? 'Cancelar' : 'Cancel')}
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
