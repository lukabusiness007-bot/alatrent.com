import type { PriceRule, Tier } from './types';
export const defaultRule: PriceRule = {
  tiers: [
    { from: 1, percent: 100 },
    { from: 3, percent: 80 },
    { from: 6, percent: 70 },
  ],
  floorPercent: 60,
  weekendPercent: 100,
  quietPercent: 100,
  quietDays: [],
};
export const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function validateRule(value: unknown): PriceRule {
  const r = value as PriceRule;
  if (
    !r ||
    !Array.isArray(r.tiers) ||
    r.tiers.length < 1 ||
    r.tiers.length > 12 ||
    !Array.isArray(r.quietDays)
  )
    throw new Error('Neispravne tarife.');
  const validPercent = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100;
  if (
    ![r.floorPercent, r.weekendPercent, r.quietPercent].every(validPercent) ||
    r.floorPercent < 1 ||
    r.quietDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  )
    throw new Error('Proveri procente i dane.');
  let prev = 0;
  const tiers: Tier[] = r.tiers.map((t) => {
    if (!Number.isInteger(t.from) || t.from <= prev || t.from > 90 || !validPercent(t.percent))
      throw new Error('Tarife moraju ići redom od prvog dana.');
    prev = t.from;
    return { from: t.from, percent: t.percent };
  });
  if (tiers[0].from !== 1) throw new Error('Prva tarifa mora početi od prvog dana.');
  return {
    tiers,
    floorPercent: r.floorPercent,
    weekendPercent: r.weekendPercent,
    quietPercent: r.quietPercent,
    quietDays: [...new Set(r.quietDays)],
  };
}
export function calculate(
  price: number,
  start: string,
  days: number,
  quantity: number,
  rule: PriceRule,
  club = 0,
  bundle = 0,
  referral = 0,
) {
  let duration = 0;
  for (let d = 1; d <= days; d++)
    duration += (price * [...rule.tiers].reverse().find((t) => t.from <= d)!.percent) / 100;
  const base = price * days;
  const weekdays = Array.from({ length: days }, (_, i) =>
    new Date(Date.parse(start) + i * 86400000).getUTCDay(),
  );
  const options = [
    { value: duration, reason: 'duration' },
    { value: base * (1 - club / 100), reason: 'club' },
    { value: base * (1 - bundle / 100), reason: 'bundle' },
    { value: base * (1 - referral / 100), reason: 'referral' },
  ];
  if (weekdays.every((d) => [5, 6, 0].includes(d)))
    options.push({ value: (base * rule.weekendPercent) / 100, reason: 'weekend' });
  if (weekdays.every((d) => rule.quietDays.includes(d)))
    options.push({ value: (base * rule.quietPercent) / 100, reason: 'quiet' });
  const winner = options.sort((a, b) => a.value - b.value)[0];
  const total = round(Math.max(winner.value, (base * rule.floorPercent) / 100) * quantity);
  return {
    base: round(base * quantity),
    total,
    saving: round(base * quantity - total),
    reason: total < base * quantity ? winner.reason : 'standard',
  };
}
