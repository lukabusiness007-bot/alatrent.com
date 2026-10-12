import { recommendations, recordEvent } from '@/lib/commerce/merchandising';
import { databaseRoute } from '@/lib/db';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { all, get, put, remove, transaction } from '@/lib/db';
import { sameOrigin, rateLimit, hashToken } from '@/lib/auth';
import { text, emailAddress } from '@/lib/validation';
import {
  currentCustomer,
  customerCookie,
  logoutCustomer,
  phoneNumber,
  authenticate,
  register,
  credentials,
} from '@/lib/commerce/auth';
import { quote, member, cartItems, publicQuote, config } from '@/lib/commerce/data';
import { referralSummary } from '@/lib/commerce/referrals';
import { createOrder, publicOrder, extensionQuote } from '@/lib/commerce/orders';
import type { Order, Customer, Project, Watch, Team } from '@/lib/commerce/types';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
async function dbGET(r: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const customer = await currentCustomer();
  const teams = customer
    ? all<Team>('teams').filter((t) => t.customerIds.includes(customer.id))
    : [];
  if (action === 'referral-program') return json({ ...config().referralProgram, memberIds: [] });
  if (action === 'me')
    return json(
      customer
        ? {
            customer: member(customer),
            referrals: referralSummary(customer, config().referralProgram),
            teams: teams.map((t) => ({ id: t.id, name: t.name, discount: t.discount })),
            orders: all<Order>('orders')
              .filter((o) => o.customerId === customer.id || teams.some((t) => t.id === o.teamId))
              .map(publicOrder),
            projects: all<Project>('projects').filter((p) => p.customerId === customer.id),
            watches: all<Watch>('watches').filter((w) => w.customerId === customer.id),
            draft: get('draftCarts', customer.id),
          }
        : { customer: null },
    );
  if (action === 'order') {
    const token = new URL(r.url).searchParams.get('token') || '';
    const order =
      token.length === 64
        ? all<Order>('orders').find((o) => o.accessHash === hashToken(token))
        : undefined;
    if (!order) return json({ error: 'Najam nije pronađen.' }, 404);
    return json(publicOrder(order));
  }
  return json({ error: 'Nije pronađeno.' }, 404);
}
async function dbPOST(r: Request, { params }: { params: Promise<{ action: string }> }) {
  if (!sameOrigin(r)) return json({ error: 'Osveži stranicu.' }, 403);
  try {
    const { action } = await params;
    const raw = await r.text();
    if (raw.length > 50000) return json({ error: 'Prevelik zahtev.' }, 413);
    const b = JSON.parse(raw);
    const customer = await currentCustomer();
    if (['login', 'register', 'recover'].includes(action)) {
      const phone = phoneNumber(b.phone);
      if (
        !rateLimit('customer-auth:' + phone, 12, 3600000) ||
        !rateLimit('customer-auth-global', 500, 3600000)
      )
        return json({ error: 'Previše pokušaja. Pokušaj kasnije.' }, 429);
      if (action === 'register') {
        if (b.consent !== true) throw new Error('Prihvati obradu podataka za nalog.');
        const result = transaction(() => register(b));
        await customerCookie(r, result.customer.id);
        return json({ customer: member(result.customer), recovery: result.recovery }, 201);
      }
      if (action === 'recover') {
        const c = all<Customer>('customers').find((c) => c.phone === phone);
        if (!c || hashToken(text(b.recovery, 100)) !== c.recoveryHash)
          throw new Error('Neispravni podaci za oporavak.');
        const password = credentials(b.password),
          salt = randomBytes(24).toString('hex'),
          recovery = randomBytes(24).toString('hex');
        transaction(() => {
          put('customers', c.id, {
            ...c,
            salt,
            hash: scryptSync(password, salt, 64).toString('hex'),
            recoveryHash: hashToken(recovery),
          });
          // Revoke every previously issued session for this customer.
          for (const session of all<{ id: string; customerId: string }>('customerSessions'))
            if (session.customerId === c.id && session.id) remove('customerSessions', session.id);
        });
        await customerCookie(r, c.id);
        return json({ ok: true, recovery });
      }
      const c = authenticate(phone, text(b.password, 200));
      await customerCookie(r, c.id);
      return json({ customer: member(c) });
    }
    if (action === 'logout') {
      await logoutCustomer();
      return json({ ok: true });
    }
    if (action === 'recommendations' || action === 'compare') {
      if (!rateLimit('merchandising-global', 3000, 60000)) return json({ error: 'Pokušaj kasnije.' },429);
      if (action === 'recommendations') return json(recommendations(b,customer));
      let before = null;
      try { before = publicQuote(quote(b.items,b.delivery || 'pickup',customer,b.useCredit,b.teamId,b.referralCode)); } catch { /* An unavailable source can be replaced. */ }
      return json({ before,
        after: publicQuote(quote(b.nextItems,b.delivery || 'pickup',customer,b.useCredit,b.teamId,b.referralCode)) });
    }
    if (action === 'event') {
      if (!rateLimit('funnel-global',3000,60000)) return json({error:'Pokušaj kasnije.'},429);
      return json(recordEvent(b));
    }
    if (action === 'quote')
      return json(
        publicQuote(
          quote(b.items, b.delivery, customer, b.useCredit === true, b.teamId || undefined, b.referralCode),
        ),
      );
    if (action === 'order') {
      if (
        !rateLimit('order:' + phoneNumber(b.phone), 15, 3600000) ||
        !rateLimit('order-global', 300, 3600000)
      )
        return json({ error: 'Previše zahteva. Pokušaj kasnije.' }, 429);
      const order = createOrder(b, customer);
      return json({ id: order.id, token: order.accessToken }, 201);
    }
    if (action === 'extend' || action === 'stop') {
      const o = get<Order>('orders', text(b.id, 80));
      if (
        !o ||
        (!(
          customer &&
          (o.customerId === customer.id ||
            (o.teamId && get<Team>('teams', o.teamId)?.customerIds.includes(customer.id)))
        ) &&
          !(typeof b.token === 'string' && hashToken(b.token) === o.accessHash))
      )
        return json({ error: 'Najam nije pronađen.' }, 404);
      if (action === 'stop') {
        put('whatsappOptOut', o.phone, { at: new Date().toISOString() });
        put('orders', o.id, { ...o, whatsapp: false, marketing: false });
        return json({ ok: true });
      }
      if (!['confirmed', 'active'].includes(o.status))
        throw new Error('Produženje je moguće samo za potvrđen ili aktivan najam.');
      const q = extensionQuote(o, text(b.end, 10));
      put('orders', o.id, { ...o, extension: { end: b.end, extra: q.extra, status: 'pending' } });
      return json({ extra: q.extra });
    }
    if (!customer) return json({ error: 'Prijavi se.' }, 401);
    if (action === 'claim') {
      return transaction(() => {
        const o = all<Order>('orders').find(
          (o) => typeof b.token === 'string' && o.accessHash === hashToken(b.token),
        );
        if (!o || o.customerId) return json({ error: 'Najam nije dostupan za povezivanje.' }, 404);
        put('orders', o.id, { ...o, customerId: customer.id });
        return json({ ok: true });
      });
    }
    if (action === 'profile') {
      const c = {
        ...customer,
        name: text(b.name, 120),
        email: emailAddress(b.email),
        address: text(b.address || '', 300, false),
        company: text(b.company || '', 200, false),
        marketing: b.marketing === true,
      };
      put('customers', c.id, c);
      return json(member(c));
    }
    if (action === 'project') {
      if (b.remove) {
        const p = get<Project>('projects', text(b.id, 80));
        if (p?.customerId !== customer.id) return json({ error: 'Nije pronađeno.' }, 404);
        remove('projects', p.id);
        return json({ ok: true });
      }
      if (all<Project>('projects').filter((p) => p.customerId === customer.id).length >= 20)
        throw new Error('Možeš sačuvati do 20 projekata.');
      const p: Project = {
        id: randomUUID(),
        customerId: customer.id,
        name: text(b.name, 100),
        items: cartItems(b.items),
        createdAt: new Date().toISOString(),
      };
      put('projects', p.id, p);
      return json(p);
    }
    if (action === 'watch') {
      if (b.consent !== true) throw new Error('Prihvati WhatsApp obaveštenje.');
      if (!rateLimit('watch:' + customer.id, 10, 86400000))
        throw new Error('Najviše 10 zahteva dnevno.');
      const item = cartItems([b.item])[0];
      const w: Watch = {
        id: randomUUID(),
        customerId: customer.id,
        item,
        createdAt: new Date().toISOString(),
        notified: false,
      };
      put('watches', w.id, w);
      return json(w);
    }
    if (action === 'draft') {
      const items = cartItems(b.items);
      put('draftCarts', customer.id, {
        id: customer.id,
        customerId: customer.id,
        items,
        updatedAt: Date.now(),
        reminded: false,
      });
      return json({ ok: true });
    }
    return json({ error: 'Nije pronađeno.' }, 404);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Proveri podatke.' }, 400);
  }
}

export const GET = databaseRoute(dbGET, false);
export const POST = databaseRoute(dbPOST, true);
