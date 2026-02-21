'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { MagnifyingGlassIcon, PlusIcon, HeartIcon } from '@heroicons/react/24/outline';
import { localDateString } from '@/lib/dates';
import { statusColor } from '@/lib/statusColors';
import { RomanticDinnerModal } from './RomanticDinnerModal';

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
    if (filter === 'today') {
      const today = localDateString();
      params.set('date_from', today);
      params.set('date_to', today);
    } else if (filter === 'upcoming') {
      params.set('date_from', localDateString());
    }
    fetch(`/api/romantic-dinners?${params}`)
      .then(r => r.json())
      .then(d => setDinners(d.romantic_dinners ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDinners(); }, [filter]);

  const openNew = () => { setSelectedDinner(null); setModalOpen(true); };
  const openEdit = (dinner: any) => { setSelectedDinner(dinner); setModalOpen(true); };

  const filtered = dinners.filter(d =>
    !search ||
    d.guest_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.location?.toLowerCase().includes(search.toLowerCase())
  );

  const TABS = ['today', 'upcoming', 'all'];

  return (
    <div className="p-6 space-y-5 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold italic" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>
            {ls('Romantic Dinners', 'Cenas Románticas')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-dim)' }}>
            {ls('Schedule and manage romantic dining experiences.', 'Gestione cenas románticas para los huéspedes.')}
          </p>
        </div>
        <button onClick={openNew} className="nayara-btn nayara-btn-primary">
          <PlusIcon className="h-4 w-4" />
          {ls('New Dinner', 'Nueva Cena')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 pointer-events-none" style={{ color: 'var(--muted-dim)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={ls('Search guest or location...', 'Buscar huésped o ubicación...')}
            className="nayara-input pl-9"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <div className="flex gap-1">
          {TABS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors"
              style={filter === f
                ? { background: 'var(--gold)', color: '#fff' }
                : { background: 'var(--elevated)', color: 'var(--muted-dim)' }
              }
            >
              {f === 'today' ? ls('Today', 'Hoy') : f === 'upcoming' ? ls('Upcoming', 'Próximas') : ls('All', 'Todas')}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="nayara-card p-10 text-center">
          <div className="h-7 w-7 border-2 border-t-transparent rounded-full mx-auto mb-2 animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--muted-dim)' }}>{ls('Loading...', 'Cargando...')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="nayara-card p-12 text-center">
          <HeartIcon className="h-10 w-10 mx-auto mb-2 opacity-20" style={{ color: 'var(--terra)' }} />
          <p className="text-sm italic" style={{ color: 'var(--muted-dim)' }}>{ls('No romantic dinners scheduled', 'Sin cenas románticas programadas')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => {
            const dinnerDate = d.date ? new Date(d.date + 'T12:00:00') : null;
            return (
              <div key={d.id} className="nayara-card p-4 flex items-center gap-4">
                {/* Date widget */}
                <div
                  className="flex-shrink-0 text-center rounded-xl px-3 py-2 min-w-[58px]"
                  style={{ background: 'rgba(170,142,103,0.10)', border: '1px solid rgba(170,142,103,0.20)' }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
                    {dinnerDate ? dinnerDate.toLocaleDateString(locale === 'es' ? 'es-CR' : 'en-US', { month: 'short' }).toUpperCase() : '—'}
                  </div>
                  <div className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>
                    {dinnerDate ? dinnerDate.getDate() : '—'}
                  </div>
                  <div className="text-[10px] font-medium" style={{ color: 'var(--muted-dim)' }}>
                    {d.time ? d.time.slice(0, 5) : '—'}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: 'var(--charcoal)' }}>
                    {d.guest_name ?? ls('Guest not specified', 'Huésped no especificado')}
                  </div>
                  <div className="text-xs mt-0.5 flex flex-wrap gap-3" style={{ color: 'var(--muted-dim)' }}>
                    {d.location && <span>📍 {d.location}</span>}
                    <span>👥 {d.num_guests} {ls('guests', 'personas')}</span>
                    {d.vendor_name && <span>🍽️ {d.vendor_name}</span>}
                  </div>
                  {d.notes && (
                    <div className="text-xs mt-1 italic truncate" style={{ color: 'var(--muted-dim)' }}>{d.notes}</div>
                  )}
                  <div className="flex gap-2 mt-1.5">
                    {d.billed_date && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(78,94,62,0.10)', color: 'var(--sage)' }}>
                        {ls('Billed', 'Facturado')}
                      </span>
                    )}
                    {d.paid_date && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(58,74,46,0.10)', color: 'var(--forest)' }}>
                        {ls('Paid', 'Pagado')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status + action */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={statusColor(d.status)}>{d.status}</span>
                  <button onClick={() => openEdit(d)} className="nayara-btn nayara-btn-ghost text-xs">
                    {ls('Edit', 'Editar')}
                  </button>
                </div>
              </div>
            );
          })}
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
