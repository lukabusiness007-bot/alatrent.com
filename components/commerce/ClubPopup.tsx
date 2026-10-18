'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BadgePercent, ShieldCheck, Sparkles, X } from 'lucide-react';
import { copy } from '@/lib/i18n';
import type { Locale } from '@/lib/types';
import { ct } from '@/lib/commerce/copy';
import { membershipText } from '@/lib/commerce/membership-copy';
import AccountAccess from './AccountAccess';
import { commerce } from '@/lib/commerce/api-browser';

const dismissalKey = 'alat-rent-club-popup-v1';

export default function ClubPopup({ locale, percent, threshold }: { locale: Locale; percent: number; threshold: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState('register');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const [recovery, setRecovery] = useState('');
  const w = (key: Parameters<typeof membershipText>[1]) => membershipText(locale, key, { percent, threshold });

  useEffect(() => {
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(dismissalKey) === 'dismissed'; } catch {}
    if (dismissed) return;
    const timer = setTimeout(() => dialog.current?.showModal(), 1200);
    return () => { clearTimeout(timer); dialog.current?.close(); };
  }, []);

  function rememberDismissal() {
    try { sessionStorage.setItem(dismissalKey, 'dismissed'); } catch {}
  }
  function close() { rememberDismissal(); dialog.current?.close(); }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    const values = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    try {
      const result = await commerce(mode, { ...values, consent: values.consent === 'on', marketing: values.marketing === 'on' });
      setRecovery(result.recovery || '');
      if (mode === 'recover') { setMode('login'); return; }
      setJoined(true);
      rememberDismissal();
    } catch (e) { setError(e instanceof Error ? e.message : ct(locale, 'error')); }
    finally { setBusy(false); }
  }

  return <dialog ref={dialog} className="club-popup" aria-labelledby="club-popup-title" onClose={rememberDismissal}>
    <button type="button" className="club-popup-close" onClick={close} aria-label={copy[locale].close}><X size={23} /></button>
    {joined ? <div className="club-popup-success" role="status">
      <Sparkles size={36} />
      <h2 id="club-popup-title">{w('registered')}</h2>
      <p>{w('discountBenefit')}</p>
      {recovery && <div className="recovery-box"><strong>{ct(locale, 'recoveryNote')}</strong><code>{recovery}</code></div>}
      <Link className="button button-lime" href={`/${locale}/nalog`} onClick={close}>{ct(locale, 'account')}</Link>
      <button type="button" className="club-popup-later" onClick={close}>{w('later')}</button>
    </div> : <div className="club-popup-grid">
      <div className="club-popup-intro">
        <span className="eyebrow"><Sparkles size={16} />{ct(locale, 'club')}</span>
        <h2 id="club-popup-title">{w('popupTitle')}</h2>
        <p>{w('popupBody')}</p>
        <ul className="club-popup-benefits">
          <li><BadgePercent size={27} /><div><strong>{w('discountBenefit')}</strong><p>{w('discountBody')}</p></div></li>
          <li><ShieldCheck size={27} /><div><strong>{w('waiverBenefit')}</strong><p>{w('waiverBody')}</p></div></li>
        </ul>
        <Link className="text-link" href={`/${locale}/klub`} onClick={close}>{ct(locale, 'club')} →</Link>
        <button type="button" className="club-popup-later" onClick={close}>{w('later')}</button>
      </div>
      <div className="club-popup-access">
        {recovery && <div className="recovery-box"><strong>{ct(locale, 'recoveryNote')}</strong><code>{recovery}</code></div>}
        <AccountAccess locale={locale} mode={mode} setMode={next => { setMode(next); setError(''); }} busy={busy} error={error} onSubmit={submit} />
      </div>
    </div>}
  </dialog>;
}
