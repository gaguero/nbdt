'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import Modal from '@/components/ui/Modal';
import { GuestSearchSelect } from '@/components/staff/GuestSearchSelect';
import { VendorSearchSelect } from '@/components/staff/VendorSearchSelect';
import { Button } from '@/components/ui/Button';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer?: any;
  onSuccess: () => void;
}

export function TransferModal({ isOpen, onClose, transfer, onSuccess }: TransferModalProps) {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '',
    guest_id: '',
    vendor_id: '',
    num_passengers: 1,
    origin: '',
    destination: '',
    transfer_type: 'arrival',
    flight_number: '',
    notes: '',
    guest_status: 'pending',
    vendor_status: 'pending'
  });

  useEffect(() => {
    if (transfer) {
      setForm({
        date: transfer.date ? transfer.date.split('T')[0] : new Date().toISOString().split('T')[0],
        time: transfer.time || '',
        guest_id: transfer.guest_id || '',
        vendor_id: transfer.vendor_id || '',
        num_passengers: transfer.num_passengers || 1,
        origin: transfer.origin || '',
        destination: transfer.destination || '',
        transfer_type: transfer.transfer_type || 'arrival',
        flight_number: transfer.flight_number || '',
        notes: transfer.notes || '',
        guest_status: transfer.guest_status || 'pending',
        vendor_status: transfer.vendor_status || 'pending'
      });
    } else {
      setForm({
        date: new Date().toISOString().split('T')[0],
        time: '',
        guest_id: '',
        vendor_id: '',
        num_passengers: 1,
        origin: '',
        destination: '',
        transfer_type: 'arrival',
        flight_number: '',
        notes: '',
        guest_status: 'pending',
        vendor_status: 'pending'
      });
    }
  }, [transfer, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = transfer ? 'PUT' : 'POST';
      const body = transfer ? { ...form, id: transfer.id } : form;
      
      const res = await fetch('/api/transfers', {
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
      title={transfer ? ls('Edit Transfer', 'Editar Traslado') : ls('New Transfer', 'Nuevo Traslado')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GuestSearchSelect 
            label={ls('Guest', 'Huésped')}
            value={form.guest_id}
            onChange={(id) => setForm({ ...form, guest_id: id })}
          />
          <VendorSearchSelect 
            label={ls('Vendor', 'Proveedor')}
            value={form.vendor_id}
            type="transfer"
            onChange={(id) => setForm({ ...form, vendor_id: id })}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Time', 'Hora')}</label>
            <input 
              type="time" 
              value={form.time} 
              onChange={e => setForm({ ...form, time: e.target.value })} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Pax', 'Pax')}</label>
            <input 
              type="number" 
              min={1} 
              value={form.num_passengers} 
              onChange={e => setForm({ ...form, num_passengers: parseInt(e.target.value) })} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Type', 'Tipo')}</label>
            <select 
              value={form.transfer_type} 
              onChange={e => setForm({ ...form, transfer_type: e.target.value })} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="arrival">{ls('Arrival', 'Llegada')}</option>
              <option value="departure">{ls('Departure', 'Salida')}</option>
              <option value="inter_hotel">{ls('Inter-hotel', 'Entre hoteles')}</option>
              <option value="activity">{ls('Activity', 'Actividad')}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Origin', 'Origen')} *</label>
            <input 
              type="text" 
              required 
              placeholder={ls('e.g. Airport', 'ej. Aeropuerto')}
              value={form.origin} 
              onChange={e => setForm({ ...form, origin: e.target.value })} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Destination', 'Destino')} *</label>
            <input 
              type="text" 
              required 
              placeholder={ls('e.g. Hotel', 'ej. Hotel')}
              value={form.destination} 
              onChange={e => setForm({ ...form, destination: e.target.value })} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Flight #', 'Vuelo #')}</label>
            <input 
              type="text" 
              value={form.flight_number} 
              onChange={e => setForm({ ...form, flight_number: e.target.value })} 
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
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Notes', 'Notas')}</label>
          <textarea 
            rows={2} 
            value={form.notes} 
            onChange={e => setForm({ ...form, notes: e.target.value })} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {ls('Cancel', 'Cancelar')}
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {transfer ? ls('Update Transfer', 'Actualizar') : ls('Create Transfer', 'Crear Traslado')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
