'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useGuestAuth } from '@/contexts/GuestAuthContext';

export default function GuestLoginPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const { login } = useGuestAuth();

  const [reservationNumber, setReservationNumber] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isEs = locale === 'es';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(reservationNumber, lastName);
      if (result.success) {
        router.push(`/${locale}/guest`);
      } else {
        setError(result.error || (isEs ? 'Error al iniciar sesión' : 'Login failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #0e1a09 0%, #1a2e12 50%, #0e1a09 100%)' }}
    >
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(170,142,103,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(78,94,62,0.2) 0%, transparent 40%)'
      }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <span className="absolute inset-[-12px] rounded-full"
              style={{ border: '1px solid rgba(170,142,103,0.2)', animation: 'pulse 3s ease-in-out infinite' }} />
            <img
              src="/brand_assets/nayara-logo-round.png"
              alt="Nayara"
              width={80}
              height={80}
              style={{ filter: 'drop-shadow(0 8px 24px rgba(170,142,103,0.3))' }}
            />
          </div>
          <h1 className="text-white text-xl font-light tracking-[0.15em]"
            style={{ fontFamily: 'var(--font-gelasio), Georgia, serif', fontStyle: 'italic' }}>
            Nayara Bocas del Toro
          </h1>
          <p className="text-white/40 text-xs mt-1 tracking-wider uppercase">
            {isEs ? 'Portal del Huésped' : 'Guest Portal'}
          </p>
        </div>

        {/* Language switcher */}
        <div className="flex justify-center gap-3 mb-6">
          <button
            onClick={() => router.push(`/en/guest/login`)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={locale === 'en'
              ? { background: 'rgba(170,142,103,0.3)', color: '#AA8E67', border: '1px solid rgba(170,142,103,0.4)' }
              : { color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
            }
          >
            English
          </button>
          <button
            onClick={() => router.push(`/es/guest/login`)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={locale === 'es'
              ? { background: 'rgba(170,142,103,0.3)', color: '#AA8E67', border: '1px solid rgba(170,142,103,0.4)' }
              : { color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
            }
          >
            Español
          </button>
        </div>

        {/* Login card */}
        <div className="rounded-2xl p-7"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}
        >
          <h2 className="text-white text-center text-lg font-semibold mb-1">
            {isEs ? 'Bienvenido' : 'Welcome'}
          </h2>
          <p className="text-white/50 text-center text-sm mb-6">
            {isEs ? 'Ingrese su información de reserva' : 'Enter your reservation details'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm"
                style={{ background: 'rgba(236,108,75,0.15)', border: '1px solid rgba(236,108,75,0.3)', color: '#EC6C4B' }}>
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">
                {isEs ? 'Número de Reserva' : 'Reservation Number'}
              </label>
              <input
                type="text"
                value={reservationNumber}
                onChange={e => setReservationNumber(e.target.value)}
                placeholder={isEs ? 'Ej: RES-2026-4521' : 'e.g. RES-2026-4521'}
                required
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(170,142,103,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">
                {isEs ? 'Apellido' : 'Last Name'}
              </label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder={isEs ? 'Ej: Rodriguez' : 'e.g. Rodriguez'}
                required
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(170,142,103,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !reservationNumber || !lastName}
              className="w-full rounded-xl py-3.5 text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #AA8E67 0%, #8B7355 100%)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(170,142,103,0.3)',
              }}
            >
              {loading
                ? (isEs ? 'Verificando...' : 'Verifying...')
                : (isEs ? 'Iniciar Sesión' : 'Sign In')
              }
            </button>
          </form>

          <p className="text-center text-xs text-white/30 mt-5">
            {isEs
              ? 'Encuentre su número de reserva en su confirmación por email'
              : 'Find your reservation number in your email confirmation'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
