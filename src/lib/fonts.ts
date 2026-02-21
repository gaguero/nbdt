import { Montserrat, Gelasio, Figtree } from 'next/font/google';

export const gotham = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-gotham',
});

export const gelasio = Gelasio({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-gelasio',
});

export const proximaNova = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-proxima-nova',
});
