'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

interface Transfer {
  id: string;
  date: string;
  time: string;
  guest_name: string;
  vendor_name: string;
  num_passengers: number;
  origin: string;
  destination: string;
  transfer_type: string;
  guest_status: string;
  vendor_status: string;
  notes: string;
  flight_number: string;
}

const FILTERS = ['today', 'upcoming', 'past', 'all'];
const GUEST_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
const VENDOR_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-600',
};

export default function TransfersPage() {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today');
  const [guests, setGuests] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    date: new Date().toISOString().split('T')[0],
    time: '',
    guest_id: '',
    vendor_id: '',
    num_passengers: 1,
    origin: '',
    destination: '',
    transfer_type: 'arrival',
    flight_number: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const fetchTransfers = () => {
    setLoading(true);
    fetch(`/api/transfers?filter=${filter === 'all' ? '' : filter}`)
      .then(r => r.json())
      .then(d => setTransfers(d.transfers ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransfers();
  }, [filter]);

  useEffect(() => {
    fetch('/api/guests').then(r => r.json()).then(d => setGuests(d.guests ?? []));
    fetch('/api/vendors').then(r => r.json()).then(d => setVendors(d.vendors ?? []));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { ...form, id: editingId } : form;
      const res = await fetch('/api/transfers', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        setShowForm(false);
        setEditingId(null);
        setForm({ date: new Date().toISOString().split('T')[0], time: '', guest_id: '', vendor_id: '', num_passengers: 1, origin: '', destination: '', transfer_type: 'arrival', flight_number: '', notes: '' });
        fetchTransfers();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (id: string, field: 'guest_status' | 'vendor_status', value: string) => {
    setUpdatingStatus(id + field);
    await fetch('/api/transfers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, [field]: value }) });
    setUpdatingStatus(null);
    fetchTransfers();
  };

  const handleEdit = (t: Transfer) => {
    setForm({
      date: t.date?.split('T')[0] ?? '',
      time: t.time ?? '',
      guest_id: '',
      vendor_id: '',
      num_passengers: t.num_passengers,
      origin: t.origin ?? '',
      destination: t.destination ?? '',
      transfer_type: t.transfer_type ?? 'arrival',
      flight_number: t.flight_number ?? '',
      notes: t.notes ?? '',
    });
    setEditingId(t.id);
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{ls('Transfers', 'Traslados')}</h1>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          + {ls('New Transfer', 'Nuevo Traslado')}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {f === 'all' ? ls('All', 'Todos') : f === 'today' ? ls('Today', 'Hoy') : f === 'upcoming' ? ls('Upcoming', 'Próximos') : ls('Past', 'Pasados')}
          </button>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">{editingId ? ls('Edit Transfer', 'Editar Traslado') : ls('New Transfer', 'Nuevo Traslado')}</h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Date', 'Fecha')} *</label>
              <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Time', 'Hora')}</label>
              <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Type', 'Tipo')}</label>
              <select value={form.transfer_type} onChange={e => setForm({ ...form, transfer_type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="arrival">{ls('Arrival', 'Llegada')}</option>
                <option value="departure">{ls('Departure', 'Salida')}</option>
                <option value="inter_hotel">{ls('Inter-hotel', 'Entre hoteles')}</option>
                <option value="activity">{ls('Activity', 'Actividad')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Guest', 'Huésped')}</label>
              <select value={form.guest_id} onChange={e => setForm({ ...form, guest_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">{ls('Select guest...', 'Seleccionar huésped...')}</option>
                {guests.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Vendor', 'Proveedor')}</label>
              <select value={form.vendor_id} onChange={e => setForm({ ...form, vendor_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">{ls('Select vendor...', 'Seleccionar proveedor...')}</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Passengers', 'Pasajeros')}</label>
              <input type="number" min={1} value={form.num_passengers} onChange={e => setForm({ ...form, num_passengers: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Origin', 'Origen')} *</label>
              <input type="text" required value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} placeholder="e.g. Bocas Airport" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Destination', 'Destino')} *</label>
              <input type="text" required value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="e.g. Nayara BDT" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Flight #', 'Vuelo #')}</label>
              <input type="text" value={form.flight_number} onChange={e => setForm({ ...form, flight_number: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Notes', 'Notas')}</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex gap-3">
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

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3">{ls('Date/Time', 'Fecha/Hora')}</th>
                <th className="px-4 py-3">{ls('Guest', 'Huésped')}</th>
                <th className="px-4 py-3">{ls('Route', 'Ruta')}</th>
                <th className="px-4 py-3">{ls('Vendor', 'Proveedor')}</th>
                <th className="px-4 py-3">{ls('Pax', 'Pax')}</th>
                <th className="px-4 py-3">{ls('Guest Status', 'Estado Hués.')}</th>
                <th className="px-4 py-3">{ls('Vendor Status', 'Estado Prov.')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">{ls('Loading...', 'Cargando...')}</td></tr>
              ) : transfers.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">{ls('No transfers found', 'Sin traslados')}</td></tr>
              ) : transfers.map((t) => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium">{t.date ? new Date(t.date).toLocaleDateString() : '—'}</div>
                    <div className="text-xs text-gray-500">{t.time ? t.time.slice(0, 5) : '—'}</div>
                  </td>
                  <td className="px-4 py-3">{t.guest_name || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs">{t.origin || '—'}</div>
                    <div className="text-xs text-gray-500">→ {t.destination || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{t.vendor_name || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3 text-center">{t.num_passengers}</td>
                  <td className="px-4 py-3">
                    <select
                      value={t.guest_status}
                      disabled={updatingStatus === t.id + 'guest_status'}
                      onChange={e => handleStatusUpdate(t.id, 'guest_status', e.target.value)}
                      className={`text-xs rounded-full px-2 py-1 border-0 font-medium cursor-pointer ${STATUS_COLORS[t.guest_status] ?? 'bg-gray-100'}`}
                    >
                      {GUEST_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={t.vendor_status}
                      disabled={updatingStatus === t.id + 'vendor_status'}
                      onChange={e => handleStatusUpdate(t.id, 'vendor_status', e.target.value)}
                      className={`text-xs rounded-full px-2 py-1 border-0 font-medium cursor-pointer ${STATUS_COLORS[t.vendor_status] ?? 'bg-gray-100'}`}
                    >
                      {VENDOR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleEdit(t)} className="text-xs text-blue-600 hover:underline">
                      {ls('Edit', 'Editar')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500">
          {transfers.length} {ls('transfers', 'traslados')}
        </div>
      </div>
    </div>
  );
}
