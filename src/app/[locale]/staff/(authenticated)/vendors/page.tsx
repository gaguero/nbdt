'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

const VENDOR_TYPES = ['transfer', 'tour', 'spa', 'restaurant', 'other'];
const TYPE_COLORS: Record<string, string> = {
  transfer: 'bg-blue-100 text-blue-800',
  tour: 'bg-green-100 text-green-800',
  spa: 'bg-purple-100 text-purple-800',
  restaurant: 'bg-orange-100 text-orange-800',
  other: 'bg-gray-100 text-gray-600',
};

export default function VendorsPage() {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'transfer',
    color_code: '#3B82F6',
    notes: '',
    is_active: true,
  });

  const fetchVendors = () => {
    setLoading(true);
    const params = typeFilter !== 'all' ? `?type=${typeFilter}` : '';
    fetch(`/api/vendors${params}`)
      .then(r => r.json())
      .then(d => setVendors(d.vendors ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchVendors(); }, [typeFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { ...form, id: editingId } : form;
      const res = await fetch('/api/vendors', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        setShowForm(false);
        setEditingId(null);
        setForm({ name: '', email: '', phone: '', type: 'transfer', color_code: '#3B82F6', notes: '', is_active: true });
        fetchVendors();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (v: any) => {
    setForm({ name: v.name, email: v.email ?? '', phone: v.phone ?? '', type: v.type, color_code: v.color_code ?? '#3B82F6', notes: v.notes ?? '', is_active: v.is_active });
    setEditingId(v.id);
    setShowForm(true);
  };

  const handleToggle = async (v: any) => {
    await fetch('/api/vendors', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: v.id, is_active: !v.is_active }) });
    fetchVendors();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{ls('Vendors', 'Proveedores')}</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', email: '', phone: '', type: 'transfer', color_code: '#3B82F6', notes: '', is_active: true }); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + {ls('New Vendor', 'Nuevo Proveedor')}
        </button>
      </div>

      {/* Type filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...VENDOR_TYPES].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${typeFilter === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t === 'all' ? ls('All', 'Todos') : t}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">{editingId ? ls('Edit Vendor', 'Editar Proveedor') : ls('New Vendor', 'Nuevo Proveedor')}</h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Name', 'Nombre')} *</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Type', 'Tipo')} *</label>
              <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                {VENDOR_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Email', 'Correo')}</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Phone', 'Teléfono')}</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Color', 'Color')}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color_code} onChange={e => setForm({ ...form, color_code: e.target.value })} className="h-9 w-16 border rounded-lg cursor-pointer" />
                <span className="text-xs text-gray-500">{form.color_code}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Active', 'Activo')}</label>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded" />
                <span className="text-sm text-gray-700">{form.is_active ? ls('Active', 'Activo') : ls('Inactive', 'Inactivo')}</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">{ls('Notes', 'Notas')}</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? ls('Saving...', 'Guardando...') : ls('Save', 'Guardar')}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                {ls('Cancel', 'Cancelar')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vendor grid */}
      {loading ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-400 text-sm">{ls('Loading...', 'Cargando...')}</div>
      ) : vendors.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-400 text-sm">{ls('No vendors found', 'Sin proveedores')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map(v => (
            <div key={v.id} className={`bg-white rounded-lg border border-gray-200 p-4 ${!v.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: v.color_code ?? '#6B7280' }} />
                  <span className="font-semibold text-gray-900 text-sm">{v.name}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[v.type] ?? 'bg-gray-100 text-gray-600'}`}>
                  {v.type}
                </span>
              </div>
              {v.email && <div className="mt-2 text-xs text-gray-500">{v.email}</div>}
              {v.phone && <div className="text-xs text-gray-500">{v.phone}</div>}
              {v.notes && <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">{v.notes}</div>}
              <div className="mt-3 flex gap-2">
                <button onClick={() => handleEdit(v)} className="text-xs text-blue-600 hover:underline">{ls('Edit', 'Editar')}</button>
                <button onClick={() => handleToggle(v)} className="text-xs text-gray-500 hover:underline">
                  {v.is_active ? ls('Deactivate', 'Desactivar') : ls('Activate', 'Activar')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
