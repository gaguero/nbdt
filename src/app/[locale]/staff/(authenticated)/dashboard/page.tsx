'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

interface DashboardStats {
  arrivals: any[];
  departures: any[];
  checkedIn: any[];
}

interface ConciergeStats {
  pendingTransfers: number;
  pendingTourBookings: number;
  pendingSpecialRequests: number;
  openConversations: number;
}

export default function DashboardPage() {
  const t = useTranslations('staff.dashboard');
  const locale = useLocale();
  const today = new Date().toISOString().split('T')[0];

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [conciergeStats, setConciergeStats] = useState<ConciergeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [arrivalsRes, departuresRes, checkedInRes, transfersRes, tourBookingsRes, requestsRes, convsRes] =
          await Promise.all([
            fetch('/api/reservations?filter=arriving_today'),
            fetch('/api/reservations?filter=departing_today'),
            fetch('/api/reservations?filter=checked_in'),
            fetch(`/api/transfers?date_from=${today}&date_to=${today}`),
            fetch(`/api/tour-bookings?date_from=${today}&date_to=${today}`),
            fetch(`/api/special-requests?status=pending`),
            fetch(`/api/conversations?status=open`),
          ]);

        const arrivalsData = await arrivalsRes.json();
        const departuresData = await departuresRes.json();
        const checkedInData = await checkedInRes.json();
        const transfersData = await transfersRes.json();
        const tourData = await tourBookingsRes.json();
        const requestsData = await requestsRes.json();
        const convsData = await convsRes.json();

        setStats({
          arrivals: arrivalsData.reservations ?? [],
          departures: departuresData.reservations ?? [],
          checkedIn: checkedInData.reservations ?? [],
        });
        setConciergeStats({
          pendingTransfers: transfersData.transfers?.length ?? 0,
          pendingTourBookings: tourData.tour_bookings?.length ?? 0,
          pendingSpecialRequests: requestsData.special_requests?.length ?? 0,
          openConversations: convsData.conversations?.length ?? 0,
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [today]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

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

      {/* Reservation Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={locale === 'es' ? 'Llegadas Hoy' : 'Arrivals Today'}
          value={stats?.arrivals?.length ?? 0}
          color="bg-green-50 border-green-200 text-green-800"
          href={`/${locale}/staff/reservations?status=RESERVED`}
        />
        <StatCard
          label={locale === 'es' ? 'Salidas Hoy' : 'Departures Today'}
          value={stats?.departures?.length ?? 0}
          color="bg-orange-50 border-orange-200 text-orange-800"
          href={`/${locale}/staff/reservations?status=CHECKED+OUT`}
        />
        <StatCard
          label={locale === 'es' ? 'Huéspedes Activos' : 'Active Guests'}
          value={stats?.checkedIn?.length ?? 0}
          color="bg-blue-50 border-blue-200 text-blue-800"
          href={`/${locale}/staff/reservations?status=CHECKED+IN`}
        />
        <StatCard
          label={locale === 'es' ? 'Solicitudes Pendientes' : 'Pending Requests'}
          value={conciergeStats?.pendingSpecialRequests ?? 0}
          color="bg-red-50 border-red-200 text-red-800"
          href={`/${locale}/staff/special-requests`}
        />
      </div>

      {/* Concierge Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label={locale === 'es' ? 'Traslados Hoy' : "Today's Transfers"}
          value={conciergeStats?.pendingTransfers ?? 0}
          color="bg-purple-50 border-purple-200 text-purple-800"
          href={`/${locale}/staff/transfers`}
        />
        <StatCard
          label={locale === 'es' ? 'Tours Hoy' : "Today's Tours"}
          value={conciergeStats?.pendingTourBookings ?? 0}
          color="bg-yellow-50 border-yellow-200 text-yellow-800"
          href={`/${locale}/staff/tour-bookings`}
        />
        <StatCard
          label={locale === 'es' ? 'Mensajes Abiertos' : 'Open Messages'}
          value={conciergeStats?.openConversations ?? 0}
          color="bg-teal-50 border-teal-200 text-teal-800"
          href={`/${locale}/staff/messages`}
        />
      </div>

      {/* Today's Arrivals */}
      {stats?.arrivals && stats.arrivals.length > 0 && (
        <Section title={locale === 'es' ? 'Llegadas de Hoy' : "Today's Arrivals"}>
          <ReservationTable reservations={stats.arrivals} locale={locale} />
        </Section>
      )}

      {/* Today's Departures */}
      {stats?.departures && stats.departures.length > 0 && (
        <Section title={locale === 'es' ? 'Salidas de Hoy' : "Today's Departures"}>
          <ReservationTable reservations={stats.departures} locale={locale} />
        </Section>
      )}
    </div>
  );
}

function StatCard({
  label, value, color, href,
}: {
  label: string;
  value: number;
  color: string;
  href?: string;
}) {
  const content = (
    <div className={`border rounded-lg p-4 ${color} transition-transform hover:scale-105`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm mt-1 font-medium">{label}</div>
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }
  return content;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function ReservationTable({ reservations, locale }: { reservations: any[]; locale: string }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500 border-b">
          <th className="px-6 py-2">{locale === 'es' ? 'Habitación' : 'Room'}</th>
          <th className="px-6 py-2">{locale === 'es' ? 'Huésped' : 'Guest'}</th>
          <th className="px-6 py-2">{locale === 'es' ? 'Categoría' : 'Category'}</th>
          <th className="px-6 py-2">{locale === 'es' ? 'Noches' : 'Nights'}</th>
          <th className="px-6 py-2">{locale === 'es' ? 'Estado' : 'Status'}</th>
        </tr>
      </thead>
      <tbody>
        {reservations.map((r) => (
          <tr key={r.id} className="border-b hover:bg-gray-50">
            <td className="px-6 py-3 font-semibold">{r.room || '—'}</td>
            <td className="px-6 py-3">
              <div>{r.guest_name || '—'}</div>
              {r.opera_guest_name && r.opera_guest_name !== r.guest_name && (
                <div className="text-xs text-gray-500">Opera: {r.opera_guest_name}</div>
              )}
            </td>
            <td className="px-6 py-3">{r.room_category || '—'}</td>
            <td className="px-6 py-3">{r.nights ?? '—'}</td>
            <td className="px-6 py-3">
              <StatusBadge status={r.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'CHECKED IN': 'bg-green-100 text-green-800',
    'RESERVED': 'bg-blue-100 text-blue-800',
    'CHECKED OUT': 'bg-gray-100 text-gray-800',
    'CANCELLED': 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
