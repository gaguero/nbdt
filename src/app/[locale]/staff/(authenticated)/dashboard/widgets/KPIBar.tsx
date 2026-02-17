'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import {
  ArrowRightEndOnRectangleIcon,
  ArrowLeftStartOnRectangleIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  TruckIcon,
  MapIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

interface KPIData {
  arrivals: number;
  departures: number;
  inHouse: number;
  transfers: number;
  tours: number;
  requests: number;
  conversations: number;
  dinners: number;
}

export function KPIBar({ date, onStatsLoad }: { date: string, onStatsLoad?: (stats: KPIData) => void }) {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/dashboard-stats?date=${date}`)
      .then(r => r.json())
      .then(data => {
        setKpis(data);
        setLoading(false);
        if (onStatsLoad) onStatsLoad(data);
      });
  }, [date, onStatsLoad]);

  const tiles = [
    { 
      label: ls('Arrivals', 'Llegadas'), 
      value: kpis?.arrivals ?? 0, 
      color: 'bg-green-50 border-green-100 text-green-700 hover:bg-green-100',
      icon: ArrowRightEndOnRectangleIcon,
      href: `/${locale}/staff/reservations?filter=arrivals&date=${date}`
    },
    { 
      label: ls('Departures', 'Salidas'), 
      value: kpis?.departures ?? 0, 
      color: 'bg-orange-50 border-orange-100 text-orange-700 hover:bg-orange-100',
      icon: ArrowLeftStartOnRectangleIcon,
      href: `/${locale}/staff/reservations?filter=departures&date=${date}`
    },
    { 
      label: ls('In House', 'En Casa'), 
      value: kpis?.inHouse ?? 0, 
      color: 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100',
      icon: UserGroupIcon,
      href: `/${locale}/staff/reservations?filter=checked_in`
    },
    { 
      label: ls('Transfers', 'Traslados'), 
      value: kpis?.transfers ?? 0, 
      color: 'bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100',
      icon: TruckIcon,
      href: `/${locale}/staff/transfers?date=${date}`
    },
    { 
      label: ls('Tours', 'Tours'), 
      value: kpis?.tours ?? 0, 
      color: 'bg-yellow-50 border-yellow-100 text-yellow-700 hover:bg-yellow-100',
      icon: MapIcon,
      href: `/${locale}/staff/tour-bookings?date=${date}`
    },
    {
      label: ls('Dinners', 'Cenas'),
      value: kpis?.dinners ?? 0,
      color: 'bg-pink-50 border-pink-100 text-pink-700 hover:bg-pink-100',
      icon: HeartIcon,
      href: `/${locale}/staff/romantic-dinners`
    },
    {
      label: ls('Messages', 'Mensajes'),
      value: kpis?.conversations ?? 0,
      color: 'bg-teal-50 border-teal-100 text-teal-700 hover:bg-teal-100',
      icon: ChatBubbleLeftRightIcon,
      href: `/${locale}/staff/messages`
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {tiles.map((tile, i) => {
        const Icon = tile.icon;
        return (
          <Link 
            key={i} 
            href={tile.href}
            className={`flex flex-col border rounded-xl p-4 transition-all duration-200 shadow-sm ${tile.color} ${loading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className="h-5 w-5 opacity-80" />
              <div className="text-2xl font-black">{tile.value}</div>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{tile.label}</div>
          </Link>
        );
      })}
    </div>
  );
}
