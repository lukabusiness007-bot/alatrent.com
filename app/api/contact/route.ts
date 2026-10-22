import { randomUUID } from 'node:crypto';
import { databaseRoute, get, put, transaction } from '@/lib/db';
import { sameOrigin, rateLimit, hashToken } from '@/lib/auth';
import { text, emailAddress } from '@/lib/validation';
import { locales } from '@/lib/types';
import type { ContactInquiry } from '@/lib/email/types';
import { enqueueEmail } from '@/lib/email/queue';
import { withEmailDelivery } from '@/lib/email/dispatch';

export const maxDuration = 60;
async function dbPOST(r: Request) {
  if (!sameOrigin(r)) return Response.json({ error: 'invalid' }, { status: 403 });
  try {
    const raw = await r.text();
    if (raw.length > 12_000) return Response.json({ error: 'invalid' }, { status: 413 });
    const b = JSON.parse(raw);
    if (b.website || b.consent !== true || !locales.includes(b.locale)) throw new Error('invalid');
    const key = text(b.idempotency, 36);
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(key)) throw new Error('invalid');
    const name = text(b.name, 120), email = emailAddress(b.email), phone = text(b.phone || '', 40, false), note = text(b.message, 1500);
    if (note.length < 10 || (phone && (!/^[+\d\s().-]{6,40}$/.test(phone) || phone.replace(/\D/g, '').length < 6))) throw new Error('invalid');
    const existing = get<ContactInquiry>('contactInquiries', key);
    if (existing) {
      if (existing.email !== email || existing.name !== name || existing.note !== note || existing.phone !== phone || existing.locale !== b.locale)
        return Response.json({ error: 'invalid' }, { status: 409 });
      return Response.json({ id: existing.id }, { status: 200 });
    }
    const ip = r.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (!rateLimit('contact-email:' + hashToken(email), 3, 86_400_000)
      || (ip && !rateLimit('contact-ip:' + hashToken(ip), 8, 3_600_000))
      || !rateLimit('contact-global', 100, 3_600_000)) return Response.json({ error: 'rate-limit' }, { status: 429 });
    return transaction(() => {
      const createdAt = new Date().toISOString();
      const record: ContactInquiry = { id: 'CT-' + randomUUID().slice(0, 13).toUpperCase(), idempotency: key,
        createdAt, name, email, phone, note, locale: b.locale };
      put('contactInquiries', key, record);
      enqueueEmail('contact:' + key, email, { kind: 'contact-received', locale: b.locale, name, reference: record.id });
      return Response.json({ id: record.id }, { status: 201 });
    });
  } catch { return Response.json({ error: 'invalid' }, { status: 400 }); }
}
export const POST = withEmailDelivery(databaseRoute(dbPOST, true));
