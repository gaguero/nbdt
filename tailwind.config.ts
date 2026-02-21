import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── V13 Slate Botanical tokens ────────────────────────────────
        nayara: {
          bg:        'var(--bg)',
          surface:   'var(--surface)',
          elevated:  'var(--elevated)',
          gold:      'var(--gold)',
          'gold-dark': 'var(--gold-dark)',
          sage:      'var(--sage)',
          forest:    'var(--forest)',
          terra:     'var(--terra)',
          charcoal:  'var(--charcoal)',
          sidebar:   'var(--sidebar-bg)',
          muted:     'var(--muted)',
          'muted-dim': 'var(--muted-dim)',
          separator: 'var(--separator)',
        },
        // Nayara Brand Color Palette
        brand: {
          primary: "#A6BBC2",        // Blue-Grey (Bocas Bali Hero Color)
          accent: "#D4DBDF",         // Soft Lavender
          sage: "#C6C897",           // Muted Sage
          cream: "#E8E5D7",          // Master Cream
          grey: "#4A4A4A",           // Master Grey
          white: "#FBF8F3",          // Master White
          pure: "#FFFFFF",
        },
        // Semantic color mappings
        primary: {
          DEFAULT: "#A6BBC2",
          foreground: "#4A4A4A",
        },
        secondary: {
          DEFAULT: "#D4DBDF",
          foreground: "#4A4A4A",
        },
        accent: {
          DEFAULT: "#C6C897",
          foreground: "#4A4A4A",
        },
        background: "#FBF8F3",
        foreground: "#4A4A4A",
        muted: {
          DEFAULT: "#D4DBDF",
          foreground: "#4A4A4A",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#4A4A4A",
        },
        border: "#D4DBDF",
        input: "#A6BBC2",
        ring: "#A6BBC2",
        // Status colors for ordering system
        status: {
          pending: {
            DEFAULT: "#F59E0B",      // Amber
            foreground: "#FFFFFF",
            bg: "#FEF3C7",
          },
          confirmed: {
            DEFAULT: "#3B82F6",      // Blue
            foreground: "#FFFFFF",
            bg: "#DBEAFE",
          },
          preparing: {
            DEFAULT: "#8B5CF6",      // Purple
            foreground: "#FFFFFF",
            bg: "#EDE9FE",
          },
          ready: {
            DEFAULT: "#10B981",      // Green
            foreground: "#FFFFFF",
            bg: "#D1FAE5",
          },
          delivered: {
            DEFAULT: "#059669",      // Emerald
            foreground: "#FFFFFF",
            bg: "#A7F3D0",
          },
          completed: {
            DEFAULT: "#6B7280",      // Gray
            foreground: "#FFFFFF",
            bg: "#E5E7EB",
          },
          cancelled: {
            DEFAULT: "#EF4444",      // Red
            foreground: "#FFFFFF",
            bg: "#FEE2E2",
          },
        },
        // State colors
        success: {
          DEFAULT: "#10B981",
          foreground: "#FFFFFF",
          light: "#D1FAE5",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#FFFFFF",
          light: "#FEF3C7",
        },
        error: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
          light: "#FEE2E2",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
      },
      fontFamily: {
        // V13 Slate Botanical fonts
        playfair: ["Playfair Display", "serif"],
        'dm-sans': ["DM Sans", "system-ui", "sans-serif"],
        'dm-mono': ["DM Mono", "Menlo", "monospace"],
        // Primary Heading Font
        heading: ["Playfair Display", "serif"],
        // Body Copy Font
        sans: ["DM Sans", "Lato", "system-ui", "sans-serif"],
        // Monospace for code
        mono: ["DM Mono", "var(--font-geist-mono)", "Menlo", "monospace"],
      },
      fontSize: {
        // Typography Scale from Style Guide
        'h1': ['2.5rem', { lineHeight: '1.3', fontWeight: '700' }],      // 40px
        'h2': ['2rem', { lineHeight: '1.35', fontWeight: '600' }],       // 32px
        'h3': ['1.5rem', { lineHeight: '1.4', fontWeight: '600' }],      // 24px
        'body': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],      // 16px
        'caption': ['0.875rem', { lineHeight: '1.5', fontWeight: '300' }], // 14px
        'button': ['1rem', { lineHeight: '1.2', fontWeight: '600' }],    // 16px
      },
      spacing: {
        // Layout Spacing from Style Guide
        'section': '5rem',      // 80px section padding
        'content': '2rem',      // 32px content padding
        'content-wide': '4rem', // 64px wide content padding
      },
      borderRadius: {
        lg: "0.5rem",    // 8px
        md: "0.375rem",  // 6px
        sm: "0.25rem",   // 4px
        // Button radius from style guide
        button: "0.375rem", // 6px
        // Card radius for ordering system
        card: "0.5rem",     // 8px
      },
      opacity: {
        '85': '0.85',
        '80': '0.8',
        '60': '0.6',
        '35': '0.35',
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-in": "slideIn 0.4s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateX(-20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
      boxShadow: {
        'card': '0 2px 12px rgba(78,94,62,0.10), 0 1px 3px rgba(26,26,26,0.06)',
        'card-hover': '0 8px 28px rgba(78,94,62,0.14), 0 2px 8px rgba(26,26,26,0.08)',
        'modal': '0 28px 80px rgba(14,26,9,0.32), 0 4px 20px rgba(26,26,26,0.14)',
        'button': '0 1px 2px rgba(0,0,0,0.08)',
        'focus': '0 0 0 3px rgba(170,142,103,0.25)',
        'focus-sage': '0 0 0 3px rgba(78,94,62,0.20)',
        'status': '0 2px 8px rgba(0,0,0,0.06)',
      },
      letterSpacing: {
        'brand-heading': '0.1em', // Tracking 100
        'brand-body': '0.04em',   // Tracking 40
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
    },
  },
  plugins: [],
  future: {
    hoverOnlyWhenSupported: true,
  },
  experimental: {
    optimizeUniversalDefaults: true,
  },
};

export default config;
