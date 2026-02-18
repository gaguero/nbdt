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
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          + {ls('New Guest', 'Nuevo Huésped')}
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 text-lg">{ls('New Guest', 'Nuevo Huésped')}</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{ls('First Name', 'Nombre')} *</label>
                <input required type="text" value={createForm.first_name} onChange={e => setCreateForm({ ...createForm, first_name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Last Name', 'Apellido')}</label>
                <input type="text" value={createForm.last_name} onChange={e => setCreateForm({ ...createForm, last_name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Email', 'Correo')}</label>
                <input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Phone', 'Teléfono')}</label>
                <input type="text" value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Nationality', 'Nacionalidad')}</label>
                <input type="text" value={createForm.nationality} onChange={e => setCreateForm({ ...createForm, nationality: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Notes', 'Notas')}</label>
                <textarea rows={2} value={createForm.notes} onChange={e => setCreateForm({ ...createForm, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2 flex gap-3">
                <button type="submit" disabled={createSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {createSaving ? ls('Saving...', 'Guardando...') : ls('Create', 'Crear')}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
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
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">{g.full_name}</div>
                    {g.email && <div className="text-xs text-gray-500 mt-0.5">{g.email}</div>}
                  </div>
                  {g.profile_type && g.profile_type !== 'guest' && (
                    <span className="text-[9px] px-2 py-1 rounded font-bold ml-2 bg-purple-100 text-purple-700">
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
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
              {ls('Loading...', 'Cargando...')}
            </div>
          ) : selected ? (
            <div className="space-y-4">
              {/* Profile header */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                {editing ? (
                  <form onSubmit={handleEditSave} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{ls('First Name', 'Nombre')}</label>
                        <input type="text" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Last Name', 'Apellido')}</label>
                        <input type="text" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Email', 'Correo')}</label>
                        <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Phone', 'Teléfono')}</label>
                        <input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Nationality', 'Nacionalidad')}</label>
                        <input type="text" value={editForm.nationality} onChange={e => setEditForm({ ...editForm, nationality: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Notes', 'Notas')}</label>
                        <textarea rows={2} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={editSaving} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50">
                        {editSaving ? ls('Saving...', 'Guardando...') : ls('Save', 'Guardar')}
                      </button>
                      <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200">
                        {ls('Cancel', 'Cancelar')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <h2 className="text-xl font-bold text-gray-900">{selected.guest.full_name}</h2>
                      <button onClick={handleStartEdit} className="text-xs text-blue-600 hover:underline px-2 py-1">
                        {ls('Edit', 'Editar')}
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                      {selected.guest.email && <div><span className="text-gray-400">{ls('Email', 'Correo')}: </span>{selected.guest.email}</div>}
                      {selected.guest.phone && <div><span className="text-gray-400">{ls('Phone', 'Tel')}: </span>{selected.guest.phone}</div>}
                      {selected.guest.nationality && <div><span className="text-gray-400">{ls('Nationality', 'Nac.')}: </span>{selected.guest.nationality}</div>}
                    </div>
                    {selected.guest.notes && (
                      <div className="mt-2 text-sm text-gray-600 bg-yellow-50 rounded-lg px-3 py-2">{selected.guest.notes}</div>
                    )}

                    {/* Quick-create buttons */}
                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                      <a
                        href={`/${locale}/staff/transfers?guest_id=${selected.guest.id}`}
                        className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs hover:bg-purple-100 font-medium"
                      >
                        + {ls('Add Transfer', 'Agregar Traslado')}
                      </a>
                      <a
                        href={`/${locale}/staff/tour-bookings?guest_id=${selected.guest.id}`}
                        className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-xs hover:bg-teal-100 font-medium"
                      >
                        + {ls('Add Tour', 'Agregar Tour')}
                      </a>
                      <a
                        href={`/${locale}/staff/special-requests?guest_id=${selected.guest.id}`}
                        className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-xs hover:bg-orange-100 font-medium"
                      >
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
