'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useGuestDrawer } from '@/contexts/GuestDrawerContext';

interface Transfer {
  id: string;
  time: string;
  guest_id: string;
  guest_name: string;
  origin: string;
  destination: string;
  vendor_name: string;
  guest_status: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-600',
};

export function TodayTransfers({ limit = 10 }: { limit?: number }) {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;
  const { openGuest } = useGuestDrawer();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetch(`/api/transfers?date_from=${today}&date_to=${today}`)
      .then(r => r.json())
      .then(d => setTransfers((d.transfers ?? []).slice(0, limit)))
      .finally(() => setLoading(false));
  }, [limit, today]);

  if (loading || transfers.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">{ls("Today's Transfers", 'Traslados de Hoy')}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="px-6 py-2">{ls('Time', 'Hora')}</th>
              <th className="px-6 py-2">{ls('Guest', 'Huésped')}</th>
              <th className="px-6 py-2">{ls('Route', 'Ruta')}</th>
              <th className="px-6 py-2">{ls('Vendor', 'Proveedor')}</th>
              <th className="px-6 py-2">{ls('Status', 'Estado')}</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map(t => (
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3 font-medium whitespace-nowrap">{t.time?.slice(0, 5) || '—'}</td>
                <td className="px-6 py-3">
                  <button
                    onClick={() => openGuest(t.guest_id)}
                    className="text-blue-600 underline cursor-pointer hover:text-blue-800"
                  >
                    {t.guest_name || '—'}
                  </button>
                </td>
                <td className="px-6 py-3 text-xs">
                  <div>{t.origin || '—'}</div>
                  <div className="text-gray-500">→ {t.destination || '—'}</div>
                </td>
                <td className="px-6 py-3 text-xs text-gray-600">{t.vendor_name || '—'}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.guest_status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {t.guest_status}
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
