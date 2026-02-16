'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useGuestDrawer } from '@/contexts/GuestDrawerContext';

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

export function InHouseGuests({ limit = 20 }: { limit?: number }) {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;
  const { openGuest } = useGuestDrawer();
  const [guests, setGuests] = useState<InHouseGuest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reservations?filter=checked_in')
      .then(r => r.json())
      .then(d => setGuests((d.reservations ?? []).slice(0, limit)))
      .finally(() => setLoading(false));
  }, [limit]);

  if (loading || guests.length === 0) return null;

  const nightsRemaining = (arrival: string, departure: string) => {
    const today = new Date();
    const depDate = new Date(departure);
    const nights = Math.ceil((depDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return nights;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">{ls('In-House Guests', 'Huéspedes Alojados')}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="px-6 py-2">{ls('Room', 'Habitación')}</th>
              <th className="px-6 py-2">{ls('Guest', 'Huésped')}</th>
              <th className="px-6 py-2">{ls('Nationality', 'Nacionalidad')}</th>
              <th className="px-6 py-2">{ls('Nights', 'Noches')}</th>
              <th className="px-6 py-2">{ls('Services', 'Servicios')}</th>
            </tr>
          </thead>
          <tbody>
            {guests.map(g => (
              <tr key={g.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3 font-bold text-lg">{g.room}</td>
                <td className="px-6 py-3">
                  <button
                    onClick={() => openGuest(g.guest_id)}
                    className="text-blue-600 underline cursor-pointer hover:text-blue-800"
                  >
                    {g.guest_name}
                  </button>
                </td>
                <td className="px-6 py-3 text-xs text-gray-600">{g.nationality || '—'}</td>
                <td className="px-6 py-3">{nightsRemaining(g.arrival, g.departure)}</td>
                <td className="px-6 py-3 text-xs space-x-2">
                  <span className={`inline-block px-2 py-1 rounded ${g.transfer_booked ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {g.transfer_booked ? '✓ Transfer' : 'No Transfer'}
                  </span>
                  <span className={`inline-block px-2 py-1 rounded ${g.tour_booked ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {g.tour_booked ? '✓ Tour' : 'No Tour'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
