'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/types';
import type { Order, PublicCustomer, Project, ReferralSummary } from '@/lib/commerce/types';
import { ct, type CommerceKey } from '@/lib/commerce/copy';
import { copy, money } from '@/lib/i18n';
import { commerce } from './CartPage';
import { useCart } from './CartProvider';
import { Star } from 'lucide-react';
import AccountAccess from './AccountAccess';
import OrderDetails from './OrderDetails';
import { ReferralCard } from './Referrals';
import { membershipText } from '@/lib/commerce/membership-copy';
export default function Account({
  locale,
  reviewUrl,
  claimToken,
  initialMode = 'login',
}: {
  locale: Locale;
  reviewUrl: string;
  claimToken?: string;
  initialMode?: 'login' | 'register';
}) {
  const t = copy[locale],
    cart = useCart();
  const [referrals, setReferrals] = useState<ReferralSummary | null>(null);
  const [customer, setCustomer] = useState<PublicCustomer | null>(null),
    [orders, setOrders] = useState<Order[]>([]),
    [projects, setProjects] = useState<Project[]>([]),
    [mode, setMode] = useState<string>(initialMode),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [recovery, setRecovery] = useState(''),
    [selected, setSelected] = useState<Order | null>(null);
  async function load() {
    const r = await fetch('/api/commerce/me');
    if (!r.ok) throw new Error(ct(locale, 'error'));
    const d = await r.json();
    setCustomer(d.customer);
    setReferrals(d.referrals || null);
    setOrders(d.orders || []);
    setProjects(d.projects || []);
    setLoading(false);
  }
  useEffect(() => {
    load().catch(() => {
      setError(ct(locale, 'error'));
      setLoading(false);
    });
  }, []);
  async function auth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const values = Object.fromEntries(new FormData(e.currentTarget));
      const result = await commerce(mode, {
        ...values,
        consent: values.consent === 'on',
        marketing: values.marketing === 'on',
      });
      setRecovery(result.recovery || '');
      if (claimToken) await commerce('claim', { token: claimToken });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : ct(locale, 'error'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="container commerce-page">
      <div className="account-heading">
        <div>
          <span className="eyebrow">{ct(locale, 'club')}</span>
          <h1>{ct(locale, 'account')}</h1>
          <p>{ct(locale, 'clubBody')}</p>
        </div>
        <Star size={80} strokeWidth={1} />
      </div>
      {error && (customer || loading) && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      {recovery && (
        <div className="recovery-box">
          <strong>{ct(locale, 'recoveryNote')}</strong>
          <code>{recovery}</code>
          <button
            className="button button-plain"
            onClick={() =>
              navigator.clipboard
                .writeText(recovery)
                .then(() => setNotice(ct(locale, 'saved')))
                .catch(() => setError(ct(locale, 'error')))
            }
          >
            Copy
          </button>
        </div>
      )}
      {loading ? (
        <p>{ct(locale, 'loading')}</p>
      ) : !customer ? (
        <AccountAccess error={error} locale={locale} mode={mode} setMode={m => { setMode(m); setError(''); }} busy={busy} onSubmit={auth} />
      ) : (
        <>
          {claimToken && (
            <button
              className="button button-lime"
              onClick={async () => {
                try {
                  await commerce('claim', { token: claimToken });
                  setNotice(ct(locale, 'saved'));
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : ct(locale, 'error'));
                }
              }}
            >
              {locale === 'sr' ? 'Poveži ovaj najam sa nalogom' : 'Link this rental to my account'}
            </button>
          )}
          <div className="member-bar">
            <div>
              <strong>{customer.name}</strong>
              <span>
                {ct(locale, customer.tier as CommerceKey)} · {customer.discount}%
              </span>
            </div>
            <div>
              <strong>{money(customer.credit, locale)}</strong>
              <span>{ct(locale, 'balance')}</span>
            </div>
            <button
              className="button button-plain"
              onClick={async () => {
                try {
                  await commerce('logout', {});
                  setRecovery('');
                  setSelected(null);
                  await load();
                } catch {
                  setError(ct(locale, 'error'));
                }
              }}
            >
              {ct(locale, 'logout')}
            </button>
          </div>
          <div className="membership-progress">
            <strong>{membershipText(locale, 'discountBenefit', { percent: customer.discount })}</strong>
            <p>{membershipText(locale, customer.depositWaived ? 'depositWaived' : 'progress', { completed: customer.completed, threshold: customer.depositThreshold })}</p>
          </div>
          {referrals && <ReferralCard code={customer.referralCode} summary={referrals} locale={locale} />}
          <div className="account-grid">
            <div>
              <h2>{ct(locale, 'history')}</h2>
              {!orders.length && <p>{ct(locale, 'noOrders')}</p>}
              {orders
                .slice()
                .reverse()
                .map((o) => (
                  <article className="commerce-card order-preview" key={o.id}>
                    <div>
                      <strong>{o.id}</strong>
                      <span className="saving-pill">
                        {ct(locale, ('status_' + o.status) as CommerceKey)}
                      </span>
                    </div>
                    <p>{o.items.map((i) => i.name[locale]).join(' · ')}</p>
                    <p>
                      {o.items[0]?.start} ·{' '}
                      {o.total === null ? t.inquiryPrice : money(o.total, locale)}
                    </p>
                    <div className="button-row">
                      <button className="button button-plain" onClick={() => setSelected(o)}>
                        {ct(locale, 'track')}
                      </button>
                      <button
                        className="button button-plain"
                        onClick={() => {
                          cart.add(
                            o.items.map((i) => ({
                              toolId: i.toolId,
                              quantity: i.quantity,
                              start: '',
                              end: '',
                            })),
                          );
                          setNotice(ct(locale, 'future'));
                        }}
                      >
                        {ct(locale, 'again')}
                      </button>
                    </div>
                  </article>
                ))}
              <h2>{ct(locale, 'projects')}</h2>
              {projects.map((p) => (
                <article className="commerce-card" key={p.id}>
                  <h3>{p.name}</h3>
                  <div className="button-row">
                    <button
                      className="button button-plain"
                      onClick={() => {
                        cart.add(p.items.map((i) => ({ ...i, start: '', end: '' })));
                        setNotice(ct(locale, 'future'));
                      }}
                    >
                      {ct(locale, 'add')}
                    </button>
                    <button
                      className="text-link"
                      onClick={async () => {
                        try {
                          await commerce('project', { id: p.id, remove: true });
                          await load();
                        } catch {
                          setError(ct(locale, 'error'));
                        }
                      }}
                    >
                      {ct(locale, 'remove')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <form
              className="commerce-card commerce-form profile-card"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError('');
                const b = Object.fromEntries(new FormData(e.currentTarget));
                try {
                  await commerce('profile', { ...b, marketing: b.marketing === 'on' });
                  setNotice(ct(locale, 'saved'));
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : ct(locale, 'error'));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>{ct(locale, 'profile')}</h2>
              <label>
                {t.name}
                <input name="name" defaultValue={customer.name} required maxLength={120} />
              </label>
              <label>
                {t.address}
                <textarea name="address" defaultValue={customer.address} maxLength={300} />
              </label>
              <label>
                {membershipText(locale, 'email')}
                <input name="email" type="email" defaultValue={customer.email || ''} required maxLength={150} autoComplete="email" />
              </label>
              <label>
                {ct(locale, 'company')}
                <input name="company" defaultValue={customer.company} maxLength={200} />
              </label>
              <label className="commerce-check">
                <input type="checkbox" name="marketing" defaultChecked={customer.marketing} />
                {ct(locale, 'marketing')}
              </label>
              <button className="button button-lime" disabled={busy}>
                {ct(locale, 'save')}
              </button>
            </form>
          </div>
          {selected && (
            <div className="order-expanded">
              <button className="button button-plain" onClick={() => setSelected(null)}>
                {t.close}
              </button>
              <OrderDetails initial={selected} locale={locale} reviewUrl={reviewUrl} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
