'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { KPIBar } from './widgets/KPIBar';
import { TodayTransfers } from './widgets/TodayTransfers';
import { TodayTours } from './widgets/TodayTours';
import { InHouseGuests } from './widgets/InHouseGuests';
import { PendingRequestsWidget } from './widgets/PendingRequestsWidget';
import { ConversationsWidget } from './widgets/ConversationsWidget';
import Link from 'next/link';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  CalendarIcon,
  PlusIcon,
  UserPlusIcon,
  DocumentPlusIcon
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const locale = useLocale();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const handleDateChange = (days: number) => {
    const date = new Date(selectedDate + 'T12:00:00');
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const setRelativeDate = (type: 'yesterday' | 'today' | 'tomorrow') => {
    const date = new Date();
    if (type === 'yesterday') date.setDate(date.getDate() - 1);
    if (type === 'tomorrow') date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const quickActions = [
    { label: ls('New Reservation', 'Nueva Reserva'), href: `/${locale}/staff/reservations`, icon: PlusIcon },
    { label: ls('Add Guest', 'Nuevo Huésped'), href: `/${locale}/staff/guests`, icon: UserPlusIcon },
    { label: ls('New Request', 'Nueva Solicitud'), href: `/${locale}/staff/special-requests`, icon: DocumentPlusIcon },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
            {ls('Operational Dashboard', 'Panel de Operaciones')}
          </h1>
          <p className="text-sm font-medium text-gray-500">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString(locale === 'es' ? 'es-CR' : 'en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Actions */}
          <div className="hidden md:flex items-center gap-2 mr-4 border-r border-gray-200 pr-4">
            {quickActions.map((action, i) => (
              <Link 
                key={i} 
                href={action.href}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <action.icon className="h-3.5 w-3.5 text-blue-600" />
                {action.label}
              </Link>
            ))}
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            <div className="flex items-center border-r border-gray-100 pr-1 mr-1">
              <button 
                onClick={() => setRelativeDate('yesterday')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-50 text-gray-500'}`}
              >
                {ls('Yesterday', 'Ayer')}
              </button>
              <button 
                onClick={() => setRelativeDate('today')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-50 text-gray-500'}`}
              >
                {ls('Today', 'Hoy')}
              </button>
              <button 
                onClick={() => setRelativeDate('tomorrow')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${selectedDate === new Date(Date.now() + 86400000).toISOString().split('T')[0] ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-50 text-gray-500'}`}
              >
                {ls('Tomorrow', 'Mañana')}
              </button>
            </div>
            <div className="flex items-center gap-1 px-1">
              <button onClick={() => handleDateChange(-1)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400">
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <div className="relative flex items-center">
                <CalendarIcon className="h-4 w-4 text-gray-400 absolute left-2 pointer-events-none" />
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-8 pr-2 py-1.5 text-xs font-black text-gray-700 bg-transparent border-none focus:ring-0 cursor-pointer"
                />
              </div>
              <button onClick={() => handleDateChange(1)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400">
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Tiles */}
      <KPIBar date={selectedDate} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Main Column */}
        <div className="xl:col-span-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TodayTransfers date={selectedDate} limit={10} />
            <TodayTours date={selectedDate} limit={10} />
          </div>
          <InHouseGuests date={selectedDate} limit={20} />
        </div>

        {/* Sidebar Column */}
        <div className="xl:col-span-4 space-y-6">
          <ConversationsWidget limit={8} />
          <PendingRequestsWidget limit={8} />
        </div>
      </div>
    </div>
  );
}
