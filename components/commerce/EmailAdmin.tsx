'use client';
import { useState } from 'react';
import type { EmailMessage, ContactInquiry } from '@/lib/email/types';

export type EmailAdminData = { ready: boolean; enabled: boolean; region: string; from: string; replyTo: string; messages: EmailMessage[]; inquiries: ContactInquiry[] };
const names = { 'club-welcome': 'Dobrodošlica u klub', 'contact-received': 'Potvrda kontakt upita', 'rental-received': 'Potvrda zahteva za najam' };
const statuses = { queued: 'Čeka slanje', sending: 'Slanje u toku', sent: 'SES prihvatio', failed: 'Slanje nije uspelo', unknown: 'Proveri ishod u SES-u' };
export default function EmailAdmin({ data, onRefresh }: { data: EmailAdminData; onRefresh: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  return <section className="admin-card"><h2>Automatski email · Amazon SES</h2>
    <div className="integration-status"><span className={data.ready ? 'ok' : 'missing'}>{data.ready ? '✓ Podešeno slanje' : '○ Čeka povezivanje AWS pristupa'}</span><span>{data.region}</span><span>{data.from}</span></div>
    <p>Potvrda kontakt upita, dobrodošlica u Klub majstora i prijem zahteva za najam šalju se automatski nakon čuvanja podataka. Odgovori korisnika stižu na {data.replyTo}.</p>
    <p className="small-muted">Status „SES prihvatio” potvrđuje da je provajder preuzeo poruku, a ne da ju je primalac pročitao. Neizvesno slanje se ne ponavlja automatski.</p>
    <button className="button button-plain" disabled={busy || !data.ready} onClick={async () => {
      setBusy(true); setNotice('');
      try {
        const r = await fetch('/api/admin/emails', { method: 'POST' });
        if (!r.ok) throw new Error();
        const result = await r.json();
        setNotice(`Obrađeno: ${result.processed}. SES prihvatio: ${result.sent}.`);
        await onRefresh();
      } catch { setNotice('Red nije obrađen. Pokušaj ponovo.'); }
      finally { setBusy(false); }
    }}>{busy ? 'Obrađujemo…' : 'Obradi čekajuće mejlove'}</button>
    {notice && <p role="status">{notice}</p>}
    {data.messages.map(m => <div className="message-admin-row" key={m.id}>
      <strong>{names[m.content.kind]}</strong><p>{m.to} · {statuses[m.status]}</p>
      <span>{new Date(m.createdAt).toLocaleString('sr-RS', { timeZone: 'Europe/Belgrade' })} · Pokušaji: {m.attempts}</span>
      {m.error && <p>{m.error}</p>}
    </div>)}
    {!data.messages.length && <p>Još nema novih mejlova za slanje.</p>}
    <h3>Kontakt upiti</h3>
    {data.inquiries.map(inquiry => <div className="message-admin-row" key={inquiry.id}>
      <strong>{inquiry.name} · {inquiry.id}</strong><p><a href={'mailto:' + inquiry.email}>{inquiry.email}</a>{inquiry.phone && <> · <a href={'tel:' + inquiry.phone.replace(/[^+\d]/g, '')}>{inquiry.phone}</a></>}</p>
      <p style={{ whiteSpace: 'pre-wrap' }}>{inquiry.note}</p><span>{new Date(inquiry.createdAt).toLocaleString('sr-RS', { timeZone: 'Europe/Belgrade' })}</span>
    </div>)}
    {!data.inquiries.length && <p>Još nema novih poruka sa kontakt forme.</p>}
  </section>;
}
