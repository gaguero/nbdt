'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { HotelBookingModal } from './HotelBookingModal';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-500',
};

const DATE_FILTERS = ['all', 'today', 'this_week', 'this_month'];

export default function HotelBookingsPage() {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const fetchBookings = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFilter !== 'all') params.set('filter', dateFilter);
    fetch(`/api/hotel-bookings?${params}`)
      .then(r => r.json())
      .then(d => setBookings(d.hotel_bookings ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [dateFilter]);

  const openNew = () => { setSelectedBooking(null); setModalOpen(true); };
  const openEdit = (b: any) => { setSelectedBooking(b); setModalOpen(true); };

  const filterLabel = (f: string) => {
    if (f === 'all') return ls('All', 'Todos');
    if (f === 'today') return ls('Today', 'Hoy');
    if (f === 'this_week') return ls('This Week', 'Esta Semana');
    if (f === 'this_month') return ls('This Month', 'Este Mes');
    return f;
  };

  const searchLower = search.toLowerCase();
  const displayed = search
    ? bookings.filter(b =>
        (b.guest_name?.toLowerCase().includes(searchLower)) ||
        (b.hotel_name?.toLowerCase().includes(searchLower))
      )
    : bookings;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{ls('Other Hotel Bookings', 'Reservas en Otros Hoteles')}</h1>
        <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + {ls('New Booking', 'Nueva Reserva')}
        </button>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap gap-2 items-center">
        {DATE_FILTERS.map(f => (
          <button key={f} onClick={() => setDateFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${dateFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {filterLabel(f)}
          </button>
        ))}
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={ls('Search guest or hotel...', 'Buscar huésped u hotel...')}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">{ls('Date', 'Fecha')}</th>
                <th className="px-4 py-3">{ls('Guest', 'Huésped')}</th>
                <th className="px-4 py-3">{ls('Hotel', 'Hotel')}</th>
                <th className="px-4 py-3">{ls('Dates', 'Fechas')}</th>
                <th className="px-4 py-3">{ls('Pax', 'Pax')}</th>
                <th className="px-4 py-3">{ls('Guest Status', 'Estado Hués.')}</th>
                <th className="px-4 py-3">{ls('Vendor Status', 'Estado Prov.')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">{ls('Loading...', 'Cargando...')}</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">{ls('No bookings found', 'Sin reservas')}</td></tr>
              ) : displayed.map(b => (
                <tr key={b.id} className={`border-b hover:bg-gray-50 transition-colors ${b.guest_status === 'cancelled' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-gray-700">{b.date ? new Date(b.date + 'T12:00:00').toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{b.guest_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{b.hotel_name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {b.checkin ? new Date(b.checkin + 'T12:00:00').toLocaleDateString() : '—'} → {b.checkout ? new Date(b.checkout + 'T12:00:00').toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">{b.num_guests}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.guest_status] ?? 'bg-gray-100'}`}>{b.guest_status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.vendor_status] ?? 'bg-gray-100'}`}>{b.vendor_status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(b)} className="text-xs text-blue-600 hover:underline font-medium">
                      {ls('Edit', 'Editar')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayed.length > 0 && (
          <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500">
            {displayed.length} {ls('bookings', 'reservas')}
          </div>
        )}
      </div>

      <HotelBookingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        booking={selectedBooking}
        onSuccess={fetchBookings}
      />
    </div>
  );
}
