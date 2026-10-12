import { merchandisingConfig, validateJob, validatePromotion, validateRecommendations, funnelMetrics } from '@/lib/commerce/merchandising';
import { databaseRoute } from '@/lib/db';
import { randomUUID } from 'node:crypto';
import { authorized, sameOrigin } from '@/lib/auth';
import { all, get, put, settings, transaction } from '@/lib/db';
import { text } from '@/lib/validation';
import { config, member, options } from '@/lib/commerce/data';
import { validateRule } from '@/lib/commerce/pricing';
import { updateOrder, publicOrder } from '@/lib/commerce/orders';
import { messagingStatus, processMessages } from '@/lib/commerce/messages';
import type { Bundle, Customer, Message, Order, ToolOptions, Team, ReferralProgram, ReferralReward } from '@/lib/commerce/types';
import { defaultReferralProgram, referralSummary, reverseReferral, economics, rentalCosts } from '@/lib/commerce/referrals';
import type { Tool } from '@/lib/types';
const json = (v: unknown, status = 200) =>
  Response.json(v, { status, headers: { 'Cache-Control': 'no-store' } });
function percent(v: unknown, max = 100) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > max)
    throw new Error('Neispravan procenat.');
  return v;
}
function amount(v: unknown) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 10000000)
    throw new Error('Neispravan iznos.');
  return Math.round(v * 100) / 100;
}
function safeUrl(v: unknown) {
  const s = text(v || '', 1000, false);
  if (s && new URL(s).protocol !== 'https:') throw new Error('Link mora početi sa https://');
  return s;
}
function ids(v: unknown): string[] {
  if (
    !Array.isArray(v) ||
    v.length > 30 ||
    v.some((id) => typeof id !== 'string' || !get('tools', id))
  )
    throw new Error('Izaberi postojeće alate.');
  return [...new Set(v)];
}
async function dbGET() {
  if (!(await authorized())) return json({ error: 'Prijavi se.' }, 401);
  const orders = all<Order>('orders');
  const finished = orders.filter((o) => o.status === 'completed' && o.paid);
  const customers = all<Customer>('customers');
  const costed = finished.filter((o) =>
    o.items.every(
      (i) => i.instructions.costPerDay != null && i.instructions.preparationCost != null,
    ),
  );
  const estimatedContribution = costed.reduce(
    (n, o) =>
      n +
      (o.rentalTotal || 0) -
      o.credit -
      o.items.reduce(
        (sum, i) =>
          sum +
          ((i.instructions.costPerDay || 0) * i.days + (i.instructions.preparationCost || 0)) *
            i.quantity,
        0,
      ),
    0,
  );
  const from = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
    to = new Date().toISOString().slice(0, 10);
  const knownTools = all<Tool>('tools').filter((t) => t.quantity != null && t.quantity > 0);
  const stockDays = knownTools.reduce((n, t) => n + t.quantity! * 30, 0);
  const bookedDays = orders
    .filter((o) => ['confirmed', 'active', 'completed'].includes(o.status))
    .flatMap((o) => o.items)
    .filter((i) => knownTools.some((t) => t.id === i.toolId) && i.start <= to && (i.openEnded || i.end >= from))
    .reduce(
      (n, i) =>
        n +
        (Math.round(
          (Date.parse(!i.openEnded && i.end < to ? i.end : to) - Date.parse(i.start > from ? i.start : from)) /
            86400000,
        ) +
          1) *
          i.quantity,
      0,
    );
  return json({
    config: config(),
    merchandising: merchandisingConfig(),
    jobs: all('rentalJobs'),
    promotions: all('promotions'),
    funnel: funnelMetrics(orders),
    tools: all<Tool>('tools').map((t) => ({ ...t, options: options(t.id) })),
    categories: all('categories'),
    bundles: all('bundles'),
    teams: all('teams'),
    orders: orders.map(o => ({ ...publicOrder(o), referral: o.referral })),
    referrals: {
      members: customers.map(c=>({ id:c.id, name:c.name, code:c.referralCode, paused:!!c.referralPaused, ...referralSummary(c,config().referralProgram) })),
      rewards: all<ReferralReward>('referralRewards'),
      orders: orders.filter(o=>o.referral).map(o=>({id:o.id, code:o.referral!.code, status:o.status, referralStatus:o.referral!.status,
        discount:o.referral!.discount, ...economics(o.rentalTotal,o.credit,o.referral!.policy.reward,
          o.status==='pending' ? rentalCosts(o.items.map(i=>({...i,instructions:options(i.toolId)}))) : (o.referralCosts ?? rentalCosts(o.items)),o.referral!.policy.minContributionPercent) })),
      costedTools: all<Tool>('tools').filter(t=>t.published && options(t.id).costPerDay!=null && options(t.id).preparationCost!=null).length,
      publishedTools: all<Tool>('tools').filter(t=>t.published).length,
    },
    customers: customers.map(member),
    messages: all<Message>('messages')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 200),
    inbox: all('whatsappInbox').slice(-50),
    integration: messagingStatus(),
    metrics: {
      costedOrders: costed.length,
      estimatedContribution,
      utilization: stockDays ? Math.min(100, (bookedDays / stockDays) * 100) : null,
      orders: orders.length,
      completed: finished.length,
      revenue: finished.reduce((n, o) => n + (o.rentalTotal || 0) - o.credit, 0),
      averageItems: finished.length
        ? finished.reduce((n, o) => n + o.items.reduce((sum, i) => sum + i.quantity, 0), 0) /
          finished.length
        : 0,
      repeatCustomers: customers.filter(
        (c) => finished.filter((o) => o.customerId === c.id).length > 1,
      ).length,
      discounts: finished.reduce((n, o) => n + o.saving + o.credit, 0),
    },
  });
}
async function dbPOST(r: Request) {
  if (!sameOrigin(r) || !(await authorized())) return json({ error: 'Prijavi se.' }, 403);
  try {
    const raw = await r.text();
    if (raw.length > 100000) return json({ error: 'Prevelik zahtev.' }, 413);
    const b = JSON.parse(raw);
    if (b.action === 'merchandising') {
      const value = {recommendationsEnabled:b.config?.recommendationsEnabled===true,promotionsEnabled:b.config?.promotionsEnabled===true};
      put('commerce','merchandising',value); return json(value);
    }
    if (b.action === 'job') {
      const value = validateJob({...b.job,id:b.job.id || randomUUID()});
      put('rentalJobs',value.id,value); return json(value);
    }
    if (b.action === 'promotion') {
      const value = validatePromotion({...b.promotion,id:b.promotion.id || randomUUID()});
      put('promotions',value.id,value); return json(value);
    }
    if (b.action === 'config') {
      const c = b.config;
      if (
        !Number.isInteger(c.clubThreshold) ||
        c.clubThreshold < 1 ||
        c.clubThreshold > 100 ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(c.returnTime)
      )
        throw new Error('Proveri prag kluba i vreme vraćanja.');
      const categories = Object.fromEntries(
        Object.entries(c.categories || {}).map(([id, rule]) => {
          if (!get('categories', id)) throw new Error('Kategorija ne postoji.');
          return [id, validateRule(rule)];
        }),
      );
      const templates = Object.fromEntries(
        Object.entries(c.templates || {}).map(([k, v]) => {
          const name = text(v, 100, false);
          if (name && !/^[a-z0-9_]+$/.test(name)) throw new Error('Neispravno ime šablona.');
          return [k, name];
        }),
      );
      const language = text(c.templateLanguage, 15);
      if (!/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(language))
        throw new Error('Proveri jezik WhatsApp šablona.');
      const input = { ...defaultReferralProgram, ...config().referralProgram, ...c.referralProgram };
      if (!Number.isInteger(input.monthlyLimit) || input.monthlyLimit < 1 || input.monthlyLimit > 100 ||
          !Array.isArray(input.memberIds) || input.memberIds.length>100 || input.memberIds.some((id: unknown)=>typeof id!=='string'||!get('customers',id)))
        throw new Error('Proveri mesečni limit i članove pilot programa.');
      if (input.pilotEndsAt && (!Number.isFinite(Date.parse(input.pilotEndsAt)) || (input.enabled && Date.parse(input.pilotEndsAt)<=Date.now())))
        throw new Error('Završetak pilota mora biti u budućnosti.');
      const referralProgram: ReferralProgram = {
        enabled: input.enabled===true, percent: percent(input.percent,50), maxDiscount: amount(input.maxDiscount),
        minimum: amount(input.minimum), reward: amount(input.reward), monthlyLimit: input.monthlyLimit,
        minContributionPercent: percent(input.minContributionPercent,90), pilotEndsAt: input.pilotEndsAt ? new Date(input.pilotEndsAt).toISOString() : '',
        memberIds: [...new Set<string>(input.memberIds)],
      };
      if (referralProgram.enabled && (referralProgram.minimum<=0 || referralProgram.reward<=0 || referralProgram.percent<=0 || referralProgram.maxDiscount<=0))
        throw new Error('Aktivan program zahteva pozitivan prag, popust i nagradu.');
      if (referralProgram.enabled) {
        const published=all<Tool>('tools').filter(t=>t.published && t.price!==null);
        if (!published.length || published.some(t=>options(t.id).costPerDay==null || options(t.id).preparationCost==null))
          throw new Error('Pre aktiviranja programa unesi dnevni trošak i pripremu za sve objavljene alate sa cenom.');
        const minimumCash=referralProgram.minimum-Math.min(referralProgram.minimum*referralProgram.percent/100,referralProgram.maxDiscount);
        if (!economics(minimumCash,0,referralProgram.reward,0,referralProgram.minContributionPercent).safe)
          throw new Error('Prag i nagrada ne ostavljaju dovoljan doprinos ni pre troškova.');
      }
      const cfg = {
        rule: validateRule(c.rule),
        categories,
        clubThreshold: c.clubThreshold,
        clubPercent: percent(c.clubPercent, 50),
        referralCredit: amount(c.referralCredit),
        referralProgram,
        creditLimitPercent: percent(c.creditLimitPercent, 50),
        returnTime: c.returnTime,
        reviewUrl: safeUrl(c.reviewUrl),
        templates,
        templateLanguage: language,
        enabled: c.enabled === true,
      };
      put('commerce', 'config', cfg);
      return json(cfg);
    }
    if (b.action === 'referral-reverse') return json(reverseReferral(text(b.id,80),text(b.reason,500)));
    if (b.action === 'referral-pause') return json(transaction(()=>{
      const c=get<Customer>('customers',text(b.id,80));
      if (!c) throw new Error('Član ne postoji.');
      put('customers',c.id,{...c,referralPaused:b.paused===true});
      return {ok:true};
    }));
    if (b.action === 'tool') {
      const id = text(b.id, 80);
      if (!get('tools', id)) throw new Error('Alat ne postoji.');
      const o = b.options;
      const result: ToolOptions = {
        recommendations: validateRecommendations(o.recommendations ?? options(id).recommendations ?? [],id),
        costPerDay: o.costPerDay == null ? null : amount(o.costPerDay),
        preparationCost: o.preparationCost == null ? null : amount(o.preparationCost),
        ...(o.rule ? { rule: validateRule(o.rule) } : {}),
        model: text(o.model || '', 150, false),
        instructions: text(o.instructions || '', 10000, false),
        manualUrl: safeUrl(o.manualUrl),
        videoUrl: safeUrl(o.videoUrl),
        relatedIds: ids(o.relatedIds || []),
        alternativeIds: ids(o.alternativeIds || []),
      };
      put('toolOptions', id, result);
      return json(result);
    }
    if (b.action === 'bundle') {
      const p = b.bundle;
      const result: Bundle = {
        id: p.id ? text(p.id, 80) : randomUUID(),
        name: text(p.name, 120),
        description: text(p.description || '', 1000, false),
        toolIds: ids(p.toolIds),
        discount: percent(p.discount, 50),
        published: p.published === true,
      };
      if (result.toolIds.length < 2)
        throw new Error('Paket treba da sadrži najmanje dva različita alata.');
      put('bundles', result.id, result);
      return json(result);
    }
    if (b.action === 'order' || b.action === 'extension') return json(updateOrder(b));
    if (b.action === 'team') {
      const t = b.team;
      if (
        !Array.isArray(t.customerIds) ||
        t.customerIds.length > 100 ||
        t.customerIds.some((id: unknown) => typeof id !== 'string' || !get('customers', id))
      )
        throw new Error('Izaberi postojeće članove.');
      const team: Team = {
        id: t.id ? text(t.id, 80) : randomUUID(),
        name: text(t.name, 120),
        customerIds: [...new Set<string>(t.customerIds)],
        discount: percent(t.discount, 50),
      };
      put('teams', team.id, team);
      return json(team);
    }
    if (b.action === 'customer') {
      const c = get<Customer>('customers', text(b.id, 80));
      if (!c) throw new Error('Kupac ne postoji.');
      put('customers', c.id, { ...c, partnerPercent: percent(b.partnerPercent, 50) });
      return json({ ok: true });
    }
    if (b.action === 'messages') return json(await processMessages());
    if (b.action === 'retry') {
      const m = get<Message>('messages', text(b.id, 160));
      if (!m || !['failed', 'unknown'].includes(m.status))
        throw new Error('Poruka nije za ponovno slanje.');
      if (m.status === 'unknown' && b.confirmedNotSent !== true)
        throw new Error('Prvo proveri da poruka nije poslata kod provajdera.');
      put('messages', m.id, {
        ...m,
        status: 'queued',
        attempts: 0,
        nextAt: Date.now(),
        error: undefined,
      });
      return json({ ok: true });
    }
    return json({ error: 'Nepoznata radnja.' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Proveri unos.' }, 400);
  }
}

export const GET = databaseRoute(dbGET, false);
export const POST = databaseRoute(dbPOST, true);
