'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { statusColor } from '@/lib/statusColors';

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  notes: string;
  profile_type?: string;
  legacy_appsheet_id?: string;
  legacy_appsheet_ids?: string[];
  opera_profile_id?: string;
  companion_name?: string;
  created_at?: string;
  updated_at?: string;
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

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ first_name: '', last_name: '', email: '', phone: '', nationality: '', notes: '' });
  const [createSaving, setCreateSaving] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editSaving, setEditSaving] = useState(false);

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
    setEditing(false);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSaving(true);
    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        const data = await res.json();
        setGuests(prev => [data.guest, ...prev]);
        setShowCreate(false);
        setCreateForm({ first_name: '', last_name: '', email: '', phone: '', nationality: '', notes: '' });
      }
    } finally {
      setCreateSaving(false);
    }
  };

  const handleStartEdit = () => {
    if (!selected) return;
    setEditForm({
      first_name: selected.guest.first_name ?? '',
      last_name: selected.guest.last_name ?? '',
      email: selected.guest.email ?? '',
      phone: selected.guest.phone ?? '',
      nationality: selected.guest.nationality ?? '',
      notes: selected.guest.notes ?? '',
    });
    setEditing(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/guests?id=${selected.guest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const data = await res.json();
        setSelected({ ...selected, guest: data.guest });
        setGuests(prev => prev.map(g => g.id === data.guest.id ? data.guest : g));
        setEditing(false);
      }
    } finally {
      setEditSaving(false);
    }
  };

  const localStatusColor = (status: string) => {
    const map: Record<string, string> = {
      'CHECKED IN': 'nayara-badge nayara-badge-confirmed',
      'RESERVED': 'nayara-badge nayara-badge-pending',
      'CHECKED OUT': 'nayara-badge nayara-badge-completed',
      'CANCELLED': 'nayara-badge nayara-badge-cancelled',
    };
    return map[status] ?? 'nayara-badge nayara-badge-cancelled';
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold italic" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>
          {ls('Guests', 'Huéspedes')}
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="nayara-btn nayara-btn-primary"
        >
          + {ls('New Guest', 'Nuevo Huésped')}
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(14,26,9,0.52)', backdropFilter: 'blur(4px)' }}>
          <div className="nayara-card w-full max-w-md p-6 space-y-4" style={{ borderRadius: '18px' }}>
            <h2 className="font-bold italic text-lg" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--sage)' }}>{ls('New Guest', 'Nuevo Huésped')}</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div>
                <label className="nayara-label">{ls('First Name', 'Nombre')} *</label>
                <input required type="text" value={createForm.first_name} onChange={e => setCreateForm({ ...createForm, first_name: e.target.value })} className="nayara-input" />
              </div>
              <div>
                <label className="nayara-label">{ls('Last Name', 'Apellido')}</label>
                <input type="text" value={createForm.last_name} onChange={e => setCreateForm({ ...createForm, last_name: e.target.value })} className="nayara-input" />
              </div>
              <div>
                <label className="nayara-label">{ls('Email', 'Correo')}</label>
                <input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} className="nayara-input" />
              </div>
              <div>
                <label className="nayara-label">{ls('Phone', 'Teléfono')}</label>
                <input type="text" value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} className="nayara-input" />
              </div>
              <div className="col-span-2">
                <label className="nayara-label">{ls('Nationality', 'Nacionalidad')}</label>
                <input type="text" value={createForm.nationality} onChange={e => setCreateForm({ ...createForm, nationality: e.target.value })} className="nayara-input" />
              </div>
              <div className="col-span-2">
                <label className="nayara-label">{ls('Notes', 'Notas')}</label>
                <textarea rows={2} value={createForm.notes} onChange={e => setCreateForm({ ...createForm, notes: e.target.value })} className="nayara-input" />
              </div>
              <div className="col-span-2 flex gap-3">
                <button type="submit" disabled={createSaving} className="nayara-btn nayara-btn-primary disabled:opacity-50">
                  {createSaving ? ls('Saving...', 'Guardando...') : ls('Create', 'Crear')}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="nayara-btn nayara-btn-ghost">
                  {ls('Cancel', 'Cancelar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={ls('Search by name...', 'Buscar por nombre...')}
          className="nayara-input flex-1 max-w-sm"
        />
        <button type="submit" className="nayara-btn nayara-btn-secondary">
          {ls('Search', 'Buscar')}
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); fetchGuests(); }} className="nayara-btn nayara-btn-ghost">
            {ls('Clear', 'Limpiar')}
          </button>
        )}
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Guest list */}
        <div className="lg:col-span-1 nayara-card overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--separator)', background: 'var(--elevated)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>{guests.length} {ls('guests', 'huéspedes')}</h2>
          </div>
          <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--muted-dim)' }}>{ls('Loading...', 'Cargando...')}</div>
            ) : guests.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--muted-dim)' }}>{ls('No guests found', 'Sin huéspedes')}</div>
            ) : guests.map(g => (
              <button
                key={g.id}
                onClick={() => fetchDetail(g.id)}
                className="w-full text-left px-4 py-3 transition-colors"
                style={selected?.guest?.id === g.id
                  ? { background: 'rgba(170,142,103,0.10)', borderLeft: '3px solid var(--gold)' }
                  : { borderLeft: '3px solid transparent' }
                }
                onMouseEnter={e => { if (selected?.guest?.id !== g.id) e.currentTarget.style.background = 'var(--elevated)'; }}
                onMouseLeave={e => { if (selected?.guest?.id !== g.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm" style={{ color: 'var(--charcoal)' }}>{g.full_name}</div>
                    {g.email && <div className="text-xs mt-0.5" style={{ color: 'var(--muted-dim)' }}>{g.email}</div>}
                  </div>
                  {g.profile_type && g.profile_type !== 'guest' && (
                    <span className="text-[9px] px-2 py-1 rounded font-bold ml-2" style={{ background: 'rgba(78,94,62,0.12)', color: 'var(--sage)' }}>
                      {g.profile_type}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Guest detail */}
        <div className="lg:col-span-2">
          {loadingDetail ? (
            <div className="nayara-card p-8 text-center text-sm" style={{ color: 'var(--muted-dim)' }}>
              {ls('Loading...', 'Cargando...')}
            </div>
          ) : selected ? (
            <div className="space-y-4">
              {/* Profile header */}
              <div className="nayara-card p-5">
                {editing ? (
                  <form onSubmit={handleEditSave} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="nayara-label">{ls('First Name', 'Nombre')}</label><input type="text" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} className="nayara-input" /></div>
                      <div><label className="nayara-label">{ls('Last Name', 'Apellido')}</label><input type="text" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} className="nayara-input" /></div>
                      <div><label className="nayara-label">{ls('Email', 'Correo')}</label><input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="nayara-input" /></div>
                      <div><label className="nayara-label">{ls('Phone', 'Teléfono')}</label><input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="nayara-input" /></div>
                      <div className="col-span-2"><label className="nayara-label">{ls('Nationality', 'Nacionalidad')}</label><input type="text" value={editForm.nationality} onChange={e => setEditForm({ ...editForm, nationality: e.target.value })} className="nayara-input" /></div>
                      <div className="col-span-2"><label className="nayara-label">{ls('Notes', 'Notas')}</label><textarea rows={2} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="nayara-input" /></div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={editSaving} className="nayara-btn nayara-btn-primary disabled:opacity-50">
                        {editSaving ? ls('Saving...', 'Guardando...') : ls('Save', 'Guardar')}
                      </button>
                      <button type="button" onClick={() => setEditing(false)} className="nayara-btn nayara-btn-ghost">
                        {ls('Cancel', 'Cancelar')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <h2 className="text-xl font-bold italic" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>{selected.guest.full_name}</h2>
                      <button onClick={handleStartEdit} className="nayara-btn nayara-btn-ghost text-xs">
                        {ls('Edit', 'Editar')}
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                      {selected.guest.email && <div><span style={{ color: 'var(--muted-dim)' }}>{ls('Email', 'Correo')}: </span>{selected.guest.email}</div>}
                      {selected.guest.phone && <div><span style={{ color: 'var(--muted-dim)' }}>{ls('Phone', 'Tel')}: </span>{selected.guest.phone}</div>}
                      {selected.guest.nationality && <div><span style={{ color: 'var(--muted-dim)' }}>{ls('Nationality', 'Nac.')}: </span>{selected.guest.nationality}</div>}
                    </div>
                    {selected.guest.notes && (
                      <div className="mt-2 text-sm rounded-lg px-3 py-2" style={{ background: 'rgba(170,142,103,0.10)', color: 'var(--muted)' }}>{selected.guest.notes}</div>
                    )}

                    {/* Quick-create buttons */}
                    <div className="mt-3 pt-3 flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--separator)' }}>
                      <a href={`/${locale}/staff/transfers?guest_id=${selected.guest.id}`} className="nayara-btn nayara-btn-secondary text-xs">
                        + {ls('Add Transfer', 'Agregar Traslado')}
                      </a>
                      <a href={`/${locale}/staff/tour-bookings?guest_id=${selected.guest.id}`} className="nayara-btn nayara-btn-secondary text-xs">
                        + {ls('Add Tour', 'Agregar Tour')}
                      </a>
                      <a href={`/${locale}/staff/special-requests?guest_id=${selected.guest.id}`} className="nayara-btn nayara-btn-secondary text-xs">
                        + {ls('Add Special Request', 'Agregar Solicitud')}
                      </a>
                    </div>
                  </>
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
                          {r.opera_guest_name && r.opera_guest_name !== selected.guest.full_name && (
                            <div className="text-xs text-gray-400 mt-1">Opera: {r.opera_guest_name}</div>
                          )}
                        </div>
                        <span className={localStatusColor(r.status)}>{r.status}</span>
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

              {/* Record Details */}
              <Section title={ls('Record Details', 'Detalles del Registro')}>
                <dl className="grid grid-cols-2 gap-3 px-4 py-3 text-xs">
                  {selected.guest.id && <div><dt className="text-gray-500 font-medium">{ls('ID', 'ID')}</dt><dd className="font-mono text-gray-700 break-all">{selected.guest.id}</dd></div>}
                  {selected.guest.legacy_appsheet_id && <div><dt className="text-gray-500 font-medium">{ls('Legacy AppSheet ID', 'Legacy AppSheet ID')}</dt><dd className="font-mono text-gray-700">{selected.guest.legacy_appsheet_id}</dd></div>}
                  {selected.guest.legacy_appsheet_ids && Array.isArray(selected.guest.legacy_appsheet_ids) && selected.guest.legacy_appsheet_ids.length > 0 && <div className="col-span-2"><dt className="text-gray-500 font-medium mb-1">{ls('Merged IDs', 'IDs Consolidados')}</dt><dd className="font-mono text-gray-700 break-all">{selected.guest.legacy_appsheet_ids.join(', ')}</dd></div>}
                  {selected.guest.opera_profile_id && <div><dt className="text-gray-500 font-medium">{ls('Opera Profile ID', 'ID Perfil Opera')}</dt><dd className="font-mono text-gray-700">{selected.guest.opera_profile_id}</dd></div>}
                  {selected.guest.companion_name && <div><dt className="text-gray-500 font-medium">{ls('Companion', 'Acompañante')}</dt><dd className="text-gray-700">{selected.guest.companion_name}</dd></div>}
                  {selected.guest.profile_type && <div><dt className="text-gray-500 font-medium">{ls('Profile Type', 'Tipo Perfil')}</dt><dd className="text-gray-700 capitalize">{selected.guest.profile_type}</dd></div>}
                  {selected.guest.created_at && <div><dt className="text-gray-500 font-medium">{ls('Created', 'Creado')}</dt><dd className="text-gray-700 text-[10px]">{new Date(selected.guest.created_at).toLocaleString()}</dd></div>}
                  {selected.guest.updated_at && <div><dt className="text-gray-500 font-medium">{ls('Updated', 'Actualizado')}</dt><dd className="text-gray-700 text-[10px]">{new Date(selected.guest.updated_at).toLocaleString()}</dd></div>}
                </dl>
              </Section>
            </div>
          ) : (
            <div className="nayara-card p-8 text-center text-sm" style={{ color: 'var(--muted-dim)' }}>
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
    <div className="nayara-card overflow-hidden">
      <div className="px-4 py-2.5" style={{ background: 'var(--elevated)', borderBottom: '1px solid var(--separator)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}
