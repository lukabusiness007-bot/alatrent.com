'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { copy, money } from '@/lib/i18n';
import type { Locale, Settings, Tool } from '@/lib/types';
import Recommendations from './commerce/Recommendations';
import { mt } from '@/lib/commerce/merchandising-copy';
import type { Quote } from '@/lib/commerce/types';
import type { PriceRule } from '@/lib/commerce/types';
import { calculate, defaultRule } from '@/lib/commerce/pricing';
import { ct } from '@/lib/commerce/copy';
import { rentalPriceText } from '@/lib/commerce/rental-price-copy';
import { useCart } from './commerce/CartProvider';
import RentalPeriod, { type RentalPeriodValue } from './RentalPeriod';
import { durationDays, endForDays, periodReady } from '@/lib/commerce/period';
import { ShoppingBag, ShieldCheck } from 'lucide-react';
export default function RentalForm({
  tool,
  locale,
  today,
  rule = defaultRule,
  clubPercent = 0,
  memberDiscount,
  recommendationsEnabled = false,
}: {
  tool: Tool;
  locale: Locale;
  settings: Settings;
  today: string;
  rule?: PriceRule;
  clubPercent?: number;
  memberDiscount?: number;
  recommendationsEnabled?: boolean;
}) {
  const t = copy[locale],
    cart = useCart();
  const [period, setPeriod] = useState<RentalPeriodValue>({ start: today, end: today }),
    [quantity, setQuantity] = useState(1),
    [added, setAdded] = useState(false);
  const [liveQuote,setLiveQuote]=useState<Quote|null>(null),[quoteBusy,setQuoteBusy]=useState(false),[quoteError,setQuoteError]=useState('');
  const selected = {toolId:tool.id,...period,quantity};
  const fingerprint=JSON.stringify(selected);
  useEffect(()=>{
    setLiveQuote(null);setQuoteError('');
    if(!periodReady(period)||!Number.isInteger(quantity)||quantity<1){setQuoteBusy(false);return;}
    const abort=new AbortController();setQuoteBusy(true);
    const timer=setTimeout(()=>{fetch('/api/commerce/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:[selected],delivery:'pickup'}),signal:abort.signal})
      .then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setLiveQuote(d);})
      .catch(e=>{if(!abort.signal.aborted)setQuoteError(e.message);})
      .finally(()=>{if(!abort.signal.aborted)setQuoteBusy(false);});},250);
    return()=>{clearTimeout(timer);abort.abort();};
  },[fingerprint]);
  const offerItems=[...cart.items.filter(i=>!(i.toolId===tool.id&&i.start===period.start&&i.end===period.end&&!!i.openEnded===!!period.openEnded)),selected];
  const days = durationDays(period.start, period.end);
  const w = (key: Parameters<typeof rentalPriceText>[1]) => rentalPriceText(locale, key);
  const isMember = memberDiscount !== undefined;
  const discount = Math.max(clubPercent, memberDiscount ?? 0);
  const start = period.start || today;
  const dailyClubPrice = tool.price === null ? null : calculate(tool.price, start, 1, 1, rule, discount);
  const estimate = tool.price === null || period.openEnded || !days
    ? null : calculate(tool.price, period.start, days, quantity, rule, memberDiscount ?? 0);
  const price = liveQuote?.items[0] || estimate;
  const clubPrice = tool.price === null || period.openEnded || !days
    ? null : calculate(tool.price, period.start, days, quantity, rule, discount);
  return (
    <>
    <form
      className="rental-panel"
      id="rental-selection"
      onSubmit={(e) => {
        e.preventDefault();
        if(quoteBusy || quoteError || !liveQuote)return;
        cart.add([{ toolId: tool.id, ...period, quantity }]);
        setAdded(true);
      }}
    >
      <span className="eyebrow">{t.area}</span>
      <div className="detail-price">
        {tool.price === null ? (
          t.inquiryPrice
        ) : (
          <>
            {money(tool.price, locale)}
            <small>{t.perDay}</small>
          </>
        )}
      </div>
      {dailyClubPrice && <div className="product-club-price">
        <span>{w(isMember ? 'yourClub' : 'club')}</span>
        <strong>{money(dailyClubPrice.total, locale)} <small>{t.perDay}</small></strong>
      </div>}
      {tool.price !== null && <div className="product-rental-prices">
        <table>
          <caption>{w('title')}</caption>
          <thead><tr>
            <th scope="col">{w('duration')}</th>
            <th scope="col">{w('regular')}</th>
            <th scope="col" className="club-price-column">{w(isMember ? 'yourClub' : 'club')}</th>
          </tr></thead>
          <tbody>{[1, 2, 3, 5].map(count => {
            const regular = calculate(tool.price!, start, count, quantity, rule);
            const club = calculate(tool.price!, start, count, quantity, rule, discount);
            const selected = !period.openEnded && days === count;
            return <tr key={count} className={selected ? 'selected' : undefined}>
              <th scope="row"><button type="button" aria-pressed={selected}
                onClick={() => {
                  setPeriod({ start, end: endForDays(start, count), openEnded: false });
                  setAdded(false);
                }}>{count} {count === 1 ? ct(locale, 'oneDay') : t.days}</button></th>
              <td>{money(regular.total, locale)}</td>
              <td className="club-price-column">{money(club.total, locale)}</td>
            </tr>;
          })}</tbody>
        </table>
        <p>{w('totals')} {w('dates')} {ct(locale, 'clubRule')}</p>
      </div>}
      <RentalPeriod value={period} locale={locale} today={today} required
        onChange={next => { setPeriod(next); setAdded(false); }} />
      <label className="quantity-field">
        {t.quantity}
        <input
          type="number"
          min={1}
          max={Math.min(tool.quantity ?? 100, 100) || 1}
          value={quantity}
          onChange={(e) => { setQuantity(Number(e.target.value)); setAdded(false); }}
          required
        />
      </label>
      <div className="rental-total">
        <span>{period.openEnded ? ct(locale, 'dailyRate') : days ? `${ct(locale, 'durationTotal')} ${days} ${days === 1 ? ct(locale, 'oneDay') : t.days}` : ct(locale, 'rental')}{isMember && price && <small className="rental-member-label">{w('yourClub')}</small>}</span>
        <strong>{period.openEnded && tool.price !== null ? `${money(tool.price * quantity, locale)} ${t.perDay}` : price?.total != null ? money(price.total, locale) : t.inquiryPrice}</strong>
      </div>
      {!isMember && clubPrice && <div className="rental-club-total">
        <span>{w('selectedClub')}</span><strong>{money(clubPrice.total, locale)}</strong>
      </div>}
      {period.openEnded && <p className="small-muted">{ct(locale, 'finalOnReturn')}</p>}
      {!!price?.saving && (
        <p className="saving-pill">
          {ct(locale, 'saving')}: {money(price.saving, locale)}
        </p>
      )}
      <p className="small-muted">{mt(locale,tool.quantity===null||tool.price===null?'confirmation':'priceEstimate')}</p>
      {liveQuote?.promotion && <p className="saving-pill">{mt(locale,'promotion')}: {liveQuote.promotion.name[locale]}</p>}
      {quoteBusy && <p role="status">{mt(locale,'adding')}</p>}
      {quoteError && <p role="alert" className="form-error">{quoteError}</p>}
      <button
        className="button button-lime submit-request"
        disabled={tool.quantity === 0 || !cart.ready || !periodReady(period) || quoteBusy || !!quoteError || !liveQuote}
      >
        <ShoppingBag size={18} />
        {ct(locale, 'add')}
      </button>
      {added && (
        <Link className="text-link" href={`/${locale}/korpa`}>
          {ct(locale, 'cart')} →
        </Link>
      )}
      <p className="small-muted">{ct(locale, 'pending')}</p>
      <p className="no-deposit-note">
        <ShieldCheck size={18} />
        {t.depositNote}
      </p>
      <Link className="text-link" href={isMember ? `/${locale}/klub` : `/${locale}/nalog?mode=register`}>
        {isMember ? ct(locale, 'club') : w('join')} →
      </Link>
    </form>
    <Recommendations locale={locale} surface="tool" enabled={recommendationsEnabled} items={offerItems} sourceIndex={offerItems.length-1} onChoose={next=>{cart.setItems(next);setAdded(true);}} />
    </>
  );
}
