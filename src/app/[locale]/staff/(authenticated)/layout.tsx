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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}
