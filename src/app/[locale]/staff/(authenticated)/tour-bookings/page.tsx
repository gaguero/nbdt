'use client';

import { useEffect, useState, Suspense } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { statusColor } from '@/lib/statusColors';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  CalendarIcon,
  MapIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { TourBookingModal } from './TourBookingModal';
import Button from '@/components/ui/Button';

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
    if (selectedDate) { params.set('date_from', selectedDate); params.set('date_to', selectedDate); }

    fetch(`/api/tour-bookings?${params}`)
      .then(r => r.json())
      .then(d => setBookings(d.tour_bookings ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [filter, selectedDate]);

  const handleOpenCreate = () => { setEditingBooking(null); setIsModalOpen(true); };
  const handleOpenEdit = (b: any) => { setEditingBooking(b); setIsModalOpen(true); };

  const handleModalSuccess = (savedBooking?: any) => {
    if (!savedBooking?.id) { fetchBookings(); return; }
    setBookings(prev => {
      const exists = prev.some(b => b.id === savedBooking.id);
      if (!exists) return [savedBooking, ...prev];
      return prev.map(b => b.id === savedBooking.id ? savedBooking : b);
    });
    setEditingBooking((prev: any) => prev?.id === savedBooking.id ? savedBooking : prev);
  };

  const searchLower = search.toLowerCase();
  const displayed = search
    ? bookings.filter(b =>
        b.guest_name?.toLowerCase().includes(searchLower) ||
        b.name_en?.toLowerCase().includes(searchLower) ||
        b.name_es?.toLowerCase().includes(searchLower) ||
        b.legacy_activity_name?.toLowerCase().includes(searchLower)
      )
    : bookings;

  const TABS = ['all', 'upcoming', 'today'];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold italic" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>
            {ls('Tour Bookings', 'Reservas de Tours')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-dim)' }}>
            {ls('Manage guest activities and schedules.', 'Gestione actividades y horarios.')}
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <PlusIcon className="h-4 w-4 mr-1.5" />
          {ls('New Booking', 'Nueva Reserva')}
        </Button>
      </div>

      {/* Table card */}
      <div className="nayara-card overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 flex flex-wrap gap-3 items-center justify-between" style={{ borderBottom: '1px solid var(--separator)' }}>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-2.5" style={{ color: 'var(--muted-dim)' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={ls('Search guest or tour...', 'Buscar...')}
                className="nayara-input pl-9 w-56"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>

            <div className="flex p-1 rounded-lg gap-0.5" style={{ background: 'var(--elevated)', border: '1px solid var(--separator)' }}>
              {TABS.map(f => {
                const active = filter === f && !selectedDate;
                return (
                  <button
                    key={f}
                    onClick={() => { setFilter(f); setSelectedDate(''); }}
                    className="px-3 py-1 text-xs font-bold rounded-md transition-colors capitalize"
                    style={active ? { background: 'var(--gold)', color: '#fff' } : { color: 'var(--muted-dim)' }}
                  >
                    {ls(
                      f.charAt(0).toUpperCase() + f.slice(1),
                      f === 'all' ? 'Todos' : f === 'today' ? 'Hoy' : 'Próximos'
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--elevated)', border: '1px solid var(--separator)' }}>
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
                <th className="px-6 py-4">{ls('Tour / Activity', 'Tour / Actividad')}</th>
                <th className="px-6 py-4">{ls('Guest', 'Huésped')}</th>
                <th className="px-6 py-4">{ls('Date & Time', 'Fecha y Hora')}</th>
                <th className="px-6 py-4 text-center">{ls('Pax', 'Pax')}</th>
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
                  <MapIcon className="h-10 w-10 mx-auto mb-2 opacity-20" style={{ color: 'var(--sage)' }} />
                  <p className="text-sm italic" style={{ color: 'var(--muted-dim)' }}>{ls('No tour bookings found', 'No se encontraron reservas')}</p>
                </td></tr>
              ) : displayed.map(b => (
                <tr key={b.id} className={b.guest_status === 'cancelled' ? 'opacity-40' : ''}>
                  <td className="px-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ background: 'rgba(78,94,62,0.10)', color: 'var(--sage)' }}>
                        <MapIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm" style={{ color: 'var(--charcoal)' }}>
                          {locale === 'es' ? (b.name_es ?? b.name_en) : (b.name_en ?? b.name_es)}
                        </div>
                        {b.vendor_name && (
                          <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: 'var(--muted-dim)' }}>{b.vendor_name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--elevated)', color: 'var(--muted-dim)' }}>
                        <UserIcon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--charcoal)' }}>{b.guest_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-6">
                    <div className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
                      {b.schedule_date ? new Date(b.schedule_date).toLocaleDateString() : '—'}
                    </div>
                    <div className="text-[11px] font-bold uppercase" style={{ color: 'var(--muted-dim)' }}>
                      {b.start_time?.slice(0, 5) ?? '--:--'}
                    </div>
                  </td>
                  <td className="px-6 text-center">
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'var(--elevated)', color: 'var(--muted)' }}>
                      {b.num_guests}
                    </span>
                  </td>
                  <td className="px-6">
                    <div className="flex flex-col gap-1">
                      <span className={statusColor(b.guest_status)}>Guest: {b.guest_status}</span>
                      <span className={statusColor(b.vendor_status)}>Vendor: {b.vendor_status}</span>
                    </div>
                  </td>
                  <td className="px-6 text-right">
                    <button onClick={() => handleOpenEdit(b)} className="nayara-btn nayara-btn-ghost text-xs">
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
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}

export default function TourBookingsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm animate-pulse" style={{ color: 'var(--muted-dim)' }}>Loading...</div>}>
      <TourBookingsContent />
    </Suspense>
  );
}
