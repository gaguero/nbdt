'use client';

import { useEffect, useState, Suspense } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { localDateString, localDateOffset } from '@/lib/dates';
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

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  no_show: 'bg-gray-100 text-gray-500 border-gray-200',
};

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
    // 'all' → no date params

    fetch(`/api/transfers?${params}`)
      .then(r => r.json())
      .then(d => setTransfers(d.transfers ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTransfers(); }, [filter, selectedDate]);

  const handleOpenCreate = () => {
    setEditingTransfer(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: any) => {
    setEditingTransfer(t);
    setIsModalOpen(true);
  };

  const searchLower = search.toLowerCase();
  const displayed = search
    ? transfers.filter(t =>
        (t.guest_name?.toLowerCase().includes(searchLower)) ||
        (t.origin?.toLowerCase().includes(searchLower)) ||
        (t.destination?.toLowerCase().includes(searchLower)) ||
        (t.vendor_name?.toLowerCase().includes(searchLower))
      )
    : transfers;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{ls('Transfers', 'Traslados')}</h1>
          <p className="text-sm text-gray-500 font-medium">{ls('Coordinate guest arrivals and departures.', 'Coordine llegadas y salidas.')}</p>
        </div>
        <Button onClick={handleOpenCreate} className="shadow-sm">
          <PlusIcon className="h-5 w-5 mr-2" />
          {ls('New Transfer', 'Nuevo Traslado')}
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between bg-gray-50/50">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={ls('Search...', 'Buscar...')}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm transition-all"
              />
            </div>
            
            <div className="flex bg-white border border-gray-300 rounded-lg p-1 shadow-sm">
              {['all', 'upcoming', 'today', 'past'].map(f => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setSelectedDate(''); }}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filter === f && !selectedDate ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  {ls(f.charAt(0).toUpperCase() + f.slice(1), f === 'all' ? 'Todos' : f === 'today' ? 'Hoy' : f === 'upcoming' ? 'Próximos' : 'Pasados')}
                </button>
              ))}
            </div>

            <div className="relative flex items-center bg-white border border-gray-300 rounded-lg px-3 py-1 shadow-sm">
              <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setFilter(''); }}
                className="text-xs font-black text-gray-700 bg-transparent border-none focus:ring-0 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
            <FunnelIcon className="h-4 w-4" />
            {displayed.length} {ls('Records', 'Registros')}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <th className="px-6 py-4">{ls('Route', 'Ruta')}</th>
                <th className="px-6 py-4">{ls('Guest', 'Huésped')}</th>
                <th className="px-6 py-4">{ls('Date & Time', 'Fecha y Hora')}</th>
                <th className="px-6 py-4">{ls('Vendor', 'Proveedor')}</th>
                <th className="px-6 py-4">{ls('Status', 'Estado')}</th>
                <th className="px-6 py-4 text-right">{ls('Actions', 'Acciones')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-20">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-400 font-medium animate-pulse">{ls('Loading transfers...', 'Cargando...')}</p>
                </td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-20 text-gray-400 italic">
                  <TruckIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  {ls('No transfers found', 'No se encontraron traslados')}
                </td></tr>
              ) : displayed.map(t => (
                <tr key={t.id} className={`hover:bg-gray-50/80 transition-colors group ${t.guest_status === 'cancelled' ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                        <ArrowsRightLeftIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-black text-gray-900 leading-tight flex items-center gap-1.5">
                          {t.origin} <span className="text-gray-300">→</span> {t.destination}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase mt-0.5 tracking-tighter">
                          {t.transfer_type} • {t.num_passengers} Pax {t.flight_number && `• Flt ${t.flight_number}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-gray-700">{t.guest_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{t.date ? new Date(t.date).toLocaleDateString() : '—'}</div>
                    <div className="text-xs font-medium text-gray-400 uppercase">{t.time?.slice(0, 5) ?? '--:--'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600">
                      {t.vendor_name || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-tight border ${STATUS_COLORS[t.guest_status] ?? 'bg-gray-100'}`}>
                        Guest: {t.guest_status}
                      </span>
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-tight border ${STATUS_COLORS[t.vendor_status] ?? 'bg-gray-100'}`}>
                        Vendor: {t.vendor_status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleOpenEdit(t)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-bold text-xs uppercase"
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
        onSuccess={fetchTransfers}
      />
    </div>
  );
}

export default function TransfersPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center animate-pulse text-gray-400">Loading UI...</div>}>
      <TransfersContent />
    </Suspense>
  );
}
