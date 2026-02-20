'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

const VENDOR_TYPES = ['transfer', 'tour', 'spa', 'restaurant', 'other'];

function vendorTypeClass(type: string): string {
  const map: Record<string, string> = {
    transfer: 'nayara-badge nayara-badge-in-progress',
    tour: 'nayara-badge nayara-badge-confirmed',
    spa: 'nayara-badge nayara-badge-resolved',
    restaurant: 'nayara-badge nayara-badge-pending',
    other: 'nayara-badge nayara-badge-cancelled',
  };
  return map[type] ?? 'nayara-badge nayara-badge-cancelled';
}

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
    name: '', email: '', phone: '', type: 'transfer', color_code: '#AA8E67', notes: '', is_active: true,
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
        setForm({ name: '', email: '', phone: '', type: 'transfer', color_code: '#AA8E67', notes: '', is_active: true });
        fetchVendors();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (v: any) => {
    setForm({ name: v.name, email: v.email ?? '', phone: v.phone ?? '', type: v.type, color_code: v.color_code ?? '#AA8E67', notes: v.notes ?? '', is_active: v.is_active });
    setEditingId(v.id);
    setShowForm(true);
  };

  const handleToggle = async (v: any) => {
    await fetch('/api/vendors', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: v.id, is_active: !v.is_active }) });
    fetchVendors();
  };

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold italic" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>
          {ls('Vendors', 'Proveedores')}
        </h1>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', email: '', phone: '', type: 'transfer', color_code: '#AA8E67', notes: '', is_active: true }); }}
          className="nayara-btn nayara-btn-primary"
        >
          + {ls('New Vendor', 'Nuevo Proveedor')}
        </button>
      </div>

      {/* Type filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...VENDOR_TYPES].map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors"
            style={typeFilter === t
              ? { background: 'var(--gold)', color: '#fff' }
              : { background: 'var(--elevated)', color: 'var(--muted-dim)' }
            }
          >
            {t === 'all' ? ls('All', 'Todos') : t}
          </button>
        ))}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="nayara-card p-5">
          <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--charcoal)' }}>
            {editingId ? ls('Edit Vendor', 'Editar Proveedor') : ls('New Vendor', 'Nuevo Proveedor')}
          </h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="nayara-label">{ls('Name', 'Nombre')} *</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="nayara-input w-full mt-1" />
            </div>
            <div>
              <label className="nayara-label">{ls('Type', 'Tipo')} *</label>
              <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="nayara-input w-full mt-1">
                {VENDOR_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="nayara-label">{ls('Email', 'Correo')}</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="nayara-input w-full mt-1" />
            </div>
            <div>
              <label className="nayara-label">{ls('Phone', 'Teléfono')}</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="nayara-input w-full mt-1" />
            </div>
            <div>
              <label className="nayara-label">{ls('Color', 'Color')}</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.color_code} onChange={e => setForm({ ...form, color_code: e.target.value })} className="h-9 w-16 rounded-lg cursor-pointer border-0" />
                <span className="text-xs font-mono" style={{ color: 'var(--muted-dim)' }}>{form.color_code}</span>
              </div>
            </div>
            <div>
              <label className="nayara-label">{ls('Active', 'Activo')}</label>
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded" />
                <span className="text-sm" style={{ color: 'var(--muted)' }}>{form.is_active ? ls('Active', 'Activo') : ls('Inactive', 'Inactivo')}</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="nayara-label">{ls('Notes', 'Notas')}</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="nayara-input w-full mt-1 resize-none" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="nayara-btn nayara-btn-primary disabled:opacity-50">
                {saving ? ls('Saving...', 'Guardando...') : ls('Save', 'Guardar')}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="nayara-btn nayara-btn-ghost">
                {ls('Cancel', 'Cancelar')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vendor grid */}
      {loading ? (
        <div className="nayara-card p-8 text-center text-sm" style={{ color: 'var(--muted-dim)' }}>{ls('Loading...', 'Cargando...')}</div>
      ) : vendors.length === 0 ? (
        <div className="nayara-card p-8 text-center text-sm italic" style={{ color: 'var(--muted-dim)' }}>{ls('No vendors found', 'Sin proveedores')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map(v => (
            <div key={v.id} className={`nayara-card p-4 ${!v.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: v.color_code ?? '#AA8E67' }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--charcoal)' }}>{v.name}</span>
                </div>
                <span className={vendorTypeClass(v.type)}>{v.type}</span>
              </div>
              {v.email && <div className="mt-2 text-xs" style={{ color: 'var(--muted-dim)' }}>{v.email}</div>}
              {v.phone && <div className="text-xs" style={{ color: 'var(--muted-dim)' }}>{v.phone}</div>}
              {v.notes && (
                <div
                  className="mt-2 text-xs rounded px-2 py-1"
                  style={{ background: 'var(--elevated)', color: 'var(--muted)' }}
                >
                  {v.notes}
                </div>
              )}
              <div className="mt-3 pt-3 space-y-1 text-[10px]" style={{ borderTop: '1px solid var(--separator)', color: 'var(--muted-dim)' }}>
                {v.id && <div><span className="font-medium">{ls('ID', 'ID')}: </span><span className="font-mono break-all">{v.id}</span></div>}
                {v.created_at && <div><span className="font-medium">{ls('Created', 'Creado')}: </span>{new Date(v.created_at).toLocaleString()}</div>}
              </div>
              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => handleEdit(v)}
                  className="text-xs font-semibold transition-colors"
                  style={{ color: 'var(--gold)' }}
                >
                  {ls('Edit', 'Editar')}
                </button>
                <button
                  onClick={() => handleToggle(v)}
                  className="text-xs font-semibold transition-colors"
                  style={{ color: 'var(--muted-dim)' }}
                >
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
