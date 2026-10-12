import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n';
import Header from '@/components/Header';
import { OrganizationSchema } from '@/components/Seo';
import { Footer } from '@/components/Store';
import { settings } from '@/lib/db';
import '../globals.css';
import { CartProvider } from '@/components/commerce/CartProvider';
export const dynamic = 'force-dynamic';
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const s = settings();
  return (
    <html data-scroll-behavior="smooth" lang={locale === 'sr' ? 'sr-Latn' : locale === 'zh' ? 'zh-Hans' : locale}>
      <body>
        <OrganizationSchema settings={s} />
        <CartProvider locale={locale}><Header locale={locale} brand={s.brand} />
        <main id="main">{children}</main>
        <Footer locale={locale} settings={s} /></CartProvider>
      </body>
    </html>
  );
}
