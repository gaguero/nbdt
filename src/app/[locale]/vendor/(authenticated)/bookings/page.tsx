'use client';

import { useEffect, useState } from 'react';

type TabType = 'transfers' | 'tours';

interface Transfer {
  id: string;
  date: string;
  time: string;
  guest_name: string;
  num_passengers: number;
  origin: string;
  destination: string;
  transfer_type: string;
  flight_number: string;
  notes: string;
  guest_status: string;
  vendor_status: string;
}

interface TourBooking {
  id: string;
  booking_date: string;
  product_name: string;
  guest_name: string;
  num_guests: number;
  booking_mode: string;
  special_requests: string;
  guest_status: string;
  vendor_status: string;
}

const VENDOR_STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'no_show', 'cancelled'];

export default function VendorBookingsPage() {
  const [tab, setTab] = useState<TabType>('transfers');
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [tours, setTours] = useState<TourBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [tRes, tourRes] = await Promise.all([
        fetch('/api/transfers'),
        fetch('/api/tour-bookings'),
      ]);
      const tData = await tRes.json();
      const tourData = await tourRes.json();
      setTransfers(tData.transfers || []);
      setTours(tourData.tour_bookings || []);
    } finally {
      setLoading(false);
    }
  }

  async function updateVendorStatus(endpoint: string, id: string, vendor_status: string) {
    setUpdating(id);
    try {
      await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, vendor_status }),
      });
      await loadData();
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['transfers', 'tours'] as TabType[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'transfers' ? `Transfers (${transfers.length})` : `Tours (${tours.length})`}
          </button>
        ))}
      </div>

      {loading && <div className="text-center text-gray-400 py-8">Loading…</div>}

      {tab === 'transfers' && !loading && (
        <div className="space-y-3">
          {transfers.length === 0 && (
            <div className="text-center text-gray-400 py-12">No transfers assigned.</div>
          )}
          {transfers.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-semibold text-gray-900">{t.guest_name}</div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{t.date}</span> at {t.time}
                  </div>
                  <div className="text-sm text-gray-600">
                    {t.origin} → {t.destination}
                  </div>
                  <div className="text-sm text-gray-500">
                    {t.num_passengers} passengers · {t.transfer_type}
                    {t.flight_number && ` · Flight: ${t.flight_number}`}
                  </div>
                  {t.notes && (
                    <div className="text-sm text-gray-500 italic">{t.notes}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusBadge status={t.guest_status} label="Guest" />
                  <select
                    value={t.vendor_status}
                    disabled={updating === t.id}
                    onChange={(e) => updateVendorStatus('/api/transfers', t.id, e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {VENDOR_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'tours' && !loading && (
        <div className="space-y-3">
          {tours.length === 0 && (
            <div className="text-center text-gray-400 py-12">No tour bookings assigned.</div>
          )}
          {tours.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-semibold text-gray-900">{t.product_name}</div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{t.booking_date}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {t.guest_name} · {t.num_guests} guests · {t.booking_mode}
                  </div>
                  {t.special_requests && (
                    <div className="text-sm text-gray-500 italic">{t.special_requests}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusBadge status={t.guest_status} label="Guest" />
                  <select
                    value={t.vendor_status}
                    disabled={updating === t.id}
                    onChange={(e) => updateVendorStatus('/api/tour-bookings', t.id, e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {VENDOR_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
    no_show: 'bg-orange-100 text-orange-800',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {label}: {status}
    </span>
  );
}
