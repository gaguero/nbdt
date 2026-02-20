import localFont from 'next/font/local';

export const gotham = localFont({
  src: [
    {
      path: '../../public/fonts/Gotham-Black.woff2',
      weight: '900',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Gotham-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Gotham-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Gotham-Book.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-gotham',
});

export const proximaNova = localFont({
  src: [
    {
      path: '../../public/fonts/ProximaNova-Light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ProximaNova-LightIt.woff2',
      weight: '300',
      style: 'italic',
    },
    {
      path: '../../public/fonts/ProximaNova-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ProximaNova-Semibold.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-proxima-nova',
});
