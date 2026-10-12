import { randomUUID } from 'node:crypto';
import { all, get, put, settings, transaction } from '../db';
import { config } from './data';
import type { Message, Order, Customer, Watch } from './types';
import { checkCapacity } from './data';
import { today } from '../validation';
export function messagingStatus() {
  return {
    ready: !!(
      config().enabled &&
      process.env.WHATSAPP_TOKEN &&
      process.env.WHATSAPP_PHONE_ID &&
      process.env.WHATSAPP_API_VERSION &&
      settings().siteUrl
    ),
    token: !!process.env.WHATSAPP_TOKEN,
    phoneId: !!process.env.WHATSAPP_PHONE_ID,
    version: !!process.env.WHATSAPP_API_VERSION,
    webhook: !!(process.env.WHATSAPP_APP_SECRET && process.env.WHATSAPP_VERIFY_TOKEN),
    scheduler: !!process.env.COMMERCE_JOB_SECRET,
    domain: !!settings().siteUrl,
  };
}
export function enqueue(
  m: Omit<Message, 'status' | 'attempts' | 'nextAt' | 'createdAt' | 'template' | 'language'>,
  templateKey: string,
) {
  if (get('messages', m.id) || get('whatsappOptOut', m.phone)) return;
  const cfg = config();
  put('messages', m.id, {
    ...m,
    status: 'queued',
    attempts: 0,
    nextAt: Date.now(),
    createdAt: new Date().toISOString(),
    template: cfg.templates[templateKey] || '',
    language: cfg.templateLanguage,
  });
}
export function enqueueOrder(order: Order, event: string) {
  if (!order.whatsapp) return;
  const details: Record<string, string> = {
    received: 'Zahtev je primljen. Raspoloživost i cena čekaju potvrdu.',
    confirmed: order.items.some(i => i.openEnded) ? 'Najam bez roka je potvrđen. Konačna cena računa se po vraćanju prema dogovorenoj dnevnoj tarifi.' : `Najam je potvrđen. Ukupno: ${order.total} RSD.`,
    active: 'Oprema je preuzeta. Uputstva za vašu opremu su na linku.',
    completed: 'Najam je završen. Hvala na poverenju.',
    cancelled: 'Najam je otkazan.',
    reminder: `Podsetnik: vratite opremu do ${order.returnTime}. Produženje možete zatražiti na linku.`,
  };
  const type = event.startsWith('extension-')
    ? 'extension'
    : event.startsWith('reminder-')
      ? 'reminder'
      : event;
  const info =
    type === 'reminder'
      ? `Podsetnik: opremu sa rokom ${event.replace('reminder-', '')} vratite do ${order.returnTime}. Zahtev za produženje je na linku.`
      : type === 'extension'
        ? `Zahtev za produženje: ${order.extension?.status === 'approved' ? 'odobren' : 'odbijen'}. Doplata: ${order.extension?.extra ?? 'po dogovoru'} RSD.`
        : details[type] || event;
  const link = `${settings().siteUrl}/${order.locale}/najam/${order.accessToken}`;
  enqueue(
    {
      id: `${order.id}:${event}`,
      orderId: order.id,
      customerId: order.customerId,
      phone: order.phone,
      event: type,
      params: [order.name, order.id, info, link],
    },
    type,
  );
}
export function scheduleMessages() {
  const tomorrow = new Date(Date.parse(today()) + 86400000).toISOString().slice(0, 10);
  for (const o of all<Order>('orders')) {
    if (['confirmed', 'active'].includes(o.status)) {
      for (const end of new Set(o.items.filter(i => !i.openEnded).map((i) => i.end)))
        if (end === tomorrow) enqueueOrder(o, 'reminder-' + end);
    }
  }
  for (const w of all<Watch>('watches').filter((w) => !w.notified)) {
    if (w.item.start < today()) {
      put('watches', w.id, { ...w, notified: true });
      continue;
    }
    const c = get<Customer>('customers', w.customerId);
    if (!c) continue;
    try {
      checkCapacity([w.item], '', true);
      enqueue(
        {
          id: 'watch:' + w.id,
          customerId: c.id,
          phone: c.phone,
          event: 'availability',
          params: [
            c.name,
            'Dostupnost alata',
            `Termin ${w.item.start} – ${w.item.openEnded ? 'bez datuma vraćanja' : w.item.end} je trenutno slobodan. Potvrda je potrebna.`,
            settings().siteUrl + '/sr/korpa',
          ],
        },
        'availability',
      );
      put('watches', w.id, { ...w, notified: true });
    } catch {
      /* still unavailable */
    }
  }
  for (const draft of all<{
    id: string;
    customerId: string;
    items: unknown;
    updatedAt: number;
    reminded: boolean;
  }>('draftCarts')) {
    if (draft.reminded || draft.updatedAt > Date.now() - 24 * 3600000) continue;
    const c = get<Customer>('customers', draft.customerId);
    const converted = all<Order>('orders').some(
      (o) => o.customerId === c?.id && Date.parse(o.createdAt) > draft.updatedAt,
    );
    if (c?.marketing && !converted)
      enqueue(
        {
          id: 'cart:' + draft.id + ':' + draft.updatedAt,
          customerId: c.id,
          phone: c.phone,
          event: 'cart',
          params: [
            c.name,
            'Sačuvana korpa',
            'Vaš izbor alata je sačuvan. Proverite termine i nastavite kada vam odgovara.',
            settings().siteUrl + '/sr/korpa',
          ],
        },
        'cart',
      );
    put('draftCarts', draft.id, { ...draft, reminded: true });
  }
}
export async function processMessages() {
  scheduleMessages();
  if (!messagingStatus().ready) return { processed: 0, setupRequired: true };
  const cfg = config();
  const selected = transaction(() => {
    const allMessages = all<Message>('messages');
    for (const m of allMessages.filter(
      (m) => m.status === 'sending' && m.nextAt < Date.now() - 120000,
    ))
      put('messages', m.id, {
        ...m,
        status: 'unknown',
        error: 'Ishod slanja nije potvrđen. Proveri kod provajdera pre ponovnog slanja.',
      });
    const list = allMessages
      .filter(
        (m) => ['queued', 'failed'].includes(m.status) && m.nextAt <= Date.now() && m.attempts < 4,
      )
      .slice(0, 10);
    for (const m of list)
      put('messages', m.id, {
        ...m,
        status: 'sending',
        attempts: m.attempts + 1,
        nextAt: Date.now(),
      });
    return list;
  });
  for (const m of selected) {
    const order = m.orderId ? get<Order>('orders', m.orderId) : undefined;
    const customer = m.customerId ? get<Customer>('customers', m.customerId) : undefined;
    const expectedStatus: Record<string, string> = {
      received: 'pending',
      confirmed: 'confirmed',
      active: 'active',
      completed: 'completed',
      cancelled: 'cancelled',
    };
    const stale =
      order &&
      ((expectedStatus[m.event] && order.status !== expectedStatus[m.event]) ||
        (order.status === 'cancelled' && m.event !== 'cancelled') ||
        (m.event === 'reminder' &&
          (!['confirmed', 'active'].includes(order.status) ||
            !order.items.some((i) => !i.openEnded && !!i.end && m.id.endsWith(i.end)))));
    if (
      get('whatsappOptOut', m.phone) ||
      (order && !order.whatsapp) ||
      (m.event === 'cart' && !customer?.marketing) ||
      stale
    ) {
      put('messages', m.id, { ...m, status: 'cancelled' });
      continue;
    }
    const template = cfg.templates[m.event] || m.template;
    if (!template) {
      put('messages', m.id, {
        ...m,
        status: 'failed',
        error: 'Nedostaje odobren WhatsApp šablon.',
        attempts: 4,
      });
      continue;
    }
    const attempt = m.attempts + 1;
    const params = [...m.params];
    if (order) params[3] = `${settings().siteUrl}/${order.locale}/najam/${order.accessToken}`;
    try {
      const response = await fetch(
        `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + process.env.WHATSAPP_TOKEN,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: m.phone.replace('+', ''),
            type: 'template',
            template: {
              name: template,
              language: { code: cfg.templateLanguage },
              components: [
                { type: 'body', parameters: params.map((text) => ({ type: 'text', text })) },
              ],
            },
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        put('messages', m.id, {
          ...m,
          template,
          status: 'failed',
          attempts: response.status === 429 ? attempt : 4,
          nextAt: Date.now() + 60000 * 2 ** attempt,
          error: `WhatsApp greška ${result.error?.code || response.status}.`,
        });
      } else if (result.messages?.[0]?.id)
        put('messages', m.id, {
          ...m,
          template,
          status: 'sent',
          attempts: attempt,
          providerId: result.messages[0].id,
          error: undefined,
        });
      else
        put('messages', m.id, {
          ...m,
          status: 'unknown',
          attempts: attempt,
          error: 'Provajder nije vratio identifikator poruke.',
        });
    } catch {
      put('messages', m.id, {
        ...m,
        status: 'unknown',
        attempts: attempt,
        error: 'Veza je prekinuta. Proveri ishod kod provajdera; nije automatski ponovljeno.',
      });
    }
  }
  return { processed: selected.length, setupRequired: false };
}
