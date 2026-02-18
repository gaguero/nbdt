'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import Modal from '@/components/ui/Modal';
import { localDateString } from '@/lib/dates';
import Button from '@/components/ui/Button';
import { GuestSearchSelect } from '@/components/staff/GuestSearchSelect';
import { VendorSearchSelect } from '@/components/staff/VendorSearchSelect';
import { MessageGuestPanel } from '@/components/staff/MessageGuestPanel';

const LOCATIONS = ['Beach', 'Overwater Deck', 'Jungle Platform', 'Room Terrace', 'Restaurant', 'Pool Area', 'Other'];

interface RomanticDinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dinner?: any;
  onSuccess: () => void;
}

export function RomanticDinnerModal({ isOpen, onClose, dinner, onSuccess }: RomanticDinnerModalProps) {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const emptyForm = {
    date: localDateString(),
    time: '19:00',
    guest_id: '',
    num_guests: 2,
    location: '',
    status: 'pending',
    notes: '',
    vendor_id: '',
    billed_date: '',
    paid_date: '',
  };

  const [form, setForm] = useState<any>(emptyForm);

  useEffect(() => {
    if (dinner) {
      setForm({
        date: dinner.date ? dinner.date.split('T')[0] : '',
        time: dinner.time ? dinner.time.slice(0, 5) : '',
        guest_id: dinner.guest_id || '',
        num_guests: dinner.num_guests || 2,
        location: dinner.location || '',
        status: dinner.status || 'pending',
        notes: dinner.notes || '',
        vendor_id: dinner.vendor_id || '',
        billed_date: dinner.billed_date ? dinner.billed_date.split('T')[0] : '',
        paid_date: dinner.paid_date ? dinner.paid_date.split('T')[0] : '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [dinner, isOpen]);

  const showBillingFields = form.status === 'confirmed' || form.status === 'completed';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = dinner ? 'PUT' : 'POST';
      const body = dinner ? { ...form, id: dinner.id } : form;
      const payload = {
        ...body,
        vendor_id: body.vendor_id || null,
        billed_date: body.billed_date || null,
        paid_date: body.paid_date || null,
      };
      const res = await fetch('/api/romantic-dinners', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onSuccess();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!dinner) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/romantic-dinners?id=${dinner.id}`, { method: 'DELETE' });
      if (res.ok) {
        onSuccess();
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={dinner ? ls('Edit Romantic Dinner', 'Editar Cena Romántica') : ls('New Romantic Dinner', 'Nueva Cena Romántica')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GuestSearchSelect
            label={ls('Guest', 'Huésped')}
            value={form.guest_id}
            onChange={(id) => setForm({ ...form, guest_id: id })}
          />
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Status', 'Estado')}</label>
            <select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {['pending', 'confirmed', 'completed', 'cancelled'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Date', 'Fecha')} *</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Time', 'Hora')} *</label>
            <input
              type="time"
              required
              value={form.time}
              onChange={e => setForm({ ...form, time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Location', 'Ubicación')}</label>
            <select
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">{ls('Select location...', 'Seleccionar ubicación...')}</option>
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('# Guests', '# Personas')}</label>
            <input
              type="number"
              min={1}
              value={form.num_guests}
              onChange={e => setForm({ ...form, num_guests: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <VendorSearchSelect
          label={ls('Restaurant / Vendor', 'Restaurante / Proveedor')}
          value={form.vendor_id}
          onChange={(id) => setForm({ ...form, vendor_id: id })}
          type="restaurant"
          placeholder={ls('Search restaurant...', 'Buscar restaurante...')}
        />

        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Notes', 'Notas')}</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder={ls('Special requests, decorations, dietary...', 'Solicitudes especiales, decoraciones, dieta...')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {showBillingFields && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Billed Date', 'Fecha Facturada')}</label>
              <input
                type="date"
                value={form.billed_date}
                onChange={e => setForm({ ...form, billed_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Paid Date', 'Fecha Pagada')}</label>
              <input
                type="date"
                value={form.paid_date}
                onChange={e => setForm({ ...form, paid_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        )}

        <MessageGuestPanel guestId={form.guest_id} guestName={dinner?.guest_name} />

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {dinner && (
              <Button type="button" variant="danger" onClick={handleDelete} isLoading={deleting} disabled={loading}>
                {ls('Cancel Dinner', 'Cancelar Cena')}
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading || deleting}>
              {ls('Close', 'Cerrar')}
            </Button>
            <Button type="submit" variant="primary" isLoading={loading} disabled={deleting}>
              {dinner ? ls('Update', 'Actualizar') : ls('Create Dinner', 'Crear Cena')}
            </Button>
          </div>
        </div>
      </form>

      {dinner && (
        <div className="mt-6 pt-6 border-t space-y-3">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Record Details', 'Detalles del Registro')}</p>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {dinner.id && <div><dt className="text-gray-500">ID</dt><dd className="font-mono text-gray-800 break-all">{dinner.id}</dd></div>}
            {dinner.reservation_id && <div><dt className="text-gray-500">Reservation ID</dt><dd className="font-mono text-gray-800 break-all">{dinner.reservation_id}</dd></div>}
            {dinner.legacy_appsheet_id && <div><dt className="text-gray-500">Legacy AppSheet ID</dt><dd className="font-mono text-gray-700">{dinner.legacy_appsheet_id}</dd></div>}
            {dinner.price && <div><dt className="text-gray-500">Price</dt><dd className="text-gray-800">${parseFloat(dinner.price).toFixed(2)}</dd></div>}
            {dinner.created_at && <div><dt className="text-gray-500">Created</dt><dd className="text-gray-700 text-[10px]">{new Date(dinner.created_at).toLocaleString()}</dd></div>}
            {dinner.updated_at && <div><dt className="text-gray-500">Updated</dt><dd className="text-gray-700 text-[10px]">{new Date(dinner.updated_at).toLocaleString()}</dd></div>}
          </dl>
        </div>
      )}
    </Modal>
  );
}
