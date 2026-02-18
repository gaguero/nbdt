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
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    nationality: '',
    notes: '',
    profile_type: 'staff'
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
        setCreateForm({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          nationality: '',
          notes: '',
          profile_type: 'staff'
        });
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

  const profileTypeColors: Record<string, string> = {
    'staff': 'bg-purple-100 text-purple-700',
    'visitor': 'bg-teal-100 text-teal-700',
    'musician': 'bg-pink-100 text-pink-700',
    'artist': 'bg-amber-100 text-amber-700',
    'vendor': 'bg-indigo-100 text-indigo-700',
    'other': 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{ls('Profiles', 'Perfiles')}</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          + {ls('New Profile', 'Nuevo Perfil')}
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 text-lg">{ls('New Profile', 'Nuevo Perfil')}</h2>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Profile Type', 'Tipo de Perfil')} *</label>
                <select value={createForm.profile_type} onChange={e => setCreateForm({ ...createForm, profile_type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="staff">{ls('Staff', 'Personal')}</option>
                  <option value="visitor">{ls('Visitor', 'Visitante')}</option>
                  <option value="musician">{ls('Musician', 'Músico')}</option>
                  <option value="artist">{ls('Artist', 'Artista')}</option>
                  <option value="vendor">{ls('Vendor', 'Vendedor')}</option>
                  <option value="other">{ls('Other', 'Otro')}</option>
                </select>
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

      {/* Type Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'staff', 'visitor', 'musician', 'artist', 'vendor', 'other'].map(type => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              profileType === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {ls(type === 'all' ? 'All Profiles' : type.charAt(0).toUpperCase() + type.slice(1),
                type === 'all' ? 'Todos' : type === 'staff' ? 'Personal' : type === 'visitor' ? 'Visitantes' : type === 'musician' ? 'Músicos' : type === 'artist' ? 'Artistas' : type === 'vendor' ? 'Vendedores' : 'Otro')}
          </button>
        ))}
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
          <button type="button" onClick={() => { setSearch(''); fetchProfiles('', profileType); }} className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm">
            {ls('Clear', 'Limpiar')}
          </button>
        )}
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile list */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="text-sm font-semibold text-gray-700">{profiles.length} {ls('profiles', 'perfiles')}</h2>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-gray-400 text-sm">{ls('Loading...', 'Cargando...')}</div>
            ) : profiles.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">{ls('No profiles found', 'Sin perfiles')}</div>
            ) : profiles.map(p => (
              <button
                key={p.id}
                onClick={() => fetchDetail(p.id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selected?.id === p.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">{p.full_name}</div>
                    {p.email && <div className="text-xs text-gray-500 mt-0.5">{p.email}</div>}
                  </div>
                  <span className={`text-[9px] px-2 py-1 rounded font-bold ml-2 ${profileTypeColors[p.profile_type] || profileTypeColors.other}`}>
                    {p.profile_type}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Profile detail */}
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
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Nationality', 'Nacionalidad')}</label>
                        <input type="text" value={editForm.nationality} onChange={e => setEditForm({ ...editForm, nationality: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Profile Type', 'Tipo de Perfil')}</label>
                        <select value={editForm.profile_type} onChange={e => setEditForm({ ...editForm, profile_type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
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
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900">{selected.full_name}</h2>
                        <span className={`text-xs px-2.5 py-1 rounded font-bold ${profileTypeColors[selected.profile_type] || profileTypeColors.other}`}>
                          {selected.profile_type}
                        </span>
                      </div>
                      <button onClick={handleStartEdit} className="text-xs text-blue-600 hover:underline px-2 py-1">
                        {ls('Edit', 'Editar')}
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                      {selected.email && <div><span className="text-gray-400">{ls('Email', 'Correo')}: </span>{selected.email}</div>}
                      {selected.phone && <div><span className="text-gray-400">{ls('Phone', 'Tel')}: </span>{selected.phone}</div>}
                      {selected.nationality && <div><span className="text-gray-400">{ls('Nationality', 'Nac.')}: </span>{selected.nationality}</div>}
                    </div>
                    {selected.notes && (
                      <div className="mt-2 text-sm text-gray-600 bg-yellow-50 rounded-lg px-3 py-2">{selected.notes}</div>
                    )}
                  </>
                )}
              </div>

              {/* Record Details */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b">
                  <h3 className="text-sm font-semibold text-gray-700">{ls('Record Details', 'Detalles del Registro')}</h3>
                </div>
                <dl className="grid grid-cols-2 gap-3 px-4 py-3 text-xs">
                  {selected.id && <div><dt className="text-gray-500 font-medium">{ls('ID', 'ID')}</dt><dd className="font-mono text-gray-700 break-all">{selected.id}</dd></div>}
                  {selected.legacy_appsheet_id && <div><dt className="text-gray-500 font-medium">{ls('Legacy AppSheet ID', 'Legacy AppSheet ID')}</dt><dd className="font-mono text-gray-700">{selected.legacy_appsheet_id}</dd></div>}
                  {selected.legacy_appsheet_ids && Array.isArray(selected.legacy_appsheet_ids) && selected.legacy_appsheet_ids.length > 0 && <div className="col-span-2"><dt className="text-gray-500 font-medium mb-1">{ls('Merged IDs', 'IDs Consolidados')}</dt><dd className="font-mono text-gray-700 break-all">{selected.legacy_appsheet_ids.join(', ')}</dd></div>}
                  {selected.opera_profile_id && <div><dt className="text-gray-500 font-medium">{ls('Opera Profile ID', 'ID Perfil Opera')}</dt><dd className="font-mono text-gray-700">{selected.opera_profile_id}</dd></div>}
                  {selected.companion_name && <div><dt className="text-gray-500 font-medium">{ls('Companion', 'Acompañante')}</dt><dd className="text-gray-700">{selected.companion_name}</dd></div>}
                  {selected.created_at && <div><dt className="text-gray-500 font-medium">{ls('Created', 'Creado')}</dt><dd className="text-gray-700 text-[10px]">{new Date(selected.created_at).toLocaleString()}</dd></div>}
                  {selected.updated_at && <div><dt className="text-gray-500 font-medium">{ls('Updated', 'Actualizado')}</dt><dd className="text-gray-700 text-[10px]">{new Date(selected.updated_at).toLocaleString()}</dd></div>}
                </dl>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
              {ls('Select a profile to view their details', 'Selecciona un perfil para ver sus detalles')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
