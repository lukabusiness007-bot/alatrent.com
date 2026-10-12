'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/types';
import type { CartItem } from '@/lib/commerce/types';
import type { Recommendation } from '@/lib/commerce/merchandising-types';
import { periodReady } from '@/lib/commerce/period';
import { mt } from '@/lib/commerce/merchandising-copy';
import { copy, money } from '@/lib/i18n';
import { ct } from '@/lib/commerce/copy';
import { analyticsIdentity, track } from '@/lib/commerce/analytics-browser';
import ToolArt from '../ToolArt';
export default function Recommendations({
  locale,
  items,
  onChoose,
  sourceIndex,
  delivery = 'pickup',
  useCredit = false,
  teamId = '',
  referralCode = '',
  enabled = true,
  surface = 'cart',
}: {
  locale: Locale;
  items: CartItem[];
  onChoose: (items: CartItem[]) => void;
  sourceIndex?: number;
  delivery?: string;
  useCredit?: boolean;
  teamId?: string;
  referralCode?: string;
  enabled?: boolean;
  surface?: 'cart' | 'tool';
}) {
  const [offers, setOffers] = useState<Recommendation[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const panel = useRef<HTMLElement>(null);
  const [analyticsVersion, setAnalyticsVersion] = useState(0);
  useEffect(() => {
    const changed = () => setAnalyticsVersion((v) => v + 1);
    window.addEventListener('rent-tools-analytics', changed);
    return () => window.removeEventListener('rent-tools-analytics', changed);
  }, []);
  const shown = useRef(new Set<string>());
  const fingerprint = JSON.stringify({
    items,
    sourceIndex,
    delivery,
    useCredit,
    teamId,
    referralCode,
  });
  const latest = useRef(fingerprint);
  latest.current = fingerprint;
  useEffect(() => {
    setOffers([]);
    setError('');
    if (!enabled || !items.length || items.some((i) => !periodReady(i))) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      fetch('/api/commerce/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: fingerprint,
        signal: abort.signal,
      })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          if (!abort.signal.aborted) setOffers(d.offers || []);
        })
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [fingerprint, enabled]);
  useEffect(() => {
    if (!panel.current || !offers.length || !analyticsIdentity().analyticsConsent) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const offer = offers.find(
            (o) => o.toolId === (entry.target as HTMLElement).dataset.offerId,
          );
          if (!offer) continue;
          const source = items[offer.sourceIndex];
          if (!source) continue;
          const key = `${source.toolId}:${offer.toolId}:${offer.kind}`;
          const session = analyticsIdentity().analyticsSession;
          if (!session) continue;
          const seenKey = `${session}:${key}`;
          if (!shown.current.has(seenKey)) {
            shown.current.add(seenKey);
            track('offer_view', surface, offer.toolId, key);
          }
        }
      },
      { threshold: 0.1 },
    );
    panel.current.querySelectorAll('[data-offer-id]').forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [offers, surface, items, analyticsVersion]);
  async function choose(offer: Recommendation) {
    const version = fingerprint;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/commerce/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...JSON.parse(fingerprint), nextItems: offer.items }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (latest.current !== version) return;
      onChoose(offer.items);
      const source = items[offer.sourceIndex];
      track(
        'offer_accept',
        surface,
        offer.toolId,
        `${source.toolId}:${offer.toolId}:${offer.kind}`,
      );
      if (offer.kind === 'complement') track('cart_add', surface, offer.toolId);
    } catch (e) {
      setError(e instanceof Error ? e.message : ct(locale, 'error'));
    } finally {
      setBusy(false);
    }
  }
  if (!enabled || !offers.length) return null;
  return (
    <section ref={panel} className="commerce-card recommendation-panel">
      <h2>{mt(locale, 'offers')}</h2>
      <div className="recommendation-grid">
        {offers.map((o) => (
          <article className="recommendation-card" key={o.toolId} data-offer-id={o.toolId}>
            <span className="eyebrow">{mt(locale, o.kind)}</span>
            <Link href={`/${locale}/alat/${o.tool.slug}`}>
              <ToolArt image={o.tool.image} name={o.tool.name[locale]} />
              <h3>{o.tool.name[locale]}</h3>
            </Link>
            <p>
              {o.reason[locale] ||
                mt(locale, o.kind === 'complement' ? 'relatedReason' : 'alternativeReason')}
            </p>
            <small>{mt(locale, o.availability)}</small>
            <div className="offer-price">
              <span>{mt(locale, 'cartTotal')}</span>
              <strong>
                {o.quote.total === null ? mt(locale, 'confirmation') : money(o.quote.total, locale)}
              </strong>
              {o.delta !== null && (
                <span>
                  {mt(locale, o.delta < 0 ? 'less' : 'extra')}: {money(Math.abs(o.delta), locale)}
                </span>
              )}
            </div>
            <button
              type="button"
              className="button button-plain"
              disabled={busy}
              onClick={() => choose(o)}
            >
              {busy
                ? mt(locale, 'adding')
                : o.kind === 'complement'
                  ? ct(locale, 'add')
                  : mt(locale, 'replace')}
            </button>
          </article>
        ))}
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <small>{copy[locale].priceDisclaimer}</small>
    </section>
  );
}
