import { databaseRoute } from '@/lib/db';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { all, get, put } from '@/lib/db';
import type { Message } from '@/lib/commerce/types';
async function dbGET(r: Request) {
  const p = new URL(r.url).searchParams;
  if (
    process.env.WHATSAPP_VERIFY_TOKEN &&
    p.get('hub.mode') === 'subscribe' &&
    p.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN
  )
    return new Response(p.get('hub.challenge'));
  return new Response(null, { status: 403 });
}
async function dbPOST(r: Request) {
  const raw = await r.text(),
    secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || raw.length > 1000000) return new Response(null, { status: 403 });
  const expected = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');
  const provided = r.headers.get('x-hub-signature-256') || '';
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  )
    return new Response(null, { status: 403 });
  try {
    const body = JSON.parse(raw);
    for (const entry of body.entry || [])
      for (const change of entry.changes || []) {
        for (const s of change.value?.statuses || []) {
          const m = all<Message>('messages').find((m) => m.providerId === s.id);
          if (!m || !['sent', 'delivered', 'read', 'failed'].includes(s.status)) continue;
          const rank: Record<string, number> = { sent: 1, delivered: 2, read: 3, failed: 0 };
          if (
            (s.status !== 'failed' && (rank[s.status] || 0) < (rank[m.status] || 0)) ||
            (s.status === 'failed' && ['delivered', 'read'].includes(m.status))
          )
            continue;
          put('messages', m.id, {
            ...m,
            status: s.status,
            ...(s.status === 'failed'
              ? { attempts: 4, error: 'Isporuka nije uspela. Proveri broj i šablon.' }
              : {}),
          });
        }
        for (const m of change.value?.messages || []) {
          if (!m.id || get('whatsappInbox', m.id)) continue;
          const phone = '+' + String(m.from || '').replace(/\D/g, '');
          const message = String(m.text?.body || m.button?.text || '').slice(0, 4000);
          if (/^(stop|odjava|otkazi|unsubscribe|стоп|одјава)$/i.test(message.trim()))
            put('whatsappOptOut', phone, { at: new Date().toISOString() });
          put('whatsappInbox', m.id, {
            id: m.id,
            phone,
            text: message || '[Poruka bez teksta — proveri WhatsApp]',
            at: new Date().toISOString(),
          });
        }
      }
    return Response.json({ ok: true });
  } catch {
    return new Response(null, { status: 400 });
  }
}

export const GET = databaseRoute(dbGET, false);
export const POST = databaseRoute(dbPOST, true);
