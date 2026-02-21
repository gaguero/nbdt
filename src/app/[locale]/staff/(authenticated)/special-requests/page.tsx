'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { statusColor, priorityColor } from '@/lib/statusColors';
import { SpecialRequestModal } from './SpecialRequestModal';

const DEPARTMENTS = ['concierge', 'housekeeping', 'maintenance', 'food_beverage', 'spa', 'front_desk', 'management'];
const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

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
    await fetch('/api/special-requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    fetchRequests();
  };

  const openNew = () => { setSelectedRequest(null); setModalOpen(true); };
  const openEdit = (req: any) => { setSelectedRequest(req); setModalOpen(true); };
  const deptLabel = (d: string) => d.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  const filtered = requests.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.request?.toLowerCase().includes(q) || r.guest_name?.toLowerCase().includes(q) || r.department?.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-5 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold italic" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>
            {ls('Special Requests', 'Solicitudes Especiales')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-dim)' }}>
            {ls('Track and resolve guest requests by department.', 'Gestione solicitudes de huéspedes por departamento.')}
          </p>
        </div>
        <button onClick={openNew} className="nayara-btn nayara-btn-primary">
          <PlusIcon className="h-4 w-4" />
          {ls('New Request', 'Nueva Solicitud')}
        </button>
      </div>

      {/* Filters */}
      <div className="nayara-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 pointer-events-none" style={{ color: 'var(--muted-dim)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={ls('Search requests...', 'Buscar solicitudes...')}
            className="nayara-input pl-9"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {['all', ...STATUSES].map(s => {
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors"
                style={active
                  ? { background: 'var(--gold)', color: '#fff' }
                  : { background: 'var(--elevated)', color: 'var(--muted-dim)' }
                }
              >
                {s === 'all' ? ls('All', 'Todas') : s.replace('_', ' ')}
              </button>
            );
          })}
        </div>

        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="nayara-input"
          style={{ width: 'auto', paddingRight: '2rem' }}
        >
          <option value="all">{ls('All Departments', 'Todos los Depto.')}</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{deptLabel(d)}</option>)}
        </select>
      </div>

      {/* Request list */}
      <div className="space-y-2">
        {loading ? (
          <div className="nayara-card p-10 text-center">
            <div className="h-7 w-7 border-2 border-t-transparent rounded-full mx-auto mb-2 animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: 'var(--muted-dim)' }}>{ls('Loading...', 'Cargando...')}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="nayara-card p-12 text-center">
            <p className="text-sm italic" style={{ color: 'var(--muted-dim)' }}>{ls('No requests found', 'Sin solicitudes')}</p>
          </div>
        ) : filtered.map(r => (
          <div
            key={r.id}
            className="nayara-card p-4 flex flex-col sm:flex-row sm:items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <span className={statusColor(r.status)}>{r.status?.replace('_', ' ')}</span>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--elevated)', color: 'var(--muted-dim)' }}
                >
                  {deptLabel(r.department)}
                </span>
                {r.priority && r.priority !== 'normal' && (
                  <span className={priorityColor(r.priority)}>{r.priority}</span>
                )}
              </div>
              <p className="text-sm mt-2" style={{ color: 'var(--charcoal)' }}>{r.request}</p>
              <div className="mt-1 text-xs" style={{ color: 'var(--muted-dim)' }}>
                {r.guest_name && <span>{r.guest_name} · </span>}
                {r.date ? new Date(r.date + 'T12:00:00').toLocaleDateString() : '—'}
                {r.time ? ` ${r.time.slice(0, 5)}` : ''}
                {r.assigned_to_name && <span className="ml-2">→ {r.assigned_to_name}</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              {r.status === 'pending' && (
                <button onClick={() => handleStatusUpdate(r.id, 'in_progress')} className="nayara-btn nayara-btn-secondary text-xs px-3 py-1.5">
                  {ls('Start', 'Iniciar')}
                </button>
              )}
              {(r.status === 'pending' || r.status === 'in_progress') && (
                <button onClick={() => handleStatusUpdate(r.id, 'completed')} className="nayara-btn nayara-btn-secondary text-xs px-3 py-1.5" style={{ background: 'rgba(58,74,46,0.12)', color: 'var(--forest)', borderColor: 'rgba(58,74,46,0.2)' }}>
                  {ls('Complete', 'Completar')}
                </button>
              )}
              <button onClick={() => openEdit(r)} className="nayara-btn nayara-btn-ghost text-xs px-3 py-1.5">
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
