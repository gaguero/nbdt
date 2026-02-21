'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  ArrowPathIcon,
  CloudArrowUpIcon,
  CalendarIcon,
  UserIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';

interface Reservation {
  id: string;
  opera_resv_id: string;
  status: string;
  room: string;
  guest_name: string;
  opera_guest_name?: string;
  arrival: string;
  departure: string;
  nights: number;
  room_category: string;
  last_synced_at: string;
}

const STATUS_FILTERS = ['ALL', 'CHECKED IN', 'RESERVED', 'CHECKED OUT', 'CANCELLED'];

function ReservationsContent() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;
  
  const initialFilter = searchParams.get('filter') || 'CHECKED IN';
  const initialDate = searchParams.get('date') || '';

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(initialFilter.toUpperCase());
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [syncStats, setSyncStats] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchReservations = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== 'ALL') {
      if (status === 'ARRIVALS') params.set('filter', 'arrivals');
      else if (status === 'DEPARTURES') params.set('filter', 'departures');
      else params.set('status', status);
    }
    if (search) params.set('search', search);
    if (selectedDate) params.set('date', selectedDate);

    fetch(`/api/reservations?${params}`)
      .then((r) => r.json())
      .then((d) => { setReservations(d.reservations ?? []); })
      .finally(() => setLoading(false));
  };

  const fetchSyncStats = () => {
    fetch('/api/opera/import')
      .then((r) => r.json())
      .then(setSyncStats)
      .catch(() => {});
  };

  useEffect(() => { 
    fetchReservations(); 
    fetchSyncStats(); 
  }, [status, selectedDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReservations();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/opera/import', { method: 'POST', body: formData });
      const data = await res.json();
      setImportResult(data);
      if (data.success) {
        fetchReservations();
        fetchSyncStats();
      }
    } catch (err) {
      setImportResult({ success: false, error: 'Upload failed' });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold italic" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>{ls('Reservations', 'Reservas')}</h1>
          <p className="text-sm text-gray-500 font-medium">
            {syncStats?.lastSync ? (
              <span className="flex items-center gap-1">
                <ArrowPathIcon className="h-3 w-3" />
                {ls('Last synced:', 'Sincronizado:')} {new Date(syncStats.lastSync).toLocaleString()}
              </span>
            ) : ls('Opera PMS Integration', 'Integración Opera PMS')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            onClick={() => fileRef.current?.click()} 
            disabled={importing}
            className="shadow-sm"
          >
            {importing ? (
              <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <CloudArrowUpIcon className="h-5 w-5 mr-2" />
            )}
            {ls('Import Opera XML', 'Importar XML')}
          </Button>
          <input ref={fileRef} type="file" accept=".xml,text/xml,application/xml" onChange={handleImport} className="hidden" />
        </div>
      </div>

      {importResult && (
        <div className="nayara-card p-4 text-sm" style={importResult.success ? { background: 'rgba(78,94,62,0.08)', borderColor: 'rgba(78,94,62,0.25)', color: 'var(--sage)' } : { background: 'rgba(236,108,75,0.08)', borderColor: 'rgba(236,108,75,0.25)', color: 'var(--terra)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded-full ${importResult.success ? 'bg-green-200' : 'bg-red-200'}`}>
                {importResult.success ? '✓' : '!'}
              </div>
              <strong>{importResult.success ? ls('Import successful', 'Importación exitosa') : ls('Import failed', 'Error al importar')}</strong>
            </div>
            <button onClick={() => setImportResult(null)} className="text-xs underline">{ls('Dismiss', 'Cerrar')}</button>
          </div>
          {importResult.success && (
            <div className="mt-2 ml-7 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-90 font-medium">
              <span>{importResult.result.total} {ls('Processed', 'Procesadas')}</span>
              <span className="text-green-700 font-bold">{importResult.result.created} {ls('New', 'Nuevas')}</span>
              <span className="text-blue-700 font-bold">{importResult.result.updated} {ls('Updated', 'Actualizadas')}</span>
              <span className="text-gray-500">{importResult.result.unchanged} {ls('Unchanged', 'Sin cambios')}</span>
            </div>
          )}
        </div>
      )}

      <div className="nayara-card overflow-hidden">
        <div className="p-4 flex flex-wrap gap-4 items-center justify-between" style={{ borderBottom: '1px solid var(--separator)' }}>
          <div className="flex flex-wrap gap-2 items-center">
            <form onSubmit={handleSearchSubmit} className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-2.5" style={{ color: 'var(--muted-dim)' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={ls('Search...', 'Buscar...')}
                className="nayara-input pl-9 w-56"
                style={{ paddingLeft: '2.25rem' }}
              />
            </form>

            <div className="flex p-1 rounded-lg gap-0.5 overflow-x-auto max-w-full" style={{ background: 'var(--elevated)', border: '1px solid var(--separator)' }}>
              {['ALL', 'CHECKED IN', 'ARRIVALS', 'DEPARTURES', 'CANCELLED'].map(s => {
                const active = status === s;
                return (
                  <button
                    key={s}
                    onClick={() => { setStatus(s); if (s !== 'ARRIVALS' && s !== 'DEPARTURES') setSelectedDate(''); }}
                    className="px-3 py-1 text-xs font-bold rounded-md transition-colors whitespace-nowrap"
                    style={active ? { background: 'var(--gold)', color: '#fff' } : { color: 'var(--muted-dim)' }}
                  >
                    {ls(s, s === 'ALL' ? 'Todas' : s === 'ARRIVALS' ? 'Llegadas' : s === 'DEPARTURES' ? 'Salidas' : s)}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--elevated)', border: '1px solid var(--separator)' }}>
              <CalendarIcon className="h-4 w-4" style={{ color: 'var(--muted-dim)' }} />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="text-xs font-bold bg-transparent border-none focus:ring-0 cursor-pointer outline-none"
                style={{ color: 'var(--charcoal)' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted-dim)' }}>
            <FunnelIcon className="h-3.5 w-3.5" />
            {reservations.length} {ls('Results', 'Resultados')}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full nayara-table">
            <thead>
              <tr>
                <th className="px-6 py-4">{ls('Room', 'Habitación')}</th>
                <th className="px-6 py-4">{ls('Guest', 'Huésped')}</th>
                <th className="px-6 py-4">{ls('Stay Period', 'Estancia')}</th>
                <th className="px-6 py-4 text-center">{ls('Nights', 'Noches')}</th>
                <th className="px-6 py-4">{ls('Category', 'Categoría')}</th>
                <th className="px-6 py-4">{ls('Status', 'Estado')}</th>
                <th className="px-6 py-4 w-1">{ls('Details', 'Detalles')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-20">
                  <div className="h-8 w-8 border-2 border-t-transparent rounded-full mx-auto mb-3 animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
                  <p className="text-sm animate-pulse" style={{ color: 'var(--muted-dim)' }}>{ls('Loading...', 'Cargando...')}</p>
                </td></tr>
              ) : reservations.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-20">
                  <HomeIcon className="h-10 w-10 mx-auto mb-2 opacity-20" style={{ color: 'var(--sage)' }} />
                  <p className="text-sm italic" style={{ color: 'var(--muted-dim)' }}>{ls('No reservations found', 'Sin resultados')}</p>
                </td></tr>
              ) : reservations.map(r => (
                <tr key={r.id}>
                  <td className="px-6">
                    <span className="text-lg font-bold" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--gold)' }}>{r.room || '--'}</span>
                  </td>
                  <td className="px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--elevated)', color: 'var(--muted-dim)' }}>
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm" style={{ color: 'var(--charcoal)' }}>{r.guest_name || '—'}</div>
                        {r.opera_guest_name && r.opera_guest_name !== r.guest_name && (
                          <div className="text-[10px]" style={{ color: 'var(--muted-dim)' }}>Opera: {r.opera_guest_name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6">
                    <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--muted)' }}>
                      <span>{r.arrival ? new Date(r.arrival).toLocaleDateString() : '—'}</span>
                      <span style={{ color: 'var(--muted-dim)' }}>→</span>
                      <span>{r.departure ? new Date(r.departure).toLocaleDateString() : '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 text-center">
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'var(--elevated)', color: 'var(--muted)' }}>{r.nights ?? '0'}</span>
                  </td>
                  <td className="px-6">
                    <span className="text-xs font-bold uppercase tracking-tighter" style={{ color: 'var(--muted-dim)' }}>{r.room_category || '—'}</span>
                  </td>
                  <td className="px-6"><StatusBadge status={r.status} ls={ls} /></td>
                  <td className="px-6 text-center relative">
                    <details className="cursor-pointer">
                      <summary className="text-[10px] font-bold uppercase list-none" style={{ color: 'var(--gold)' }}>▼</summary>
                      <div className="absolute right-0 top-full mt-1 nayara-card p-3 z-10 text-left text-xs w-64" style={{ borderRadius: '10px' }}>
                        <dl className="space-y-1.5">
                          <div><dt className="font-bold" style={{ color: 'var(--muted-dim)' }}>{ls('Opera Resv ID', 'ID Opera')}</dt><dd className="font-mono break-all" style={{ color: 'var(--charcoal)' }}>{r.opera_resv_id}</dd></div>
                          <div><dt className="font-bold" style={{ color: 'var(--muted-dim)' }}>{ls('DB ID', 'ID BD')}</dt><dd className="font-mono text-[9px] break-all" style={{ color: 'var(--muted)' }}>{r.id}</dd></div>
                          {r.last_synced_at && <div><dt className="font-bold" style={{ color: 'var(--muted-dim)' }}>{ls('Last Synced', 'Última Sincronización')}</dt><dd className="text-[9px]" style={{ color: 'var(--muted)' }}>{new Date(r.last_synced_at).toLocaleString()}</dd></div>}
                        </dl>
                      </div>
                    </details>
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

function StatusBadge({ status, ls }: { status: string, ls: any }) {
  const classMap: Record<string, string> = {
    'CHECKED IN': 'nayara-badge nayara-badge-confirmed',
    'RESERVED': 'nayara-badge nayara-badge-pending',
    'CHECKED OUT': 'nayara-badge nayara-badge-completed',
    'CANCELLED': 'nayara-badge nayara-badge-cancelled',
  };
  return <span className={classMap[status] ?? 'nayara-badge nayara-badge-cancelled'}>{status}</span>;
}

export default function ReservationsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center animate-pulse text-gray-400">Loading UI...</div>}>
      <ReservationsContent />
    </Suspense>
  );
}
