'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { HotelBookingModal } from './HotelBookingModal';
import { statusColor } from '@/lib/statusColors';

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
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold italic" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>
          {ls('Other Hotel Bookings', 'Reservas en Otros Hoteles')}
        </h1>
        <button onClick={openNew} className="nayara-btn nayara-btn-primary">
          + {ls('New Booking', 'Nueva Reserva')}
        </button>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap gap-2 items-center">
        {DATE_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setDateFilter(f)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
            style={dateFilter === f
              ? { background: 'var(--gold)', color: '#fff' }
              : { background: 'var(--elevated)', color: 'var(--muted-dim)' }
            }
          >
            {filterLabel(f)}
          </button>
        ))}
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 pointer-events-none" style={{ color: 'var(--muted-dim)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={ls('Search guest or hotel...', 'Buscar huésped u hotel...')}
            className="nayara-input w-full pl-9"
          />
        </div>
      </div>

      <div className="nayara-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full nayara-table">
            <thead>
              <tr>
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
                <tr><td colSpan={8} className="text-center py-8 text-sm" style={{ color: 'var(--muted-dim)' }}>{ls('Loading...', 'Cargando...')}</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-sm italic" style={{ color: 'var(--muted-dim)' }}>{ls('No bookings found', 'Sin reservas')}</td></tr>
              ) : displayed.map(b => (
                <tr key={b.id} className={b.guest_status === 'cancelled' ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>{b.date ? new Date(b.date + 'T12:00:00').toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 font-medium text-sm" style={{ color: 'var(--charcoal)' }}>{b.guest_name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>{b.hotel_name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-dim)' }}>
                    {b.checkin ? new Date(b.checkin + 'T12:00:00').toLocaleDateString() : '—'} → {b.checkout ? new Date(b.checkout + 'T12:00:00').toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-sm" style={{ color: 'var(--muted)' }}>{b.num_guests}</td>
                  <td className="px-4 py-3">
                    <span className={statusColor(b.guest_status)}>{b.guest_status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusColor(b.vendor_status)}>{b.vendor_status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(b)}
                      className="text-xs font-semibold transition-colors"
                      style={{ color: 'var(--gold)' }}
                    >
                      {ls('Edit', 'Editar')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayed.length > 0 && (
          <div className="px-4 py-2 text-xs" style={{ borderTop: '1px solid var(--separator)', background: 'var(--elevated)', color: 'var(--muted-dim)' }}>
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
