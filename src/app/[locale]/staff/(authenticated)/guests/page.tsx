'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  notes: string;
}

interface GuestDetail {
  guest: Guest;
  reservations: any[];
  transfers: any[];
  tourBookings: any[];
  specialRequests: any[];
}

export default function GuestsPage() {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<GuestDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchGuests = (q?: string) => {
    setLoading(true);
    const params = q ? `?search=${encodeURIComponent(q)}` : '';
    fetch(`/api/guests${params}`)
      .then(r => r.json())
      .then(d => setGuests(d.guests ?? []))
      .finally(() => setLoading(false));
  };

  const fetchDetail = (id: string) => {
    setLoadingDetail(true);
    fetch(`/api/guests?id=${id}`)
      .then(r => r.json())
      .then(d => setSelected(d))
      .finally(() => setLoadingDetail(false));
  };

  useEffect(() => { fetchGuests(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGuests(search);
  };

  const STATUS_COLORS: Record<string, string> = {
    'CHECKED IN': 'bg-green-100 text-green-700',
    'RESERVED': 'bg-blue-100 text-blue-700',
    'CHECKED OUT': 'bg-gray-100 text-gray-600',
    'CANCELLED': 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{ls('Guests', 'Huéspedes')}</h1>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={ls('Search by name...', 'Buscar por nombre...')}
          className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-sm"
        />
        <button type="submit" className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
          {ls('Search', 'Buscar')}
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); fetchGuests(); }} className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm">
            {ls('Clear', 'Limpiar')}
          </button>
        )}
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Guest list */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="text-sm font-semibold text-gray-700">{guests.length} {ls('guests', 'huéspedes')}</h2>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-gray-400 text-sm">{ls('Loading...', 'Cargando...')}</div>
            ) : guests.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">{ls('No guests found', 'Sin huéspedes')}</div>
            ) : guests.map(g => (
              <button
                key={g.id}
                onClick={() => fetchDetail(g.id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selected?.guest?.id === g.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
              >
                <div className="font-medium text-sm text-gray-900">{g.full_name}</div>
                {g.email && <div className="text-xs text-gray-500 mt-0.5">{g.email}</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Guest detail */}
        <div className="lg:col-span-2">
          {loadingDetail ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
              {ls('Loading...', 'Cargando...')}
            </div>
          ) : selected ? (
            <div className="space-y-4">
              {/* Profile header */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="text-xl font-bold text-gray-900">{selected.guest.full_name}</h2>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                  {selected.guest.email && <div><span className="text-gray-400">{ls('Email', 'Correo')}: </span>{selected.guest.email}</div>}
                  {selected.guest.phone && <div><span className="text-gray-400">{ls('Phone', 'Tel')}: </span>{selected.guest.phone}</div>}
                </div>
                {selected.guest.notes && (
                  <div className="mt-2 text-sm text-gray-600 bg-yellow-50 rounded-lg px-3 py-2">{selected.guest.notes}</div>
                )}
              </div>

              {/* Reservations */}
              {selected.reservations.length > 0 && (
                <Section title={ls('Reservations', 'Reservaciones')}>
                  <div className="divide-y">
                    {selected.reservations.map(r => (
                      <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{ls('Room', 'Hab.')} {r.room || '—'}</span>
                          <span className="text-xs text-gray-500 ml-3">{r.arrival ? new Date(r.arrival).toLocaleDateString() : '—'} → {r.departure ? new Date(r.departure).toLocaleDateString() : '—'}</span>
                          <span className="text-xs text-gray-500 ml-2">({r.nights ?? '—'} {ls('nights', 'noches')})</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Transfers */}
              {selected.transfers.length > 0 && (
                <Section title={ls(`Transfers (${selected.transfers.length})`, `Traslados (${selected.transfers.length})`)}>
                  <div className="divide-y">
                    {selected.transfers.map(t => (
                      <div key={t.id} className="px-4 py-3 text-sm">
                        <div className="flex justify-between">
                          <span>{t.date ? new Date(t.date).toLocaleDateString() : '—'} {t.time ? t.time.slice(0, 5) : ''}</span>
                          <span className="text-xs text-gray-500">{t.vendor_name || '—'}</span>
                        </div>
                        <div className="text-xs text-gray-500">{t.origin || '—'} → {t.destination || '—'}</div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Tour Bookings */}
              {selected.tourBookings.length > 0 && (
                <Section title={ls(`Tours (${selected.tourBookings.length})`, `Tours (${selected.tourBookings.length})`)}>
                  <div className="divide-y">
                    {selected.tourBookings.map(tb => (
                      <div key={tb.id} className="px-4 py-3 text-sm">
                        <div className="font-medium">{tb.product_name || '—'}</div>
                        <div className="text-xs text-gray-500">{tb.booking_mode} · {tb.num_guests} {ls('guests', 'huéspedes')}</div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Special Requests */}
              {selected.specialRequests.length > 0 && (
                <Section title={ls(`Special Requests (${selected.specialRequests.length})`, `Solicitudes (${selected.specialRequests.length})`)}>
                  <div className="divide-y">
                    {selected.specialRequests.map(sr => (
                      <div key={sr.id} className="px-4 py-3 text-sm">
                        <div>{sr.request}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{sr.date ? new Date(sr.date).toLocaleDateString() : '—'} · {sr.department}</div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
              {ls('Select a guest to view their profile', 'Selecciona un huésped para ver su perfil')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      {children}
    </div>
  );
}
