'use client';

import { useEffect, useState, Suspense } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { localDateString, localDateOffset } from '@/lib/dates';
import { statusColor } from '@/lib/statusColors';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  CalendarIcon,
  TruckIcon,
  UserIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import { TransferModal } from './TransferModal';
import Button from '@/components/ui/Button';

function TransfersContent() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;
  const initialDate = searchParams.get('date') || '';

  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialDate ? '' : 'today');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<any | null>(null);

  const fetchTransfers = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedDate) {
      params.set('date_from', selectedDate);
      params.set('date_to', selectedDate);
    } else if (filter === 'today') {
      const today = localDateString();
      params.set('date_from', today);
      params.set('date_to', today);
    } else if (filter === 'upcoming') {
      params.set('date_from', localDateString());
    } else if (filter === 'past') {
      params.set('date_to', localDateOffset(-1));
    }

    fetch(`/api/transfers?${params}`)
      .then(r => r.json())
      .then(d => setTransfers(d.transfers ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTransfers(); }, [filter, selectedDate]);

  const handleOpenCreate = () => { setEditingTransfer(null); setIsModalOpen(true); };
  const handleOpenEdit = (t: any) => { setEditingTransfer(t); setIsModalOpen(true); };

  const handleModalSuccess = (savedTransfer?: any) => {
    if (!savedTransfer?.id) { fetchTransfers(); return; }
    setTransfers(prev => {
      const exists = prev.some(t => t.id === savedTransfer.id);
      if (!exists) return [savedTransfer, ...prev];
      return prev.map(t => t.id === savedTransfer.id ? savedTransfer : t);
    });
    setEditingTransfer((prev: any) => prev?.id === savedTransfer.id ? savedTransfer : prev);
  };

  const searchLower = search.toLowerCase();
  const displayed = search
    ? transfers.filter(t =>
        t.guest_name?.toLowerCase().includes(searchLower) ||
        t.origin?.toLowerCase().includes(searchLower) ||
        t.destination?.toLowerCase().includes(searchLower) ||
        t.vendor_name?.toLowerCase().includes(searchLower)
      )
    : transfers;

  const TABS = ['all', 'upcoming', 'today', 'past'];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold italic" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>
            {ls('Transfers', 'Traslados')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-dim)' }}>
            {ls('Coordinate guest arrivals and departures.', 'Coordine llegadas y salidas.')}
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <PlusIcon className="h-4 w-4 mr-1.5" />
          {ls('New Transfer', 'Nuevo Traslado')}
        </Button>
      </div>

      {/* Table card */}
      <div className="nayara-card overflow-hidden">
        {/* Toolbar */}
        <div
          className="p-4 flex flex-wrap gap-3 items-center justify-between"
          style={{ borderBottom: '1px solid var(--separator)' }}
        >
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-2.5" style={{ color: 'var(--muted-dim)' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={ls('Search...', 'Buscar...')}
                className="nayara-input pl-9 w-56"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>

            {/* Filter tabs */}
            <div
              className="flex p-1 rounded-lg gap-0.5"
              style={{ background: 'var(--elevated)', border: '1px solid var(--separator)' }}
            >
              {TABS.map(f => {
                const active = filter === f && !selectedDate;
                return (
                  <button
                    key={f}
                    onClick={() => { setFilter(f); setSelectedDate(''); }}
                    className="px-3 py-1 text-xs font-bold rounded-md transition-colors capitalize"
                    style={active
                      ? { background: 'var(--gold)', color: '#fff' }
                      : { color: 'var(--muted-dim)' }
                    }
                  >
                    {ls(
                      f.charAt(0).toUpperCase() + f.slice(1),
                      f === 'all' ? 'Todos' : f === 'today' ? 'Hoy' : f === 'upcoming' ? 'Próximos' : 'Pasados'
                    )}
                  </button>
                );
              })}
            </div>

            {/* Date picker */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--elevated)', border: '1px solid var(--separator)' }}
            >
              <CalendarIcon className="h-4 w-4" style={{ color: 'var(--muted-dim)' }} />
              <input
                type="date"
                value={selectedDate}
                onChange={e => { setSelectedDate(e.target.value); setFilter(''); }}
                className="text-xs font-bold bg-transparent border-none focus:ring-0 cursor-pointer outline-none"
                style={{ color: 'var(--charcoal)' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted-dim)' }}>
            <FunnelIcon className="h-3.5 w-3.5" />
            {displayed.length} {ls('Records', 'Registros')}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full nayara-table">
            <thead>
              <tr>
                <th className="px-6 py-4">{ls('Route', 'Ruta')}</th>
                <th className="px-6 py-4">{ls('Guest', 'Huésped')}</th>
                <th className="px-6 py-4">{ls('Date & Time', 'Fecha y Hora')}</th>
                <th className="px-6 py-4">{ls('Vendor', 'Proveedor')}</th>
                <th className="px-6 py-4">{ls('Status', 'Estado')}</th>
                <th className="px-6 py-4 text-right">{ls('Actions', 'Acciones')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-20">
                  <div className="h-8 w-8 border-2 border-t-transparent rounded-full mx-auto mb-3 animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
                  <p className="text-sm animate-pulse" style={{ color: 'var(--muted-dim)' }}>{ls('Loading...', 'Cargando...')}</p>
                </td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-20">
                  <TruckIcon className="h-10 w-10 mx-auto mb-2 opacity-20" style={{ color: 'var(--sage)' }} />
                  <p className="text-sm italic" style={{ color: 'var(--muted-dim)' }}>{ls('No transfers found', 'No se encontraron traslados')}</p>
                </td></tr>
              ) : displayed.map(t => (
                <tr key={t.id} className={t.guest_status === 'cancelled' ? 'opacity-40' : ''}>
                  <td className="px-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ background: 'rgba(78,94,62,0.10)', color: 'var(--sage)' }}>
                        <ArrowsRightLeftIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm" style={{ color: 'var(--charcoal)' }}>
                          {t.origin} <span style={{ color: 'var(--muted-dim)' }}>→</span> {t.destination}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: 'var(--muted-dim)' }}>
                          {t.transfer_type} · {t.num_passengers} Pax{t.flight_number ? ` · Flt ${t.flight_number}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--elevated)', color: 'var(--muted-dim)' }}>
                        <UserIcon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--charcoal)' }}>{t.guest_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-6">
                    <div className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
                      {t.date ? new Date(t.date).toLocaleDateString() : '—'}
                    </div>
                    <div className="text-[11px] font-bold uppercase" style={{ color: 'var(--muted-dim)' }}>
                      {t.time?.slice(0, 5) ?? '--:--'}
                    </div>
                  </td>
                  <td className="px-6">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded"
                      style={{ background: 'var(--elevated)', color: 'var(--muted)' }}
                    >
                      {t.vendor_name || '—'}
                    </span>
                  </td>
                  <td className="px-6">
                    <div className="flex flex-col gap-1">
                      <span className={statusColor(t.guest_status)}>
                        Guest: {t.guest_status}
                      </span>
                      <span className={statusColor(t.vendor_status)}>
                        Vendor: {t.vendor_status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 text-right">
                    <button
                      onClick={() => handleOpenEdit(t)}
                      className="nayara-btn nayara-btn-ghost text-xs"
                    >
                      {ls('Edit', 'Editar')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TransferModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transfer={editingTransfer}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}

export default function TransfersPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm animate-pulse" style={{ color: 'var(--muted-dim)' }}>Loading...</div>}>
      <TransfersContent />
    </Suspense>
  );
}
