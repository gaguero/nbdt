'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function StaffLoginPage() {
  const t = useTranslations('staff.login');
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Redirect to dashboard on success
      router.push('/staff/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* Background watermark logos */}
      <img
        src="/brand_assets/nayara-logo-round.png"
        alt=""
        className="nayara-logo-spin"
        style={{
          position: 'absolute',
          width: 480,
          height: 480,
          top: -120,
          right: -120,
          opacity: 0.04,
          pointerEvents: 'none',
        }}
      />
      <img
        src="/brand_assets/nayara-logo-round.png"
        alt=""
        style={{
          position: 'absolute',
          width: 280,
          height: 280,
          bottom: -80,
          left: -80,
          opacity: 0.035,
          pointerEvents: 'none',
          transform: 'rotate(45deg)',
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Floating logo above card */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
            <span
              style={{
                position: 'absolute',
                inset: -10,
                borderRadius: '50%',
                border: '1.5px solid rgba(170,142,103,0.3)',
                animation: 'nayara-pulse-ring 2.8s ease-out infinite',
              }}
            />
            <span
              style={{
                position: 'absolute',
                inset: -10,
                borderRadius: '50%',
                border: '1.5px solid rgba(170,142,103,0.2)',
                animation: 'nayara-pulse-ring 2.8s ease-out 0.9s infinite',
              }}
            />
            <img
              src="/brand_assets/nayara-logo-round.png"
              alt="Nayara"
              className="nayara-logo-float"
              style={{
                width: 72,
                height: 72,
                display: 'block',
                position: 'relative',
                filter: 'drop-shadow(0 8px 20px rgba(170,142,103,0.25))',
              }}
            />
          </div>
          <h2
            style={{
              fontFamily: "var(--font-gelasio), Georgia, serif",
              fontStyle: 'italic',
              fontSize: 14,
              color: 'var(--muted-dim)',
              letterSpacing: '0.08em',
              textTransform: 'none',
              fontWeight: 400,
            }}
          >
            Nayara Bocas del Toro
          </h2>
        </div>

        {/* Card */}
        <div className="nayara-card" style={{ padding: '32px 28px' }}>
          {/* Logo divider header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--separator)' }} />
            <img src="/brand_assets/nayara-logo-round.png" alt="" style={{ width: 24, height: 24, opacity: 0.5 }} />
            <div style={{ flex: 1, height: 1, background: 'var(--separator)' }} />
          </div>

          <h1
            className="text-center"
            style={{
              fontFamily: "var(--font-gotham), Montserrat, sans-serif",
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: '0.1em',
              color: 'var(--charcoal)',
              marginBottom: 4,
              textTransform: 'uppercase',
            }}
          >
            {t('title', { defaultValue: 'Staff Login' })}
          </h1>
          <p
            className="text-center"
            style={{ fontSize: 12, color: 'var(--muted-dim)', marginBottom: 28, letterSpacing: '0.04em' }}
          >
            {t('subtitle', { defaultValue: 'Sign in to access the staff portal' })}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                style={{
                  background: 'rgba(236,108,75,0.08)',
                  border: '1px solid rgba(236,108,75,0.25)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: 'var(--terra)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <img src="/brand_assets/nayara-logo-round.png" alt="" style={{ width: 16, height: 16, opacity: 0.5 }} />
                {error}
              </div>
            )}

            <div>
              <label className="nayara-label" htmlFor="email">
                {t('email', { defaultValue: 'Email' })}
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder={t('emailPlaceholder', { defaultValue: 'Enter your email' })}
                className="w-full"
              />
            </div>

            <div>
              <label className="nayara-label" htmlFor="password">
                {t('password', { defaultValue: 'Password' })}
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder={t('passwordPlaceholder', { defaultValue: 'Enter your password' })}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between" style={{ paddingTop: 4 }}>
              <div className="flex items-center gap-2">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  style={{ accentColor: 'var(--gold)' }}
                />
                <label htmlFor="remember-me" style={{ fontSize: 12, color: 'var(--muted-dim)', cursor: 'pointer' }}>
                  {t('rememberMe', { defaultValue: 'Remember me' })}
                </label>
              </div>
              <a
                href="#"
                style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-dark)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--gold)')}
              >
                {t('forgotPassword', { defaultValue: 'Forgot password?' })}
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="nayara-btn nayara-btn-primary w-full"
              style={{ marginTop: 8, height: 44, fontSize: 13 }}
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <img
                    src="/brand_assets/nayara-logo-round.png"
                    alt=""
                    className="nayara-logo-spin"
                    style={{ width: 18, height: 18, filter: 'brightness(3)', opacity: 0.8 }}
                  />
                  {t('signingIn', { defaultValue: 'Signing in...' })}
                </span>
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  <img
                    src="/brand_assets/nayara-logo-round.png"
                    alt=""
                    style={{ width: 18, height: 18, filter: 'brightness(3)' }}
                  />
                  {t('signIn', { defaultValue: 'Sign in' })}
                </span>
              )}
            </button>
          </form>

          {/* Footer logo divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--separator)' }} />
            <img
              src="/brand_assets/nayara-logo-round.png"
              alt=""
              className="nayara-logo-breathe"
              style={{ width: 16, height: 16, opacity: 0.25 }}
            />
            <div style={{ flex: 1, height: 1, background: 'var(--separator)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
