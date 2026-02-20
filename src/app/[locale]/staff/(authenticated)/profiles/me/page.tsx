'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import { 
  UserCircleIcon, 
  KeyIcon, 
  IdentificationIcon,
  ShieldCheckIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function MyProfilePage() {
  const locale = useLocale();
  const { user, refetch } = useAuth();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  // Personal Info Form
  const [personalForm, setPersonalForm] = useState({ first_name: '', last_name: '' });
  const [personalLoading, setPersonalLoading] = useState(false);
  const [personalSuccess, setPersonalSuccess] = useState(false);

  // Password Form
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setPersonalForm({
        first_name: user.firstName || '',
        last_name: user.lastName || '',
      });
    }
  }, [user]);

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPersonalLoading(true);
    setPersonalSuccess(false);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personalForm)
      });
      if (res.ok) {
        setPersonalSuccess(true);
        refetch();
      }
    } finally {
      setPersonalLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(ls('New passwords do not match', 'Las nuevas contraseñas no coinciden'));
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordSuccess(true);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordError(data.error || 'Failed to change password');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) return <div className="p-12 text-center text-gray-400">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
          <UserCircleIcon className="w-20 h-20" />
        </div>
        <div className="text-center md:text-left flex-1">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{user.fullName}</h1>
          <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
            <span className="px-3 py-1 bg-blue-600 text-white text-xs font-black uppercase rounded-full tracking-widest shadow-sm">
              {user.role}
            </span>
            {user.station && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-black uppercase rounded-full tracking-widest border border-purple-200">
                {user.station}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-2 font-medium">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Personal Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <IdentificationIcon className="w-5 h-5 text-gray-400" />
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-700">{ls('Personal Details', 'Detalles Personales')}</h2>
          </div>
          
          <form onSubmit={handlePersonalSubmit} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">{ls('First Name', 'Nombre')}</label>
              <input 
                type="text" 
                value={personalForm.first_name} 
                onChange={e => setPersonalForm({ ...personalForm, first_name: e.target.value })} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800" 
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">{ls('Last Name', 'Apellido')}</label>
              <input 
                type="text" 
                value={personalForm.last_name} 
                onChange={e => setPersonalForm({ ...personalForm, last_name: e.target.value })} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800" 
              />
            </div>
            
            {personalSuccess && (
              <div className="flex items-center gap-2 text-green-600 text-xs font-bold bg-green-50 p-2 rounded-lg border border-green-100">
                <CheckCircleIcon className="w-4 h-4" />
                {ls('Profile updated!', 'Perfil actualizado!')}
              </div>
            )}

            <Button type="submit" variant="primary" isLoading={personalLoading} fullWidth>
              {ls('Save Changes', 'Guardar Cambios')}
            </Button>
          </form>
        </div>

        {/* Security / Password */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheckIcon className="w-5 h-5 text-gray-400" />
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-700">{ls('Security', 'Seguridad')}</h2>
          </div>

          <form onSubmit={handlePasswordSubmit} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">{ls('Current Password', 'Contraseña Actual')}</label>
              <input 
                type="password" 
                required
                value={passwordForm.currentPassword} 
                onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">{ls('New Password', 'Nueva Contraseña')}</label>
              <input 
                type="password" 
                required
                minLength={8}
                value={passwordForm.newPassword} 
                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">{ls('Confirm New Password', 'Confirmar Nueva Contraseña')}</label>
              <input 
                type="password" 
                required
                value={passwordForm.confirmPassword} 
                onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>

            {passwordError && (
              <div className="text-red-600 text-xs font-bold bg-red-50 p-2 rounded-lg border border-red-100 italic">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="flex items-center gap-2 text-green-600 text-xs font-bold bg-green-50 p-2 rounded-lg border border-green-100">
                <CheckCircleIcon className="w-4 h-4" />
                {ls('Password changed successfully!', 'Contraseña cambiada exitosamente!')}
              </div>
            )}

            <Button type="submit" variant="outline" isLoading={passwordLoading} fullWidth>
              <KeyIcon className="w-4 h-4 mr-2" />
              {ls('Change Password', 'Cambiar Contraseña')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
