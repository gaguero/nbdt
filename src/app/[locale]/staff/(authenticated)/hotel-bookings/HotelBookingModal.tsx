'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import Modal from '@/components/ui/Modal';
import { localDateString } from '@/lib/dates';
import Button from '@/components/ui/Button';
import { GuestSearchSelect } from '@/components/staff/GuestSearchSelect';
import { MessageGuestPanel } from '@/components/staff/MessageGuestPanel';

interface HotelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: any;
  onSuccess: () => void;
}

export function HotelBookingModal({ isOpen, onClose, booking, onSuccess }: HotelBookingModalProps) {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hotels, setHotels] = useState<any[]>([]);

  const emptyForm = {
    date: localDateString(),
    guest_id: '',
    hotel_id: '',
    num_guests: 1,
    checkin: '',
    checkout: '',
    notes: '',
    guest_status: 'pending',
    vendor_status: 'pending',
  };

  const [form, setForm] = useState<any>(emptyForm);

  useEffect(() => {
    fetch('/api/hotel-bookings?hotels=true')
      .then(r => r.json())
      .then(d => setHotels(d.hotels ?? []));
  }, []);

  useEffect(() => {
    if (booking) {
      setForm({
        date: booking.date ? booking.date.split('T')[0] : '',
        guest_id: booking.guest_id || '',
        hotel_id: booking.hotel_id || '',
        num_guests: booking.num_guests || 1,
        checkin: booking.checkin ? booking.checkin.split('T')[0] : '',
        checkout: booking.checkout ? booking.checkout.split('T')[0] : '',
        notes: booking.notes || '',
        guest_status: booking.guest_status || 'pending',
        vendor_status: booking.vendor_status || 'pending',
      });
    } else {
      setForm(emptyForm);
    }
  }, [booking, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = booking ? 'PUT' : 'POST';
      const body = booking ? { ...form, id: booking.id } : form;
      const res = await fetch('/api/hotel-bookings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
    if (!booking) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/hotel-bookings?id=${booking.id}`, { method: 'DELETE' });
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
      title={booking ? ls('Edit Hotel Booking', 'Editar Reserva de Hotel') : ls('New Hotel Booking', 'Nueva Reserva de Hotel')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GuestSearchSelect
            label={ls('Guest', 'Huésped')}
            value={form.guest_id}
            onChange={(id) => setForm({ ...form, guest_id: id })}
          />
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Hotel', 'Hotel')} *</label>
            <select
              required
              value={form.hotel_id}
              onChange={e => setForm({ ...form, hotel_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">{ls('Select hotel...', 'Seleccionar hotel...')}</option>
              {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Booking Date', 'Fecha Reserva')} *</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('# Guests', '# Huéspedes')}</label>
            <input
              type="number"
              min={1}
              value={form.num_guests}
              onChange={e => setForm({ ...form, num_guests: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Check-in', 'Check-in')}</label>
            <input
              type="date"
              value={form.checkin}
              onChange={e => setForm({ ...form, checkin: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Check-out', 'Check-out')}</label>
            <input
              type="date"
              value={form.checkout}
              onChange={e => setForm({ ...form, checkout: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Guest Status', 'Estado Huésped')}</label>
            <select
              value={form.guest_status}
              onChange={e => setForm({ ...form, guest_status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {['pending', 'confirmed', 'completed', 'cancelled', 'no_show'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Vendor Status', 'Estado Proveedor')}</label>
            <select
              value={form.vendor_status}
              onChange={e => setForm({ ...form, vendor_status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {['pending', 'confirmed', 'completed', 'cancelled', 'no_show'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Notes', 'Notas')}</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <MessageGuestPanel guestId={form.guest_id} guestName={booking?.guest_name} />

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {booking && (
              <Button type="button" variant="danger" isLoading={deleting} disabled={loading} onClick={handleDelete}>
                {ls('Cancel Booking', 'Cancelar Reserva')}
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading || deleting}>
              {ls('Close', 'Cerrar')}
            </Button>
            <Button type="submit" variant="primary" isLoading={loading} disabled={deleting}>
              {booking ? ls('Update', 'Actualizar') : ls('Create Booking', 'Crear Reserva')}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
