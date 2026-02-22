'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
  pending: { bg: 'rgba(170,142,103,0.15)', text: '#AA8E67', label_en: 'Pending', label_es: 'Pendiente' },
  confirmed: { bg: 'rgba(78,94,62,0.12)', text: '#4E5E3E', label_en: 'Confirmed', label_es: 'Confirmado' },
  completed: { bg: 'rgba(78,94,62,0.08)', text: '#6B7F5A', label_en: 'Completed', label_es: 'Completado' },
  cancelled: { bg: 'rgba(156,163,175,0.1)', text: '#9CA3AF', label_en: 'Cancelled', label_es: 'Cancelado' },
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
  const locale = params.locale as string;
  const isEs = locale === 'es';
  const { guest } = useGuestAuth();

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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
    <div className="max-w-lg mx-auto px-5 py-5">
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: '#AA8E67', letterSpacing: '0.15em' }}>
            {isEs ? 'Transporte' : 'Transport'}
          </p>
          <h1 className="text-[22px] font-semibold" style={{ color: '#1a2e12', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
            {isEs ? 'Traslados' : 'Transfers'}
          </h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-[11px] font-semibold tracking-wider uppercase px-4 py-2 rounded-full"
          style={showForm
            ? { background: 'transparent', color: '#B0B0A8', border: '1px solid rgba(170,142,103,0.15)' }
            : { background: '#1a2e12', color: '#fff', letterSpacing: '0.06em' }
          }>
          {showForm ? (isEs ? 'Cerrar' : 'Close') : (isEs ? '+ Solicitar' : '+ Request')}
        </button>
      </div>

      {/* New transfer form */}
      {showForm && (
        <form onSubmit={handleSubmitNew} className="rounded-2xl p-5 mb-5 space-y-4"
          style={{ background: '#fff', border: '1px solid rgba(170,142,103,0.1)' }}>
          <h3 className="text-sm font-semibold" style={{ color: '#1a2e12' }}>
            {isEs ? 'Solicitar Nuevo Traslado' : 'Request New Transfer'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider block mb-1.5" style={{ color: '#AA8E67', letterSpacing: '0.1em' }}>
                {isEs ? 'Fecha' : 'Date'}
              </label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ border: '1px solid rgba(170,142,103,0.15)', color: '#1a2e12', background: '#F7F6F2' }} />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider block mb-1.5" style={{ color: '#AA8E67', letterSpacing: '0.1em' }}>
                {isEs ? 'Hora Preferida' : 'Preferred Time'}
              </label>
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ border: '1px solid rgba(170,142,103,0.15)', color: '#1a2e12', background: '#F7F6F2' }} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider block mb-1.5" style={{ color: '#AA8E67', letterSpacing: '0.1em' }}>
              {isEs ? 'Origen' : 'Origin'}
            </label>
            <input type="text" value={newOrigin} onChange={e => setNewOrigin(e.target.value)} required
              placeholder={isEs ? 'Ej: Nayara Resort' : 'e.g. Nayara Resort'}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ border: '1px solid rgba(170,142,103,0.15)', color: '#1a2e12', background: '#F7F6F2' }} />
          </div>
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider block mb-1.5" style={{ color: '#AA8E67', letterSpacing: '0.1em' }}>
              {isEs ? 'Destino' : 'Destination'}
            </label>
            <input type="text" value={newDestination} onChange={e => setNewDestination(e.target.value)} required
              placeholder={isEs ? 'Ej: Aeropuerto Bocas' : 'e.g. Bocas Airport'}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ border: '1px solid rgba(170,142,103,0.15)', color: '#1a2e12', background: '#F7F6F2' }} />
          </div>
          <div className="flex items-center gap-4">
            <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AA8E67', letterSpacing: '0.1em' }}>
              {isEs ? 'Pasajeros' : 'Passengers'}
            </label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setNewPassengers(Math.max(1, newPassengers - 1))}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ border: '1px solid rgba(170,142,103,0.2)', color: '#8B7D6B' }}>-</button>
              <span className="font-semibold text-sm w-6 text-center" style={{ color: '#1a2e12' }}>{newPassengers}</span>
              <button type="button" onClick={() => setNewPassengers(newPassengers + 1)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ border: '1px solid rgba(170,142,103,0.2)', color: '#8B7D6B' }}>+</button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider block mb-1.5" style={{ color: '#AA8E67', letterSpacing: '0.1em' }}>
              {isEs ? 'Notas' : 'Notes'}
            </label>
            <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} rows={2}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
              style={{ border: '1px solid rgba(170,142,103,0.15)', color: '#1a2e12', background: '#F7F6F2' }} />
          </div>
          <button type="submit" disabled={submitting}
            className="w-full py-3 rounded-full text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#1a2e12' }}>
            {submitting ? '...' : (isEs ? 'Enviar Solicitud' : 'Submit Request')}
          </button>
        </form>
      )}

      {/* Transfers list */}
      {loading ? (
        <div className="text-center py-20 text-sm" style={{ color: '#B0B0A8' }}>
          {isEs ? 'Cargando...' : 'Loading...'}
        </div>
      ) : transfers.length === 0 ? (
        <div className="text-center py-20">
          <svg className="h-12 w-12 mx-auto mb-3 opacity-15" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="#AA8E67">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <p className="text-sm" style={{ color: '#B0B0A8' }}>
            {isEs ? 'No tienes traslados' : 'You have no transfers'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transfers.map(t => {
            const st = STATUS_STYLES[t.guest_status] || STATUS_STYLES.pending;
            const typeLabel = TYPE_LABELS[t.transfer_type] || { en: t.transfer_type, es: t.transfer_type };
            return (
              <div key={t.id} className="rounded-2xl p-4"
                style={{ background: '#fff', border: '1px solid rgba(170,142,103,0.1)' }}>
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(78,94,62,0.08)', color: '#4E5E3E', letterSpacing: '0.05em' }}>
                      {isEs ? typeLabel.es : typeLabel.en}
                    </span>
                    {t.requires_boat && (
                      <span className="text-[9px] font-semibold tracking-wide px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(78,150,200,0.1)', color: '#4E96C8' }}>
                        Boat
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full"
                    style={{ background: st.bg, color: st.text, letterSpacing: '0.05em' }}>
                    {isEs ? st.label_es : st.label_en}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm" style={{ color: '#1a2e12' }}>{t.origin || '?'}</span>
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#AA8E67">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                  </svg>
                  <span className="font-semibold text-sm" style={{ color: '#1a2e12' }}>{t.destination || '?'}</span>
                </div>

                <div className="text-xs" style={{ color: '#8B7D6B' }}>
                  <span>{formatDate(t.date)}</span>
                  {t.time && <span> · {t.time.slice(0, 5)}</span>}
                  <span> · {t.num_passengers} pax</span>
                  {t.flight_number && <span> · {isEs ? 'Vuelo' : 'Flight'}: {t.flight_number}</span>}
                  {t.boat_name && <span> · {t.boat_name}</span>}
                </div>

                {t.guest_status === 'pending' && (
                  <button
                    onClick={() => handleCancel(t.id)}
                    disabled={cancellingId === t.id}
                    className="mt-3 text-[11px] font-medium px-4 py-1.5 rounded-full transition-colors"
                    style={{ color: '#EC6C4B', background: 'rgba(236,108,75,0.06)', border: '1px solid rgba(236,108,75,0.15)' }}>
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
