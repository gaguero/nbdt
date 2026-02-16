'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

interface KPIData {
  arrivals: number;
  departures: number;
  activeGuests: number;
  pendingRequests: number;
  todayTransfers: number;
  todayTours: number;
  openMessages: number;
}

export function KPIBar() {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    Promise.all([
      fetch('/api/reservations?filter=arriving_today'),
      fetch('/api/reservations?filter=departing_today'),
      fetch('/api/reservations?filter=checked_in'),
      fetch(`/api/transfers?date_from=${today}&date_to=${today}`),
      fetch(`/api/tour-bookings?date_from=${today}&date_to=${today}`),
      fetch('/api/special-requests?filter=today&status=pending&count=true'),
      fetch('/api/conversations?status=open'),
    ]).then(async (responses) => {
      const [arr, dep, active, trans, tours, reqs, convs] = await Promise.all(
        responses.map(r => r.json())
      );

      setKpis({
        arrivals: arr.reservations?.length ?? 0,
        departures: dep.reservations?.length ?? 0,
        activeGuests: active.reservations?.length ?? 0,
        pendingRequests: reqs.count ?? 0,
        todayTransfers: trans.transfers?.length ?? 0,
        todayTours: tours.tour_bookings?.length ?? 0,
        openMessages: convs.conversations?.length ?? 0,
      });
    });
  }, [today]);

  const tiles = [
    { label: ls('Arrivals Today', 'Llegadas Hoy'), value: kpis?.arrivals ?? 0, color: 'bg-green-50 border-green-200 text-green-800' },
    { label: ls('Departures Today', 'Salidas Hoy'), value: kpis?.departures ?? 0, color: 'bg-orange-50 border-orange-200 text-orange-800' },
    { label: ls('Active Guests', 'Huéspedes Activos'), value: kpis?.activeGuests ?? 0, color: 'bg-blue-50 border-blue-200 text-blue-800' },
    { label: ls('Pending Requests', 'Solicitudes Pendientes'), value: kpis?.pendingRequests ?? 0, color: 'bg-red-50 border-red-200 text-red-800' },
    { label: ls("Today's Transfers", 'Traslados Hoy'), value: kpis?.todayTransfers ?? 0, color: 'bg-purple-50 border-purple-200 text-purple-800' },
    { label: ls("Today's Tours", 'Tours Hoy'), value: kpis?.todayTours ?? 0, color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {tiles.map((tile, i) => (
        <div key={i} className={`border rounded-lg p-3 ${tile.color}`}>
          <div className="text-2xl font-bold">{tile.value}</div>
          <div className="text-xs mt-1 font-medium">{tile.label}</div>
        </div>
      ))}
    </div>
  );
}
