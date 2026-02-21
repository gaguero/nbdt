'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface RoomCategory {
  name: string;
  code: string;
  total: number;
}

interface PropertyConfig {
  id: string;
  name: string;
  code: string;
  timezone: string;
  currency: string;
  logoUrl: string | null;
  locationLat: number;
  locationLon: number;
  locationLabel: string;
  settings: {
    brand: {
      colors: Record<string, string>;
      fonts: { heading: string; headingWeight: string; subheading: string; body: string };
    };
    rooms: { categories: RoomCategory[]; totalUnits: number };
    dining: { locations: string[] };
    departments: string[];
    weather: { enabled: boolean; provider: string; zoom: number };
  };
}

interface PropertyConfigContextType {
  config: PropertyConfig | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const PropertyConfigContext = createContext<PropertyConfigContextType | undefined>(undefined);

export function PropertyConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PropertyConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/property-config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <PropertyConfigContext.Provider value={{ config, loading, refresh }}>
      {children}
    </PropertyConfigContext.Provider>
  );
}

export function usePropertyConfig() {
  const context = useContext(PropertyConfigContext);
  if (!context) throw new Error('usePropertyConfig must be used within PropertyConfigProvider');
  return context;
}
