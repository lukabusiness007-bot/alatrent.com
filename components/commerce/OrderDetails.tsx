'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Order } from '@/lib/commerce/types';
import type { Locale } from '@/lib/types';
import { ct, type CommerceKey } from '@/lib/commerce/copy';
import { copy, money } from '@/lib/i18n';
import { commerce } from './CartPage';
export default function OrderDetails({
  initial,
  locale,
  token,
  reviewUrl,
}: {
  initial: Omit<Order, 'accessToken' | 'accessHash' | 'idempotency'>;
  locale: Locale;
  token?: string;
  reviewUrl: string;
}) {
  const [order, setOrder] = useState(initial),
    [end, setEnd] = useState(''),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const t = copy[locale];
  async function extend(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await commerce('extend', { id: order.id, token, end });
      setOrder({ ...order, extension: { end, extra: r.extra, status: 'pending' } });
      setNotice(
        ct(locale, 'extension') +
          ' ' +
          (r.extra === null ? t.inquiryPrice : money(r.extra, locale)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : ct(locale, 'error'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="order-details">
      <div className="commerce-heading">
        <span className="eyebrow">{order.id}</span>
        <h1>{ct(locale, 'track')}</h1>
        <span className="saving-pill">{ct(locale, ('status_' + order.status) as CommerceKey)}</span>
      </div>
      <div className="commerce-card">
        <p>
          {order.name} · {order.phone}
        </p>
        <p>{order.delivery === 'pickup' ? t.pickup : order.address}</p>
        <p>
          {ct(locale, 'total')}:{' '}
          <strong>{order.total === null ? t.inquiryPrice : money(order.total, locale)}</strong>
        </p>
        {order.status === 'pending' && <p>{ct(locale, 'pending')}</p>}
      </div>
      <h2>{ct(locale, 'instructions')}</h2>
      {order.items.map((i, index) => (
        <article className="commerce-card" key={index}>
          <h3>{i.name[locale]}</h3>
          <p>
            {i.quantity} × · {i.start} — {i.end} · {ct(locale, 'returnBy')} {order.returnTime}
          </p>
          <strong>{i.instructions.model}</strong>
          <p className="instruction-text">
            {i.instructions.instructions || ct(locale, 'noInstructions')}
          </p>
          <div className="button-row">
            {i.instructions.manualUrl && (
              <a
                className="text-link"
                href={i.instructions.manualUrl}
                target="_blank"
                rel="noreferrer"
              >
                {ct(locale, 'manual')} ↗
              </a>
            )}
            {i.instructions.videoUrl && (
              <a
                className="text-link"
                href={i.instructions.videoUrl}
                target="_blank"
                rel="noreferrer"
              >
                {ct(locale, 'video')} ↗
              </a>
            )}
          </div>
        </article>
      ))}
      {['confirmed', 'active'].includes(order.status) && (
        <form className="commerce-card commerce-form" onSubmit={extend}>
          <h2>{ct(locale, 'extend')}</h2>
          <label>
            {t.end}
            <input
              type="date"
              min={order.items
                .map((i) => i.end)
                .sort()
                .at(-1)}
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <button className="button button-lime" disabled={busy}>
            {ct(locale, 'extend')}
          </button>
          {order.extension && (
            <p>
              {order.extension.end} · {order.extension.status} ·{' '}
              {order.extension.extra === null
                ? t.inquiryPrice
                : money(order.extension.extra, locale)}
            </p>
          )}
        </form>
      )}
      {order.status === 'completed' && reviewUrl && (
        <a className="button button-lime" href={reviewUrl} target="_blank" rel="noreferrer">
          {ct(locale, 'review')}
        </a>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="button-row">
        <Link
          className="button button-plain"
          href={`/${locale}/nalog${token && !order.customerId ? `?claim=${token}` : ''}`}
        >
          {ct(locale, 'account')}
        </Link>
        {order.whatsapp && (
          <button
            className="text-link"
            onClick={async () => {
              try {
                await commerce('stop', { id: order.id, token });
                setOrder({ ...order, whatsapp: false });
                setNotice(ct(locale, 'saved'));
              } catch {
                setError(ct(locale, 'error'));
              }
            }}
          >
            {ct(locale, 'stop')}
          </button>
        )}
      </div>
    </div>
  );
}
