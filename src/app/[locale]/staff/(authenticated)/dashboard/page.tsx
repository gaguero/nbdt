'use client';

import { useLocale } from 'next-intl';
import { KPIBar } from './widgets/KPIBar';
import { TodayTransfers } from './widgets/TodayTransfers';
import { TodayTours } from './widgets/TodayTours';
import { InHouseGuests } from './widgets/InHouseGuests';

export default function DashboardPage() {
  const locale = useLocale();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {locale === 'es' ? 'Panel de Control' : 'Dashboard'}
        </h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString(locale === 'es' ? 'es-CR' : 'en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </div>
      </div>

      {/* KPI Summary Tiles */}
      <KPIBar />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Transfers Widget */}
        <TodayTransfers limit={10} />

        {/* Today's Tour Bookings Widget */}
        <TodayTours limit={10} />
      </div>

      {/* In-House Guests Table */}
      <InHouseGuests limit={20} />
    </div>
  );
}
