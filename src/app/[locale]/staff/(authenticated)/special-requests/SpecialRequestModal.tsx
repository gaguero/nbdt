'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import Modal from '@/components/ui/Modal';
import { localDateString } from '@/lib/dates';
import Button from '@/components/ui/Button';
import { GuestSearchSelect } from '@/components/staff/GuestSearchSelect';

const DEPARTMENTS = ['concierge', 'housekeeping', 'maintenance', 'food_beverage', 'spa', 'front_desk', 'management'];
const PRIORITIES = ['normal', 'high', 'urgent'];

const PRIORITY_COLORS: Record<string, string> = {
  normal: 'text-gray-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
};

interface SpecialRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request?: any;
  onSuccess: () => void;
}

export function SpecialRequestModal({ isOpen, onClose, request, onSuccess }: SpecialRequestModalProps) {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);

  const emptyForm = {
    date: localDateString(),
    time: '',
    guest_id: '',
    department: 'concierge',
    check_in: '',
    check_out: '',
    request: '',
    status: 'pending',
    priority: 'normal',
    assigned_to: '',
    internal_notes: '',
  };

  const [form, setForm] = useState<any>(emptyForm);

  useEffect(() => {
    fetch('/api/staff-users')
      .then(r => r.json())
      .then(d => setStaffUsers(d.staff ?? []));
  }, []);

  useEffect(() => {
    if (request) {
      setForm({
        date: request.date ? request.date.split('T')[0] : '',
        time: request.time ? request.time.slice(0, 5) : '',
        guest_id: request.guest_id || '',
        department: request.department || 'concierge',
        check_in: request.check_in ? request.check_in.split('T')[0] : '',
        check_out: request.check_out ? request.check_out.split('T')[0] : '',
        request: request.request || '',
        status: request.status || 'pending',
        priority: request.priority || 'normal',
        assigned_to: request.assigned_to || '',
        internal_notes: request.internal_notes || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [request, isOpen]);

  const deptLabel = (d: string) => d.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = request ? 'PUT' : 'POST';
      const body = request ? { ...form, id: request.id } : form;
      const payload = {
        ...body,
        assigned_to: body.assigned_to || null,
        internal_notes: body.internal_notes || null,
      };
      const res = await fetch('/api/special-requests', {
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
    if (!request) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/special-requests?id=${request.id}`, { method: 'DELETE' });
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
      title={request ? ls('Edit Special Request', 'Editar Solicitud') : ls('New Special Request', 'Nueva Solicitud Especial')}
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
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Department', 'Departamento')} *</label>
            <select
              required
              value={form.department}
              onChange={e => setForm({ ...form, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {DEPARTMENTS.map(d => <option key={d} value={d}>{deptLabel(d)}</option>)}
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
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Time', 'Hora')}</label>
            <input
              type="time"
              value={form.time}
              onChange={e => setForm({ ...form, time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Check-in Date', 'Check-in')}</label>
            <input
              type="date"
              value={form.check_in}
              onChange={e => setForm({ ...form, check_in: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Check-out Date', 'Check-out')}</label>
            <input
              type="date"
              value={form.check_out}
              onChange={e => setForm({ ...form, check_out: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Request', 'Solicitud')} *</label>
          <textarea
            required
            rows={3}
            value={form.request}
            onChange={e => setForm({ ...form, request: e.target.value })}
            placeholder={ls('Describe the request...', 'Describe la solicitud...')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Status', 'Estado')}</label>
            <select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {['pending', 'in_progress', 'completed', 'cancelled'].map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Priority', 'Prioridad')}</label>
            <select
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium ${PRIORITY_COLORS[form.priority]}`}
            >
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Assigned To', 'Asignado a')}</label>
            <select
              value={form.assigned_to}
              onChange={e => setForm({ ...form, assigned_to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">{ls('Unassigned', 'Sin asignar')}</option>
              {staffUsers.map(u => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Internal Notes (staff only)', 'Notas Internas (solo personal)')}</label>
          <textarea
            rows={2}
            value={form.internal_notes}
            onChange={e => setForm({ ...form, internal_notes: e.target.value })}
            placeholder={ls('Internal staff notes...', 'Notas internas...')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-yellow-50"
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {request && (
              <Button type="button" variant="danger" isLoading={deleting} disabled={loading} onClick={handleDelete}>
                {ls('Cancel Request', 'Cancelar Solicitud')}
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading || deleting}>
              {ls('Close', 'Cerrar')}
            </Button>
            <Button type="submit" variant="primary" isLoading={loading} disabled={deleting}>
              {request ? ls('Update', 'Actualizar') : ls('Create Request', 'Crear Solicitud')}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
