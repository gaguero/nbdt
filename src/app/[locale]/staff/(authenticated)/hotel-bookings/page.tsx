'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-500',
};

export default function HotelBookingsPage() {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    date: new Date().toISOString().split('T')[0],
    guest_id: '',
    hotel_id: '',
    num_guests: 1,
    checkin: '',
    checkout: '',
    notes: '',
  });

  const fetch_ = () => {
    setLoading(true);
    fetch('/api/hotel-bookings')
      .then(r => r.json())
      .then(d => setBookings(d.hotel_bookings ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch_(); }, []);
  useEffect(() => {
    fetch('/api/guests').then(r => r.json()).then(d => setGuests(d.guests ?? []));
    fetch('/api/hotel-bookings?hotels=true').then(r => r.json()).then(d => setHotels(d.hotels ?? []));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/hotel-bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) {
        setShowForm(false);
        setForm({ date: new Date().toISOString().split('T')[0], guest_id: '', hotel_id: '', num_guests: 1, checkin: '', checkout: '', notes: '' });
        fetch_();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (id: string, field: string, value: string) => {
    await fetch('/api/hotel-bookings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, [field]: value }) });
    fetch_();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{ls('Other Hotel Bookings', 'Reservas en Otros Hoteles')}</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + {ls('New Booking', 'Nueva Reserva')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">{ls('New Hotel Booking', 'Nueva Reserva de Hotel')}</h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Date', 'Fecha')} *</label>
              <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Guest', 'Huésped')}</label>
              <select value={form.guest_id} onChange={e => setForm({ ...form, guest_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">{ls('Select guest...', 'Seleccionar huésped...')}</option>
                {guests.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Hotel', 'Hotel')} *</label>
              <select required value={form.hotel_id} onChange={e => setForm({ ...form, hotel_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">{ls('Select hotel...', 'Seleccionar hotel...')}</option>
                {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('# Guests', '# Huéspedes')}</label>
              <input type="number" min={1} value={form.num_guests} onChange={e => setForm({ ...form, num_guests: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Check-in', 'Check-in')}</label>
              <input type="date" value={form.checkin} onChange={e => setForm({ ...form, checkin: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Check-out', 'Check-out')}</label>
              <input type="date" value={form.checkout} onChange={e => setForm({ ...form, checkout: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Notes', 'Notas')}</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? ls('Saving...', 'Guardando...') : ls('Save', 'Guardar')}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                {ls('Cancel', 'Cancelar')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3">{ls('Date', 'Fecha')}</th>
                <th className="px-4 py-3">{ls('Guest', 'Huésped')}</th>
                <th className="px-4 py-3">{ls('Hotel', 'Hotel')}</th>
                <th className="px-4 py-3">{ls('Dates', 'Fechas')}</th>
                <th className="px-4 py-3">{ls('Guests', 'Hués.')}</th>
                <th className="px-4 py-3">{ls('Guest Status', 'Estado Hués.')}</th>
                <th className="px-4 py-3">{ls('Vendor Status', 'Estado Prov.')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">{ls('Loading...', 'Cargando...')}</td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">{ls('No bookings found', 'Sin reservas')}</td></tr>
              ) : bookings.map(b => (
                <tr key={b.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{b.date ? new Date(b.date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">{b.guest_name ?? '—'}</td>
                  <td className="px-4 py-3">{b.hotel_name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {b.checkin ? new Date(b.checkin).toLocaleDateString() : '—'} → {b.checkout ? new Date(b.checkout).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">{b.num_guests}</td>
                  <td className="px-4 py-3">
                    <select value={b.guest_status} onChange={e => handleStatusUpdate(b.id, 'guest_status', e.target.value)}
                      className={`text-xs rounded-full px-2 py-1 border-0 font-medium cursor-pointer ${STATUS_COLORS[b.guest_status] ?? 'bg-gray-100'}`}>
                      {['pending','confirmed','completed','cancelled','no_show'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select value={b.vendor_status} onChange={e => handleStatusUpdate(b.id, 'vendor_status', e.target.value)}
                      className={`text-xs rounded-full px-2 py-1 border-0 font-medium cursor-pointer ${STATUS_COLORS[b.vendor_status] ?? 'bg-gray-100'}`}>
                      {['pending','confirmed','completed','cancelled','no_show'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
