'use client';

import { useEffect, useState, Suspense } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  PlusIcon,
  CalendarIcon,
  MapIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { TourBookingModal } from './TourBookingModal';
import { Button } from '@/components/ui/Button';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  no_show: 'bg-gray-100 text-gray-500 border-gray-200',
};

function TourBookingsContent() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;
  const initialDate = searchParams.get('date') || '';

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(initialDate);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);

  const fetchBookings = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('filter', filter);
    if (selectedDate) {
      params.set('date_from', selectedDate);
      params.set('date_to', selectedDate);
    }
    
    fetch(`/api/tour-bookings?${params}`)
      .then(r => r.json())
      .then(d => setBookings(d.tour_bookings ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [filter, selectedDate]);

  const handleOpenCreate = () => {
    setEditingBooking(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: any) => {
    setEditingBooking(b);
    setIsModalOpen(true);
  };

  const searchLower = search.toLowerCase();
  const displayed = search
    ? bookings.filter(b =>
        (b.guest_name?.toLowerCase().includes(searchLower)) ||
        (b.name_en?.toLowerCase().includes(searchLower)) ||
        (b.name_es?.toLowerCase().includes(searchLower)) ||
        (b.legacy_activity_name?.toLowerCase().includes(searchLower))
      )
    : bookings;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{ls('Tour Bookings', 'Reservas de Tours')}</h1>
          <p className="text-sm text-gray-500 font-medium">{ls('Manage guest activities and schedules.', 'Gestione actividades y horarios.')}</p>
        </div>
        <Button onClick={handleOpenCreate} className="shadow-sm">
          <PlusIcon className="h-5 w-5 mr-2" />
          {ls('New Booking', 'Nueva Reserva')}
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
                placeholder={ls('Search guest or tour...', 'Buscar...')}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm transition-all"
              />
            </div>
            
            <div className="flex bg-white border border-gray-300 rounded-lg p-1 shadow-sm">
              {['all', 'upcoming', 'today'].map(f => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setSelectedDate(''); }}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filter === f && !selectedDate ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  {ls(f.charAt(0).toUpperCase() + f.slice(1), f === 'all' ? 'Todos' : f === 'today' ? 'Hoy' : 'Próximos')}
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
                <th className="px-6 py-4">{ls('Tour / Activity', 'Tour / Actividad')}</th>
                <th className="px-6 py-4">{ls('Guest', 'Huésped')}</th>
                <th className="px-6 py-4">{ls('Date & Time', 'Fecha y Hora')}</th>
                <th className="px-6 py-4 text-center">{ls('Pax', 'Pax')}</th>
                <th className="px-6 py-4">{ls('Status', 'Estado')}</th>
                <th className="px-6 py-4 text-right">{ls('Actions', 'Acciones')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-20">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-400 font-medium animate-pulse">{ls('Loading bookings...', 'Cargando reservas...')}</p>
                </td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-20 text-gray-400 italic">
                  <MapIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  {ls('No tour bookings found', 'No se encontraron reservas')}
                </td></tr>
              ) : displayed.map(b => (
                <tr key={b.id} className={`hover:bg-gray-50/80 transition-colors group ${b.guest_status === 'cancelled' ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <MapIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-black text-gray-900 leading-tight">
                          {locale === 'es' ? (b.name_es ?? b.name_en) : (b.name_en ?? b.name_es)}
                        </div>
                        {b.vendor_name && <div className="text-[10px] font-bold text-gray-400 uppercase mt-0.5 tracking-tighter">{b.vendor_name}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-gray-700">{b.guest_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{b.schedule_date ? new Date(b.schedule_date).toLocaleDateString() : '—'}</div>
                    <div className="text-xs font-medium text-gray-400 uppercase">{b.start_time?.slice(0, 5) ?? '--:--'}</div>
                  </td>
                  <td className="px-6 py-4 text-center font-black text-gray-700">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">{b.num_guests}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-tight border ${STATUS_COLORS[b.guest_status] ?? 'bg-gray-100'}`}>
                        Guest: {b.guest_status}
                      </span>
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-tight border ${STATUS_COLORS[b.vendor_status] ?? 'bg-gray-100'}`}>
                        Vendor: {b.vendor_status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleOpenEdit(b)}
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

      <TourBookingModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        booking={editingBooking}
        onSuccess={fetchBookings}
      />
    </div>
  );
}

export default function TourBookingsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center animate-pulse text-gray-400">Loading UI...</div>}>
      <TourBookingsContent />
    </Suspense>
  );
}
