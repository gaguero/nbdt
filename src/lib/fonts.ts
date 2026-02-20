import { Montserrat } from 'next/font/google';

/**
 * BRAND SUBSTITUTE CONFIGURATION:
 * We are using Montserrat as the high-quality substitute for both Gotham and Proxima Nova.
 * Montserrat perfectly matches the geometric proportions of the Metropolis and Milliard 
 * alternatives suggested by the Brand Book sources.
 */

export const gotham = Montserrat({
  subsets: ['latin'],
  // Gotham weights: Black (900), Bold (700), Book (400)
  weight: ['400', '700', '900'],
  variable: '--font-gotham',
});

export const proximaNova = Montserrat({
  subsets: ['latin'],
  // Proxima Nova weights: Light (300), Regular (400), Semibold (600)
  weight: ['300', '400', '600'],
  variable: '--font-proxima-nova',
});
