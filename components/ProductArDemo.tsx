import { createElement } from 'react';
import Script from 'next/script';

type ProductPhoto = { src: string; alt: string };

/** Standard Augmenta widget. Only product IDs and image data belong to this site. */
export function ProductArDemo({ photos }: { photos: ProductPhoto[] }) {
  return <div id="3d-ar-demo" style={{ scrollMarginTop: 130 }}>
    <Script src="https://www.augmenta3d.com/embed.js" strategy="afterInteractive" />
    {createElement('augmenta-ar-viewer', {
      merchant: 'rent-tools-embed-demo', product: 'luma-chair-demo', gallery: '', lang: 'sr',
      'model-label': 'Demo: Luma stolica. Model ne prikazuje hoblericu.',
    }, photos.map((photo, index) => createElement('img', { key: index, src: photo.src, alt: photo.alt, width: 600, height: 390, style: { maxWidth: '100%', objectFit: 'contain' } })))}
  </div>;
}
