import { databaseRoute } from '@/lib/db';
import { randomUUID } from 'node:crypto';
import { sameOrigin, rateLimit } from '@/lib/auth';
import { get, put, settings, transaction, occupied } from '@/lib/db';
import { text, date, today, rentalDays } from '@/lib/validation';
import { locales, type Tool, type Category, type RentalRequest } from '@/lib/types';
import { currentCustomer } from '@/lib/commerce/auth';
import { member } from '@/lib/commerce/data';
import { round } from '@/lib/commerce/pricing';
import { enqueueEmail } from '@/lib/email/queue';
import { withEmailDelivery } from '@/lib/email/dispatch';
export const maxDuration = 60;
async function dbPOST(r: Request) {
  if (!sameOrigin(r)) return Response.json({ error: 'invalid' }, { status: 403 });
  if (Number(r.headers.get('content-length')) > 20000)
    return Response.json({ error: 'invalid' }, { status: 413 });
  try {
    const b = await r.json();
    if (b.website) return Response.json({ error: 'invalid' }, { status: 400 });
    const name = text(b.name, 120),
      phone = text(b.phone, 40),
      email = text(b.email || '', 150, false),
      note = text(b.note || '', 1500, false),
      address = text(b.address || '', 300, false);
    if (
      !/^[+\d\s().-]{6,40}$/.test(phone) ||
      phone.replace(/\D/g, '').length < 6 ||
      !b.consent ||
      (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    )
      throw new Error('invalid');
    const start = date(b.start),
      end = date(b.end),
      days = rentalDays(start, end);
    if (start < today() || days < 1 || days > 90 || Date.parse(start) > Date.now() + 366 * 86400000)
      throw new Error('invalid');
    if (
      !Number.isInteger(b.quantity) ||
      b.quantity < 1 ||
      b.quantity > 100 ||
      !['pickup', 'standard', 'express'].includes(b.delivery) ||
      !locales.includes(b.locale)
    )
      throw new Error('invalid');
    if (b.delivery !== 'pickup' && address.length < 5) throw new Error('invalid');
    if (
      !rateLimit('request:' + phone.replace(/\D/g, ''), 5, 3600_000) ||
      !rateLimit('requests-total', 100, 3600_000)
    )
      return Response.json({ error: 'invalid' }, { status: 429 });
    const customer = await currentCustomer();
    return transaction(() => {
      const tool = get<Tool>('tools', text(b.toolId, 80));
      if (!tool || !tool.published || !get<Category>('categories', tool.categoryId)?.published)
        throw new Error('invalid');
      if (tool.quantity !== null && occupied(tool.id, start, end) + b.quantity > tool.quantity)
        return Response.json({ error: 'unavailable' }, { status: 409 });
      const s = settings();
      const membership = customer ? member(customer) : undefined;
      const record: RentalRequest = {
        customerId: customer?.id,
        depositWaived: membership?.depositWaived === true,
        id: 'RT-' + randomUUID().slice(0, 8).toUpperCase(),
        toolId: tool.id,
        toolName: tool.name.sr,
        name,
        phone,
        email,
        note,
        address,
        start,
        end,
        days,
        quantity: b.quantity,
        delivery: b.delivery,
        rentalTotal: tool.price === null ? null : round(tool.price * days * b.quantity * (1 - (membership?.discount || 0) / 100)),
        deliveryTotal:
          b.delivery === 'standard'
            ? s.standardDelivery
            : b.delivery === 'express'
              ? s.expressDelivery
              : 0,
        deposit: membership?.depositWaived ? 0 : null,
        status: 'pending',
        paid: false,
        locale: b.locale,
        createdAt: new Date().toISOString(),
      };
      put('requests', record.id, record);
      enqueueEmail('request:' + record.id, email || customer?.email, { kind: 'rental-received', locale: record.locale, name, reference: record.id });
      return Response.json({ id: record.id }, { status: 201 });
    });
  } catch {
    return Response.json({ error: 'invalid' }, { status: 400 });
  }
}

export const POST = withEmailDelivery(databaseRoute(dbPOST, true));
