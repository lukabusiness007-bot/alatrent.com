'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useCart, QuickAdd } from './CartProvider';
import { ct } from '@/lib/commerce/copy';
import { copy, money } from '@/lib/i18n';
import type { Locale, PublicData } from '@/lib/types';
import type { Quote, PublicCustomer, CartItem, Team, ReferralProgram } from '@/lib/commerce/types';
import ToolArt from '../ToolArt';
import { savedReferral, storeReferral } from '@/lib/commerce/referral-browser';
import { ReferralTerms } from './Referrals';
import { rt } from '@/lib/commerce/referral-copy';
import { ShoppingBag, Trash2, ArrowRight, Bookmark } from 'lucide-react';
export async function commerce(action: string, body: unknown) {
  const r = await fetch('/api/commerce/' + action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await r.json();
  if (!r.ok) throw new Error(result.error || 'Request failed.');
  return result;
}
export default function CartPage({
  locale,
  data,
  today,
  creditLimit,
  recommendations,
  referralProgram,
}: {
  locale: Locale;
  data: PublicData;
  today: string;
  creditLimit: number;
  recommendations: Record<string, string[]>;
  referralProgram: ReferralProgram;
}) {
  const { items, setItems, ready } = useCart(),
    t = copy[locale];
  const [referralCode,setReferralCode] = useState('');
  useEffect(()=>setReferralCode(savedReferral()),[]);
  const [quote, setQuote] = useState<Quote | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [customer, setCustomer] = useState<PublicCustomer | null>(null),
    [delivery, setDelivery] = useState('pickup'),
    [useCredit, setUseCredit] = useState(false),
    [start, setStart] = useState(''),
    [end, setEnd] = useState(''),
    [result, setResult] = useState<{ id: string; token: string } | null>(null),
    [notice, setNotice] = useState(''),
    [project, setProject] = useState('');
  const [contact, setContact] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    company: '',
    note: '',
    whatsapp: false,
    marketing: false,
    consent: false,
  });
  const [teams, setTeams] = useState<Pick<Team, 'id' | 'name' | 'discount'>[]>([]),
    [teamId, setTeamId] = useState('');
  const key = useRef('');
  const liveItems = useRef(items);
  liveItems.current = items;
  const suggested = [...new Set(items.flatMap((i) => recommendations[i.toolId] || []))]
    .filter((id) => !items.some((i) => i.toolId === id))
    .map((id) => data.tools.find((t) => t.id === id))
    .filter((t) => !!t)
    .slice(0, 3);
  const fingerprint = JSON.stringify({ items, delivery, useCredit, teamId, referralCode });
  const [quotedFingerprint, setQuotedFingerprint] = useState('');
  useEffect(() => {
    if (!ready) return;
    fetch('/api/commerce/me')
      .then((r) => r.json())
      .then((d) => {
        setCustomer(d.customer);
        setTeams(d.teams || []);
        if (d.draft?.items?.length && !liveItems.current.length) setItems(d.draft.items);
        if (d.customer)
          setContact((c) => ({
            ...c,
            name: d.customer.name,
            phone: d.customer.phone,
            address: d.customer.address,
            company: d.customer.company,
            marketing: d.customer.marketing,
          }));
      })
      .catch(() => {});
  }, [ready]);
  useEffect(() => {
    key.current = crypto.randomUUID();
    setQuote(null);
    setError('');
    if (!ready || !items.length) {
      setLoading(false);
      return;
    }
    if (items.some((i) => !i.start || !i.end)) {
      setLoading(false);
      return;
    }
    const abort = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const r = await fetch('/api/commerce/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, delivery, useCredit, teamId, referralCode }),
          signal: abort.signal,
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setQuote(d);
        setQuotedFingerprint(fingerprint);
      } catch (e) {
        if (!abort.signal.aborted) setError(e instanceof Error ? e.message : ct(locale, 'error'));
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [fingerprint, ready, customer, locale]);
  useEffect(() => {
    if (!customer || !items.length || items.some((i) => !i.start || !i.end)) return;
    const timer = setTimeout(() => {
      commerce('draft', { items }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [items, customer]);
  function update(index: number, patch: Partial<CartItem>) {
    setItems(items.map((i, n) => (n === index ? { ...i, ...patch } : i)));
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await commerce('order', {
        ...contact,
        items,
        delivery,
        useCredit,
        teamId,
        locale,
        referralCode,
        idempotency: key.current,
      });
      setResult(r);
      storeReferral('');
      setItems(
        liveItems.current.flatMap((current) => {
          const submitted = items.find(
            (i) =>
              i.toolId === current.toolId && i.start === current.start && i.end === current.end,
          );
          const quantity = current.quantity - (submitted?.quantity || 0);
          return quantity > 0 ? [{ ...current, quantity }] : [];
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : ct(locale, 'error'));
    } finally {
      setBusy(false);
    }
  }
  async function saveProject() {
    setError('');
    try {
      await commerce('project', { name: project, items });
      setNotice(ct(locale, 'saved'));
      setProject('');
    } catch (e) {
      setError(e instanceof Error ? e.message : ct(locale, 'error'));
    }
  }
  if (result)
    return (
      <section className="container commerce-page">
        <div className="commerce-success">
          <span className="eyebrow">{result.id}</span>
          <h1>{ct(locale, 'sent')}</h1>
          <p>{ct(locale, 'pending')}</p>
          <Link className="button button-lime" href={`/${locale}/najam/${result.token}`}>
            {ct(locale, 'track')}
            <ArrowRight size={18} />
          </Link>
          <p>
            <Link href={customer ? `/${locale}/nalog` : `/${locale}/nalog?claim=${result.token}`}>
              {ct(locale, customer ? 'account' : 'register')} · {ct(locale, 'club')}
            </Link>
          </p>
        </div>
      </section>
    );
  return (
    <section className="container commerce-page">
      <div className="commerce-heading">
        <span className="eyebrow">{ct(locale, 'rental')}</span>
        <h1>
          {ct(locale, 'cart')}
          <span className="count-chip">{items.length}</span>
        </h1>
        <p>{ct(locale, 'pending')}</p>
      </div>
      {!items.length ? (
        <div className="commerce-empty">
          <ShoppingBag size={42} />
          <h2>{ct(locale, 'empty')}</h2>
          <Link className="button button-lime" href={`/${locale}/katalog`}>
            {ct(locale, 'keep')}
          </Link>
        </div>
      ) : (
        <div className="checkout-grid">
          <div>
            <div className="commerce-card date-batch">
              <h3>{ct(locale, 'dates')}</h3>
              <div className="form-row">
                <label>
                  {t.start}
                  <input
                    aria-label={t.start}
                    type="date"
                    min={today}
                    value={start}
                    onChange={(e) => {
                      setStart(e.target.value);
                      if (end < e.target.value) setEnd(e.target.value);
                    }}
                  />
                </label>
                <label>
                  {t.end}
                  <input
                    aria-label={t.end}
                    type="date"
                    min={start || today}
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
                <button
                  className="button button-plain"
                  type="button"
                  disabled={!start || !end || end < start}
                  onClick={() => setItems(items.map((i) => ({ ...i, start, end })))}
                >
                  {ct(locale, 'apply')}
                </button>
              </div>
              <p className="small-muted">{ct(locale, 'daysRule')}</p>
              {items.some((i) => !i.start || !i.end) && (
                <p className="saving-pill">{t.chooseDates}</p>
              )}
            </div>
            <div className="cart-items">
              {items.map((item, index) => {
                const tool = data.tools.find((t) => t.id === item.toolId);
                const line = quote?.items.find(
                  (l) => l.toolId === item.toolId && l.start === item.start && l.end === item.end,
                );
                return (
                  <article className="commerce-card cart-item" key={index}>
                    <div className="cart-item-top">
                      <div className="cart-art">
                        <ToolArt
                          image={tool?.image || ''}
                          name={tool?.name[locale] || item.toolId}
                        />
                      </div>
                      <div>
                        <h3>
                          {tool ? (
                            <Link href={`/${locale}/alat/${tool.slug}`}>{tool.name[locale]}</Link>
                          ) : (
                            item.toolId
                          )}
                        </h3>
                        <strong>
                          {line?.total != null ? money(line.total, locale) : t.inquiryPrice}
                        </strong>
                        {!!line?.saving && (
                          <small className="saving-pill">
                            {ct(locale, 'saving')} {money(line.saving, locale)}
                          </small>
                        )}
                      </div>
                      <button
                        className="icon-button"
                        aria-label={ct(locale, 'remove')}
                        onClick={() => setItems(items.filter((_, n) => n !== index))}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="cart-item-fields">
                      <label>
                        {t.start}
                        <input
                          type="date"
                          min={today}
                          value={item.start}
                          onChange={(e) =>
                            update(index, {
                              start: e.target.value,
                              ...(item.end < e.target.value ? { end: e.target.value } : {}),
                            })
                          }
                        />
                      </label>
                      <label>
                        {t.end}
                        <input
                          type="date"
                          min={item.start || today}
                          value={item.end}
                          onChange={(e) => update(index, { end: e.target.value })}
                        />
                      </label>
                      <label>
                        {t.quantity}
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={item.quantity}
                          onChange={(e) => update(index, { quantity: Number(e.target.value) })}
                        />
                      </label>
                    </div>
                    {customer && (
                      <button
                        className="text-link"
                        onClick={async () => {
                          if (!contact.whatsapp) {
                            setError(ct(locale, 'watchNote'));
                            return;
                          }
                          try {
                            await commerce('watch', { item, consent: true });
                            setNotice(ct(locale, 'saved'));
                          } catch (e) {
                            setError(e instanceof Error ? e.message : ct(locale, 'error'));
                          }
                        }}
                      >
                        {ct(locale, 'watch')}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
            <Link className="text-link" href={`/${locale}/katalog`}>
              ← {ct(locale, 'keep')}
            </Link>
            {suggested.length > 0 && (
              <div className="commerce-card">
                <h3>{ct(locale, 'more')}</h3>
                <div className="cart-suggestions">
                  {suggested.map((tool) => (
                    <article key={tool.id}>
                      <Link href={`/${locale}/alat/${tool.slug}`}>{tool.name[locale]}</Link>
                      <small>
                        {tool.price === null
                          ? t.inquiryPrice
                          : `${money(tool.price, locale)} ${t.perDay}`}
                      </small>
                      <QuickAdd toolId={tool.id} locale={locale} />
                    </article>
                  ))}
                </div>
              </div>
            )}
            {customer && (
              <div className="commerce-card">
                <h3>
                  <Bookmark size={18} /> {ct(locale, 'saveProject')}
                </h3>
                <label>
                  {ct(locale, 'projectName')}
                  <input
                    value={project}
                    maxLength={100}
                    onChange={(e) => setProject(e.target.value)}
                  />
                </label>
                <button
                  className="button button-plain"
                  disabled={!project.trim()}
                  onClick={saveProject}
                >
                  {ct(locale, 'save')}
                </button>
              </div>
            )}
          </div>
          <form
            className="commerce-card checkout-summary"
            onSubmit={submit}
            onChange={() => {
              key.current = crypto.randomUUID();
            }}
          >
            <h2>{ct(locale, 'total')}</h2>
            {teams.length > 0 && (
              <label>
                {ct(locale, 'teamOrder')}
                <select
                  value={teamId}
                  onChange={(e) => {
                    setTeamId(e.target.value);
                    setUseCredit(false);
                  }}
                >
                  <option value="">{ct(locale, 'personal')}</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.discount}%
                    </option>
                  ))}
                </select>
              </label>
            )}
            <fieldset className="checkout-delivery">
              <legend>{t.deliveryCost}</legend>
              {(['pickup', 'standard', 'express'] as const).map((d) => (
                <label key={d}>
                  <input
                    type="radio"
                    name="delivery"
                    checked={delivery === d}
                    onChange={() => setDelivery(d)}
                  />
                  <span>{t[d]}</span>
                  <strong>
                    {money(
                      d === 'pickup'
                        ? 0
                        : d === 'standard'
                          ? data.settings.standardDelivery
                          : data.settings.expressDelivery,
                      locale,
                    )}
                  </strong>
                </label>
              ))}
            </fieldset>
            {(referralProgram.enabled || referralCode) && <div className="referral-checkout">
              <label>{rt(locale,'code')}<input maxLength={20} autoCapitalize="characters" value={referralCode} onChange={e=>{setReferralCode(e.target.value.toUpperCase());storeReferral(e.target.value);}} /></label>
              {referralCode && <button type="button" className="button button-plain" onClick={()=>{setReferralCode('');storeReferral('');}}>{rt(locale,'remove')}</button>}
              {!customer && <Link href={`/${locale}/nalog?mode=register`}>{rt(locale,'signIn')}</Link>}
              <ReferralTerms policy={referralProgram} locale={locale}/>
              {quote?.referral && <p className="saving-text" role="status">{quote.referral.discount>0 ? `${rt(locale,'applied')}: ${money(quote.referral.discount,locale)}` : rt(locale,'better')}</p>}
            </div>}
            {loading && <p role="status">{ct(locale, 'loading')}</p>}
            {quote && (
              <div className="quote-lines">
                <p>
                  <span>{ct(locale, 'base')}</span>
                  <b>
                    {quote.baseTotal === null ? t.inquiryPrice : money(quote.baseTotal, locale)}
                  </b>
                </p>
                {quote.saving > 0 && (
                  <p className="saving-text">
                    <span>{ct(locale, 'saving')}</span>
                    <b>−{money(quote.saving, locale)}</b>
                  </p>
                )}
                <p>
                  <span>{ct(locale, 'rental')}</span>
                  <b>
                    {quote.rentalTotal === null ? t.inquiryPrice : money(quote.rentalTotal, locale)}
                  </b>
                </p>
                <p>
                  <span>{t.deliveryCost}</span>
                  <b>{money(quote.deliveryTotal, locale)}</b>
                </p>
                {quote.credit > 0 && (
                  <p>
                    <span>{ct(locale, 'balance')}</span>
                    <b>−{money(quote.credit, locale)}</b>
                  </p>
                )}
                <p className="quote-total">
                  <span>{ct(locale, 'total')}</span>
                  <b>{quote.total === null ? t.inquiryPrice : money(quote.total, locale)}</b>
                </p>
              </div>
            )}
            {!!customer?.credit && !teamId && (
              <label className="commerce-check">
                <input
                  type="checkbox"
                  checked={useCredit}
                  onChange={(e) => setUseCredit(e.target.checked)}
                />
                {ct(locale, 'credit')} ({money(customer.credit, locale)})
              </label>
            )}{' '}
            {!!customer?.credit && !teamId && (
              <p className="small-muted">
                {ct(locale, 'maxCredit')} {creditLimit}%.
              </p>
            )}
            <p className="small-muted">{ct(locale, 'clubRule')}</p>
            <div className="contact-fields">
              <label>
                {t.name}
                <input
                  required
                  value={contact.name}
                  maxLength={120}
                  autoComplete="name"
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                />
              </label>
              <label>
                {t.phone}
                <input
                  type="tel"
                  required
                  value={contact.phone}
                  placeholder="+381 60 123 4567"
                  autoComplete="tel"
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                />
              </label>
              <label>
                {t.email}
                <input
                  type="email"
                  value={contact.email}
                  maxLength={150}
                  autoComplete="email"
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                />
              </label>
              {delivery !== 'pickup' && (
                <label>
                  {t.address}
                  <input
                    required
                    minLength={5}
                    maxLength={300}
                    autoComplete="street-address"
                    value={contact.address}
                    onChange={(e) => setContact({ ...contact, address: e.target.value })}
                  />
                </label>
              )}
              <label>
                {ct(locale, 'company')}
                <input
                  value={contact.company}
                  maxLength={200}
                  onChange={(e) => setContact({ ...contact, company: e.target.value })}
                />
              </label>
              <label>
                {t.note}
                <textarea
                  value={contact.note}
                  maxLength={1500}
                  onChange={(e) => setContact({ ...contact, note: e.target.value })}
                />
              </label>
              <label className="commerce-check">
                <input
                  type="checkbox"
                  checked={contact.whatsapp}
                  onChange={(e) => setContact({ ...contact, whatsapp: e.target.checked })}
                />
                {ct(locale, 'wa')}
              </label>
              <label className="commerce-check">
                <input
                  type="checkbox"
                  checked={contact.marketing}
                  onChange={(e) => setContact({ ...contact, marketing: e.target.checked })}
                />
                {ct(locale, 'marketing')}
              </label>
              <label className="commerce-check">
                <input
                  type="checkbox"
                  required
                  checked={contact.consent}
                  onChange={(e) => setContact({ ...contact, consent: e.target.checked })}
                />
                <span>
                  {t.consent}{' '}
                  <Link href={`/${locale}/privatnost`} target="_blank">
                    {t.privacy}
                  </Link>
                </span>
              </label>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {notice && <p role="status">{notice}</p>}
            <button
              className="button button-lime"
              disabled={busy || loading || !quote || quotedFingerprint !== fingerprint}
            >
              {busy ? t.sending : ct(locale, 'submit')}
              <ArrowRight size={18} />
            </button>
            <p className="small-muted">{ct(locale, 'guest')}</p>
          </form>
        </div>
      )}
    </section>
  );
}
