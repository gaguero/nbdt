'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

const DEPARTMENTS = ['concierge', 'housekeeping', 'maintenance', 'food_beverage', 'spa', 'front_desk', 'management'];
const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function SpecialRequestsPage() {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [deptFilter, setDeptFilter] = useState('all');
  const [guests, setGuests] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '',
    guest_id: '',
    request: '',
    department: 'concierge',
    check_in: '',
    check_out: '',
  });

  const fetchRequests = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (deptFilter !== 'all') params.set('department', deptFilter);
    fetch(`/api/special-requests?${params}`)
      .then(r => r.json())
      .then(d => setRequests(d.special_requests ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRequests(); }, [statusFilter, deptFilter]);
  useEffect(() => {
    fetch('/api/guests').then(r => r.json()).then(d => setGuests(d.guests ?? []));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/special-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) {
        setShowForm(false);
        setForm({ date: new Date().toISOString().split('T')[0], time: '', guest_id: '', request: '', department: 'concierge', check_in: '', check_out: '' });
        fetchRequests();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    await fetch('/api/special-requests', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    fetchRequests();
  };

  const deptLabel = (d: string) => d.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{ls('Special Requests', 'Solicitudes Especiales')}</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + {ls('New Request', 'Nueva Solicitud')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {['all', ...STATUSES].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s === 'all' ? ls('All', 'Todas') : s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-xs">
          <option value="all">{ls('All Departments', 'Todos los Depto.')}</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{deptLabel(d)}</option>)}
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">{ls('New Special Request', 'Nueva Solicitud Especial')}</h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Date', 'Fecha')} *</label>
              <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Time', 'Hora')}</label>
              <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Guest', 'Huésped')}</label>
              <select value={form.guest_id} onChange={e => setForm({ ...form, guest_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">{ls('Select guest...', 'Seleccionar huésped...')}</option>
                {guests.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Department', 'Departamento')} *</label>
              <select required value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                {DEPARTMENTS.map(d => <option key={d} value={d}>{deptLabel(d)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Check-in Date', 'Check-in')}</label>
              <input type="date" value={form.check_in} onChange={e => setForm({ ...form, check_in: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Check-out Date', 'Check-out')}</label>
              <input type="date" value={form.check_out} onChange={e => setForm({ ...form, check_out: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Request', 'Solicitud')} *</label>
              <textarea required rows={3} value={form.request} onChange={e => setForm({ ...form, request: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder={ls('Describe the request...', 'Describe la solicitud...')} />
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

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-400 text-sm">{ls('Loading...', 'Cargando...')}</div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-400 text-sm">{ls('No requests found', 'Sin solicitudes')}</div>
        ) : requests.map(r => (
          <div key={r.id} className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex-1">
              <div className="flex items-start gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100'}`}>
                  {r.status?.replace('_', ' ')}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{deptLabel(r.department)}</span>
              </div>
              <p className="text-sm text-gray-900 mt-2">{r.request}</p>
              <div className="mt-1 text-xs text-gray-500">
                {r.guest_name && <span>{r.guest_name} · </span>}
                {r.date ? new Date(r.date).toLocaleDateString() : '—'}
                {r.time ? ` ${r.time.slice(0, 5)}` : ''}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {r.status === 'pending' && (
                <button onClick={() => handleStatusUpdate(r.id, 'in_progress')}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100 font-medium">
                  {ls('Start', 'Iniciar')}
                </button>
              )}
              {(r.status === 'pending' || r.status === 'in_progress') && (
                <button onClick={() => handleStatusUpdate(r.id, 'completed')}
                  className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs hover:bg-green-100 font-medium">
                  {ls('Complete', 'Completar')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
