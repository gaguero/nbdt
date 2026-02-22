'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Not authenticated');
        }

        setIsAuthenticated(true);
      } catch (error) {
        // Redirect to login if not authenticated
        router.push('/staff/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg)' }}
      >
        <div className="flex flex-col items-center gap-5">
          <div style={{ position: 'relative', width: 96, height: 96 }}>
            <img
              src="/brand_assets/nayara-logo-round.png"
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: 96,
                height: 96,
                opacity: 0.18,
                animation: 'nayara-spin-slow 20s linear infinite',
              }}
            />
            <img
              src="/brand_assets/nayara-logo-round.png"
              alt="Loading"
              style={{
                position: 'absolute',
                inset: 16,
                width: 64,
                height: 64,
                animation: 'nayara-spin-ccw 12s linear infinite',
              }}
            />
          </div>
          <p
            style={{
              fontFamily: "var(--font-gelasio), Georgia, serif",
              fontStyle: 'italic',
              fontSize: 13,
              color: 'var(--muted-dim)',
              letterSpacing: '0.08em',
            }}
          >
            Loading your workspace…
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}
