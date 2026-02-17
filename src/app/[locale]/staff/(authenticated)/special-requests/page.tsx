'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { SpecialRequestModal } from './SpecialRequestModal';

const DEPARTMENTS = ['concierge', 'housekeeping', 'maintenance', 'food_beverage', 'spa', 'front_desk', 'management'];
const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-600',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function SpecialRequestsPage() {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [deptFilter, setDeptFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

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

  const handleStatusUpdate = async (id: string, status: string) => {
    await fetch('/api/special-requests', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    fetchRequests();
  };

  const openNew = () => { setSelectedRequest(null); setModalOpen(true); };
  const openEdit = (req: any) => { setSelectedRequest(req); setModalOpen(true); };

  const deptLabel = (d: string) => d.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  const filtered = requests.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.request?.toLowerCase().includes(q) ||
      r.guest_name?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{ls('Special Requests', 'Solicitudes Especiales')}</h1>
        <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + {ls('New Request', 'Nueva Solicitud')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={ls('Search requests...', 'Buscar solicitudes...')}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-1">
          {['all', ...STATUSES].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s === 'all' ? ls('All', 'Todas') : s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="all">{ls('All Departments', 'Todos los Depto.')}</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{deptLabel(d)}</option>)}
        </select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-400 text-sm">{ls('Loading...', 'Cargando...')}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <p className="text-gray-400 text-sm">{ls('No requests found', 'Sin solicitudes')}</p>
          </div>
        ) : filtered.map(r => (
          <div key={r.id} className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-start gap-3 hover:border-blue-200 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100'}`}>
                  {r.status?.replace('_', ' ')}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{deptLabel(r.department)}</span>
                {r.priority && r.priority !== 'normal' && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[r.priority] ?? 'bg-gray-100'}`}>
                    {r.priority}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-900 mt-2">{r.request}</p>
              <div className="mt-1 text-xs text-gray-500">
                {r.guest_name && <span>{r.guest_name} · </span>}
                {r.date ? new Date(r.date + 'T12:00:00').toLocaleDateString() : '—'}
                {r.time ? ` ${r.time.slice(0, 5)}` : ''}
                {r.assigned_to_name && <span className="ml-2">→ {r.assigned_to_name}</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
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
              <button onClick={() => openEdit(r)}
                className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-xs hover:bg-gray-100 font-medium">
                {ls('Edit', 'Editar')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <SpecialRequestModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        request={selectedRequest}
        onSuccess={fetchRequests}
      />
    </div>
  );
}
