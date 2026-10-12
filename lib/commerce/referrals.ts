import { all, get, put, transaction } from '../db';
import type { RentalRequest } from '../types';
import type { Customer, Line, Order, ReferralProgram, ReferralReward, ReferralSummary } from './types';
import { calculate, round } from './pricing';

export const defaultReferralProgram: ReferralProgram = {
  enabled: false, percent: 10, maxDiscount: 1000, minimum: 5000, reward: 500,
  monthlyLimit: 3, minContributionPercent: 20, pilotEndsAt: '', memberIds: [],
};
export function normalizeReferral(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length > 20) throw new Error('Proveri kod preporuke.');
  const code = value.trim().toUpperCase();
  if (code && !/^[A-Z0-9-]{4,20}$/.test(code)) throw new Error('Proveri kod preporuke.');
  return code;
}
export function programActive(p: ReferralProgram) {
  return p.enabled && (!p.pilotEndsAt || Date.parse(p.pilotEndsAt) > Date.now());
}
export function referrerActive(c: Customer, p: ReferralProgram) {
  return programActive(p) && !c.referralPaused && (!p.memberIds.length || p.memberIds.includes(c.id));
}
const normalizedPhone = (value: string) => {
  let p = value.replace(/[ ().-]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (p.startsWith('0')) p = '+381' + p.slice(1);
  return p;
};
export function hasPriorRental(c: Customer, exceptId = '') {
  return !!c.rewarded || all<Order>('orders').some(o => o.id !== exceptId && o.status !== 'cancelled' &&
    (o.customerId === c.id || normalizedPhone(o.phone) === c.phone)) ||
    all<RentalRequest>('requests').some(o => o.status !== 'cancelled' && normalizedPhone(o.phone) === c.phone);
}
export function referralFor(customer: Customer | undefined, raw: unknown, p: ReferralProgram, teamId?: string) {
  // Explicit empty input clears an attributed registration code.
  const stored = programActive(p) && customer && !hasPriorRental(customer) && customer.referredBy && customer.referredAt && Date.parse(customer.referredAt) > Date.now() - 30 * 86400000
    ? get<Customer>('customers', customer.referredBy)?.referralCode : '';
  const code = normalizeReferral(raw === undefined ? stored || '' : raw);
  if (!code) return undefined;
  if (!customer) throw new Error('Prijavi se ili napravi nalog da iskoristiš kod preporuke.');
  const referrer = all<Customer>('customers').find(c => c.referralCode === code);
  if (!referrer || !referrerActive(referrer, p)) throw new Error('Kod preporuke trenutno nije aktivan.');
  if (teamId) throw new Error('Kod preporuke važi samo za lični najam.');
  if (referrer.id === customer.id || referrer.phone === customer.phone) throw new Error('Ne možeš koristiti sopstveni kod.');
  if (hasPriorRental(customer)) throw new Error('Kod važi samo za prvi najam. Već postoji najam ili zahtev na ovom nalogu/broju.');
  return referrer;
}
export function referralLines(lines: Line[], p: ReferralProgram) {
  const base = lines.reduce((n, i) => n + (i.base || 0), 0);
  const percent = base ? Math.min(p.percent, p.maxDiscount / base * 100) : 0;
  const updated = lines.map(i => i.price === null ? i : ({ ...i,
    ...calculate(i.price, i.start, i.days, i.quantity, i.rule, i.clubPercent, i.bundlePercent, percent),
  }));
  // Rounding per line must never exceed the order-wide cap.
  let excess = round(Math.max(0, lines.reduce((n,i)=>n+(i.total || 0),0) - updated.reduce((n,i)=>n+(i.total || 0),0) - p.maxDiscount));
  for (let n = 0; excess > 0 && n < updated.length; n++) {
    const correction = Math.min(excess, round((lines[n].total || 0) - (updated[n].total || 0)));
    updated[n].total = round((updated[n].total || 0) + correction);
    updated[n].saving = round((updated[n].base || 0) - updated[n].total!);
    excess = round(excess - correction);
  }
  return updated;
}
export function updateReferralDiscount(o: Order) {
  if (!o.referral || o.rentalTotal === null) return;
  if (o.items.some(i=>i.reason==='promotion')) { o.referral.discount=0; return; }
  const baseline = o.items.reduce((sum,i) => sum + (i.price === null ? 0 : calculate(i.price,i.start,i.days,i.quantity,i.rule,i.clubPercent,i.bundlePercent).total),0);
  const lineDiscount = round(Math.max(0,baseline-o.items.reduce((sum,i)=>sum+(i.total||0),0)));
  o.referral.discount = round(Math.max(0,Math.min(lineDiscount,baseline-o.rentalTotal)));
}
export function rentalCosts(lines: Line[]): number | null {
  if (lines.some(i => !Number.isFinite(i.instructions.costPerDay) || !Number.isFinite(i.instructions.preparationCost) ||
    i.instructions.costPerDay! < 0 || i.instructions.preparationCost! < 0)) return null;
  return round(lines.reduce((n,i)=>n+(i.instructions.costPerDay! * i.days + i.instructions.preparationCost!) * i.quantity,0));
}
export function economics(rental: number | null, credit: number, reward: number, costs: number | null, target: number) {
  const cash = rental === null ? null : round(rental - credit);
  const contribution = cash === null || costs === null ? null : round(cash - reward - costs);
  return { cash, costs, reward, contribution,
    maxCosts: cash === null ? null : round(cash * (1 - target / 100) - reward),
    percent: contribution === null || !cash ? null : round(contribution / cash * 100),
    safe: contribution !== null && cash !== null && cash > 0 && contribution >= cash * target / 100,
  };
}
export function assertReferralEconomics(o: Order) {
  if (!o.referral && !(o.referralVersion === 2 && o.credit > 0)) return;
  const costs = rentalCosts(o.items);
  const e = economics(o.rentalTotal, o.credit, o.referral?.policy.reward || 0, costs, o.referral?.policy.minContributionPercent ?? o.creditContributionTarget ?? 20);
  if (costs === null) throw new Error('Pre potvrde unesi dnevni trošak i trošak pripreme za sve alate u najmu sa preporukom ili kreditom.');
  if (!e.safe) throw new Error(`Najam ne pokriva ciljni doprinos posle popusta, kredita i nagrade. Najviše dozvoljeni troškovi: ${e.maxCosts} RSD. Proveri cenu i troškove.`);
  o.referralCosts = costs;
}
export function monthKey(at: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Belgrade', year: 'numeric', month: '2-digit' }).formatToParts(new Date(at));
  return parts.find(p=>p.type==='year')!.value + '-' + parts.find(p=>p.type==='month')!.value;
}
export function referralSummary(c: Customer, p: ReferralProgram): ReferralSummary {
  const entries = all<ReferralReward>('referralRewards').filter(r=>r.referrerId === c.id);
  const month = monthKey(new Date().toISOString());
  return { policy: { ...p, memberIds: [] }, active: referrerActive(c,p),
    pending: all<Order>('orders').filter(o=>o.referral?.referrerId===c.id && o.referral.status==='pending' && o.status!=='cancelled').length,
    successful: entries.filter(r=>!r.reversedAt).length,
    remaining: Math.max(0,p.monthlyLimit-entries.filter(r=>monthKey(r.createdAt)===month).length),
    earned: round(entries.filter(r=>!r.reversedAt).reduce((n,r)=>n+r.amount,0)),
    reversed: round(entries.filter(r=>r.reversedAt).reduce((n,r)=>n+r.amount,0)),
  };
}
// Called inside the order transaction. One ledger key per order, one first rental per customer.
export function grantReferral(o: Order, c: Customer) {
  const r = o.referral;
  if (!r || r.status !== 'pending' || get('referralRewards',o.id)) return;
  if (!r.verified || c.rewarded) { r.status='rejected'; return; }
  const ref = get<Customer>('customers',r.referrerId);
  if (!ref || ref.id===c.id || ref.phone===c.phone || o.phone!==c.phone ||
      all<Order>('orders').some(x=>x.id!==o.id && x.status==='completed' && (x.customerId===c.id || x.phone===c.phone))) {
    r.status='rejected'; return;
  }
  // Pausing a code prevents new referrals; accepted orders retain their promised terms.
  const count = all<ReferralReward>('referralRewards').filter(x=>x.referrerId===ref.id && monthKey(x.createdAt)===monthKey(o.completedAt!)).length;
  c.rewarded=true;
  if (count >= r.policy.monthlyLimit) r.status='limit';
  else {
    r.status='granted';
    put('customers',ref.id,{...ref,credit:round(ref.credit+r.policy.reward)});
    put('referralRewards',o.id,{orderId:o.id,referrerId:ref.id,customerId:c.id,amount:r.policy.reward,createdAt:o.completedAt!} satisfies ReferralReward);
  }
}
export function reverseReferral(orderId: string, reason: string) {
  return transaction(()=>{
    const entry=get<ReferralReward>('referralRewards',orderId);
    const order=get<Order>('orders',orderId);
    if (!entry || !order?.referral) throw new Error('Nagrada nije dodeljena.');
    if (entry.reversedAt) return {ok:true};
    if (reason.trim().length<5) throw new Error('Unesi razlog poništavanja (najmanje 5 znakova).');
    const ref=get<Customer>('customers',entry.referrerId)!;
    // A spent reward creates a debt offset by future rewards. No silent loss of the audit trail.
    put('customers',ref.id,{...ref,credit:round(ref.credit-entry.amount)});
    put('referralRewards',orderId,{...entry,reversedAt:new Date().toISOString(),reason});
    put('orders',orderId,{...order,referral:{...order.referral,status:'reversed'}});
    return {ok:true};
  });
}
