import localFont from 'next/font/local';

export const googleSans = localFont({
  src: '../public/fonts/google-sans.woff2',
  variable: '--font-google-sans',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  adjustFontFallback: 'Arial',
  fallback: ['Arial', 'sans-serif'],
});
