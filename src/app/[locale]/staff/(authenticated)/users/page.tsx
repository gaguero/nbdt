'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { RolesSelect } from '@/components/staff/RolesSelect';
import { StationSelect } from '@/components/staff/StationSelect';
import { PermissionsPicker } from '@/components/staff/PermissionsPicker';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { 
  UserGroupIcon, 
  PencilIcon, 
  PlusIcon, 
  KeyIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface StaffUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  permissions: any[];
  is_active: boolean;
  station: string | null;
  last_login_at: string | null;
}

export default function UsersPage() {
  const locale = useLocale();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<StaffUser | null>(null);
  
  // Forms
  const [createForm, setCreateForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'staff',
    password: '',
    station: ''
  });
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  
  const [saving, setSaving] = useState(false);
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const fetchUsers = () => {
    setLoading(true);
    fetch('/api/staff-users')
      .then(r => r.json())
      .then(d => setUsers(d.staff ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/staff-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });
      if (res.ok) {
        setShowCreate(false);
        setCreateForm({ email: '', first_name: '', last_name: '', role: 'staff', password: '', station: '' });
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create user');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await fetch('/api/staff-users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
          role: editingUser.role,
          permissions: editingUser.permissions,
          is_active: editingUser.is_active,
          station: editingUser.station
        })
      });
      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser || !resetPasswordValue) return;
    setSaving(true);
    try {
      const res = await fetch('/api/staff-users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resetPasswordUser.id, password: resetPasswordValue })
      });
      if (res.ok) {
        setTempPassword(resetPasswordValue);
        setResetPasswordValue('');
      }
    } finally {
      setSaving(false);
    }
  };

  const generateRandomPassword = () => {
    const pass = Math.random().toString(36).slice(-8);
    if (showCreate) setCreateForm({ ...createForm, password: pass });
    else setResetPasswordValue(pass);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{ls('Staff Management', 'Gestión de Personal')}</h1>
          <p className="text-sm font-medium text-gray-500">{ls('Manage accounts, roles, and station access.', 'Gestione cuentas, roles y acceso a estaciones.')}</p>
        </div>
        <PermissionGuard permission="staff:manage">
          <Button onClick={() => setShowCreate(true)} className="shadow-sm">
            <PlusIcon className="h-5 w-5 mr-2" />
            {ls('Add Staff Member', 'Agregar Personal')}
          </Button>
        </PermissionGuard>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400">
                <th className="px-6 py-4">{ls('Name', 'Nombre')}</th>
                <th className="px-6 py-4">{ls('Email', 'Correo')}</th>
                <th className="px-6 py-4">{ls('Role', 'Rol')}</th>
                <th className="px-6 py-4">{ls('Station', 'Estación')}</th>
                <th className="px-6 py-4">{ls('Status', 'Estado')}</th>
                <th className="px-6 py-4 text-right">{ls('Actions', 'Acciones')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400 animate-pulse">{ls('Loading staff...', 'Cargando personal...')}</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${!u.is_active ? 'opacity-60 grayscale' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{u.first_name} {u.last_name}</div>
                    <div className="text-[10px] text-gray-400 italic">
                      {u.last_login_at ? `${ls('Last login', 'Última sesión')}: ${new Date(u.last_login_at).toLocaleString()}` : ls('Never logged in', 'Nunca ha iniciado sesión')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-100">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {u.station ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-100">
                        {u.station}
                      </span>
                    ) : <span className="text-gray-300 text-xs italic">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    {u.is_active ? (
                      <span className="flex items-center text-xs font-bold text-green-600 gap-1">
                        <CheckCircleIcon className="h-4 w-4" /> {ls('Active', 'Activo')}
                      </span>
                    ) : (
                      <span className="flex items-center text-xs font-bold text-red-400 gap-1">
                        <NoSymbolIcon className="h-4 w-4" /> {ls('Inactive', 'Inactivo')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <PermissionGuard permission="staff:manage">
                        <button 
                          onClick={() => setEditingUser(u)}
                          title={ls('Edit User', 'Editar Usuario')}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => { setResetPasswordUser(u); setTempPassword(null); }}
                          title={ls('Reset Password', 'Restablecer Contraseña')}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          <KeyIcon className="h-4 w-4" />
                        </button>
                      </PermissionGuard>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={ls('Add New Staff Member', 'Nuevo Miembro del Personal')} size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Email *</label>
              <input required type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1 flex flex-col">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Password *</label>
              <div className="flex gap-2">
                <input required type="text" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
                <Button type="button" variant="secondary" onClick={generateRandomPassword} className="!px-3">
                  <ArrowPathIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('First Name', 'Nombre')} *</label>
              <input required type="text" value={createForm.first_name} onChange={e => setCreateForm({ ...createForm, first_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Last Name', 'Apellido')}</label>
              <input type="text" value={createForm.last_name} onChange={e => setCreateForm({ ...createForm, last_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Role', 'Rol')} *</label>
              <RolesSelect value={createForm.role} onChange={(r) => setCreateForm({ ...createForm, role: r })} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Station', 'Estación')}</label>
              <StationSelect value={createForm.station} onChange={(s) => setCreateForm({ ...createForm, station: s })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>{ls('Cancel', 'Cancelar')}</Button>
            <Button type="submit" variant="primary" isLoading={saving}>{ls('Create Account', 'Crear Cuenta')}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title={ls('Edit User', 'Editar Usuario')} size="lg">
        {editingUser && (
          <form onSubmit={handleSaveEdit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('First Name', 'Nombre')}</label>
                <input type="text" value={editingUser.first_name} onChange={e => setEditingUser({ ...editingUser, first_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Last Name', 'Apellido')}</label>
                <input type="text" value={editingUser.last_name} onChange={e => setEditingUser({ ...editingUser, last_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Role', 'Rol')}</label>
                <RolesSelect value={editingUser.role} onChange={(role) => setEditingUser({ ...editingUser, role })} />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{ls('Station', 'Estación')}</label>
                <StationSelect value={editingUser.station || ''} onChange={(s) => setEditingUser({ ...editingUser, station: s })} />
              </div>
              <div className="space-y-1 flex flex-col justify-center">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">{ls('Status', 'Estado')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingUser.is_active}
                    onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold text-gray-700">{editingUser.is_active ? ls('Active', 'Activo') : ls('Inactive', 'Inactivo')}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                {ls('Override Permissions', 'Permisos Personalizados')}
              </label>
              <PermissionsPicker 
                role={editingUser.role}
                value={editingUser.permissions || []}
                onChange={(perms) => setEditingUser({ ...editingUser, permissions: perms })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={() => setEditingUser(null)} disabled={saving}>{ls('Cancel', 'Cancelar')}</Button>
              <Button type="submit" variant="primary" isLoading={saving}>{ls('Save Changes', 'Guardar Cambios')}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={!!resetPasswordUser} onClose={() => setResetPasswordUser(null)} title={ls('Reset Password', 'Restablecer Contraseña')} size="md">
        {resetPasswordUser && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg flex gap-3">
              <ExclamationCircleIcon className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <p className="text-xs text-orange-800 font-medium">
                {ls(`Resetting password for ${resetPasswordUser.first_name}. Ensure you share the new password securely.`, `Restableciendo contraseña para ${resetPasswordUser.first_name}. Asegúrese de compartir la nueva contraseña de forma segura.`)}
              </p>
            </div>

            {!tempPassword ? (
              <div className="space-y-1 flex flex-col">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">{ls('New Password', 'Nueva Contraseña')}</label>
                <div className="flex gap-2">
                  <input required type="text" value={resetPasswordValue} onChange={e => setResetPasswordValue(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
                  <Button type="button" variant="secondary" onClick={generateRandomPassword} className="!px-3">
                    <ArrowPathIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-green-50 rounded-xl border border-green-200 text-center space-y-3 animate-in zoom-in duration-200">
                <p className="text-xs font-bold text-green-800 uppercase tracking-widest">{ls('New Password Generated', 'Nueva Contraseña Generada')}</p>
                <div className="text-3xl font-black font-mono tracking-widest text-gray-900 select-all">{tempPassword}</div>
                <p className="text-[10px] text-green-600">{ls('Copy this password now. It will not be shown again.', 'Copie esta contraseña ahora. No se mostrará de nuevo.')}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={() => setResetPasswordUser(null)}>{tempPassword ? ls('Close', 'Cerrar') : ls('Cancel', 'Cancelar')}</Button>
              {!tempPassword && <Button type="submit" variant="primary" isLoading={saving}>{ls('Update Password', 'Actualizar Contraseña')}</Button>}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function ArrowPathIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
