import { publicDatabaseComponent } from '@/lib/db';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n';
import Header from '@/components/Header';
import { OrganizationSchema } from '@/components/Seo';
import { Footer } from '@/components/Store';
import { settings } from '@/lib/db';
import '../globals.css';
import { CartProvider } from '@/components/commerce/CartProvider';
import Analytics from '@/components/commerce/Analytics';
import CatalogNotice from '@/components/CatalogNotice';
import { siteIcons } from '@/lib/seo-assets';
import { googleSans } from '@/lib/fonts';
export const metadata = { icons: siteIcons };
export const dynamic = 'force-dynamic';
async function dbLayout({
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
    <html className={googleSans.variable} data-scroll-behavior="smooth" lang={locale === 'sr' ? 'sr-Latn' : locale === 'zh' ? 'zh-Hans' : locale}>
      <body>
        <OrganizationSchema settings={s} />
        <CartProvider locale={locale}><Header locale={locale} brand={s.brand} />
        <CatalogNotice locale={locale} />
        <main id="main">{children}</main>
        <Footer locale={locale} settings={s} /><Analytics /></CartProvider>
      </body>
    </html>
  );
}

export default publicDatabaseComponent(dbLayout, ['settings']);
