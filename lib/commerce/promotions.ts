import type { Line, Quote, Order } from './types';
import type { Promotion } from './merchandising-types';
import { round } from './pricing';

// Evaluate each campaign against the same baseline. Campaigns never stack.
export function promotionalQuote(
  lines: Line[],
  campaigns: Promotion[],
  creditPercent: number,
  balance: number,
  reward = 0,
  fixedCredit = 0,
) {
  let winner = lines;
  let policy: Promotion | undefined;
  const total = (values: Line[]) => round(values.reduce((n, i) => n + (i.total || 0), 0));
  if (lines.some((i) => i.openEnded || i.total === null || i.base === null))
    return { lines: winner };
  for (const p of campaigns) {
    if (!p.enabled) continue;
    const covered = lines.filter((i) => p.toolIds.includes(i.toolId));
    if (!covered.length || covered.some((i) => i.start < p.start || i.end > p.end)) continue;
    if (
      p.kind === 'combination' &&
      (!p.toolIds.every((id) => covered.some((i) => i.toolId === id)) ||
        covered.some((i) => i.start !== covered[0].start || i.end !== covered[0].end))
    )
      continue;
    // A campaign requires known costs for the entire rental, including unpromoted lines.
    if (
      lines.some((i) => i.instructions.costPerDay == null || i.instructions.preparationCost == null)
    )
      continue;
    const base = covered.reduce((n, i) => n + i.base!, 0);
    const discountCents = Math.floor(
      Math.min((base * p.percent) / 100, p.maxDiscount) * 100 + 1e-7,
    );
    if (!base || !discountCents) continue;
    let remaining = discountCents;
    const shares = new Map<Line, number>();
    covered.forEach((i, n) => {
      const share =
        n === covered.length - 1 ? remaining : Math.floor((discountCents * i.base!) / base);
      shares.set(i, share / 100);
      remaining -= share;
    });
    const candidate = lines.map((i) => {
      if (!shares.has(i)) return i;
      const amount = round(
        Math.max(i.base! - shares.get(i)!, (i.base! * i.rule.floorPercent) / 100),
      );
      return amount >= i.total!
        ? i
        : { ...i, total: amount, saving: round(i.base! - amount), reason: 'promotion' };
    });
    const rental = total(candidate);
    const cash = round(
      rental - fixedCredit - Math.min(Math.max(0, balance), (rental * creditPercent) / 100),
    );
    const costs = lines.reduce(
      (n, i) =>
        n + (i.instructions.costPerDay! * i.days + i.instructions.preparationCost!) * i.quantity,
      0,
    );
    if (cash <= 0 || cash - costs - reward < (cash * p.minContributionPercent) / 100) continue;
    if (rental < total(winner)) {
      winner = candidate;
      policy = p;
    }
  }
  return { lines: winner, policy };
}

export function promotionSummary(
  policy: Promotion | undefined,
  lines: Line[],
): Pick<Quote, 'promotion' | 'promotionPolicy'> {
  return policy
    ? {
        promotionPolicy: structuredClone(policy),
        promotion: {
          id: policy.id,
          name: policy.name,
          saving: round(
            lines.filter((i) => i.reason === 'promotion').reduce((n, i) => n + i.saving, 0),
          ),
        },
      }
    : {};
}

export function assertPromotionEconomics(order: Order) {
  const policy = order.promotionPolicy;
  if (!policy || order.rentalTotal === null) return;
  if (
    order.items.some(
      (i) => i.instructions.costPerDay == null || i.instructions.preparationCost == null,
    )
  )
    throw new Error('Akcija zahteva poznate troškove svih stavki.');
  const cash = round(order.rentalTotal - order.credit);
  const costs = order.items.reduce(
    (n, i) =>
      n + (i.instructions.costPerDay! * i.days + i.instructions.preparationCost!) * i.quantity,
    0,
  );
  if (
    cash <= 0 ||
    cash - costs - (order.referral?.policy.reward || 0) <
      (cash * policy.minContributionPercent) / 100
  )
    throw new Error(
      'Najam sa akcijom ne pokriva dogovoreni minimalni doprinos. Proveri cenu i troškove.',
    );
}
