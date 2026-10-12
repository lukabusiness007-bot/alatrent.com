'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Gift, Copy, Share2 } from 'lucide-react';
import type { Locale } from '@/lib/types';
import type { ReferralSummary, ReferralProgram } from '@/lib/commerce/types';
import { rt, referralTerms, referralIntro } from '@/lib/commerce/referral-copy';
import { storeReferral } from '@/lib/commerce/referral-browser';
import { money } from '@/lib/i18n';
export function ReferralCapture() {
  const params=useSearchParams();
  const code=params.get('ref');
  useEffect(()=>{ if(code) storeReferral(code); },[code]);
  return null;
}
export function ReferralTerms({policy,locale}:{policy:ReferralProgram;locale:Locale}) {
  const intro=referralIntro(policy,locale);
  return <div className="referral-terms"><p>{intro}</p><details><summary>{rt(locale,'conditions')}</summary><p>{referralTerms(policy,locale).slice(intro.length)}</p></details></div>;
}
export function ReferralCard({code,summary,locale}:{code:string;summary:ReferralSummary;locale:Locale}) {
  const [origin,setOrigin]=useState('');
  const [notice,setNotice]=useState('');
  useEffect(()=>setOrigin(window.location.origin),[]);
  const link=`${origin}/${locale}/klub?ref=${encodeURIComponent(code)}`;
  async function copy(value:string) { try { await navigator.clipboard.writeText(value); setNotice(rt(locale,'saved')); } catch { setNotice(rt(locale,'copyError')); } }
  return <section className="commerce-card referral-card" aria-labelledby="referral-title">
    <div className="referral-heading"><Gift size={30}/><h2 id="referral-title">{rt(locale,'title')}</h2></div>
    {summary.active ? <ReferralTerms policy={summary.policy} locale={locale}/> : <p>{rt(locale,'paused')}</p>}
    <div className="referral-code"><span>{rt(locale,'code')}</span><strong>{code}</strong></div>
    {summary.active && <><div className="button-row">
      <button className="button button-lime" onClick={()=>copy(code)}><Copy size={17}/>{rt(locale,'copyCode')}</button>
      <button className="button button-plain" disabled={!origin} onClick={()=>copy(link)}>{rt(locale,'copyLink')}</button>
      {origin && <a className="button button-plain" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(referralIntro(summary.policy,locale)+'\n'+link)}`}><Share2 size={17}/>{rt(locale,'share')}</a>}
    </div><p className="referral-link">{link}</p></>}
    <p role="status">{notice}</p>
    <dl className="referral-stats">{([
      ['pending',summary.pending],['successful',summary.successful],['remaining',summary.remaining],['earned',money(summary.earned,locale)],
    ] as const).map(([key,value])=><div key={key}><dt>{rt(locale,key)}</dt><dd>{value}</dd></div>)}</dl>
  </section>;
}
