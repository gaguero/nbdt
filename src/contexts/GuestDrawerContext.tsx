'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface GuestDrawerContextType {
  guestId: string | null;
  openGuest: (id: string) => void;
  closeGuest: () => void;
}

const GuestDrawerContext = createContext<GuestDrawerContextType | undefined>(undefined);

export function GuestDrawerProvider({ children }: { children: ReactNode }) {
  const [guestId, setGuestId] = useState<string | null>(null);

  return (
    <GuestDrawerContext.Provider
      value={{
        guestId,
        openGuest: (id: string) => setGuestId(id),
        closeGuest: () => setGuestId(null),
      }}
    >
      {children}
    </GuestDrawerContext.Provider>
  );
}

export function useGuestDrawer() {
  const context = useContext(GuestDrawerContext);
  if (!context) {
    throw new Error('useGuestDrawer must be used within GuestDrawerProvider');
  }
  return context;
}
