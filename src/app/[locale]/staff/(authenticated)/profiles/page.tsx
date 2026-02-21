'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  notes: string;
  profile_type: string;
  legacy_appsheet_id?: string;
  legacy_appsheet_ids?: string[];
  opera_profile_id?: string;
  companion_name?: string;
  created_at?: string;
  updated_at?: string;
}

function profileTypeBadge(type: string): string {
  const map: Record<string, string> = {
    staff: 'nayara-badge nayara-badge-confirmed',
    visitor: 'nayara-badge nayara-badge-in-progress',
    musician: 'nayara-badge nayara-badge-resolved',
    artist: 'nayara-badge nayara-badge-pending',
    vendor: 'nayara-badge nayara-badge-vendor-confirmed',
    guest: 'nayara-badge nayara-badge-confirmed',
    other: 'nayara-badge nayara-badge-cancelled',
  };
  return map[type] ?? 'nayara-badge nayara-badge-cancelled';
}

export default function ProfilesPage() {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Profile | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [profileType, setProfileType] = useState<string>('all');

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', nationality: '', notes: '', profile_type: 'staff'
  });
  const [createSaving, setCreateSaving] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editSaving, setEditSaving] = useState(false);

  const fetchProfiles = (q?: string, type?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.append('search', q);
    params.append('profileType', type === 'all' ? 'all' : type || 'all');
    fetch(`/api/guests?${params.toString()}`)
      .then(r => r.json())
      .then(d => setProfiles(d.guests ?? []))
      .finally(() => setLoading(false));
  };

  const fetchDetail = (id: string) => {
    setLoadingDetail(true);
    setEditing(false);
    fetch(`/api/guests?id=${id}`)
      .then(r => r.json())
      .then(d => setSelected(d.guest))
      .finally(() => setLoadingDetail(false));
  };

  useEffect(() => { fetchProfiles('', 'all'); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProfiles(search, profileType);
  };

  const handleTypeChange = (type: string) => {
    setProfileType(type);
    fetchProfiles(search, type);
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
        setProfiles(prev => [data.guest, ...prev]);
        setShowCreate(false);
        setCreateForm({ first_name: '', last_name: '', email: '', phone: '', nationality: '', notes: '', profile_type: 'staff' });
      }
    } finally {
      setCreateSaving(false);
    }
  };

  const handleStartEdit = () => {
    if (!selected) return;
    setEditForm({
      first_name: selected.first_name ?? '',
      last_name: selected.last_name ?? '',
      email: selected.email ?? '',
      phone: selected.phone ?? '',
      nationality: selected.nationality ?? '',
      notes: selected.notes ?? '',
      profile_type: selected.profile_type ?? 'guest',
    });
    setEditing(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/guests?id=${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const data = await res.json();
        setSelected(data.guest);
        setProfiles(prev => prev.map(p => p.id === data.guest.id ? data.guest : p));
        setEditing(false);
      }
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold italic" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>
          {ls('Profiles', 'Perfiles')}
        </h1>
        <button onClick={() => setShowCreate(true)} className="nayara-btn nayara-btn-primary">
          + {ls('New Profile', 'Nuevo Perfil')}
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(14,26,9,0.52)', backdropFilter: 'blur(4px)' }}
        >
          <div className="nayara-card w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold italic text-lg" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>
              {ls('New Profile', 'Nuevo Perfil')}
            </h2>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div>
                <label className="nayara-label">{ls('First Name', 'Nombre')} *</label>
                <input required type="text" value={createForm.first_name} onChange={e => setCreateForm({ ...createForm, first_name: e.target.value })} className="nayara-input w-full mt-1" />
              </div>
              <div>
                <label className="nayara-label">{ls('Last Name', 'Apellido')}</label>
                <input type="text" value={createForm.last_name} onChange={e => setCreateForm({ ...createForm, last_name: e.target.value })} className="nayara-input w-full mt-1" />
              </div>
              <div>
                <label className="nayara-label">{ls('Email', 'Correo')}</label>
                <input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} className="nayara-input w-full mt-1" />
              </div>
              <div>
                <label className="nayara-label">{ls('Phone', 'Teléfono')}</label>
                <input type="text" value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} className="nayara-input w-full mt-1" />
              </div>
              <div className="col-span-2">
                <label className="nayara-label">{ls('Nationality', 'Nacionalidad')}</label>
                <input type="text" value={createForm.nationality} onChange={e => setCreateForm({ ...createForm, nationality: e.target.value })} className="nayara-input w-full mt-1" />
              </div>
              <div className="col-span-2">
                <label className="nayara-label">{ls('Profile Type', 'Tipo de Perfil')} *</label>
                <select value={createForm.profile_type} onChange={e => setCreateForm({ ...createForm, profile_type: e.target.value })} className="nayara-input w-full mt-1">
                  <option value="staff">{ls('Staff', 'Personal')}</option>
                  <option value="visitor">{ls('Visitor', 'Visitante')}</option>
                  <option value="musician">{ls('Musician', 'Músico')}</option>
                  <option value="artist">{ls('Artist', 'Artista')}</option>
                  <option value="vendor">{ls('Vendor', 'Vendedor')}</option>
                  <option value="other">{ls('Other', 'Otro')}</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="nayara-label">{ls('Notes', 'Notas')}</label>
                <textarea rows={2} value={createForm.notes} onChange={e => setCreateForm({ ...createForm, notes: e.target.value })} className="nayara-input w-full mt-1 resize-none" />
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

      {/* Type Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'staff', 'visitor', 'musician', 'artist', 'vendor', 'other'].map(type => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors"
            style={profileType === type
              ? { background: 'var(--gold)', color: '#fff' }
              : { background: 'var(--elevated)', color: 'var(--muted-dim)' }
            }
          >
            {ls(
              type === 'all' ? 'All Profiles' : type.charAt(0).toUpperCase() + type.slice(1),
              type === 'all' ? 'Todos' : type === 'staff' ? 'Personal' : type === 'visitor' ? 'Visitantes' : type === 'musician' ? 'Músicos' : type === 'artist' ? 'Artistas' : type === 'vendor' ? 'Vendedores' : 'Otro'
            )}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={ls('Search by name...', 'Buscar por nombre...')}
          className="nayara-input flex-1 max-w-sm"
        />
        <button type="submit" className="nayara-btn nayara-btn-secondary">{ls('Search', 'Buscar')}</button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); fetchProfiles('', profileType); }} className="nayara-btn nayara-btn-ghost">
            {ls('Clear', 'Limpiar')}
          </button>
        )}
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile list */}
        <div className="lg:col-span-1 nayara-card overflow-hidden">
          <div className="px-4 py-3" style={{ background: 'var(--elevated)', borderBottom: '1px solid var(--separator)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>{profiles.length} {ls('profiles', 'perfiles')}</h2>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto custom-scrollbar" style={{ borderColor: 'var(--separator)' }}>
            {loading ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--muted-dim)' }}>{ls('Loading...', 'Cargando...')}</div>
            ) : profiles.length === 0 ? (
              <div className="py-8 text-center text-sm italic" style={{ color: 'var(--muted-dim)' }}>{ls('No profiles found', 'Sin perfiles')}</div>
            ) : profiles.map(p => (
              <button
                key={p.id}
                onClick={() => fetchDetail(p.id)}
                className="w-full text-left px-4 py-3 transition-colors"
                style={selected?.id === p.id
                  ? { background: 'rgba(170,142,103,0.10)', borderLeft: '3px solid var(--gold)' }
                  : { borderLeft: '3px solid transparent' }
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: 'var(--charcoal)' }}>{p.full_name}</div>
                    {p.email && <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted-dim)' }}>{p.email}</div>}
                  </div>
                  <span className={profileTypeBadge(p.profile_type)}>{p.profile_type}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Profile detail */}
        <div className="lg:col-span-2">
          {loadingDetail ? (
            <div className="nayara-card p-8 text-center text-sm" style={{ color: 'var(--muted-dim)' }}>
              {ls('Loading...', 'Cargando...')}
            </div>
          ) : selected ? (
            <div className="space-y-4">
              <div className="nayara-card p-5">
                {editing ? (
                  <form onSubmit={handleEditSave} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="nayara-label">{ls('First Name', 'Nombre')}</label>
                        <input type="text" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} className="nayara-input w-full mt-1" />
                      </div>
                      <div>
                        <label className="nayara-label">{ls('Last Name', 'Apellido')}</label>
                        <input type="text" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} className="nayara-input w-full mt-1" />
                      </div>
                      <div>
                        <label className="nayara-label">{ls('Email', 'Correo')}</label>
                        <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="nayara-input w-full mt-1" />
                      </div>
                      <div>
                        <label className="nayara-label">{ls('Phone', 'Teléfono')}</label>
                        <input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="nayara-input w-full mt-1" />
                      </div>
                      <div>
                        <label className="nayara-label">{ls('Nationality', 'Nacionalidad')}</label>
                        <input type="text" value={editForm.nationality} onChange={e => setEditForm({ ...editForm, nationality: e.target.value })} className="nayara-input w-full mt-1" />
                      </div>
                      <div>
                        <label className="nayara-label">{ls('Profile Type', 'Tipo de Perfil')}</label>
                        <select value={editForm.profile_type} onChange={e => setEditForm({ ...editForm, profile_type: e.target.value })} className="nayara-input w-full mt-1">
                          <option value="guest">{ls('Guest', 'Huésped')}</option>
                          <option value="staff">{ls('Staff', 'Personal')}</option>
                          <option value="visitor">{ls('Visitor', 'Visitante')}</option>
                          <option value="musician">{ls('Musician', 'Músico')}</option>
                          <option value="artist">{ls('Artist', 'Artista')}</option>
                          <option value="vendor">{ls('Vendor', 'Vendedor')}</option>
                          <option value="other">{ls('Other', 'Otro')}</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="nayara-label">{ls('Notes', 'Notas')}</label>
                        <textarea rows={2} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="nayara-input w-full mt-1 resize-none" />
                      </div>
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
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-xl font-bold italic" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>
                          {selected.full_name}
                        </h2>
                        <span className={profileTypeBadge(selected.profile_type)}>{selected.profile_type}</span>
                      </div>
                      <button
                        onClick={handleStartEdit}
                        className="text-xs font-semibold transition-colors px-2 py-1"
                        style={{ color: 'var(--gold)' }}
                      >
                        {ls('Edit', 'Editar')}
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                      {selected.email && <div><span style={{ color: 'var(--muted-dim)' }}>{ls('Email', 'Correo')}: </span>{selected.email}</div>}
                      {selected.phone && <div><span style={{ color: 'var(--muted-dim)' }}>{ls('Phone', 'Tel')}: </span>{selected.phone}</div>}
                      {selected.nationality && <div><span style={{ color: 'var(--muted-dim)' }}>{ls('Nationality', 'Nac.')}: </span>{selected.nationality}</div>}
                    </div>
                    {selected.notes && (
                      <div
                        className="mt-2 text-sm rounded-lg px-3 py-2"
                        style={{ background: 'rgba(170,142,103,0.10)', color: 'var(--gold-dark)' }}
                      >
                        {selected.notes}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Record Details */}
              <div className="nayara-card overflow-hidden">
                <div className="px-4 py-2.5" style={{ background: 'var(--elevated)', borderBottom: '1px solid var(--separator)' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>{ls('Record Details', 'Detalles del Registro')}</h3>
                </div>
                <dl className="grid grid-cols-2 gap-3 px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>
                  {selected.id && <div><dt className="font-medium mb-0.5" style={{ color: 'var(--muted-dim)' }}>{ls('ID', 'ID')}</dt><dd className="font-mono break-all">{selected.id}</dd></div>}
                  {selected.legacy_appsheet_id && <div><dt className="font-medium mb-0.5" style={{ color: 'var(--muted-dim)' }}>{ls('Legacy AppSheet ID', 'Legacy AppSheet ID')}</dt><dd className="font-mono">{selected.legacy_appsheet_id}</dd></div>}
                  {selected.legacy_appsheet_ids && Array.isArray(selected.legacy_appsheet_ids) && selected.legacy_appsheet_ids.length > 0 && (
                    <div className="col-span-2"><dt className="font-medium mb-1" style={{ color: 'var(--muted-dim)' }}>{ls('Merged IDs', 'IDs Consolidados')}</dt><dd className="font-mono break-all">{selected.legacy_appsheet_ids.join(', ')}</dd></div>
                  )}
                  {selected.opera_profile_id && <div><dt className="font-medium mb-0.5" style={{ color: 'var(--muted-dim)' }}>{ls('Opera Profile ID', 'ID Perfil Opera')}</dt><dd className="font-mono">{selected.opera_profile_id}</dd></div>}
                  {selected.companion_name && <div><dt className="font-medium mb-0.5" style={{ color: 'var(--muted-dim)' }}>{ls('Companion', 'Acompañante')}</dt><dd>{selected.companion_name}</dd></div>}
                  {selected.created_at && <div><dt className="font-medium mb-0.5" style={{ color: 'var(--muted-dim)' }}>{ls('Created', 'Creado')}</dt><dd className="text-[10px]">{new Date(selected.created_at).toLocaleString()}</dd></div>}
                  {selected.updated_at && <div><dt className="font-medium mb-0.5" style={{ color: 'var(--muted-dim)' }}>{ls('Updated', 'Actualizado')}</dt><dd className="text-[10px]">{new Date(selected.updated_at).toLocaleString()}</dd></div>}
                </dl>
              </div>
            </div>
          ) : (
            <div className="nayara-card p-8 text-center text-sm italic" style={{ color: 'var(--muted-dim)' }}>
              {ls('Select a profile to view their details', 'Selecciona un perfil para ver sus detalles')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
