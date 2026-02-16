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
import { Button } from '@/components/ui/Button';

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
          <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{ls('Reservations', 'Reservas')}</h1>
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
        <div className={`rounded-xl p-4 text-sm animate-in slide-in-from-top duration-300 ${importResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between bg-gray-50/50">
          <div className="flex flex-wrap gap-2 items-center">
            <form onSubmit={handleSearchSubmit} className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={ls('Search...', 'Buscar...')}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm"
              />
            </form>
            
            <div className="flex bg-white border border-gray-300 rounded-lg p-1 shadow-sm overflow-x-auto max-w-full">
              {['ALL', 'CHECKED IN', 'ARRIVALS', 'DEPARTURES', 'CANCELLED'].map(s => (
                <button
                  key={s}
                  onClick={() => { setStatus(s); if (s !== 'ARRIVALS' && s !== 'DEPARTURES') setSelectedDate(''); }}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all whitespace-nowrap ${status === s ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  {ls(s, s === 'ALL' ? 'Todas' : s === 'ARRIVALS' ? 'Llegadas' : s === 'DEPARTURES' ? 'Salidas' : s)}
                </button>
              ))}
            </div>

            <div className="relative flex items-center bg-white border border-gray-300 rounded-lg px-3 py-1 shadow-sm">
              <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-black text-gray-700 bg-transparent border-none focus:ring-0 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
            <FunnelIcon className="h-4 w-4" />
            {reservations.length} {ls('Results', 'Resultados')}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <th className="px-6 py-4">{ls('Room', 'Habitación')}</th>
                <th className="px-6 py-4">{ls('Guest', 'Huésped')}</th>
                <th className="px-6 py-4">{ls('Stay Period', 'Estancia')}</th>
                <th className="px-6 py-4 text-center">{ls('Nights', 'Noches')}</th>
                <th className="px-6 py-4">{ls('Category', 'Categoría')}</th>
                <th className="px-6 py-4">{ls('Status', 'Estado')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-20 text-gray-400 font-medium animate-pulse">{ls('Loading reservations...', 'Cargando...')}</td></tr>
              ) : reservations.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-20 text-gray-400 italic">
                  <HomeIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  {ls('No reservations found', 'Sin resultados')}
                </td></tr>
              ) : reservations.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-lg font-black text-blue-600">{r.room || '--'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 leading-tight">{r.guest_name || '—'}</div>
                        {r.opera_guest_name && r.opera_guest_name !== r.guest_name && (
                          <div className="text-[10px] text-gray-400 font-medium">Opera: {r.opera_guest_name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-bold text-gray-700">
                      <span>{r.arrival ? new Date(r.arrival).toLocaleDateString() : '—'}</span>
                      <span className="text-gray-300 font-normal">→</span>
                      <span>{r.departure ? new Date(r.departure).toLocaleDateString() : '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-black text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">{r.nights ?? '0'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">{r.room_category || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={r.status} ls={ls} />
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
  const colors: Record<string, string> = {
    'CHECKED IN': 'bg-green-100 text-green-700 border-green-200',
    'RESERVED': 'bg-blue-100 text-blue-700 border-blue-200',
    'CHECKED OUT': 'bg-gray-100 text-gray-600 border-gray-200',
    'CANCELLED': 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-tight border ${colors[status] ?? 'bg-gray-100'}`}>
      {status}
    </span>
  );
}

export default function ReservationsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center animate-pulse text-gray-400">Loading UI...</div>}>
      <ReservationsContent />
    </Suspense>
  );
}
