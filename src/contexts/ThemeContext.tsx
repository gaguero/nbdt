'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { usePropertyConfig } from '@/contexts/PropertyConfigContext';

export type PaletteName =
  | 'botanical' | 'ocean' | 'midnight' | 'desert' | 'slate'
  | 'navy-reef' | 'arctic' | 'dusk' | 'ember' | 'sage-mist';

export type FontSetName = 'botanical' | 'modern' | 'classic' | 'minimal';

interface ThemeContextType {
  palette: PaletteName;
  fontSet: FontSetName;
}

const ThemeContext = createContext<ThemeContextType>({ palette: 'botanical', fontSet: 'botanical' });

// Maps property-config color keys → CSS variable names
const COLOR_VAR_MAP: Record<string, string> = {
  bg:         '--bg',
  surface:    '--surface',
  elevated:   '--elevated',
  gold:       '--gold',
  goldDark:   '--gold-dark',
  sage:       '--sage',
  forest:     '--forest',
  terra:      '--terra',
  charcoal:   '--charcoal',
  sidebarBg:  '--sidebar-bg',
  muted:      '--muted',
  mutedDim:   '--muted-dim',
  separator:  '--separator',
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { config } = usePropertyConfig();
  const colors = config?.settings?.brand?.colors as Record<string, string> | undefined;
  const palette = (colors?.palette as PaletteName) ?? 'botanical';
  const fontSet = ((config?.settings?.brand as Record<string, unknown>)?.fontSet as FontSetName) ?? 'botanical';

  useEffect(() => {
    const root = document.documentElement;

    // Apply preset palette attribute
    if (palette === 'botanical') {
      root.removeAttribute('data-palette');
    } else {
      root.setAttribute('data-palette', palette);
    }

    // Apply font set attribute
    if (fontSet === 'botanical') {
      root.removeAttribute('data-fontset');
    } else {
      root.setAttribute('data-fontset', fontSet);
    }

    // Apply individual color overrides on top of the palette
    if (colors) {
      for (const [key, cssVar] of Object.entries(COLOR_VAR_MAP)) {
        const value = colors[key];
        if (value && typeof value === 'string') {
          root.style.setProperty(cssVar, value);
        }
      }
    }
  }, [palette, fontSet, colors]);

  return (
    <ThemeContext.Provider value={{ palette, fontSet }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
