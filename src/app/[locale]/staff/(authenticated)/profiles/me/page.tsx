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

  const [personalForm, setPersonalForm] = useState({ first_name: '', last_name: '' });
  const [personalLoading, setPersonalLoading] = useState(false);
  const [personalSuccess, setPersonalSuccess] = useState(false);

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

  if (!user) return (
    <div className="p-12 text-center text-sm" style={{ color: 'var(--muted-dim)' }}>Loading...</div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Profile header */}
      <div className="nayara-card p-8 flex flex-col md:flex-row items-center gap-6">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(78,94,62,0.12)', color: 'var(--sage)' }}
        >
          <UserCircleIcon className="w-20 h-20" />
        </div>
        <div className="text-center md:text-left flex-1">
          <h1
            className="text-3xl font-bold italic"
            style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}
          >
            {user.fullName}
          </h1>
          <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
            <span
              className="px-3 py-1 text-xs font-bold uppercase rounded-full tracking-widest"
              style={{ background: 'var(--gold)', color: '#fff' }}
            >
              {user.role}
            </span>
            {user.station && (
              <span
                className="px-3 py-1 text-xs font-bold uppercase rounded-full tracking-widest"
                style={{ background: 'rgba(78,94,62,0.12)', color: 'var(--sage)', border: '1px solid rgba(78,94,62,0.2)' }}
              >
                {user.station}
              </span>
            )}
          </div>
          <p className="text-sm mt-2 font-medium" style={{ color: 'var(--muted-dim)' }}>{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Personal Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <IdentificationIcon className="w-5 h-5" style={{ color: 'var(--muted-dim)' }} />
            <h2 className="nayara-label">{ls('Personal Details', 'Detalles Personales')}</h2>
          </div>

          <form onSubmit={handlePersonalSubmit} className="nayara-card p-6 space-y-4">
            <div className="space-y-1">
              <label className="nayara-label">{ls('First Name', 'Nombre')}</label>
              <input
                type="text"
                value={personalForm.first_name}
                onChange={e => setPersonalForm({ ...personalForm, first_name: e.target.value })}
                className="nayara-input w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="nayara-label">{ls('Last Name', 'Apellido')}</label>
              <input
                type="text"
                value={personalForm.last_name}
                onChange={e => setPersonalForm({ ...personalForm, last_name: e.target.value })}
                className="nayara-input w-full"
              />
            </div>

            {personalSuccess && (
              <div
                className="flex items-center gap-2 text-xs font-bold p-2 rounded-lg"
                style={{ background: 'rgba(78,94,62,0.10)', color: 'var(--sage)', border: '1px solid rgba(78,94,62,0.2)' }}
              >
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
            <ShieldCheckIcon className="w-5 h-5" style={{ color: 'var(--muted-dim)' }} />
            <h2 className="nayara-label">{ls('Security', 'Seguridad')}</h2>
          </div>

          <form onSubmit={handlePasswordSubmit} className="nayara-card p-6 space-y-4">
            <div className="space-y-1">
              <label className="nayara-label">{ls('Current Password', 'Contraseña Actual')}</label>
              <input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="nayara-input w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="nayara-label">{ls('New Password', 'Nueva Contraseña')}</label>
              <input
                type="password"
                required
                minLength={8}
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="nayara-input w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="nayara-label">{ls('Confirm New Password', 'Confirmar Nueva Contraseña')}</label>
              <input
                type="password"
                required
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="nayara-input w-full"
              />
            </div>

            {passwordError && (
              <div
                className="text-xs font-bold p-2 rounded-lg italic"
                style={{ background: 'rgba(236,108,75,0.10)', color: 'var(--terra)', border: '1px solid rgba(236,108,75,0.2)' }}
              >
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div
                className="flex items-center gap-2 text-xs font-bold p-2 rounded-lg"
                style={{ background: 'rgba(78,94,62,0.10)', color: 'var(--sage)', border: '1px solid rgba(78,94,62,0.2)' }}
              >
                <CheckCircleIcon className="w-4 h-4" />
                {ls('Password changed successfully!', 'Contraseña cambiada exitosamente!')}
              </div>
            )}

            <Button type="submit" variant="secondary" isLoading={passwordLoading} fullWidth>
              <KeyIcon className="w-4 h-4 mr-2" />
              {ls('Change Password', 'Cambiar Contraseña')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
