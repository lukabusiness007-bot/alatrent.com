import { all, get, put, occupied, settings } from '../db';
import { date, rentalDays, today, text } from '../validation';
import type { Tool, Category } from '../types';
import type {
  CommerceConfig,
  ToolOptions,
  Customer,
  Order,
  PublicCustomer,
  CartItem,
  Quote,
  Line,
  Bundle,
  Team,
} from './types';
import { calculate, defaultRule, round } from './pricing';
import { defaultReferralProgram, referralFor, referralLines } from './referrals';
export const blankOptions: ToolOptions = {
  instructions: '',
  manualUrl: '',
  videoUrl: '',
  model: '',
  relatedIds: [],
  alternativeIds: [],
};
export function config(): CommerceConfig {
  const saved = get<CommerceConfig>('commerce', 'config');
  return {
    ...(saved || {
      rule: defaultRule,
      categories: {},
      clubThreshold: 3,
      clubPercent: 5,
      referralCredit: 0,
      creditLimitPercent: 20,
      returnTime: '17:00',
      reviewUrl: '',
      templates: {},
      templateLanguage: 'sr',
      enabled: false,
    }),
    referralProgram: { ...defaultReferralProgram, ...saved?.referralProgram },
  };
}
export const options = (id: string) => get<ToolOptions>('toolOptions', id) || blankOptions;
export function member(c: Customer): PublicCustomer {
  const completed = all<Order>('orders').filter(
    (o) =>
      o.customerId === c.id &&
      o.status === 'completed' &&
      o.paid &&
      o.completedAt &&
      Date.parse(o.completedAt) >= Date.now() - 365 * 86400000,
  ).length;
  const cfg = config();
  const { salt: _s, hash: _h, recoveryHash: _r, ...safe } = c;
  return {
    ...safe,
    completed,
    tier: c.partnerPercent > 0 ? 'partner' : completed >= cfg.clubThreshold ? 'regular' : 'member',
    discount: Math.max(c.partnerPercent, completed >= cfg.clubThreshold ? cfg.clubPercent : 0),
  };
}
export function cartItems(input: unknown): CartItem[] {
  if (!Array.isArray(input) || !input.length || input.length > 30)
    throw new Error('Izaberi 1–30 stavki.');
  const merged = new Map<string, CartItem>();
  for (const b of input) {
    const toolId = text(b.toolId, 80),
      start = date(b.start),
      end = date(b.end),
      days = rentalDays(start, end);
    if (
      start < today() ||
      days < 1 ||
      days > 90 ||
      Date.parse(start) > Date.now() + 366 * 86400000 ||
      !Number.isInteger(b.quantity) ||
      b.quantity < 1 ||
      b.quantity > 100
    )
      throw new Error('Proveri datume i količinu.');
    const key = `${toolId}:${start}:${end}`;
    const previous = merged.get(key);
    merged.set(key, { toolId, start, end, quantity: b.quantity + (previous?.quantity || 0) });
  }
  const items = [...merged.values()];
  if (items.some((i) => i.quantity > 100)) throw new Error('Najviše 100 komada po stavci.');
  return items;
}
export function checkCapacity(items: CartItem[], exceptId = '', requireKnown = false) {
  for (const item of items) {
    const tool = get<Tool>('tools', item.toolId);
    if (!tool || !tool.published || !get<Category>('categories', tool.categoryId)?.published)
      throw new Error('Alat više nije u ponudi.');
    if (requireKnown && tool.quantity === null)
      throw new Error('Unesi raspoloživu količinu za sve alate.');
    if (tool.quantity === null) continue;
    const days = rentalDays(item.start, item.end);
    for (let d = 0; d < days; d++) {
      const at = new Date(Date.parse(item.start) + d * 86400000).toISOString().slice(0, 10);
      const wanted = items
        .filter((i) => i.toolId === tool.id && i.start <= at && i.end >= at)
        .reduce((n, i) => n + i.quantity, 0);
      if (occupied(tool.id, at, at, exceptId) + wanted > tool.quantity)
        throw new Error(`Nema dovoljno slobodnih komada: ${tool.name.sr} (${at}).`);
    }
  }
}
export function quote(
  input: unknown,
  delivery: string,
  customer?: Customer,
  useCredit = false,
  teamId?: string,
  referralCode?: unknown,
): Quote {
  if (!['pickup', 'standard', 'express'].includes(delivery)) throw new Error('Izaberi dostavu.');
  const items = cartItems(input);
  checkCapacity(items);
  const team = teamId ? get<Team>('teams', teamId) : undefined;
  if (teamId && (!team || !customer || !team.customerIds.includes(customer.id)))
    throw new Error('Nemaš pristup ovoj firmi.');
  const cfg = config(),
    club = Math.max(customer ? member(customer).discount : 0, team?.discount || 0);
  const bundles = all<Bundle>('bundles').filter((b) => b.published && b.toolIds.length > 1);
  let lines: Line[] = items.map((item) => {
    const tool = get<Tool>('tools', item.toolId)!;
    const opts = options(tool.id),
      rule = opts.rule || cfg.categories[tool.categoryId] || cfg.rule;
    const bundlePercent = Math.max(
      0,
      ...bundles
        .filter(
          (b) =>
            b.toolIds.includes(tool.id) &&
            b.toolIds.every((id) =>
              items.some((i) => i.toolId === id && i.start === item.start && i.end === item.end),
            ),
        )
        .map((b) => b.discount),
    );
    const days = rentalDays(item.start, item.end);
    return {
      ...item,
      name: tool.name,
      slug: tool.slug,
      days,
      price: tool.price,
      rule,
      clubPercent: club,
      bundlePercent,
      instructions: opts,
      ...(tool.price === null
        ? { base: null, total: null, saving: 0, reason: 'quote' }
        : calculate(tool.price, item.start, days, item.quantity, rule, club, bundlePercent)),
    };
  });
  const unknown = lines.some((l) => l.total === null);
  const referrer = referralFor(customer, referralCode, cfg.referralProgram, teamId);
  const beforeReferral = unknown ? null : round(lines.reduce((n,l)=>n+l.total!,0));
  if (referrer) {
    if (unknown) throw new Error('Kod se može koristiti kada svi alati imaju poznatu cenu.');
    const base = round(lines.reduce((n,l)=>n+l.base!,0));
    if (base < cfg.referralProgram.minimum) throw new Error(`Za kod preporuke potreban je najam od najmanje ${cfg.referralProgram.minimum} RSD pre popusta, bez dostave.`);
    lines = referralLines(lines, cfg.referralProgram);
  }
  const rentalTotal = unknown ? null : round(lines.reduce((n, l) => n + l.total!, 0));
  const baseTotal = unknown ? null : round(lines.reduce((n, l) => n + l.base!, 0));
  const s = settings(),
    deliveryTotal =
      delivery === 'pickup' ? 0 : delivery === 'standard' ? s.standardDelivery : s.expressDelivery;
  const credit =
    !teamId && useCredit && customer && rentalTotal !== null
      ? round(Math.min(Math.max(0, customer.credit), (rentalTotal * cfg.creditLimitPercent) / 100))
      : 0;
  return {
    ...(referrer ? { referral: {
      referrerId: referrer.id, code: referrer.referralCode,
      policy: { ...cfg.referralProgram },
      discount: round(beforeReferral! - rentalTotal!), status: 'pending' as const,
    } } : {}),
    items: lines,
    rentalTotal,
    baseTotal,
    saving: round(lines.reduce((n, l) => n + l.saving, 0)),
    deliveryTotal,
    credit,
    total: rentalTotal === null ? null : round(rentalTotal + deliveryTotal - credit),
  };
}
export function saveCustomer(c: Customer) {
  put('customers', c.id, c);
}

export function publicQuote(q: Quote): Quote {
  return {
    ...q,
    ...(q.referral ? { referral: { ...q.referral, referrerId: '', policy: { ...q.referral.policy, memberIds: [] } } } : {}),
    items: q.items.map((i) => {
      const { costPerDay: _day, preparationCost: _prep, ...instructions } = i.instructions;
      return { ...i, instructions };
    }),
  };
}
