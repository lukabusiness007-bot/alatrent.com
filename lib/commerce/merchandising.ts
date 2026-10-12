import { all, get, put, remove, publicData } from '../db';
import { locales, type Localized, type Tool } from '../types';
import { date, text } from '../validation';
import { cartItems, checkCapacity, options, quote, publicQuote } from './data';
import type { Customer, Order } from './types';
import type {
  FunnelEvent,
  MerchandisingConfig,
  Promotion,
  Recommendation,
  RecommendationLink,
  RentalJob,
} from './merchandising-types';

export const merchandisingConfig = (): MerchandisingConfig => ({
  recommendationsEnabled: false,
  promotionsEnabled: false,
  ...get<MerchandisingConfig>('commerce', 'merchandising'),
});
export function publicJobs(): RentalJob[] {
  const ids = new Set(publicData().tools.map((t) => t.id));
  return all<RentalJob>('rentalJobs')
    .filter((j) => j.published)
    .map((j) => ({ ...j, toolIds: j.toolIds.filter((id) => ids.has(id)) }))
    .filter((j) => j.toolIds.length)
    .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
}
export function localized(value: unknown, max = 500, required = true): Localized {
  if (!value || typeof value !== 'object') throw new Error('Unesi prevode na svih pet jezika.');
  return Object.fromEntries(
    locales.map((l) => [l, text((value as Record<string, unknown>)[l], max, required)]),
  ) as Localized;
}
export function toolIds(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length > 200 ||
    value.some((id) => typeof id !== 'string' || !get('tools', id))
  )
    throw new Error('Izaberi postojeće alate.');
  return [...new Set<string>(value)];
}
function number(value: unknown, max: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max)
    throw new Error('Proveri iznos ili procenat.');
  return value;
}
export function validateJob(b: RentalJob): RentalJob {
  return {
    id: text(b.id, 80),
    name: localized(b.name, 120),
    description: localized(b.description, 1000, false),
    toolIds: toolIds(b.toolIds),
    rank: number(b.rank, 10000),
    published: b.published === true,
  };
}
export function validatePromotion(b: Promotion): Promotion {
  if (!['seasonal', 'combination'].includes(b.kind)) throw new Error('Izaberi vrstu akcije.');
  const start = date(b.start),
    end = date(b.end),
    ids = toolIds(b.toolIds);
  if (end < start || !ids.length || (b.kind === 'combination' && ids.length < 2))
    throw new Error('Proveri period i obuhvat akcije.');
  const p = {
    id: text(b.id, 80),
    name: localized(b.name, 120),
    kind: b.kind,
    toolIds: ids,
    start,
    end,
    percent: number(b.percent, 50),
    maxDiscount: number(b.maxDiscount, 10000000),
    minContributionPercent: number(b.minContributionPercent, 90),
    enabled: b.enabled === true,
  };
  if (
    p.enabled &&
    (!p.percent ||
      !p.maxDiscount ||
      ids.some((id) => options(id).costPerDay == null || options(id).preparationCost == null))
  )
    throw new Error('Aktivna akcija zahteva popust, limit i troškove svih obuhvaćenih alata.');
  return p;
}
export function validateRecommendations(value: unknown, sourceId: string): RecommendationLink[] {
  if (!Array.isArray(value) || value.length > 30) throw new Error('Najviše 30 preporuka po alatu.');
  const seen = new Set<string>();
  return value.map((v) => {
    if (
      !v ||
      !['complement', 'upgrade', 'budget', 'alternative'].includes(v.kind) ||
      !get('tools', v.toolId) ||
      v.toolId === sourceId ||
      seen.has(v.toolId)
    )
      throw new Error('Proveri preporuke i ukloni duplikate.');
    seen.add(v.toolId);
    return {
      toolId: v.toolId,
      kind: v.kind,
      reason: localized(v.reason, 500),
      rank: number(v.rank, 10000),
    };
  });
}
export function availability(item: {
  toolId: string;
  start: string;
  end: string;
  quantity: number;
  openEnded?: boolean;
}): 'available' | 'confirmation' | 'unavailable' {
  try {
    cartItems([item]);
    checkCapacity([item]);
  } catch {
    return 'unavailable';
  }
  return get<Tool>('tools', item.toolId)?.quantity == null ? 'confirmation' : 'available';
}
export function recommendations(
  b: {
    items: unknown;
    sourceIndex?: number;
    delivery?: string;
    useCredit?: boolean;
    teamId?: string;
    referralCode?: unknown;
  },
  customer?: Customer,
): { before: ReturnType<typeof publicQuote> | null; offers: Recommendation[] } {
  const items = cartItems(b.items);
  if (
    b.sourceIndex !== undefined &&
    (!Number.isInteger(b.sourceIndex) || b.sourceIndex < 0 || b.sourceIndex >= items.length)
  )
    throw new Error('Proveri polazni alat.');
  // Baseline may be unavailable: allow alternatives to rescue an unavailable cart.
  let before: ReturnType<typeof publicQuote> | null = null;
  try {
    before = publicQuote(
      quote(items, b.delivery || 'pickup', customer, b.useCredit, b.teamId, b.referralCode),
    );
  } catch {
    /* Candidate still gets a full authoritative quote. */
  }
  const offers: Recommendation[] = [];
  if (!merchandisingConfig().recommendationsEnabled) return { before, offers };
  const data = publicData();
  const seen = new Set<string>();
  for (let sourceIndex = 0; sourceIndex < items.length; sourceIndex++) {
    if (b.sourceIndex !== undefined && b.sourceIndex !== sourceIndex) continue;
    const source = items[sourceIndex],
      o = options(source.toolId);
    const explicit = o.recommendations || [];
    const mapped = new Set(explicit.map((v) => v.toolId));
    const blank = Object.fromEntries(locales.map((l) => [l, ''])) as Localized;
    const links: RecommendationLink[] = [
      ...explicit,
      ...o.relatedIds
        .filter((id) => !mapped.has(id))
        .map((toolId, rank) => ({
          toolId,
          kind: 'complement' as const,
          reason: blank,
          rank: 1000 + rank,
        })),
      ...o.alternativeIds
        .filter((id) => !mapped.has(id) && !o.relatedIds.includes(id))
        .map((toolId, rank) => ({
          toolId,
          kind: 'alternative' as const,
          reason: blank,
          rank: 2000 + rank,
        })),
    ].sort((a, b) => a.rank - b.rank);
    for (const link of links) {
      const tool = data.tools.find((t) => t.id === link.toolId);
      if (
        !tool ||
        tool.id === source.toolId ||
        items.some((i) => i.toolId === tool.id) ||
        seen.has(tool.id)
      )
        continue;
      if (link.kind === 'complement' && offers.filter((v) => v.kind === 'complement').length >= 3)
        continue;
      const next =
        link.kind === 'complement'
          ? [...items, { ...source, toolId: tool.id, quantity: 1 }]
          : items.map((i, n) => (n === sourceIndex ? { ...i, toolId: tool.id } : i));
      try {
        const result = quote(
          next,
          b.delivery || 'pickup',
          customer,
          b.useCredit,
          b.teamId,
          b.referralCode,
        );
        const delta =
          before?.total == null || result.total == null
            ? null
            : Math.round((result.total - before.total) * 100) / 100;
        if (link.kind === 'budget' && (delta === null || delta >= 0)) continue;
        seen.add(tool.id);
        offers.push({
          ...link,
          sourceIndex,
          tool,
          items: next,
          quote: publicQuote(result),
          delta,
          availability: next.some(
            (i) =>
              get<Tool>('tools', i.toolId)?.quantity == null ||
              get<Tool>('tools', i.toolId)?.price == null,
          )
            ? 'confirmation'
            : 'available',
        });
      } catch {
        /* Full candidate cart cannot be rented; omit this suggestion. */
      }
    }
  }
  return { before, offers: offers.slice(0, 9) };
}

