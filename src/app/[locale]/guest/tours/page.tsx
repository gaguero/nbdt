'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface TourProduct {
  id: string;
  name_en: string;
  name_es: string;
  description_en: string;
  type: string;
  booking_mode: string;
  duration_minutes: number;
  price_per_person: number;
  price_shared: number;
  price_private: number;
  location: string;
  vendor_name: string;
  max_guests_per_booking: number;
}

interface TourSchedule {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity_remaining: number;
  is_available: boolean;
}

interface GuestInfo { guest_id: string; reservation_id: string; guest_name: string; first_name: string; room: string; }

export default function GuestToursPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [products, setProducts] = useState<TourProduct[]>([]);
  const [selected, setSelected] = useState<TourProduct | null>(null);
  const [schedules, setSchedules] = useState<TourSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<string>('');
  const [bookingMode, setBookingMode] = useState<'private' | 'shared'>('shared');
  const [numGuests, setNumGuests] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');
  const [guest, setGuest] = useState<GuestInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    setGuest(JSON.parse(localStorage.getItem('nayara_guest') || 'null'));
    loadProducts();
  }, [typeFilter]);

  async function loadProducts() {
    setLoading(true);
    const q = typeFilter ? `?type=${typeFilter}` : '?active=true';
    const res = await fetch(`/api/tour-products${q}`);
    const data = await res.json();
    setProducts((data.products || []).filter((p: TourProduct) => p.id));
    setLoading(false);
  }

  async function openProduct(p: TourProduct) {
    setSelected(p);
    setSelectedSchedule('');
    setSpecialRequests('');
    setSuccess(false);
    setError('');
    setBookingMode(p.booking_mode === 'private' ? 'private' : 'shared');

    // Load available schedules
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/tour-schedules?product_id=${p.id}&date_from=${today}&available=true`);
    const data = await res.json();
    setSchedules(data.tour_schedules || []);
  }

  async function handleBook() {
    if (!selected || !guest) {
      setError('Please scan your room QR code first.');
      return;
    }
    if (schedules.length > 0 && !selectedSchedule) {
      setError('Please select a date and time.');
      return;
    }

    setBooking(true);
    setError('');
    try {
      const res = await fetch('/api/tour-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selected.id,
          schedule_id: selectedSchedule || null,
          guest_id: guest.guest_id,
          reservation_id: guest.reservation_id,
          booking_mode: bookingMode,
          num_guests: numGuests,
          special_requests: specialRequests,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Booking failed');
        return;
      }
      setSuccess(true);
    } finally {
      setBooking(false);
    }
  }

  const TYPES = ['tour', 'spa', 'experience', 'restaurant'];

  return (
    <div className="min-h-screen bg-gray-50">
      {guest && (
        <div className="bg-green-700 text-white text-center py-2 text-sm">
          {guest.first_name || guest.guest_name} — Room {guest.room}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Tours & Activities</h1>

        {/* Type filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter('')}
            className={`px-3 py-1.5 text-xs rounded-full font-medium capitalize ${typeFilter === '' ? 'bg-green-700 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
          >
            All
          </button>
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium capitalize ${typeFilter === t ? 'bg-green-700 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading && <div className="text-center text-gray-400 py-8">Loading…</div>}

        <div className="space-y-3">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => openProduct(p)}
              className="w-full bg-white rounded-2xl border border-gray-200 p-4 text-left hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900">{locale === 'es' ? p.name_es : p.name_en}</div>
                  {p.description_en && (
                    <div className="text-sm text-gray-500 mt-0.5 line-clamp-2">{p.description_en}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {p.duration_minutes}min
                    {p.location ? ` · ${p.location}` : ''}
                    {p.vendor_name ? ` · ${p.vendor_name}` : ''}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {p.price_per_person > 0 && (
                    <div className="font-semibold text-green-700">${p.price_per_person}/pp</div>
                  )}
                  {p.price_shared > 0 && (
                    <div className="font-semibold text-green-700">${p.price_shared}</div>
                  )}
                  <div className="text-xs text-gray-400 capitalize">{p.booking_mode}</div>
                </div>
              </div>
            </button>
          ))}
          {!loading && products.length === 0 && (
            <div className="text-center text-gray-400 py-12">No tours available.</div>
          )}
        </div>
      </div>

      {/* Booking modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-6 space-y-4">
            {success ? (
              <div className="text-center py-6">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Your request has been sent. Our concierge team will confirm your booking shortly.
                </p>
                <button
                  onClick={() => setSelected(null)}
                  className="bg-green-700 text-white rounded-xl px-6 py-3 font-semibold"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900">{selected.name_en}</h3>

                {schedules.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Date & Time</label>
                    <select
                      value={selectedSchedule}
                      onChange={(e) => setSelectedSchedule(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Choose a slot…</option>
                      {schedules.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.date} at {s.start_time}
                          {s.capacity_remaining > 0 ? ` (${s.capacity_remaining} spots)` : ' (Full)'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {schedules.length === 0 && (
                  <div className="text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                    Our concierge team will contact you to confirm the schedule.
                  </div>
                )}

                {(selected.booking_mode === 'either') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Booking Type</label>
                    <div className="flex gap-2">
                      {(['shared', 'private'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setBookingMode(m)}
                          className={`flex-1 py-2 rounded-xl text-sm font-medium border capitalize ${
                            bookingMode === m
                              ? 'bg-green-700 text-white border-green-700'
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Guests</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setNumGuests(Math.max(1, numGuests - 1))}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-lg font-medium hover:bg-gray-50"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold">{numGuests}</span>
                    <button
                      onClick={() => setNumGuests(Math.min(selected.max_guests_per_booking || 10, numGuests + 1))}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-lg font-medium hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    rows={2}
                    placeholder="Any special needs or requests…"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelected(null)}
                    className="flex-1 border border-gray-300 rounded-xl py-3 text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBook}
                    disabled={booking}
                    className="flex-1 bg-green-700 text-white rounded-xl py-3 text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
                  >
                    {booking ? 'Booking…' : 'Request Booking'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
