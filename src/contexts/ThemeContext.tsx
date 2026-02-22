'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { usePropertyConfig } from '@/contexts/PropertyConfigContext';

type PaletteName = 'botanical' | 'ocean' | 'midnight' | 'desert' | 'slate';

interface ThemeContextType {
  palette: PaletteName;
}

const ThemeContext = createContext<ThemeContextType>({ palette: 'botanical' });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { config } = usePropertyConfig();
  const palette = (config?.settings?.brand?.colors?.palette as PaletteName) ?? 'botanical';

  useEffect(() => {
    if (palette === 'botanical') {
      document.documentElement.removeAttribute('data-palette');
    } else {
      document.documentElement.setAttribute('data-palette', palette);
    }
  }, [palette]);

  return (
    <ThemeContext.Provider value={{ palette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
