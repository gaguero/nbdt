'use client';

import { useEffect, useState, useRef } from 'react';
import { useLocale } from 'next-intl';

interface Reservation {
  id: string;
  opera_resv_id: string;
  status: string;
  room: string;
  full_name: string;
  arrival: string;
  departure: string;
  nights: number;
  room_category: string;
  last_synced_at: string;
}

const STATUS_FILTERS = ['ALL', 'CHECKED IN', 'RESERVED', 'CHECKED OUT', 'CANCELLED'];

export default function ReservationsPage() {
  const locale = useLocale();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('CHECKED IN');
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [syncStats, setSyncStats] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetch_ = (status: string, search: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== 'ALL') params.set('status', status);
    if (search) params.set('search', search);
    fetch(`/api/reservations?${params}`)
      .then((r) => r.json())
      .then((d) => { setReservations(d.reservations ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  };

  const fetchSyncStats = () => {
    fetch('/api/opera/import')
      .then((r) => r.json())
      .then(setSyncStats)
      .catch(() => {});
  };

  useEffect(() => { fetch_(status, search); fetchSyncStats(); }, []);
  useEffect(() => { fetch_(status, search); }, [status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetch_(status, search);
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
        fetch_(status, search);
        fetchSyncStats();
      }
    } catch (err) {
      setImportResult({ success: false, error: 'Upload failed' });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{ls('Reservations', 'Reservas')}</h1>
        <div className="flex items-center gap-3">
          {syncStats?.lastSync && (
            <span className="text-xs text-gray-500">
              {ls('Last sync:', 'Última sincronización:')} {new Date(syncStats.lastSync).toLocaleString()}
            </span>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {importing ? ls('Importing...', 'Importando...') : ls('Import Opera XML', 'Importar Opera XML')}
          </button>
          <input ref={fileRef} type="file" accept=".xml,text/xml,application/xml" onChange={handleImport} className="hidden" />
        </div>
      </div>

      {importResult && (
        <div className={`rounded-lg p-4 text-sm ${importResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {importResult.success ? (
            <div>
              <strong>{ls('Import successful', 'Importación exitosa')}</strong>
              <span className="ml-2">
                {ls(`${importResult.result.total} processed, ${importResult.result.created} new, ${importResult.result.updated} updated, ${importResult.result.unchanged} unchanged`,
                  `${importResult.result.total} procesadas, ${importResult.result.created} nuevas, ${importResult.result.updated} actualizadas, ${importResult.result.unchanged} sin cambios`)}
              </span>
              {importResult.result.errors?.length > 0 && (
                <div className="mt-1 text-xs text-red-600">{importResult.result.errors.slice(0, 3).join('; ')}</div>
              )}
            </div>
          ) : (
            <span>{importResult.error ?? ls('Import failed', 'Error al importar')}</span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                status === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'ALL' ? ls('All', 'Todas') : s}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex gap-2 ml-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={ls('Search guest or room...', 'Buscar huésped o habitación...')}
            className="border rounded-lg px-3 py-1.5 text-sm w-60"
          />
          <button type="submit" className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
            {ls('Search', 'Buscar')}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3">{ls('Room', 'Hab.')}</th>
                <th className="px-4 py-3">{ls('Guest', 'Huésped')}</th>
                <th className="px-4 py-3">{ls('Arrival', 'Llegada')}</th>
                <th className="px-4 py-3">{ls('Departure', 'Salida')}</th>
                <th className="px-4 py-3">{ls('Nights', 'Noches')}</th>
                <th className="px-4 py-3">{ls('Category', 'Categoría')}</th>
                <th className="px-4 py-3">{ls('Status', 'Estado')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">{ls('Loading...', 'Cargando...')}</td></tr>
              ) : reservations.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">{ls('No reservations found', 'Sin reservas')}</td></tr>
              ) : reservations.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">{r.room || '—'}</td>
                  <td className="px-4 py-3">{r.full_name || '—'}</td>
                  <td className="px-4 py-3">{r.arrival ? new Date(r.arrival).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">{r.departure ? new Date(r.departure).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">{r.nights ?? '—'}</td>
                  <td className="px-4 py-3">{r.room_category || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t bg-gray-50 text-xs text-gray-500">
          {ls(`${total} total reservations`, `${total} reservas en total`)}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'CHECKED IN': 'bg-green-100 text-green-700',
    'RESERVED': 'bg-blue-100 text-blue-700',
    'CHECKED OUT': 'bg-gray-100 text-gray-600',
    'CANCELLED': 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100'}`}>
      {status}
    </span>
  );
}
