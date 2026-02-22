'use client';

import { useEffect, useState } from 'react';

interface Vendor { id: string; name: string; }
interface TourProduct {
  id: string;
  name_en: string;
  name_es: string;
  description_en: string;
  description_es: string;
  type: string;
  booking_mode: string;
  max_capacity_shared: number;
  max_capacity_private: number;
  duration_minutes: number;
  price_private: number;
  price_shared: number;
  price_per_person: number;
  requires_minimum_guests: number;
  max_guests_per_booking: number;
  location: string;
  meeting_point_en: string;
  meeting_point_es: string;
  cancellation_policy_hours: number;
  scheduling_mode: string;
  is_active: boolean;
  guest_visible: boolean;
  images: string[];
  vendor_id: string;
  vendor_name: string;
}

interface TourSchedule {
  id: string;
  product_id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity_remaining: number;
  is_available: boolean;
  override_price: number | null;
  notes_internal: string | null;
}

const PRODUCT_TYPES = ['tour', 'spa', 'restaurant', 'experience', 'transfer'];
const BOOKING_MODES = ['private', 'shared', 'either'];
const SCHEDULING_MODES = ['fixed_slots', 'flexible', 'on_request'];
const DAYS_OF_WEEK = [
  { label: 'Sun', value: 0 }, { label: 'Mon', value: 1 }, { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 }, { label: 'Thu', value: 4 }, { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

const emptyForm = {
  name_en: '', name_es: '', description_en: '', description_es: '',
  type: 'tour', booking_mode: 'either', scheduling_mode: 'fixed_slots', vendor_id: '',
  max_capacity_shared: 8, max_capacity_private: 2, duration_minutes: 120,
  price_private: 0, price_shared: 0, price_per_person: 0,
  requires_minimum_guests: 1, max_guests_per_booking: 10,
  location: '', meeting_point_en: '', meeting_point_es: '',
  cancellation_policy_hours: 24, is_active: true, guest_visible: true,
  images: [] as string[],
};

const emptyScheduleForm = {
  date: '', start_time: '09:00', end_time: '11:00', capacity_remaining: 8, override_price: '', notes_internal: '',
};

const emptyRecurringForm = {
  from_date: '', to_date: '', start_time: '09:00', end_time: '11:00', capacity: 8, days_of_week: [] as number[],
};

export default function TourProductsPage() {
  const [products, setProducts] = useState<TourProduct[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TourProduct | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');

  const [schedulesProduct, setSchedulesProduct] = useState<TourProduct | null>(null);
  const [schedules, setSchedules] = useState<TourSchedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [scheduleTab, setScheduleTab] = useState<'list' | 'add' | 'recurring'>('list');
  const [scheduleForm, setScheduleForm] = useState<any>({ ...emptyScheduleForm });
  const [recurringForm, setRecurringForm] = useState<any>({ ...emptyRecurringForm });
  const [scheduleSaving, setScheduleSaving] = useState(false);

  useEffect(() => { loadData(); }, [typeFilter]);

  async function loadData() {
    setLoading(true);
    const q = typeFilter ? `?type=${typeFilter}` : '';
    const [pRes, vRes] = await Promise.all([fetch(`/api/tour-products${q}`), fetch('/api/vendors')]);
    const pData = await pRes.json();
    const vData = await vRes.json();
    setProducts(pData.products || []);
    setVendors(vData.vendors || []);
    setLoading(false);
  }

  function openNew() { setEditing(null); setForm({ ...emptyForm }); setShowForm(true); }
  function openEdit(p: TourProduct) {
    setEditing(p);
    const imgs = Array.isArray(p.images) ? p.images : [];
    setForm({
      name_en: p.name_en, name_es: p.name_es, description_en: p.description_en || '', description_es: p.description_es || '',
      type: p.type, booking_mode: p.booking_mode, scheduling_mode: p.scheduling_mode, vendor_id: p.vendor_id || '',
      max_capacity_shared: p.max_capacity_shared, max_capacity_private: p.max_capacity_private,
      duration_minutes: p.duration_minutes, price_private: p.price_private,
      price_shared: p.price_shared, price_per_person: p.price_per_person,
      requires_minimum_guests: p.requires_minimum_guests, max_guests_per_booking: p.max_guests_per_booking,
      location: p.location || '', meeting_point_en: p.meeting_point_en || '', meeting_point_es: p.meeting_point_es || '',
      cancellation_policy_hours: p.cancellation_policy_hours, is_active: p.is_active,
      guest_visible: p.guest_visible !== false,
      images: imgs,
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        vendor_id: form.vendor_id || null,
        images: form.images || [],
      };
      const method = editing ? 'PUT' : 'POST';
      const body = editing ? { id: editing.id, ...payload } : payload;
      await fetch('/api/tour-products', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setShowForm(false);
      await loadData();
    } finally { setSaving(false); }
  }

  async function toggleActive(p: TourProduct) {
    await fetch('/api/tour-products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, is_active: !p.is_active }) });
    await loadData();
  }

  async function openSchedules(p: TourProduct) {
    setSchedulesProduct(p);
    setScheduleTab('list');
    setScheduleForm({ ...emptyScheduleForm });
    setRecurringForm({ ...emptyRecurringForm });
    await loadSchedules(p.id);
  }

  async function loadSchedules(productId: string) {
    setSchedulesLoading(true);
    const res = await fetch(`/api/tour-schedules?product_id=${productId}`);
    if (res.ok) { const data = await res.json(); setSchedules(data.tour_schedules || []); }
    setSchedulesLoading(false);
  }

  async function handleAddSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!schedulesProduct) return;
    setScheduleSaving(true);
    try {
      await fetch('/api/tour-schedules', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: schedulesProduct.id, date: scheduleForm.date,
          start_time: scheduleForm.start_time, end_time: scheduleForm.end_time,
          capacity_remaining: Number(scheduleForm.capacity_remaining),
          override_price: scheduleForm.override_price ? Number(scheduleForm.override_price) : null,
          notes_internal: scheduleForm.notes_internal || null,
        }),
      });
      setScheduleForm({ ...emptyScheduleForm });
      setScheduleTab('list');
      await loadSchedules(schedulesProduct.id);
    } finally { setScheduleSaving(false); }
  }

  async function handleRecurring(e: React.FormEvent) {
    e.preventDefault();
    if (!schedulesProduct || recurringForm.days_of_week.length === 0) return;
    setScheduleSaving(true);
    try {
      await fetch('/api/tour-schedules', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: schedulesProduct.id, recurring: true,
          from_date: recurringForm.from_date, to_date: recurringForm.to_date,
          start_time: recurringForm.start_time, end_time: recurringForm.end_time,
          capacity: Number(recurringForm.capacity), days_of_week: recurringForm.days_of_week,
        }),
      });
      setRecurringForm({ ...emptyRecurringForm });
      setScheduleTab('list');
      await loadSchedules(schedulesProduct.id);
    } finally { setScheduleSaving(false); }
  }

  async function toggleScheduleAvailability(s: TourSchedule) {
    await fetch('/api/tour-schedules', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, is_available: !s.is_available }) });
    if (schedulesProduct) await loadSchedules(schedulesProduct.id);
  }

  function toggleDay(day: number) {
    const days = recurringForm.days_of_week as number[];
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    setRecurringForm({ ...recurringForm, days_of_week: next });
  }

  function field(key: string, label: string, type = 'text', opts?: { min?: number; step?: number }) {
    return (
      <div>
        <label className="nayara-label">{label}</label>
        <input
          type={type}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
          className="nayara-input w-full mt-1"
          {...opts}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold italic" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>
          Tour Products
        </h1>
        <button onClick={openNew} className="nayara-btn nayara-btn-primary">+ New Product</button>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTypeFilter('')}
          className="px-3 py-1.5 text-xs rounded-full font-semibold transition-colors"
          style={typeFilter === '' ? { background: 'var(--gold)', color: '#fff' } : { background: 'var(--elevated)', color: 'var(--muted-dim)' }}
        >
          All
        </button>
        {PRODUCT_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className="px-3 py-1.5 text-xs rounded-full font-semibold capitalize transition-colors"
            style={typeFilter === t ? { background: 'var(--gold)', color: '#fff' } : { background: 'var(--elevated)', color: 'var(--muted-dim)' }}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-8 text-sm" style={{ color: 'var(--muted-dim)' }}>Loading…</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <div key={p.id} className={`nayara-card p-4 flex flex-col gap-3 ${!p.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--charcoal)' }}>{p.name_en}</h3>
                {p.name_es && <p className="text-xs mt-0.5" style={{ color: 'var(--muted-dim)' }}>{p.name_es}</p>}
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize shrink-0"
                style={{ background: 'rgba(78,94,62,0.10)', color: 'var(--sage)', border: '1px solid rgba(78,94,62,0.2)' }}
              >
                {p.type}
              </span>
            </div>

            <div className="text-xs space-y-0.5" style={{ color: 'var(--muted-dim)' }}>
              {p.vendor_name && <div>Vendor: {p.vendor_name}</div>}
              <div>{p.duration_minutes}min · {p.booking_mode} · {p.scheduling_mode}</div>
              {p.price_per_person > 0 && <div>${p.price_per_person}/person</div>}
              {p.price_private > 0 && <div>Private: ${p.price_private}</div>}
              {p.price_shared > 0 && <div>Shared: ${p.price_shared}</div>}
              {p.location && <div>{p.location}</div>}
              <div className="flex items-center gap-2 pt-0.5">
                {p.guest_visible !== false && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(78,150,200,0.1)', color: '#4E96C8' }}>Guest Portal</span>
                )}
                {Array.isArray(p.images) && p.images.length > 0 && (
                  <span className="text-[10px]">{p.images.length} image{p.images.length > 1 ? 's' : ''}</span>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-auto">
              <button onClick={() => openEdit(p)} className="nayara-btn nayara-btn-ghost flex-1 text-xs !py-1.5">Edit</button>
              {p.scheduling_mode === 'fixed_slots' && (
                <button onClick={() => openSchedules(p)} className="nayara-btn nayara-btn-secondary flex-1 text-xs !py-1.5">Schedules</button>
              )}
              <button
                onClick={() => toggleActive(p)}
                className="nayara-btn nayara-btn-ghost flex-1 text-xs !py-1.5"
                style={{ color: p.is_active ? 'var(--terra)' : 'var(--sage)' }}
              >
                {p.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {!loading && products.length === 0 && (
        <div className="text-center py-12 text-sm italic" style={{ color: 'var(--muted-dim)' }}>
          No tour products. Create one to get started.
        </div>
      )}

      {/* Product Form modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(14,26,9,0.52)', backdropFilter: 'blur(4px)' }}
        >
          <div className="nayara-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold italic mb-4" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>
                {editing ? 'Edit Product' : 'New Tour Product'}
              </h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {field('name_en', 'Name (EN) *')}
                  {field('name_es', 'Name (ES)')}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="nayara-label">Description (EN)</label>
                    <textarea
                      value={form.description_en}
                      onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                      rows={2}
                      className="nayara-input w-full mt-1 resize-none"
                    />
                  </div>
                  <div>
                    <label className="nayara-label">Description (ES)</label>
                    <textarea
                      value={form.description_es}
                      onChange={(e) => setForm({ ...form, description_es: e.target.value })}
                      rows={2}
                      className="nayara-input w-full mt-1 resize-none"
                    />
                  </div>
                </div>

                {/* Images */}
                <div>
                  <label className="nayara-label">Images (URLs for Guest Portal)</label>
                  <div className="space-y-2 mt-1">
                    {(form.images || []).map((url: string, idx: number) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => {
                            const imgs = [...(form.images || [])];
                            imgs[idx] = e.target.value;
                            setForm({ ...form, images: imgs });
                          }}
                          placeholder="https://..."
                          className="nayara-input flex-1"
                        />
                        {url && (
                          <img src={url} alt="" className="w-10 h-10 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const imgs = [...(form.images || [])];
                            imgs.splice(idx, 1);
                            setForm({ ...form, images: imgs });
                          }}
                          className="text-xs px-2 py-1 rounded"
                          style={{ color: 'var(--terra)' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, images: [...(form.images || []), ''] })}
                      className="text-xs font-medium"
                      style={{ color: 'var(--gold)' }}
                    >
                      + Add Image URL
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="nayara-label">Type</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="nayara-input w-full mt-1">
                      {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="nayara-label">Booking Mode</label>
                    <select value={form.booking_mode} onChange={(e) => setForm({ ...form, booking_mode: e.target.value })} className="nayara-input w-full mt-1">
                      {BOOKING_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="nayara-label">Scheduling</label>
                    <select value={form.scheduling_mode} onChange={(e) => setForm({ ...form, scheduling_mode: e.target.value })} className="nayara-input w-full mt-1">
                      {SCHEDULING_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="nayara-label">Vendor</label>
                  <select value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })} className="nayara-input w-full mt-1">
                    <option value="">No vendor</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {field('duration_minutes', 'Duration (min)', 'number', { min: 1 })}
                  {field('max_capacity_shared', 'Max Shared Capacity', 'number', { min: 1 })}
                  {field('max_capacity_private', 'Max Private Capacity', 'number', { min: 1 })}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {field('price_per_person', 'Price / Person ($)', 'number', { min: 0, step: 0.01 })}
                  {field('price_shared', 'Shared Rate ($)', 'number', { min: 0, step: 0.01 })}
                  {field('price_private', 'Private Rate ($)', 'number', { min: 0, step: 0.01 })}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {field('requires_minimum_guests', 'Min Guests', 'number', { min: 1 })}
                  {field('max_guests_per_booking', 'Max Guests / Booking', 'number', { min: 1 })}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {field('location', 'Location')}
                  {field('cancellation_policy_hours', 'Cancellation Hours', 'number', { min: 0 })}
                </div>

                {field('meeting_point_en', 'Meeting Point (EN)')}
                {field('meeting_point_es', 'Meeting Point (ES)')}

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                    <label htmlFor="is_active" className="text-sm" style={{ color: 'var(--muted)' }}>Active (visible for staff booking)</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="guest_visible" checked={form.guest_visible} onChange={(e) => setForm({ ...form, guest_visible: e.target.checked })} className="rounded" />
                    <label htmlFor="guest_visible" className="text-sm" style={{ color: 'var(--muted)' }}>Show on Guest Portal</label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid var(--separator)' }}>
                  <button type="button" onClick={() => setShowForm(false)} className="nayara-btn nayara-btn-ghost">Cancel</button>
                  <button type="submit" disabled={saving || !form.name_en} className="nayara-btn nayara-btn-primary disabled:opacity-50">
                    {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Schedules modal */}
      {schedulesProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(14,26,9,0.52)', backdropFilter: 'blur(4px)' }}
        >
          <div className="nayara-card w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--separator)' }}>
              <div>
                <h2 className="font-bold italic text-lg" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>Schedules</h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--muted-dim)' }}>{schedulesProduct.name_en}</p>
              </div>
              <button onClick={() => setSchedulesProduct(null)} className="text-xl leading-none" style={{ color: 'var(--muted-dim)' }}>×</button>
            </div>

            {/* Tabs */}
            <div className="flex px-6" style={{ borderBottom: '1px solid var(--separator)' }}>
              {(['list', 'add', 'recurring'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setScheduleTab(tab)}
                  className="py-3 px-4 text-sm font-medium border-b-2 -mb-px capitalize transition-colors"
                  style={scheduleTab === tab
                    ? { borderBottomColor: 'var(--gold)', color: 'var(--gold)' }
                    : { borderBottomColor: 'transparent', color: 'var(--muted-dim)' }
                  }
                >
                  {tab === 'list' ? 'Upcoming' : tab === 'add' ? 'Add Single' : 'Add Recurring'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {scheduleTab === 'list' && (
                <div className="space-y-2">
                  {schedulesLoading && <div className="text-center py-8 text-sm" style={{ color: 'var(--muted-dim)' }}>Loading…</div>}
                  {!schedulesLoading && schedules.length === 0 && (
                    <div className="text-center py-8 text-sm italic" style={{ color: 'var(--muted-dim)' }}>
                      No upcoming schedules. Use the Add tabs to create slots.
                    </div>
                  )}
                  {schedules.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg px-4 py-3 text-sm"
                      style={s.is_available
                        ? { border: '1px solid var(--separator)', background: 'var(--surface)' }
                        : { border: '1px solid var(--separator)', background: 'var(--elevated)', opacity: 0.7 }
                      }
                    >
                      <div>
                        <span className="font-medium" style={{ color: 'var(--charcoal)' }}>{s.date}</span>
                        <span className="ml-2" style={{ color: 'var(--muted-dim)' }}>{s.start_time} – {s.end_time}</span>
                        {s.override_price && (
                          <span className="ml-2 text-xs font-mono" style={{ color: 'var(--gold)' }}>${s.override_price}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: 'var(--muted-dim)' }}>
                          {s.capacity_remaining !== null ? `${s.capacity_remaining} spots` : 'Unlimited'}
                        </span>
                        <button
                          onClick={() => toggleScheduleAvailability(s)}
                          className="text-xs px-2 py-1 rounded-md font-medium transition-colors"
                          style={s.is_available
                            ? { background: 'rgba(78,94,62,0.10)', color: 'var(--sage)' }
                            : { background: 'var(--elevated)', color: 'var(--muted-dim)' }
                          }
                        >
                          {s.is_available ? 'Available' : 'Blocked'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {scheduleTab === 'add' && (
                <form onSubmit={handleAddSchedule} className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="nayara-label">Date *</label>
                      <input type="date" required value={scheduleForm.date} onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })} className="nayara-input w-full mt-1" />
                    </div>
                    <div>
                      <label className="nayara-label">Start Time *</label>
                      <input type="time" required value={scheduleForm.start_time} onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })} className="nayara-input w-full mt-1" />
                    </div>
                    <div>
                      <label className="nayara-label">End Time</label>
                      <input type="time" value={scheduleForm.end_time} onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })} className="nayara-input w-full mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="nayara-label">Capacity</label>
                      <input type="number" min={1} value={scheduleForm.capacity_remaining} onChange={(e) => setScheduleForm({ ...scheduleForm, capacity_remaining: e.target.value })} className="nayara-input w-full mt-1" />
                    </div>
                    <div>
                      <label className="nayara-label">Override Price ($)</label>
                      <input type="number" min={0} step={0.01} value={scheduleForm.override_price} onChange={(e) => setScheduleForm({ ...scheduleForm, override_price: e.target.value })} placeholder="Leave blank for default" className="nayara-input w-full mt-1" />
                    </div>
                  </div>
                  <div>
                    <label className="nayara-label">Internal Notes</label>
                    <input type="text" value={scheduleForm.notes_internal} onChange={(e) => setScheduleForm({ ...scheduleForm, notes_internal: e.target.value })} className="nayara-input w-full mt-1" />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={scheduleSaving || !scheduleForm.date} className="nayara-btn nayara-btn-primary disabled:opacity-50">
                      {scheduleSaving ? 'Adding…' : 'Add Schedule'}
                    </button>
                  </div>
                </form>
              )}

              {scheduleTab === 'recurring' && (
                <form onSubmit={handleRecurring} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="nayara-label">From Date *</label>
                      <input type="date" required value={recurringForm.from_date} onChange={(e) => setRecurringForm({ ...recurringForm, from_date: e.target.value })} className="nayara-input w-full mt-1" />
                    </div>
                    <div>
                      <label className="nayara-label">To Date *</label>
                      <input type="date" required value={recurringForm.to_date} onChange={(e) => setRecurringForm({ ...recurringForm, to_date: e.target.value })} className="nayara-input w-full mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="nayara-label">Start Time *</label>
                      <input type="time" required value={recurringForm.start_time} onChange={(e) => setRecurringForm({ ...recurringForm, start_time: e.target.value })} className="nayara-input w-full mt-1" />
                    </div>
                    <div>
                      <label className="nayara-label">End Time</label>
                      <input type="time" value={recurringForm.end_time} onChange={(e) => setRecurringForm({ ...recurringForm, end_time: e.target.value })} className="nayara-input w-full mt-1" />
                    </div>
                    <div>
                      <label className="nayara-label">Capacity</label>
                      <input type="number" min={1} value={recurringForm.capacity} onChange={(e) => setRecurringForm({ ...recurringForm, capacity: e.target.value })} className="nayara-input w-full mt-1" />
                    </div>
                  </div>
                  <div>
                    <label className="nayara-label mb-2">Days of Week *</label>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {DAYS_OF_WEEK.map((d) => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => toggleDay(d.value)}
                          className="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors"
                          style={(recurringForm.days_of_week as number[]).includes(d.value)
                            ? { background: 'var(--gold)', color: '#fff', border: '1px solid var(--gold)' }
                            : { background: 'transparent', color: 'var(--muted-dim)', border: '1px solid var(--separator)' }
                          }
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={scheduleSaving || !recurringForm.from_date || !recurringForm.to_date || (recurringForm.days_of_week as number[]).length === 0}
                      className="nayara-btn nayara-btn-primary disabled:opacity-50"
                    >
                      {scheduleSaving ? 'Creating…' : 'Generate Schedules'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
