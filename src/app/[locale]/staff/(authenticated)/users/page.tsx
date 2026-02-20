'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { RolesSelect } from '@/components/staff/RolesSelect';
import { PermissionsPicker } from '@/components/staff/PermissionsPicker';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { UserGroupIcon, PencilIcon } from '@heroicons/react/24/outline';

interface StaffUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  permissions: any[];
  is_active: boolean;
}

export default function UsersPage() {
  const locale = useLocale();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    fetch('/api/staff-users')
      .then(r => r.json())
      .then(d => setUsers(d.staff ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await fetch('/api/staff-users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          role: editingUser.role,
          permissions: editingUser.permissions,
          is_active: editingUser.is_active
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

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">User Management</h1>
          <p className="text-sm font-medium text-gray-500">Manage staff roles and permissions.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Custom Permissions</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-gray-900">{u.first_name} {u.last_name}</td>
                  <td className="px-6 py-4 text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {u.permissions?.length > 0 ? (
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                        +{u.permissions.length} overrides
                      </span>
                    ) : <span className="text-gray-400 text-xs">Default</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <PermissionGuard permission="staff:manage">
                      <button 
                        onClick={() => setEditingUser(u)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </PermissionGuard>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit User"
        size="lg"
      >
        {editingUser && (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Role</label>
                <RolesSelect 
                  value={editingUser.role} 
                  onChange={(role) => setEditingUser({ ...editingUser, role })} 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Status</label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={editingUser.is_active}
                    onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active Account</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Override Permissions
              </label>
              <PermissionsPicker 
                role={editingUser.role}
                value={editingUser.permissions || []}
                onChange={(perms) => setEditingUser({ ...editingUser, permissions: perms })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={() => setEditingUser(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={saving}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
