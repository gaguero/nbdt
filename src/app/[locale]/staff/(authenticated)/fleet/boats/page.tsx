'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

interface Boat {
  id: string;
  name: string;
  type: string;
  capacity: number;
  status: string;
  photo_url: string;
  home_dock: string;
  registration_number: string;
  notes: string;
  today_assignments: number;
}

const BOAT_TYPES = ['speedboat', 'catamaran', 'panga', 'yacht', 'other'];
const STATUS_OPTIONS = ['active', 'maintenance', 'out_of_service'];

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: 'rgba(78,94,62,0.12)', text: '#4E5E3E' },
  maintenance: { bg: 'rgba(217,170,60,0.12)', text: '#B8941E' },
  out_of_service: { bg: 'rgba(236,108,75,0.1)', text: '#EC6C4B' },
};

export default function BoatsPage() {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const [boats, setBoats] = useState<Boat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'speedboat', capacity: 12, status: 'active', home_dock: '', registration_number: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchBoats = () => {
    setLoading(true);
    fetch('/api/fleet/boats')
      .then(r => r.json())
      .then(d => { setBoats(d.boats || []); setLoading(false); });
  };

  useEffect(() => { fetchBoats(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const method = editId ? 'PUT' : 'POST';
      const body = editId ? { id: editId, ...form } : form;
      await fetch('/api/fleet/boats', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setShowForm(false);
      setEditId(null);
      setForm({ name: '', type: 'speedboat', capacity: 12, status: 'active', home_dock: '', registration_number: '', notes: '' });
      fetchBoats();
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (boat: Boat) => {
    setEditId(boat.id);
    setForm({
      name: boat.name, type: boat.type, capacity: boat.capacity, status: boat.status,
      home_dock: boat.home_dock || '', registration_number: boat.registration_number || '', notes: boat.notes || '',
    });
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--charcoal)' }}>
            {ls('Boats Registry', 'Registro de Botes')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-dim)' }}>
            {ls('Manage your fleet vessels', 'Administre sus embarcaciones')}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', type: 'speedboat', capacity: 12, status: 'active', home_dock: '', registration_number: '', notes: '' }); }}
          className="nayara-btn nayara-btn-primary text-sm">
          {showForm ? ls('Cancel', 'Cancelar') : ls('+ Add Boat', '+ Agregar Bote')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="nayara-card p-6 space-y-4">
          <h3 className="font-bold text-sm" style={{ color: 'var(--charcoal)' }}>
            {editId ? ls('Edit Boat', 'Editar Bote') : ls('New Boat', 'Nuevo Bote')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="nayara-label">{ls('Name', 'Nombre')}</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                required className="nayara-input w-full" />
            </div>
            <div>
              <label className="nayara-label">{ls('Type', 'Tipo')}</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="nayara-input w-full">
                {BOAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="nayara-label">{ls('Capacity', 'Capacidad')}</label>
              <input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })}
                min={1} className="nayara-input w-full" />
            </div>
            <div>
              <label className="nayara-label">{ls('Status', 'Estado')}</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="nayara-input w-full">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="nayara-label">{ls('Home Dock', 'Muelle Base')}</label>
              <input type="text" value={form.home_dock} onChange={e => setForm({ ...form, home_dock: e.target.value })}
                className="nayara-input w-full" />
            </div>
            <div>
              <label className="nayara-label">{ls('Registration #', '# Registro')}</label>
              <input type="text" value={form.registration_number} onChange={e => setForm({ ...form, registration_number: e.target.value })}
                className="nayara-input w-full" />
            </div>
          </div>
          <div>
            <label className="nayara-label">{ls('Notes', 'Notas')}</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2} className="nayara-input w-full" />
          </div>
          <button type="submit" disabled={submitting} className="nayara-btn nayara-btn-primary text-sm">
            {submitting ? '...' : (editId ? ls('Update', 'Actualizar') : ls('Create', 'Crear'))}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-16" style={{ color: 'var(--muted-dim)' }}>Loading...</div>
      ) : boats.length === 0 ? (
        <div className="text-center py-16 nayara-card">
          <p style={{ color: 'var(--muted-dim)' }}>{ls('No boats yet', 'No hay botes aún')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boats.map(boat => {
            const st = STATUS_STYLES[boat.status] || STATUS_STYLES.active;
            return (
              <div key={boat.id} className="nayara-card p-5 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleEdit(boat)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-base" style={{ color: 'var(--charcoal)' }}>{boat.name}</h3>
                    <p className="text-xs capitalize" style={{ color: 'var(--muted-dim)' }}>{boat.type}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                    style={{ background: st.bg, color: st.text }}>
                    {boat.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--muted-dim)' }}>
                  <div>
                    <span className="font-medium">{ls('Capacity:', 'Capacidad:')}</span> {boat.capacity} pax
                  </div>
                  {boat.home_dock && (
                    <div>
                      <span className="font-medium">{ls('Dock:', 'Muelle:')}</span> {boat.home_dock}
                    </div>
                  )}
                  {boat.registration_number && (
                    <div>
                      <span className="font-medium">{ls('Reg:', 'Reg:')}</span> {boat.registration_number}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">{ls('Today:', 'Hoy:')}</span> {boat.today_assignments || 0} trips
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
