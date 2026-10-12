'use client';
import { useState } from 'react';
import Link from 'next/link';
import { copy, money } from '@/lib/i18n';
import type { Locale, Settings, Tool } from '@/lib/types';
import type { PriceRule } from '@/lib/commerce/types';
import { calculate, defaultRule } from '@/lib/commerce/pricing';
import { ct } from '@/lib/commerce/copy';
import { useCart } from './commerce/CartProvider';
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
  const [start, setStart] = useState(''),
    [end, setEnd] = useState(''),
    [quantity, setQuantity] = useState(1),
    [added, setAdded] = useState(false);
  const days =
    start && end
      ? Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1)
      : 0;
  const price =
    tool.price === null || !days ? null : calculate(tool.price, start, days, quantity, rule);
  return (
    <form
      className="rental-panel"
      onSubmit={(e) => {
        e.preventDefault();
        cart.add([{ toolId: tool.id, start, end, quantity }]);
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
      {tool.price !== null && (
        <div className="rate-preview">
          {[1, 3, 5, 7].map((days) => (
            <div key={days}>
              <span>
                {days} {t.days}
              </span>
              <strong>{money(calculate(tool.price!, today, days, 1, rule).total, locale)}</strong>
            </div>
          ))}
        </div>
      )}
      <h2>{t.dates}</h2>
      <div className="form-row">
        <label>
          {t.start}
          <input
            type="date"
            min={today}
            required
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              if (end < e.target.value) setEnd(e.target.value);
              setAdded(false);
            }}
          />
        </label>
        <label>
          {t.end}
          <input
            type="date"
            min={start || today}
            required
            value={end}
            onChange={(e) => {
              setEnd(e.target.value);
              setAdded(false);
            }}
          />
        </label>
      </div>
      <label>
        {t.quantity}
        <input
          type="number"
          min={1}
          max={Math.min(tool.quantity ?? 100, 100) || 1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          required
        />
      </label>
      <p className="small-muted">{ct(locale, 'daysRule')}</p>
      <div className="rental-total">
        <span>{ct(locale, 'rental')}</span>
        <strong>{price ? money(price.total, locale) : t.inquiryPrice}</strong>
      </div>
      {!!price?.saving && (
        <p className="saving-pill">
          {ct(locale, 'saving')}: {money(price.saving, locale)}
        </p>
      )}
      <button
        className="button button-lime submit-request"
        disabled={tool.quantity === 0 || !cart.ready}
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
