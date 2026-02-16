'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useGuestDrawer } from '@/contexts/GuestDrawerContext';
import { UserGroupIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface InHouseGuest {
  id: string;
  room: string;
  guest_id: string;
  guest_name: string;
  nationality: string;
  arrival: string;
  departure: string;
  transfer_booked: boolean;
  tour_booked: boolean;
}

export function InHouseGuests({ date, limit = 20 }: { date: string, limit?: number }) {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;
  const { openGuest } = useGuestDrawer();
  const [guests, setGuests] = useState<InHouseGuest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // filter=checked_in usually means CURRENTLY checked in, but we want for the specific DATE
    fetch(`/api/reservations?filter=checked_in&date=${date}`)
      .then(r => r.json())
      .then(d => {
        setGuests((d.reservations ?? []).slice(0, limit));
        setLoading(false);
      });
  }, [date, limit]);

  const nightsRemaining = (departure: string) => {
    const targetDate = new Date(date + 'T12:00:00');
    const depDate = new Date(departure + 'T12:00:00');
    const diff = depDate.getTime() - targetDate.getTime();
    const nights = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 0;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 rounded-lg">
            <UserGroupIcon className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="font-black text-sm uppercase tracking-widest text-gray-800">{ls('In-House Guests', 'Huéspedes Alojados')}</h2>
        </div>
        <Link 
          href={`/${locale}/staff/reservations?filter=checked_in`}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group"
        >
          {ls('View All', 'Ver Todo')}
          <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-400 animate-pulse">{ls('Loading...', 'Cargando...')}</div>
        ) : guests.length === 0 ? (
          <div className="p-12 text-center text-gray-400 italic text-sm">{ls('No guests in house for this date', 'No hay huéspedes para esta fecha')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-tighter text-gray-400 border-b border-gray-50">
                <th className="px-6 py-3">{ls('Room', 'Hab.')}</th>
                <th className="px-6 py-3">{ls('Guest', 'Huésped')}</th>
                <th className="px-6 py-3">{ls('Nts Left', 'Noches')}</th>
                <th className="px-6 py-3">{ls('Services', 'Servicios')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {guests.map(g => (
                <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-black text-blue-600 text-lg">{g.room || '??'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openGuest(g.guest_id)}
                      className="font-bold text-gray-900 hover:underline text-left block"
                    >
                      {g.guest_name}
                    </button>
                    <div className="text-[10px] text-gray-400 font-medium">{g.nationality || '—'}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-700">{nightsRemaining(g.departure)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5">
                      <span title={ls('Transfer', 'Traslado')} className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black ${g.transfer_booked ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-300'}`}>
                        T
                      </span>
                      <span title={ls('Tour', 'Tour')} className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black ${g.tour_booked ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-300'}`}>
                        A
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
