import { Montserrat, Open_Sans } from 'next/font/google';

/**
 * BRIDGE CONFIGURATION:
 * Since local Gotham and Proxima Nova files are missing in the repository,
 * we are using high-quality Google Font equivalents to prevent build failures.
 * 
 * To switch to the real fonts:
 * 1. Upload .woff2 files to /public/fonts/
 * 2. Restore the localFont configuration in this file.
 */

export const gotham = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-gotham', // Remains the same for CSS compatibility
});

export const proximaNova = Open_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  variable: '--font-proxima-nova', // Remains the same for CSS compatibility
});
