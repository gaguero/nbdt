'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import Modal from '@/components/ui/Modal';
import { GuestSearchSelect } from '@/components/staff/GuestSearchSelect';
import { ProductSearchSelect } from '@/components/staff/ProductSearchSelect';
import Button from '@/components/ui/Button';
import { MessageGuestPanel } from '@/components/staff/MessageGuestPanel';

interface TourBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: any;
  onSuccess: () => void;
}

export function TourBookingModal({ isOpen, onClose, booking, onSuccess }: TourBookingModalProps) {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    product_id: '',
    schedule_id: '',
    guest_id: '',
    booking_mode: 'shared',
    num_guests: 1,
    total_price: '',
    special_requests: '',
    guest_status: 'pending',
    vendor_status: 'pending'
  });

  useEffect(() => {
    if (booking) {
      setForm({
        product_id: booking.product_id || '',
        schedule_id: booking.schedule_id || '',
        guest_id: booking.guest_id || '',
        booking_mode: booking.booking_mode || 'shared',
        num_guests: booking.num_guests || 1,
        total_price: booking.total_price || '',
        special_requests: booking.special_requests || '',
        guest_status: booking.guest_status || 'pending',
        vendor_status: booking.vendor_status || 'pending'
      });
    } else {
      setForm({
        product_id: '',
        schedule_id: '',
        guest_id: '',
        booking_mode: 'shared',
        num_guests: 1,
        total_price: '',
        special_requests: '',
        guest_status: 'pending',
        vendor_status: 'pending'
      });
    }
  }, [booking, isOpen]);

  useEffect(() => {
    if (form.product_id) {
      fetch(`/api/tour-schedules?product_id=${form.product_id}&available=true`)
        .then(r => r.json())
        .then(data => setSchedules(data.tour_schedules ?? []));
    } else {
      setSchedules([]);
    }
  }, [form.product_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = booking ? 'PUT' : 'POST';
      const body = booking ? { ...form, id: booking.id } : form;
      
      const res = await fetch('/api/tour-bookings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={booking ? ls('Edit Booking', 'Editar Reserva') : ls('New Booking', 'Nueva Reserva')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GuestSearchSelect 
            label={ls('Guest', 'Huésped')}
            value={form.guest_id}
            onChange={(id) => setForm({ ...form, guest_id: id })}
          />
          <ProductSearchSelect 
            label={ls('Tour / Activity', 'Tour / Actividad')}
            value={form.product_id}
            locale={locale}
            onChange={(id) => setForm({ ...form, product_id: id })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Available Slot', 'Horario Disponible')}</label>
            <select 
              value={form.schedule_id} 
              onChange={e => setForm({ ...form, schedule_id: e.target.value })} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">{ls('Select a slot...', 'Seleccionar horario...')}</option>
              {schedules.map(s => (
                <option key={s.id} value={s.id}>
                  {new Date(s.date).toLocaleDateString()} at {s.start_time.slice(0, 5)} ({s.capacity_remaining} left)
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Mode', 'Modalidad')}</label>
            <select 
              value={form.booking_mode} 
              onChange={e => setForm({ ...form, booking_mode: e.target.value })} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="shared">{ls('Shared', 'Compartido')}</option>
              <option value="private">{ls('Private', 'Privado')}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Pax', 'Pax')}</label>
            <input 
              type="number" 
              min={1} 
              value={form.num_guests} 
              onChange={e => setForm({ ...form, num_guests: parseInt(e.target.value) })} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Price', 'Precio')}</label>
            <input 
              type="number" 
              step="0.01"
              value={form.total_price} 
              onChange={e => setForm({ ...form, total_price: e.target.value })} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Guest Status', 'Estado Huésped')}</label>
            <select 
              value={form.guest_status} 
              onChange={e => setForm({ ...form, guest_status: e.target.value })} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {['pending','confirmed','completed','cancelled','no_show'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Vendor Status', 'Estado Proveedor')}</label>
            <select 
              value={form.vendor_status} 
              onChange={e => setForm({ ...form, vendor_status: e.target.value })} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {['pending','confirmed','completed','cancelled','no_show'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Special Requests', 'Solicitudes Especiales')}</label>
          <textarea 
            rows={2} 
            value={form.special_requests} 
            onChange={e => setForm({ ...form, special_requests: e.target.value })} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
          />
        </div>

        <MessageGuestPanel guestId={form.guest_id} guestName={booking?.guest_name} />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {ls('Cancel', 'Cancelar')}
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            {booking ? ls('Update Booking', 'Actualizar') : ls('Create Booking', 'Crear Reserva')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
