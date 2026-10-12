import Link from 'next/link';
import { ArrowUpRight, ArrowRight, Bookmark, Repeat2, CalendarClock, ClipboardList, Users, Check, Plus, Sparkles } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { ct } from '@/lib/commerce/copy';
import type { ReferralProgram } from '@/lib/commerce/types';
import { ReferralTerms } from './Referrals';
import { rt } from '@/lib/commerce/referral-copy';
import { clubText } from '@/lib/commerce/club-copy';

export default function Club({ locale, threshold, percent, referralProgram }: { locale: Locale; threshold: number; percent: number; referralProgram: ReferralProgram }) {
  const w = (key: Parameters<typeof clubText>[1]) => clubText(locale, key);
  const joinUrl = `/${locale}/nalog?mode=register`;
  const plural = new Intl.PluralRules(locale).select(threshold);
  const rentalLabel = locale === 'sr' ? (plural === 'one' ? 'plaćen i završen najam' : plural === 'few' ? 'plaćena i završena najma' : w('rentalLabel')) : w('rentalLabel');
  const qualifying = `${threshold} ${rentalLabel} ${w('period')}`;
  const benefits = [
    { icon: Bookmark, title: ct(locale, 'projects'), body: w('projectsBody') },
    { icon: Repeat2, title: ct(locale, 'again'), body: w('repeatBody') },
    { icon: ClipboardList, title: ct(locale, 'history'), body: w('historyBody') },
    { icon: CalendarClock, title: w('extend'), body: w('extendBody') },
  ];
  const steps = [
    { title: w('stepOne'), body: w('stepOneBody') },
    { title: w('stepTwo'), body: w('stepTwoBody') },
    { title: w('stepThree'), body: w('stepThreeBody') },
  ];
  const questions = [
    { title: w('faqFree'), body: w('faqFreeBody') },
    { title: w('faqDiscount'), body: `${percent}% — ${w('condition')}: ${qualifying}. ${w('stepThreeBody')}` },
    { title: w('faqStack'), body: w('faqStackBody') },
    { title: w('faqGuest'), body: w('faqGuestBody') },
  ];
  return <div className="club-landing">
    <section className="container km-hero" aria-labelledby="club-title">
      <div className="km-hero-copy">
        <span className="km-kicker"><span />{ct(locale, 'club')}</span>
        <h1 id="club-title">{w('headline')}</h1>
        <p>{w('intro')}</p>
        <Link href={joinUrl} className="button button-lime">{w('join')}<ArrowUpRight size={21} /></Link>
        <div className="km-signin">{w('existing')} <Link href={`/${locale}/nalog`}>{ct(locale, 'signIn')} <ArrowRight size={14} /></Link></div>
      </div>
      <div className="km-card-stage">
        <div className="km-card-orbit" aria-hidden="true" />
        <div className="km-member-card">
          <div className="km-card-brand"><strong>alat rent<Sparkles size={23} /></strong><span>{ct(locale, 'club')}</span></div>
          <p className="km-card-title">{w('cardTitle')}</p>
          <div className="km-card-rate"><strong>{percent}<span>%</span></strong><span>{w('regularRate')}</span></div>
          <div className="km-card-condition"><Check size={17} /><span>{w('condition')}: {qualifying}</span></div>
        </div>
        <div className="km-free-tag"><span>0 <small>RSD</small></span><span>{w('free')}</span></div>
      </div>
    </section>
    <div className="container"><div className="km-reassurance"><span><Check size={17} />{w('free')}</span><span><Check size={17} />{w('obligation')}</span><Link href={`/${locale}/paketi`}>{ct(locale, 'packages')}<ArrowUpRight size={17} /></Link></div></div>
    <section className="container km-benefits" aria-labelledby="club-benefits-title">
      <div className="km-section-heading"><div><span className="km-kicker">{w('benefitsTag')}</span><h2 id="club-benefits-title">{w('benefitsTitle')}</h2></div><p>{w('benefitsIntro')}</p></div>
      <div className="km-benefit-grid">{benefits.map(({ icon: Icon, title, body }, i) => <article key={title}><div className="km-benefit-top"><span className="km-icon"><Icon size={26} strokeWidth={1.6} /></span><span className="km-index">0{i + 1}</span></div><h3>{title}</h3><p>{body}</p></article>)}</div>
    </section>
    <section className="km-steps-band" aria-labelledby="club-steps-title"><div className="container"><span className="km-kicker">{w('stepsTag')}</span><h2 id="club-steps-title">{w('stepsTitle')}</h2><ol className="km-steps">{steps.map((s, i) => <li key={s.title}><span className="km-step-number">0{i + 1}</span><h3>{s.title}</h3><p>{s.body}</p></li>)}</ol><div className="km-price-rule"><Check size={18} /><p>{ct(locale, 'clubRule')}</p></div></div></section>
    <section className="container km-team" aria-labelledby="club-team-title"><div className="km-team-icon"><Users size={48} strokeWidth={1.3} /></div><div><span className="km-kicker">{w('teamTag')}</span><h2 id="club-team-title">{w('teamTitle')}</h2><p>{w('teamBody')}</p></div><Link className="km-text-link" href={`/${locale}/kontakt`}>{w('teamCta')}<ArrowUpRight size={21} /></Link></section>
    <section className="container km-faq" aria-labelledby="club-faq-title"><div><span className="km-kicker">{ct(locale, 'club')}</span><h2 id="club-faq-title">{w('faqTitle')}</h2></div><div className="km-questions">{questions.map(q => <details key={q.title}><summary>{q.title}<Plus size={20} /></summary><p>{q.body}</p></details>)}</div></section>
    {referralProgram.enabled && (!referralProgram.pilotEndsAt || Date.parse(referralProgram.pilotEndsAt)>Date.now()) && <section className="container"><div className="commerce-card referral-card"><h2>{rt(locale,'title')}</h2><ReferralTerms policy={referralProgram} locale={locale}/><Link className="button button-lime" href={joinUrl}>{w('join')}<ArrowUpRight size={21}/></Link></div></section>}
    <section className="container km-final"><div><Sparkles size={30} /><h2>{w('finalTitle')}</h2><p>{w('finalBody')}</p></div><Link className="button button-lime" href={joinUrl}>{w('join')}<ArrowUpRight size={21} /></Link></section>
  </div>;
}
