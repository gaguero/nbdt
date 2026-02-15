'use client';

import { useEffect, useState } from 'react';

interface Booking {
  id: string;
  booking_date?: string;
  date?: string;
  time?: string;
  guest_name?: string;
  num_passengers?: number;
  num_guests?: number;
  origin?: string;
  destination?: string;
  product_name?: string;
  guest_status: string;
  vendor_status: string;
  type: 'transfer' | 'tour';
}

export default function VendorDashboardPage() {
  const [transfers, setTransfers] = useState<Booking[]>([]);
  const [tours, setTours] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [tRes, tourRes] = await Promise.all([
          fetch(`/api/transfers?date_from=${today}`),
          fetch(`/api/tour-bookings?date_from=${today}`),
        ]);
        const tData = await tRes.json();
        const tourData = await tourRes.json();
        setTransfers(
          (tData.transfers || []).map((b: any) => ({ ...b, type: 'transfer' }))
        );
        setTours(
          (tourData.tour_bookings || []).map((b: any) => ({ ...b, type: 'tour' }))
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const pending = [...transfers, ...tours].filter((b) => b.vendor_status === 'pending');
  const confirmed = [...transfers, ...tours].filter((b) => b.vendor_status === 'confirmed');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">{todayStr}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Today's Bookings", value: transfers.length + tours.length, color: 'blue' },
          { label: 'Pending Confirmation', value: pending.length, color: 'yellow' },
          { label: 'Confirmed', value: confirmed.length, color: 'green' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className={`text-3xl font-bold text-${stat.color}-600`}>{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {loading && <div className="text-center text-gray-400 py-8">Loading…</div>}

      {/* Today's transfers */}
      {transfers.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Today&apos;s Transfers</h2>
          <div className="space-y-2">
            {transfers.map((t) => (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{t.guest_name || '—'}</div>
                  <div className="text-sm text-gray-500">
                    {t.time} · {t.origin} → {t.destination} · {t.num_passengers} pax
                  </div>
                </div>
                <StatusBadge status={t.vendor_status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Today's tours */}
      {tours.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Today&apos;s Tours &amp; Activities</h2>
          <div className="space-y-2">
            {tours.map((t) => (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{t.product_name || '—'}</div>
                  <div className="text-sm text-gray-500">
                    {t.guest_name} · {t.num_guests} guests
                  </div>
                </div>
                <StatusBadge status={t.vendor_status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && transfers.length === 0 && tours.length === 0 && (
        <div className="text-center text-gray-400 py-12">No bookings for today.</div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
    no_show: 'bg-orange-100 text-orange-800',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}
