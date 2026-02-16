'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useGuestDrawer } from '@/contexts/GuestDrawerContext';
import { TruckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { TransferModal } from '../../transfers/TransferModal';

interface Transfer {
  id: string;
  date: string;
  time: string;
  guest_id: string;
  guest_name: string;
  origin: string;
  destination: string;
  vendor_id: string;
  vendor_name: string;
  guest_status: string;
  transfer_type: string;
  num_passengers: number;
  flight_number?: string;
  notes?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-600',
};

export function TodayTransfers({ date, limit = 10 }: { date: string, limit?: number }) {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;
  const { openGuest } = useGuestDrawer();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [isModalOpen, setIsOpen] = useState(false);

  const fetchTransfers = () => {
    setLoading(true);
    fetch(`/api/transfers?date_from=${date}&date_to=${date}`)
      .then(r => r.json())
      .then(d => {
        setTransfers((d.transfers ?? []).slice(0, limit));
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTransfers();
  }, [date, limit]);

  const handleEdit = (t: Transfer) => {
    setSelectedTransfer(t);
    setIsOpen(true);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-50 rounded-lg">
            <TruckIcon className="h-5 w-5 text-purple-600" />
          </div>
          <h2 className="font-black text-sm uppercase tracking-widest text-gray-800">{ls('Transfers', 'Traslados')}</h2>
        </div>
        <Link 
          href={`/${locale}/staff/transfers?date=${date}`}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group"
        >
          {ls('View All', 'Ver Todo')}
          <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      
      <div className="flex-1 overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-400 animate-pulse">{ls('Loading...', 'Cargando...')}</div>
        ) : transfers.length === 0 ? (
          <div className="p-12 text-center text-gray-400 italic text-sm">{ls('No transfers for this date', 'No hay traslados para esta fecha')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-tighter text-gray-400 border-b border-gray-50">
                <th className="px-6 py-3">{ls('Time', 'Hora')}</th>
                <th className="px-6 py-3">{ls('Guest', 'Huésped')}</th>
                <th className="px-6 py-3">{ls('Route', 'Ruta')}</th>
                <th className="px-6 py-3">{ls('Status', 'Estado')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transfers.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">{t.time?.slice(0, 5) || '—'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openGuest(t.guest_id)}
                      className="font-bold text-blue-600 hover:underline text-left block"
                    >
                      {t.guest_name || '—'}
                    </button>
                    <div className="text-[10px] text-gray-400 font-medium">{t.vendor_name}</div>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <button 
                      onClick={() => handleEdit(t)}
                      className="text-left hover:bg-gray-100 p-1 -ml-1 rounded transition-colors block w-full"
                    >
                      <div className="font-bold text-gray-700">{t.origin || '—'}</div>
                      <div className="text-gray-400">→ {t.destination || '—'}</div>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tight ${STATUS_COLORS[t.guest_status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {t.guest_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <TransferModal 
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        transfer={selectedTransfer}
        onSuccess={fetchTransfers}
      />
    </div>
  );
}
