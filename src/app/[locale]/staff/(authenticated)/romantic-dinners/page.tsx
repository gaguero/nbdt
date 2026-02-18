'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { localDateString } from '@/lib/dates';
import { RomanticDinnerModal } from './RomanticDinnerModal';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-pink-100 text-pink-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function RomanticDinnersPage() {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const [dinners, setDinners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDinner, setSelectedDinner] = useState<any>(null);

  const fetchDinners = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter === 'today') { const today = localDateString(); params.set('date_from', today); params.set('date_to', today); }
    else if (filter === 'upcoming') params.set('date_from', localDateString());
    fetch(`/api/romantic-dinners?${params}`)
      .then(r => r.json())
      .then(d => setDinners(d.romantic_dinners ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDinners(); }, [filter]);

  const openNew = () => { setSelectedDinner(null); setModalOpen(true); };
  const openEdit = (dinner: any) => { setSelectedDinner(dinner); setModalOpen(true); };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{ls('Romantic Dinners', 'Cenas Románticas')}</h1>
        <button onClick={openNew} className="px-4 py-2 bg-pink-600 text-white rounded-lg text-sm hover:bg-pink-700">
          + {ls('New Dinner', 'Nueva Cena')}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={ls('Search guest or location...', 'Buscar huésped o ubicación...')}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none"
          />
        </div>
        {['today', 'upcoming', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f === 'today' ? ls('Today', 'Hoy') : f === 'upcoming' ? ls('Upcoming', 'Próximas') : ls('All', 'Todas')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-400 text-sm">{ls('Loading...', 'Cargando...')}</div>
      ) : dinners.filter(d => !search || d.guest_name?.toLowerCase().includes(search.toLowerCase()) || d.location?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <p className="text-gray-400 text-sm">{ls('No romantic dinners scheduled', 'Sin cenas románticas programadas')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dinners.filter(d => !search || d.guest_name?.toLowerCase().includes(search.toLowerCase()) || d.location?.toLowerCase().includes(search.toLowerCase())).map(d => (
            <div key={d.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4 hover:border-pink-200 transition-colors">
              <div className="flex-shrink-0 text-center bg-pink-50 rounded-lg px-3 py-2 min-w-[60px]">
                <div className="text-xs text-pink-500 font-medium">{d.date ? new Date(d.date + 'T12:00:00').toLocaleDateString(locale === 'es' ? 'es-CR' : 'en-US', { month: 'short' }).toUpperCase() : '—'}</div>
                <div className="text-2xl font-bold text-pink-700">{d.date ? new Date(d.date + 'T12:00:00').getDate() : '—'}</div>
                <div className="text-xs text-pink-500">{d.time ? d.time.slice(0, 5) : '—'}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{d.guest_name ?? ls('Guest not specified', 'Huésped no especificado')}</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {d.location && <span className="mr-3">📍 {d.location}</span>}
                  <span>👥 {d.num_guests} {ls('guests', 'personas')}</span>
                  {d.vendor_name && <span className="ml-3">🍽️ {d.vendor_name}</span>}
                </div>
                {d.notes && <div className="text-xs text-gray-500 mt-1 italic truncate">{d.notes}</div>}
                <div className="flex gap-2 mt-1">
                  {d.billed_date && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{ls('Billed', 'Facturado')}</span>}
                  {d.paid_date && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{ls('Paid', 'Pagado')}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status] ?? 'bg-gray-100'}`}>{d.status}</span>
                <button
                  onClick={() => openEdit(d)}
                  className="text-xs text-pink-600 hover:underline"
                >
                  {ls('Edit', 'Editar')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <RomanticDinnerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        dinner={selectedDinner}
        onSuccess={fetchDinners}
      />
    </div>
  );
}
