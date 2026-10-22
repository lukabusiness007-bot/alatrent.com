'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { contactCopy } from '@/lib/contact-copy';
import type { Locale } from '@/lib/types';

export default function ContactForm({ locale }: { locale: Locale }) {
  const w = contactCopy(locale);
  const idempotency = useRef('');
  const [busy, setBusy] = useState(false), [reference, setReference] = useState(''), [error, setError] = useState('');
  return <section className="container contact-message-section" aria-labelledby="contact-message-title">
    <div className="contact-message-intro"><span className="eyebrow">{w.tag}</span><h2 id="contact-message-title">{w.title}</h2><p>{w.intro}</p></div>
    {reference ? <div className="contact-message-success" role="status"><CheckCircle2 size={32}/><h3>{w.success}</h3><p>{w.successBody}</p><strong>{reference}</strong></div> :
      <form className="contact-message-form" aria-busy={busy} onSubmit={async e => {
        e.preventDefault(); if (busy) return;
        const form = e.currentTarget;
        const values = Object.fromEntries(new FormData(form));
        idempotency.current ||= crypto.randomUUID();
        setBusy(true); setError('');
        try {
          const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...values, locale, idempotency: idempotency.current, consent: values.consent === 'on' }) });
          const result = await response.json();
          if (!response.ok) throw new Error(w.error);
          setReference(result.id);
        } catch { setError(w.error); }
        finally { setBusy(false); }
      }}>
        <div className="contact-message-fields"><label>{w.name}<input name="name" required maxLength={120} autoComplete="name"/></label><label>{w.email}<input name="email" type="email" required maxLength={150} autoComplete="email"/></label></div>
        <label>{w.phone}<input name="phone" type="tel" maxLength={40} autoComplete="tel"/></label>
        <label>{w.message}<textarea name="message" rows={5} required minLength={10} maxLength={1500} placeholder={w.placeholder}/></label>
        <div className="contact-message-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
        <label className="contact-message-consent"><input name="consent" type="checkbox" required/><span>{w.consent} <Link href={`/${locale}/privatnost`}>{w.privacy}</Link></span></label>
        {error && <p role="alert" className="form-error">{error}</p>}
        <button className="button button-lime" disabled={busy}>{busy ? w.busy : w.send}<ArrowRight size={18}/></button>
        <p className="contact-message-note">{w.pending}</p>
      </form>}
  </section>;
}
