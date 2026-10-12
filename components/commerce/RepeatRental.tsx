'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/types';
import type { CartItem, Quote } from '@/lib/commerce/types';
import { mt } from '@/lib/commerce/merchandising-copy';
import { ct } from '@/lib/commerce/copy';
import { money, copy } from '@/lib/i18n';
import RentalPeriod, { type RentalPeriodValue } from '../RentalPeriod';
import { periodReady } from '@/lib/commerce/period';
import { useCart } from './CartProvider';
export default function RepeatRental({
  items,
  locale,
  onClose,
}: {
  items: Pick<CartItem, 'toolId' | 'quantity'>[];
  locale: Locale;
  onClose: () => void;
}) {
  const cart = useCart();
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Belgrade',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [period, setPeriod] = useState<RentalPeriodValue>({ start: today, end: today }),
    [quote, setQuote] = useState<Quote | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [added, setAdded] = useState(false);
  const selected = items.map((i) => ({ ...i, ...period }));
  const fingerprint = JSON.stringify(selected);
  useEffect(() => {
    setQuote(null);
    setError('');
    if (!periodReady(period)) return;
    const abort = new AbortController();
    setBusy(true);
    const timer = setTimeout(() => {
      fetch('/api/commerce/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selected, delivery: 'pickup' }),
        signal: abort.signal,
      })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          setQuote(d);
        })
        .catch((e) => {
          if (!abort.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!abort.signal.aborted) setBusy(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [fingerprint]);
  return (
    <section className="commerce-card repeat-rental" aria-label={mt(locale, 'repeat')}>
      <h2>{mt(locale, 'repeat')}</h2>
      <p>{mt(locale, 'chooseDates')}</p>
      {added ? (
        <>
          <p role="status">{ct(locale, 'added')}</p>
          <Link className="button button-lime" href={`/${locale}/korpa`}>
            {ct(locale, 'cart')} →
          </Link>
        </>
      ) : (
        <>
          <RentalPeriod locale={locale} today={today} value={period} onChange={setPeriod} />
          {busy && <p role="status">{mt(locale, 'adding')}</p>}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {quote && (
            <>
              <ul>
                {quote.items.map((i, n) => (
                  <li key={n}>
                    {i.name[locale]} × {i.quantity}
                  </li>
                ))}
              </ul>
              <p>
                {ct(locale, 'rental')}:{' '}
                <strong>
                  {quote.total === null ? copy[locale].inquiryPrice : money(quote.total, locale)}
                </strong>
              </p>
              <p className="small-muted">{mt(locale, 'priceEstimate')}</p>
            </>
          )}
          <button
            type="button"
            className="button button-lime"
            disabled={busy || !quote || !!error}
            onClick={() => {
              cart.add(selected);
              setAdded(true);
            }}
          >
            {ct(locale, 'add')}
          </button>
        </>
      )}
      <button type="button" className="text-link" onClick={onClose}>
        {copy[locale].close}
      </button>
    </section>
  );
}
