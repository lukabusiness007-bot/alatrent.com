import { catalogOnly } from '@/lib/storage';
import type { Locale } from '@/lib/types';

const messages: Record<Locale, string> = {
  sr: 'Pregled kataloga — online rezervacije i registracija trenutno nisu dostupne.',
  en: 'Catalog preview — online bookings and registration are currently unavailable.',
  ru: 'Просмотр каталога — онлайн-бронирование и регистрация временно недоступны.',
  tr: 'Katalog önizlemesi — çevrimiçi rezervasyon ve kayıt şu anda kullanılamıyor.',
  zh: '目录预览 — 在线预订和注册暂不可用。',
};

export default function CatalogNotice({ locale }: { locale: Locale }) {
  if (!catalogOnly) return null;
  return <aside className="catalog-notice" role="status">{messages[locale]}</aside>;
}
