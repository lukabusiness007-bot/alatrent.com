'use client';
import { useState } from 'react';
import Link from 'next/link';
import { copy, money } from '@/lib/i18n';
import type { Locale, Settings, Tool } from '@/lib/types';
import type { PriceRule } from '@/lib/commerce/types';
import { calculate, defaultRule } from '@/lib/commerce/pricing';
import { ct } from '@/lib/commerce/copy';
import { useCart } from './commerce/CartProvider';
import RentalPeriod, { type RentalPeriodValue } from './RentalPeriod';
import { durationDays, periodReady } from '@/lib/commerce/period';
import { ShoppingBag, ShieldCheck } from 'lucide-react';
export default function RentalForm({
  tool,
  locale,
  today,
  rule = defaultRule,
}: {
  tool: Tool;
  locale: Locale;
  settings: Settings;
  today: string;
  rule?: PriceRule;
}) {
  const t = copy[locale],
    cart = useCart();
  const [period, setPeriod] = useState<RentalPeriodValue>({ start: today, end: today }),
    [quantity, setQuantity] = useState(1),
    [added, setAdded] = useState(false);
  const days = durationDays(period.start, period.end);
  const price = tool.price === null || period.openEnded || !days
    ? null : calculate(tool.price, period.start, days, quantity, rule);
  return (
    <form
      className="rental-panel"
      onSubmit={(e) => {
        e.preventDefault();
        cart.add([{ toolId: tool.id, ...period, quantity }]);
        setAdded(true);
      }}
    >
      <span className="eyebrow">{t.area}</span>
      <div className="detail-price">
        {tool.price === null ? (
          t.inquiryPrice
        ) : (
          <>
            {money(tool.price, locale)}
            <small>{t.perDay}</small>
          </>
        )}
      </div>
      <RentalPeriod value={period} locale={locale} today={today} required
        onChange={next => { setPeriod(next); setAdded(false); }} />
      <label className="quantity-field">
        {t.quantity}
        <input
          type="number"
          min={1}
          max={Math.min(tool.quantity ?? 100, 100) || 1}
          value={quantity}
          onChange={(e) => { setQuantity(Number(e.target.value)); setAdded(false); }}
          required
        />
      </label>
      <div className="rental-total">
        <span>{period.openEnded ? ct(locale, 'dailyRate') : days ? `${ct(locale, 'durationTotal')} ${days} ${days === 1 ? ct(locale, 'oneDay') : t.days}` : ct(locale, 'rental')}</span>
        <strong>{period.openEnded && tool.price !== null ? `${money(tool.price * quantity, locale)} ${t.perDay}` : price ? money(price.total, locale) : t.inquiryPrice}</strong>
      </div>
      {period.openEnded && <p className="small-muted">{ct(locale, 'finalOnReturn')}</p>}
      {!!price?.saving && (
        <p className="saving-pill">
          {ct(locale, 'saving')}: {money(price.saving, locale)}
        </p>
      )}
      <button
        className="button button-lime submit-request"
        disabled={tool.quantity === 0 || !cart.ready || !periodReady(period)}
      >
        <ShoppingBag size={18} />
        {ct(locale, 'add')}
      </button>
      {added && (
        <Link className="text-link" href={`/${locale}/korpa`}>
          {ct(locale, 'cart')} →
        </Link>
      )}
      <p className="small-muted">{ct(locale, 'pending')}</p>
      <p className="no-deposit-note">
        <ShieldCheck size={18} />
        {t.depositNote}
      </p>
      <Link className="text-link" href={`/${locale}/klub`}>
        {ct(locale, 'club')} →
      </Link>
    </form>
  );
}
