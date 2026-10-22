import type { Locale } from './types';

const messages: Record<Locale, string> = {
  sr: 'Cene alata su prikazane u evrima (EUR). Naplata se vrši u dinarima (RSD). Dinarski iznos prikazan je u obračunu i korpi.',
  en: 'Tool prices are displayed in euros (EUR). Payment is collected in Serbian dinars (RSD). The dinar amount is shown in the estimate and cart.',
  ru: 'Цены на инструменты указаны в евро (EUR). Оплата производится в сербских динарах (RSD). Сумма в динарах указана в расчёте и корзине.',
  tr: 'Alet fiyatları avro (EUR) olarak gösterilir. Ödeme Sırp dinarı (RSD) olarak alınır. Dinar tutarı hesaplamada ve sepette gösterilir.',
  zh: '工具价格以欧元（EUR）显示。付款以塞尔维亚第纳尔（RSD）结算。估算和购物车中显示第纳尔金额。',
};

export const paymentText = (locale: Locale) => messages[locale];
