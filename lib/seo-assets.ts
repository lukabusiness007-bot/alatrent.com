import type { Metadata } from 'next';

// Stable raster URLs let search crawlers and older browsers use the same brand mark.
export const siteIcons = {
  icon: [{ url: '/favicon.png', type: 'image/png', sizes: '96x96' }],
  shortcut: '/favicon.ico',
  apple: [{ url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
} satisfies NonNullable<Metadata['icons']>;

export const organizationLogo = '/images/brand-logo.png';
export const defaultSocialImage = {
  url: '/images/equipment-hero.png', width: 1536, height: 1024, type: 'image/png',
};
