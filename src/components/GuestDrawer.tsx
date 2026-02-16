'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface GuestProfile {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  notes: string;
  reservations: any[];
  transfers: any[];
  tourBookings: any[];
  specialRequests: any[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-600',
};

export function GuestDrawer({ guestId, onClose }: { guestId: string | null; onClose: () => void }) {
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!guestId) {
      setGuest(null);
      return;
    }

    setLoading(true);
    fetch(`/api/guests?id=${guestId}`)
      .then(r => r.json())
      .then(d => setGuest(d.guest || null))
      .finally(() => setLoading(false));
  }, [guestId]);

  if (!guestId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-screen w-96 bg-white shadow-lg z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="font-bold text-lg">Guest Profile</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : guest ? (
          <div className="p-4 space-y-6">
            {/* Guest Profile */}
            <Section title="Profile">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {guest.full_name}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {guest.email || '—'}
                </div>
                <div>
                  <span className="font-medium">Phone:</span> {guest.phone || '—'}
                </div>
                <div>
                  <span className="font-medium">Nationality:</span> {guest.nationality || '—'}
                </div>
              </div>
            </Section>

            {/* Current Reservation */}
            {guest.reservations && guest.reservations.length > 0 && (
              <Section title="Current Reservation">
                {guest.reservations.map(r => (
                  <div key={r.id} className="text-sm space-y-1">
                    <div>
                      <span className="font-medium">Room:</span> {r.room}
                    </div>
                    <div>
                      <span className="font-medium">Check-in:</span> {r.arrival}
                    </div>
                    <div>
                      <span className="font-medium">Check-out:</span> {r.departure}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>{' '}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status?.toLowerCase()] || 'bg-gray-100'}`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {/* Upcoming Transfers */}
            {guest.transfers && guest.transfers.length > 0 && (
              <Section title="Upcoming Transfers">
                <div className="space-y-3">
                  {guest.transfers.slice(0, 7).map(t => (
                    <div key={t.id} className="text-sm border-l-2 border-blue-500 pl-3 py-2">
                      <div>
                        <span className="font-medium">{t.time?.slice(0, 5)}</span> {t.origin} → {t.destination}
                      </div>
                      <div className="text-xs text-gray-600">{t.vendor_name}</div>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${STATUS_COLORS[t.guest_status?.toLowerCase()] || 'bg-gray-100'}`}>
                        {t.guest_status}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Upcoming Tours */}
            {guest.tourBookings && guest.tourBookings.length > 0 && (
              <Section title="Upcoming Tours">
                <div className="space-y-3">
                  {guest.tourBookings.slice(0, 7).map(tb => (
                    <div key={tb.id} className="text-sm border-l-2 border-purple-500 pl-3 py-2">
                      <div className="font-medium">{tb.name_en || tb.legacy_activity_name}</div>
                      <div className="text-xs text-gray-600">
                        {tb.start_time?.slice(0, 5)} • {tb.num_guests} guests
                      </div>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${STATUS_COLORS[tb.guest_status?.toLowerCase()] || 'bg-gray-100'}`}>
                        {tb.guest_status}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Open Special Requests */}
            {guest.specialRequests && guest.specialRequests.length > 0 && (
              <Section title="Special Requests">
                <div className="space-y-2">
                  {guest.specialRequests.filter((r: any) => r.status !== 'completed').map((req: any) => (
                    <div key={req.id} className="text-sm border-l-2 border-orange-500 pl-3 py-2">
                      <div className="font-medium">{req.request}</div>
                      <div className="text-xs text-gray-600">{req.department}</div>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${STATUS_COLORS[req.status?.toLowerCase()] || 'bg-gray-100'}`}>
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">Guest not found</div>
        )}
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-sm text-gray-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}
