'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { Locale } from '@/lib/types';
import type { CartItem } from '@/lib/commerce/types';
import { ct } from '@/lib/commerce/copy';
import { durationDays, endForDays } from '@/lib/commerce/period';
import { copy } from '@/lib/i18n';

export type RentalPeriodValue = Pick<CartItem, 'start' | 'end' | 'openEnded'>;
export default function RentalPeriod({ value, onChange, locale, today, required = false }: {
  value: RentalPeriodValue;
  onChange: (value: RentalPeriodValue) => void;
  locale: Locale;
  today: string;
  required?: boolean;
}) {
  const id = useId();
  const days = durationDays(value.start, value.end);
  const [custom, setCustom] = useState(days > 7);
  const [selectedDays, setSelectedDays] = useState(days || 1);
  const lastChange = useRef('');
  const signature = `${value.start}:${value.end}:${!!value.openEnded}`;
  useEffect(() => {
    if (days > 0) setSelectedDays(days);
    if (signature !== lastChange.current) setCustom(days > 7);
  }, [days, signature]);
  function change(next: RentalPeriodValue) {
    lastChange.current = `${next.start}:${next.end}:${!!next.openEnded}`;
    onChange(next);
  }
  function selectDays(count: number) {
    setSelectedDays(count);
    const start = value.start || today;
    change({ start, end: endForDays(start, count), openEnded: false });
  }
  const formatDate = (date: string) => new Intl.DateTimeFormat(
    locale === 'sr' ? 'sr-Latn-RS' : locale, { day: 'numeric', month: 'long', timeZone: 'UTC' },
  ).format(new Date(date));
  return <div className="rental-period">
    <label className="rental-start" htmlFor={`${id}-start`}>
      {ct(locale, 'whenNeeded')}
      <input id={`${id}-start`} type="date" min={today} required={required} value={value.start}
        onChange={e => change({ ...value, start: e.target.value,
          end: value.openEnded ? '' : endForDays(e.target.value, days || selectedDays) })} />
    </label>
    <fieldset className="rental-duration">
      <legend>{ct(locale, 'howLong')}</legend>
      <div className="duration-days">
        {[1, 2, 3, 4, 5, 6, 7].map(count => <button type="button" key={count}
          aria-label={`${count} ${(count === 1 ? ct(locale, 'oneDay') : copy[locale].days)}`}
          aria-pressed={!value.openEnded && !custom && (days || selectedDays) === count}
          onClick={() => { setCustom(false); selectDays(count); }}>{count}</button>)}
      </div>
      <div className="duration-options">
        <button type="button" aria-pressed={!value.openEnded && (custom || days > 7)}
          onClick={() => { setCustom(true); selectDays(Math.max(8, days || selectedDays)); }}>
          {ct(locale, 'moreDays')}</button>
        <button type="button" aria-pressed={!!value.openEnded}
          onClick={() => { setCustom(false); change({ start: value.start || today, end: '', openEnded: true }); }}>
          {ct(locale, 'unknownDuration')}</button>
      </div>
      {!value.openEnded && (custom || days > 7) && <label className="duration-custom" htmlFor={`${id}-days`}>
        {ct(locale, 'numberOfDays')}
        <input id={`${id}-days`} type="number" min={8} max={90} step={1} required={required}
          value={days || ''} onChange={e => selectDays(Number(e.target.value))} />
      </label>}
    </fieldset>
    <div className="rental-period-summary" aria-live="polite">
      {value.openEnded ? <p>{ct(locale, 'openHint')}</p> : value.start && value.end ? <>
        <span>{ct(locale, 'pickupOn')} <strong>{formatDate(value.start)}</strong></span>
        <span>{ct(locale, 'returnOn')} <strong>{formatDate(value.end)}</strong></span>
        <small>{ct(locale, 'daysRule')}</small>
      </> : <p>{copy[locale].chooseDates}</p>}
    </div>
  </div>;
}
