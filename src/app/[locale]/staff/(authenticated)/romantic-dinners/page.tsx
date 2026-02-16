'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

const LOCATIONS = ['Beach', 'Overwater Deck', 'Jungle Platform', 'Room Terrace', 'Restaurant', 'Pool Area', 'Other'];
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-pink-100 text-pink-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function RomanticDinnersPage() {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const [dinners, setDinners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [guests, setGuests] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    guest_id: '',
    num_guests: 2,
    location: '',
    notes: '',
  });

  const fetch_ = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter === 'today') { const today = new Date().toISOString().split('T')[0]; params.set('date_from', today); params.set('date_to', today); }
    else if (filter === 'upcoming') params.set('date_from', new Date().toISOString().split('T')[0]);
    fetch(`/api/romantic-dinners?${params}`)
      .then(r => r.json())
      .then(d => setDinners(d.romantic_dinners ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch_(); }, [filter]);
  useEffect(() => {
    fetch('/api/guests?profileType=all').then(r => r.json()).then(d => setGuests(d.guests ?? []));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/romantic-dinners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) {
        setShowForm(false);
        setForm({ date: new Date().toISOString().split('T')[0], time: '19:00', guest_id: '', num_guests: 2, location: '', notes: '' });
        fetch_();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    await fetch('/api/romantic-dinners', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    fetch_();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{ls('Romantic Dinners', 'Cenas Románticas')}</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-pink-600 text-white rounded-lg text-sm hover:bg-pink-700">
          + {ls('New Dinner', 'Nueva Cena')}</button>
      </div>

      <div className="flex gap-2">
        {['today', 'upcoming', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f === 'today' ? ls('Today', 'Hoy') : f === 'upcoming' ? ls('Upcoming', 'Próximas') : ls('All', 'Todas')}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">{ls('New Romantic Dinner', 'Nueva Cena Romántica')}</h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Date', 'Fecha')} *</label>
              <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Time', 'Hora')} *</label>
              <input type="time" required value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Guest', 'Huésped')}</label>
              <select value={form.guest_id} onChange={e => setForm({ ...form, guest_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">{ls('Select guest...', 'Seleccionar huésped...')}</option>
                {guests.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('# Guests', '# Personas')}</label>
              <input type="number" min={1} value={form.num_guests} onChange={e => setForm({ ...form, num_guests: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Location', 'Ubicación')}</label>
              <select value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">{ls('Select location...', 'Seleccionar ubicación...')}</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Notes', 'Notas')}</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder={ls('Special requests, decorations, dietary...', 'Solicitudes especiales, decoraciones, dieta...')} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-pink-600 text-white rounded-lg text-sm hover:bg-pink-700 disabled:opacity-50">
                {saving ? ls('Saving...', 'Guardando...') : ls('Save', 'Guardar')}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                {ls('Cancel', 'Cancelar')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Calendar-style list */}
      {loading ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-400 text-sm">{ls('Loading...', 'Cargando...')}</div>
      ) : dinners.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-400 text-sm">{ls('No romantic dinners scheduled', 'Sin cenas románticas programadas')}</div>
      ) : (
        <div className="space-y-3">
          {dinners.map(d => (
            <div key={d.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
              {/* Date column */}
              <div className="flex-shrink-0 text-center bg-pink-50 rounded-lg px-3 py-2 min-w-[60px]">
                <div className="text-xs text-pink-500 font-medium">{d.date ? new Date(d.date).toLocaleDateString(locale === 'es' ? 'es-CR' : 'en-US', { month: 'short' }).toUpperCase() : '—'}</div>
                <div className="text-2xl font-bold text-pink-700">{d.date ? new Date(d.date).getDate() : '—'}</div>
                <div className="text-xs text-pink-500">{d.time ? d.time.slice(0, 5) : '—'}</div>
              </div>
              {/* Info */}
              <div className="flex-1">
                <div className="font-medium text-gray-900">{d.guest_name ?? ls('Guest not specified', 'Huésped no especificado')}</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {d.location && <span className="mr-3">📍 {d.location}</span>}
                  <span>👥 {d.num_guests} {ls('guests', 'personas')}</span>
                </div>
                {d.notes && <div className="text-xs text-gray-500 mt-1 italic">{d.notes}</div>}
              </div>
              {/* Status */}
              <div className="flex flex-col items-end gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status] ?? 'bg-gray-100'}`}>{d.status}</span>
                <div className="flex gap-1">
                  {d.status === 'pending' && (
                    <button onClick={() => handleStatusUpdate(d.id, 'confirmed')} className="text-xs text-pink-600 hover:underline">{ls('Confirm', 'Confirmar')}</button>
                  )}
                  {d.status === 'confirmed' && (
                    <button onClick={() => handleStatusUpdate(d.id, 'completed')} className="text-xs text-green-600 hover:underline">{ls('Complete', 'Completar')}</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
