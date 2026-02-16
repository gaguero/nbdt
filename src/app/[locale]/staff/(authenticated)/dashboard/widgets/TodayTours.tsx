'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useGuestDrawer } from '@/contexts/GuestDrawerContext';
import { MapIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { TourBookingModal } from '../tour-bookings/TourBookingModal';

interface TourBooking {
  id: string;
  product_id: string;
  schedule_id?: string;
  activity_date?: string;
  start_time: string;
  name_en: string;
  name_es: string;
  legacy_activity_name: string;
  guest_id: string;
  guest_name: string;
  num_guests: number;
  guest_status: string;
  vendor_status: string;
  total_price?: string;
  special_requests?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-600',
};

export function TodayTours({ date, limit = 10 }: { date: string, limit?: number }) {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;
  const { openGuest } = useGuestDrawer();
  const [tours, setTours] = useState<TourBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<TourBooking | null>(null);
  const [isModalOpen, setIsOpen] = useState(false);

  const fetchTours = () => {
    setLoading(true);
    fetch(`/api/tour-bookings?date_from=${date}&date_to=${date}`)
      .then(r => r.json())
      .then(d => {
        setTours((d.tour_bookings ?? []).slice(0, limit));
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTours();
  }, [date, limit]);

  const handleEdit = (b: TourBooking) => {
    setSelectedBooking(b);
    setIsOpen(true);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-yellow-50 rounded-lg">
            <MapIcon className="h-5 w-5 text-yellow-600" />
          </div>
          <h2 className="font-black text-sm uppercase tracking-widest text-gray-800">{ls('Tours', 'Tours')}</h2>
        </div>
        <Link 
          href={`/${locale}/staff/tour-bookings?date=${date}`}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group"
        >
          {ls('View All', 'Ver Todo')}
          <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="flex-1 overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-400 animate-pulse">{ls('Loading...', 'Cargando...')}</div>
        ) : tours.length === 0 ? (
          <div className="p-12 text-center text-gray-400 italic text-sm">{ls('No tours for this date', 'No hay tours para esta fecha')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-tighter text-gray-400 border-b border-gray-50">
                <th className="px-6 py-3">{ls('Time', 'Hora')}</th>
                <th className="px-6 py-3">{ls('Tour', 'Tour')}</th>
                <th className="px-6 py-3">{ls('Guest', 'Huésped')}</th>
                <th className="px-6 py-3 text-center">{ls('Pax', 'Pax')}</th>
                <th className="px-6 py-3">{ls('Status', 'Estado')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tours.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">{b.start_time?.slice(0, 5) || '—'}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => handleEdit(b)}
                      className="text-left hover:bg-gray-100 p-1 -ml-1 rounded transition-colors block w-full"
                    >
                      <div className="font-bold text-gray-800">{locale === 'es' ? (b.name_es ?? b.name_en) : (b.name_en ?? b.name_es)}</div>
                      {b.legacy_activity_name && (b.legacy_activity_name !== b.name_en && b.legacy_activity_name !== b.name_es) && (
                        <div className="text-[10px] text-gray-400 italic leading-tight mt-0.5">CSV: {b.legacy_activity_name}</div>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openGuest(b.guest_id)}
                      className="font-bold text-blue-600 hover:underline text-left"
                    >
                      {b.guest_name || '—'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-gray-700">{b.num_guests}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tight ${STATUS_COLORS[b.guest_status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {b.guest_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <TourBookingModal 
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        booking={selectedBooking}
        onSuccess={fetchTours}
      />
    </div>
  );
}
