import { all, get, put, withDatabase, transaction } from '../db';
import { emailAddress } from '../validation';
import { emailConfiguration, sendSesEmail } from './ses';
import { deliverEmailBatch } from './delivery';
import type { EmailContent, EmailMessage, ContactInquiry } from './types';

export function enqueueEmail(id: string, to: string | undefined, content: EmailContent) {
  if (!to || get('emails', id)) return;
  const now = new Date().toISOString();
  const message: EmailMessage = { id, to: emailAddress(to), content, status: 'queued', attempts: 0,
    nextAt: Date.now(), createdAt: now, updatedAt: now };
  put('emails', id, message);
}

export async function processEmailQueue() {
  const cfg = emailConfiguration();
  if (!cfg.ready) return { processed: 0, sent: 0, failed: 0, unknown: 0, setupRequired: true };
  const result = await deliverEmailBatch({
    claim: () => withDatabase(() => transaction(() => {
      const messages = all<EmailMessage>('emails');
      for (const m of messages.filter(m => m.status === 'sending' && Date.parse(m.updatedAt) < Date.now() - 120_000)) {
        put('emails', m.id, { ...m, status: 'unknown', updatedAt: new Date().toISOString(),
          error: 'Slanje je prekinuto. Proveri SES pre ponovnog slanja.' });
      }
      const selected = messages.filter(m => ['queued', 'failed'].includes(m.status) && m.attempts < 4 && m.nextAt <= Date.now())
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, 3)
        .map(m => ({ ...m, status: 'sending' as const, attempts: m.attempts + 1, updatedAt: new Date().toISOString() }));
      for (const m of selected) put('emails', m.id, m);
      return selected;
    }), true),
    finish: message => withDatabase(() => {
      const current = get<EmailMessage>('emails', message.id);
      if (current?.status === 'sending' && current.attempts === message.attempts) put('emails', message.id, message);
    }, true),
    send: sendSesEmail,
  });
  return { ...result, setupRequired: false };
}

export function emailAdminData() {
  const { ready, enabled, region, from, replyTo } = emailConfiguration();
  return { ready, enabled, region, from, replyTo,
    inquiries: all<ContactInquiry>('contactInquiries').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100),
    messages: all<EmailMessage>('emails').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100),
  };
}