export function recordEvent(b: Record<string, unknown>) {
  if (b.consent !== true) throw new Error('Potrebna je saglasnost za analitiku.');
  const id = text(b.id, 80),
    session = text(b.session, 80);
  if (
    !/^[a-f0-9-]{36}$/.test(id) ||
    !/^[a-f0-9-]{36}$/.test(session) ||
    !['view', 'offer_view', 'offer_accept', 'cart_add'].includes(String(b.event)) ||
    !['home', 'catalog', 'tool', 'cart', 'account'].includes(String(b.surface))
  )
    throw new Error('Neispravan događaj.');
  const toolId = b.toolId ? text(b.toolId, 80) : undefined;
  if (toolId && !get('tools', toolId)) throw new Error('Alat ne postoji.');
  // Accept only an internal relation key; never persist URLs, query text or contact details.
  const offerKey = b.offerKey ? text(b.offerKey, 180) : undefined;
  if (
    offerKey &&
    !/^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+:(complement|upgrade|budget|alternative)$/.test(offerKey)
  )
    throw new Error('Neispravna ponuda.');
  if (!get('funnelEvents', id))
    put('funnelEvents', id, {
      id,
      session,
      event: b.event,
      surface: b.surface,
      ...(toolId ? { toolId } : {}),
      ...(offerKey ? { offerKey } : {}),
      at: new Date().toISOString(),
    });
  // Bound retention and prevent anonymous telemetry from growing indefinitely.
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
  for (const e of all<FunnelEvent>('funnelEvents')) if (e.at < cutoff) remove('funnelEvents', e.id);
  return { ok: true };
}
export function funnelMetrics(orders: Order[]) {
  const events = all<FunnelEvent>('funnelEvents').filter(
    (e) => Date.parse(e.at) >= Date.now() - 30 * 86400000,
  );
  const sessions = new Set(events.filter((e) => e.event === 'view').map((e) => e.session));
  const requests = new Set(
    events.filter((e) => e.event === 'request' && sessions.has(e.session)).map((e) => e.session),
  );
  const exposed = new Set(
    events
      .filter((e) => e.event === 'offer_view' && e.offerKey)
      .map((e) => e.session + ':' + e.offerKey),
  );
  const accepted = new Set(
    events
      .filter((e) => e.event === 'offer_accept' && exposed.has(e.session + ':' + e.offerKey))
      .map((e) => e.session + ':' + e.offerKey),
  );
  const finished = orders.filter((o) => o.status === 'completed' && o.paid);
  return {
    sessions: sessions.size,
    conversion: sessions.size ? (requests.size / sessions.size) * 100 : null,
    offerExposures: exposed.size,
    offerAcceptance: exposed.size ? (accepted.size / exposed.size) * 100 : null,
    confirmationRate: orders.length
      ? (orders.filter((o) => ['confirmed', 'active', 'completed'].includes(o.status)).length /
          orders.length) *
        100
      : null,
    averageRental: finished.length
      ? finished.reduce((n, o) => n + (o.rentalTotal || 0) - o.credit, 0) / finished.length
      : null,
  };
}
