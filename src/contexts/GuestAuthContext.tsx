'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface GuestData {
  guest_id: string;
  reservation_id: string;
  guest_name: string;
  first_name: string;
  room: string;
  arrival: string;
  departure: string;
  status: string;
  property_id: string | null;
}

interface GuestAuthContextType {
  guest: GuestData | null;
  loading: boolean;
  login: (reservationNumber: string, lastName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const GuestAuthContext = createContext<GuestAuthContextType | null>(null);

export function GuestAuthProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useState<GuestData | null>(null);
  const [loading, setLoading] = useState(true);

  const verify = async () => {
    try {
      const res = await fetch('/api/auth/guest-verify', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setGuest(data.guest);
      } else {
        setGuest(null);
      }
    } catch {
      setGuest(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verify();
  }, []);

  const login = async (reservationNumber: string, lastName: string) => {
    try {
      const res = await fetch('/api/auth/guest-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_number: reservationNumber, last_name: lastName }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error };
      }
      setGuest(data.guest);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    await fetch('/api/auth/guest-logout', { method: 'POST', credentials: 'include' });
    setGuest(null);
  };

  const refresh = verify;

  return (
    <GuestAuthContext.Provider value={{ guest, loading, login, logout, refresh }}>
      {children}
    </GuestAuthContext.Provider>
  );
}

export function useGuestAuth() {
  const ctx = useContext(GuestAuthContext);
  if (!ctx) throw new Error('useGuestAuth must be used within GuestAuthProvider');
  return ctx;
}
