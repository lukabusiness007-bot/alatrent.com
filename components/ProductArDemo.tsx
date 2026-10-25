import QRCode from 'qrcode';
import { ProductMediaGallery, type ProductPhoto } from './ProductMediaGallery';

const viewer = 'https://www.augmenta3d.com/embed/rent-tools-embed-demo/luma-chair-demo';
const threeDUrl = `${viewer}?ar=0&cta=hide&lang=sr`;
const arUrl = `${viewer}?ar=1&cta=hide&lang=sr`;

/** The demo is attached only to the owner-selected product's photo gallery. */
export async function ProductArDemo({ photos }: { photos: ProductPhoto[] }) {
  const qr = await QRCode.toDataURL(arUrl, { width: 320, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1c211b', light: '#ffffff' } });
  return <ProductMediaGallery photos={photos} model={{ src: threeDUrl, arUrl, qr, name: 'Luma stolica' }} />;
}
