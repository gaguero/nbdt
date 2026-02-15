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

export default function TourBookingsPage() {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [guests, setGuests] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    product_id: '',
    schedule_id: '',
    guest_id: '',
    booking_mode: 'shared',
    num_guests: 1,
    special_requests: '',
    notes: '',
  });

  const fetchBookings = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter === 'today') { const today = new Date().toISOString().split('T')[0]; params.set('date_from', today); params.set('date_to', today); }
    else if (filter === 'upcoming') { params.set('date_from', new Date().toISOString().split('T')[0]); }
    fetch(`/api/tour-bookings?${params}`)
      .then(r => r.json())
      .then(d => setBookings(d.tour_bookings ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [filter]);
  useEffect(() => {
    fetch('/api/guests').then(r => r.json()).then(d => setGuests(d.guests ?? []));
    fetch('/api/tour-products').then(r => r.json()).then(d => setProducts(d.tour_products ?? []));
  }, []);

  const handleProductChange = async (productId: string) => {
    setForm({ ...form, product_id: productId, schedule_id: '' });
    if (productId) {
      const res = await fetch(`/api/tour-schedules?product_id=${productId}&available=true`);
      const data = await res.json();
      setSchedules(data.tour_schedules ?? []);
    } else {
      setSchedules([]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/tour-bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) {
        setShowForm(false);
        setForm({ product_id: '', schedule_id: '', guest_id: '', booking_mode: 'shared', num_guests: 1, special_requests: '', notes: '' });
        setSchedules([]);
        fetchBookings();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (id: string, field: string, value: string) => {
    await fetch('/api/tour-bookings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, [field]: value }) });
    fetchBookings();
  };

  const formatSchedule = (s: any) => {
    const d = new Date(s.date).toLocaleDateString();
    const t = s.start_time?.slice(0, 5) ?? '';
    const cap = `(${s.capacity_remaining}/${s.capacity_total} ${ls('spots', 'lugares')})`;
    return `${d} at ${t} ${cap}`;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{ls('Tours & Activities', 'Tours y Actividades')}</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + {ls('New Booking', 'Nueva Reserva')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['today', 'upcoming', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f === 'today' ? ls('Today', 'Hoy') : f === 'upcoming' ? ls('Upcoming', 'Próximos') : ls('All', 'Todos')}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">{ls('New Tour Booking', 'Nueva Reserva de Tour')}</h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Guest', 'Huésped')}</label>
              <select value={form.guest_id} onChange={e => setForm({ ...form, guest_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">{ls('Select guest...', 'Seleccionar huésped...')}</option>
                {guests.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Tour / Activity', 'Tour / Actividad')} *</label>
              <select required value={form.product_id} onChange={e => handleProductChange(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">{ls('Select product...', 'Seleccionar producto...')}</option>
                {products.map(p => <option key={p.id} value={p.id}>{locale === 'es' ? p.name_es : p.name_en}</option>)}
              </select>
            </div>
            {form.product_id && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Available Slot', 'Horario Disponible')}</label>
                <select value={form.schedule_id} onChange={e => setForm({ ...form, schedule_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">{ls('Select slot...', 'Seleccionar horario...')}</option>
                  {schedules.map(s => <option key={s.id} value={s.id}>{formatSchedule(s)}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Mode', 'Modalidad')}</label>
              <select value={form.booking_mode} onChange={e => setForm({ ...form, booking_mode: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="shared">{ls('Shared', 'Compartido')}</option>
                <option value="private">{ls('Private', 'Privado')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('# Guests', '# Huéspedes')} *</label>
              <input type="number" required min={1} value={form.num_guests} onChange={e => setForm({ ...form, num_guests: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Special Requests', 'Solicitudes Especiales')}</label>
              <textarea rows={2} value={form.special_requests} onChange={e => setForm({ ...form, special_requests: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? ls('Saving...', 'Guardando...') : ls('Book', 'Reservar')}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                {ls('Cancel', 'Cancelar')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3">{ls('Tour', 'Tour')}</th>
                <th className="px-4 py-3">{ls('Guest', 'Huésped')}</th>
                <th className="px-4 py-3">{ls('Date', 'Fecha')}</th>
                <th className="px-4 py-3">{ls('Mode', 'Mod.')}</th>
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
                  <td className="px-4 py-3 font-medium">{locale === 'es' ? (b.name_es ?? b.name_en) : (b.name_en ?? b.name_es)}</td>
                  <td className="px-4 py-3">{b.guest_name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{b.schedule_date ? new Date(b.schedule_date).toLocaleDateString() : '—'}<br />{b.start_time?.slice(0, 5) ?? ''}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${b.booking_mode === 'private' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>
                      {b.booking_mode}
                    </span>
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
