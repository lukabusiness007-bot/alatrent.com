import { randomBytes, randomUUID } from 'node:crypto';
import { get, put, all, remove, transaction } from '../db';
import { hashToken } from '../auth';
import { text, date, rentalDays, today } from '../validation';
import { locales } from '../types';
import type { Locale } from '../types';
import type { Customer, Order, Line } from './types';
import { checkCapacity, config, quote, options, publicQuote } from './data';
import { phoneNumber } from './auth';
import { calculate, round } from './pricing';
import { enqueueOrder } from './messages';
import { referralLines, assertReferralEconomics, grantReferral, hasPriorRental, updateReferralDiscount } from './referrals';
export function createOrder(b: Record<string, unknown>, customer?: Customer): Order {
  return transaction(() => {
    const idempotency = text(b.idempotency, 80);
    if (!/^[a-zA-Z0-9-]{20,80}$/.test(idempotency)) throw new Error('Osveži zahtev.');
    const old = all<Order>('orders').find(
      (o) => o.idempotency === idempotency && o.customerId === customer?.id,
    );
    if (old) return old;
    if (b.consent !== true || b.website)
      throw new Error('Potrebna je saglasnost za obradu zahteva.');
    const phone = phoneNumber(b.phone),
      name = text(b.name, 120),
      email = text(b.email || '', 150, false),
      address = text(b.address || '', 300, false);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Neispravan email.');
    if (b.delivery !== 'pickup' && address.length < 5) throw new Error('Unesi adresu dostave.');
    if (!locales.includes(b.locale as Locale)) throw new Error('Nepoznat jezik.');
    const fresh = customer ? get<Customer>('customers', customer.id) : undefined;
    const teamId = b.teamId ? text(b.teamId, 80) : undefined;
    const q = quote(b.items, String(b.delivery), fresh, b.useCredit === true, teamId, b.referralCode);
    if (q.referral && phone !== fresh?.phone) throw new Error('Za preporuku koristi telefon svog naloga.');
    const accessToken = randomBytes(32).toString('hex');
    const order: Order = {
      ...q,
      referralVersion: 2,
      creditContributionTarget: config().referralProgram.minContributionPercent,
      id: 'RT-' + randomUUID().slice(0, 12).toUpperCase(),
      idempotency,
      customerId: fresh?.id,
      teamId,
      accessToken,
      accessHash: hashToken(accessToken),
      name,
      phone,
      email,
      address,
      company: text(b.company || '', 200, false),
      note: text(b.note || '', 1500, false),
      delivery: b.delivery as Order['delivery'],
      status: 'pending',
      paid: false,
      locale: b.locale as Locale,
      whatsapp: b.whatsapp === true,
      marketing: b.marketing === true,
      consentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      returnTime: config().returnTime,
      adjustment: 0,
    };
    if (fresh) put('customers', fresh.id, { ...fresh, marketing: b.marketing === true });
    if (fresh && q.credit)
      put('customers', fresh.id, {
        ...fresh,
        marketing: b.marketing === true,
        credit: round(fresh.credit - q.credit),
      });
    put('orders', order.id, order);
    if (fresh) remove('draftCarts', fresh.id);
    enqueueOrder(order, 'received');
    return order;
  });
}
export function extensionQuote(order: Order, end: string) {
  date(end);
  if (end < today()) throw new Error('Novi rok ne može biti u prošlosti.');
  if (order.items.some((i) => end <= i.end || rentalDays(i.start, end) > 90))
    throw new Error('Novi datum mora biti posle svih postojećih rokova (najviše 90 dana).');
  let items: Line[] = order.items.map((i) => ({
    ...i,
    end,
    days: rentalDays(i.start, end),
    ...(i.price === null
      ? { total: null, base: null, saving: 0, reason: 'quote' }
      : calculate(
          i.price,
          i.start,
          rentalDays(i.start, end),
          i.quantity,
          i.rule,
          i.clubPercent,
          i.bundlePercent,
        )),
  }));
  if (order.referral) items = referralLines(items, order.referral.policy);
  checkCapacity(items, order.id, true);
  const total = items.some((i) => i.total === null)
    ? null
    : round(items.reduce((n, i) => n + i.total!, 0) + order.adjustment);
  return {
    items,
    total,
    extra:
      total === null || order.rentalTotal === null
        ? null
        : round(Math.max(0, total - order.rentalTotal)),
  };
}
export function updateOrder(b: Record<string, unknown>) {
  return transaction(() => {
    const order = get<Order>('orders', text(b.id, 80));
    if (!order) throw new Error('Najam ne postoji.');
    if (['completed', 'cancelled'].includes(order.status))
      throw new Error('Završen ili otkazan najam nije moguće menjati.');
    if (b.action === 'extension') {
      if (order.extension?.status !== 'pending') throw new Error('Nema zahteva za produženje.');
      if (b.approve === true) {
        const q = extensionQuote(order, order.extension.end);
        if (q.total === null)
          throw new Error('Produženje alata bez tarife zahteva novi dogovoreni upit.');
        order.items = q.items;
        order.rentalTotal = Math.max(order.rentalTotal || 0, q.total);
        order.baseTotal = round(q.items.reduce((n, i) => n + (i.base || 0), 0));
        order.saving = round(Math.max(0, order.baseTotal - order.rentalTotal));
        order.total = round(order.rentalTotal + order.deliveryTotal - order.credit);
        order.extension = { ...order.extension, status: 'approved', extra: q.extra };
        if (q.extra) order.paid = false;
        updateReferralDiscount(order);
        assertReferralEconomics(order);
      } else order.extension.status = 'rejected';
      put('orders', order.id, order);
      enqueueOrder(order, 'extension-' + order.extension.end + '-' + order.extension.status);
      return order;
    }
    if (b.rentalTotal !== undefined) {
      if (order.status !== 'pending') throw new Error('Cena je zaključana nakon potvrde.');
      if (
        typeof b.rentalTotal !== 'number' ||
        !Number.isFinite(b.rentalTotal) ||
        b.rentalTotal < order.credit ||
        b.rentalTotal > 10000000
      )
        throw new Error('Neispravna dogovorena cena.');
      const original = order.items.reduce((n, i) => n + (i.total || 0), 0);
      order.rentalTotal = round(b.rentalTotal);
      order.adjustment = round(order.rentalTotal - original);
      order.total = round(order.rentalTotal + order.deliveryTotal - order.credit);
      order.saving =
        order.baseTotal === null ? 0 : round(Math.max(0, order.baseTotal - order.rentalTotal));
    }
    updateReferralDiscount(order);
    if (b.deliveryTotal !== undefined) {
      if (
        order.status !== 'pending' ||
        typeof b.deliveryTotal !== 'number' ||
        !Number.isFinite(b.deliveryTotal) ||
        b.deliveryTotal < 0 ||
        b.deliveryTotal > 10000000
      )
        throw new Error('Neispravna cena dostave ili je najam već potvrđen.');
      order.deliveryTotal = round(b.deliveryTotal);
      order.total =
        order.rentalTotal === null
          ? null
          : round(order.rentalTotal + order.deliveryTotal - order.credit);
    }
    const status = b.status as Order['status'];
    const transitions: Record<string, string[]> = {
      pending: ['pending', 'confirmed', 'cancelled'],
      confirmed: ['confirmed', 'active', 'cancelled'],
      active: ['active', 'completed'],
    };
    if (!transitions[order.status]?.includes(status))
      throw new Error('Nedozvoljena promena statusa.');
    if (['confirmed', 'active'].includes(status)) {
      if (status === 'confirmed' && order.items.some((i) => i.end < today()))
        throw new Error('Termin je istekao. Potreban je novi zahtev.');
      checkCapacity(order.items, order.id, true);
      if (order.rentalTotal === null) throw new Error('Unesi dogovorenu cenu pre potvrde.');
    }
    if (order.referral && ['confirmed', 'active'].includes(status)) {
      if (b.referralVerified === true) order.referral.verified = true;
      if (!order.referral.verified) throw new Error('Potvrdi da je identitet proveren i da je ovo novi kupac.');
      const c = get<Customer>('customers', order.customerId!);
      if (!c || c.phone !== order.phone || hasPriorRental(c, order.id)) throw new Error('Kupac više ne ispunjava uslov prvog najma.');
      // Capture costs at confirmation; later catalog edits cannot rewrite accepted economics.
      if (order.status === 'pending') order.items = order.items.map(i => ({ ...i, instructions: options(i.toolId) }));
      assertReferralEconomics(order);
    }
    if (!order.referral && order.referralVersion === 2 && order.credit > 0 && ['confirmed','active'].includes(status)) {
      if (order.status === 'pending') order.items = order.items.map(i=>({...i,instructions:options(i.toolId)}));
      assertReferralEconomics(order);
    }
    if (b.paid !== undefined) order.paid = b.paid === true;
    if (status === 'completed' && !order.paid)
      throw new Error('Označi da je najam plaćen pre završetka.');
    const previous = order.status;
    order.status = status;
    if (status === 'active' && previous !== status)
      order.items = order.items.map((i) => ({ ...i, instructions: { ...options(i.toolId), ...((order.referral || (order.referralVersion === 2 && order.credit > 0)) ? { costPerDay: i.instructions.costPerDay, preparationCost: i.instructions.preparationCost } : {}) } }));
    if (status === 'cancelled' && order.customerId && order.credit && !order.creditReturned) {
      const c = get<Customer>('customers', order.customerId)!;
      put('customers', c.id, { ...c, credit: round(c.credit + order.credit) });
      order.creditReturned = true;
    }
    if (status === 'completed') {
      order.completedAt = new Date().toISOString();
      const c = order.customerId ? get<Customer>('customers', order.customerId) : undefined;
      if (c) {
        grantReferral(order, c);
        // Old pending orders retain the legacy promise; new orders never double-reward buyers.
        if (!order.referralVersion && !c.rewarded) {
          c.rewarded = true;
          const ref = c.referredBy ? get<Customer>('customers', c.referredBy) : undefined;
          if (ref && ref.id !== c.id && ref.phone !== c.phone && order.phone === c.phone) {
            const amount = config().referralCredit;
            c.credit = round(c.credit + amount);
            put('customers', ref.id, { ...ref, credit: round(ref.credit + amount) });
            put('creditLedger', order.id, { orderId: order.id, customerId: c.id, referrerId: ref.id, amount, createdAt: order.completedAt });
          }
        }
        c.rewarded = true;
        put('customers', c.id, c);
      }
    }
    put('orders', order.id, order);
    if (previous !== status) enqueueOrder(order, status);
    return order;
  });
}
export function publicOrder(o: Order) {
  const { accessToken: _t, accessHash: _h, idempotency: _k, referralCosts: _cost, ...safe } = o;
  return { ...safe, ...publicQuote(safe) };
}
