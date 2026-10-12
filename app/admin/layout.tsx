import type { Metadata } from 'next';
import '../globals.css';
import './admin.css';
export const metadata: Metadata = {
  title: 'Administracija | Alat Rent',
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.svg' },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html data-scroll-behavior="smooth" lang="sr-Latn">
      <body className="admin-body">{children}</body>
    </html>
  );
}
