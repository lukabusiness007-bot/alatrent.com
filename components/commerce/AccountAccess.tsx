'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { savedReferral, storeReferral } from '@/lib/commerce/referral-browser';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { copy } from '@/lib/i18n';
import { ct } from '@/lib/commerce/copy';
import { showProjectKits } from '@/lib/commerce/features';
import { membershipText } from '@/lib/commerce/membership-copy';

const words = {
  password: ['Lozinka', 'Password', 'Пароль', 'Şifre', '密码'],
  newPassword: ['Nova lozinka', 'New password', 'Новый пароль', 'Yeni şifre', '新密码'],
  welcome: ['Dobro došao nazad.', 'Welcome back.', 'С возвращением.', 'Tekrar hoş geldiniz.', '欢迎回来。'],
  join: ['Tvoj sledeći posao počinje ovde.', 'Your next project starts here.', 'Ваш следующий проект начинается здесь.', 'Sonraki projeniz burada başlıyor.', '从这里开始下一个项目。'],
  reset: ['Postavi novu lozinku.', 'Set a new password.', 'Задайте новый пароль.', 'Yeni şifre belirleyin.', '设置新密码。'],
  intro: ['Svi najmovi, termini i projekti na jednom mestu.', 'Your rentals, dates and projects in one place.', 'Аренда, даты и проекты в одном месте.', 'Kiralamalar, tarihler ve projeler tek yerde.', '集中管理租赁、日期和项目。'],
  free: ['Članstvo je besplatno. Bez pretplate.', 'Free membership. No subscription.', 'Бесплатное членство. Без подписки.', 'Ücretsiz üyelik. Abonelik yok.', '免费会员，无需订阅。'],
  forgot: ['Zaboravio sam šifru', 'Forgot password?', 'Забыли пароль?', 'Şifremi unuttum', '忘记密码？'],
  back: ['Nazad na prijavu', 'Back to sign in', 'Назад ко входу', 'Girişe dön', '返回登录'],
  help: ['Unesi broj telefona i sigurnosni kod koji si sačuvao pri registraciji. Zatim izaberi novu lozinku.', 'Enter your phone number and the recovery code saved when you registered, then choose a new password.', 'Введите телефон и код восстановления, сохранённый при регистрации, затем новый пароль.', 'Telefonunuzu ve kayıt sırasında sakladığınız kurtarma kodunu girip yeni şifre seçin.', '输入手机号和注册时保存的恢复码，然后设置新密码。'],
  noCode: ['Nemaš sačuvan kod? Obrati nam se za pomoć.', 'No recovery code? Contact us for help.', 'Нет кода? Свяжитесь с нами.', 'Kodunuz yok mu? Yardım için iletişime geçin.', '没有恢复码？联系我们获取帮助。'],
  hint: ['Najmanje 12 znakova. Može i kratka rečenica.', 'At least 12 characters. A short phrase works too.', 'Не менее 12 символов. Можно короткую фразу.', 'En az 12 karakter. Kısa bir cümle de olabilir.', '至少12个字符，也可以使用短语。'],
  confirm: ['Ponovi lozinku', 'Confirm password', 'Повторите пароль', 'Şifreyi tekrarlayın', '确认密码'],
  mismatch: ['Lozinke se ne podudaraju.', 'Passwords do not match.', 'Пароли не совпадают.', 'Şifreler eşleşmiyor.', '密码不一致。'],
  show: ['Prikaži lozinku', 'Show password', 'Показать пароль', 'Şifreyi göster', '显示密码'],
  hide: ['Sakrij lozinku', 'Hide password', 'Скрыть пароль', 'Şifreyi gizle', '隐藏密码'],
  working: ['Sačekaj trenutak…', 'One moment…', 'Подождите…', 'Bir dakika…', '请稍候…'],
  browse: ['Nastavi bez naloga', 'Continue as a guest', 'Продолжить без аккаунта', 'Misafir olarak devam et', '以访客身份继续'],
  referral: ['Imaš kod preporuke? (opciono)', 'Have a referral code? (optional)', 'Есть код приглашения? (необязательно)', 'Davet kodunuz var mı? (isteğe bağlı)', '有推荐码？（可选）'],
  secure: ['Tvoj nalog. Tvoji projekti.', 'Your account. Your projects.', 'Ваш аккаунт. Ваши проекты.', 'Hesabınız. Projeleriniz.', '你的账户，你的项目。'],
} as const;
export function accessText(locale: Locale, key: keyof typeof words) {
  return words[key][['sr', 'en', 'ru', 'tr', 'zh'].indexOf(locale)];
}
export default function AccountAccess({ locale, mode, setMode, busy, error, onSubmit }: {
  error: string; locale: Locale; mode: string; setMode: (mode: string) => void; busy: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const [referral,setReferral] = useState('');
  useEffect(()=>setReferral(savedReferral()),[]);
  const [visible, setVisible] = useState(false);
  const [validation, setValidation] = useState('');
  const w = (key: keyof typeof words) => accessText(locale, key);
  function change(next: string) { setVisible(false); setValidation(''); setMode(next); }
  return <div className="account-access" id="pristup">
    <aside className="access-story">
      <span className="eyebrow">{ct(locale, 'club')}</span>
      <h2>{w('secure')}</h2>
      <p>{w('intro')}</p>
      <div className="access-mark"><ShieldCheck size={34} /><span>{w('free')}</span></div>
      {showProjectKits && <Link href={`/${locale}/paketi`}>{ct(locale, 'packages')} <ArrowRight size={18} /></Link>}
    </aside>
    <div className="access-panel">
      {mode !== 'recover' ? <div className="access-tabs" aria-label={ct(locale, 'account')}>
        {['login', 'register'].map(m => <button key={m} type="button" aria-pressed={mode === m} disabled={busy} className={mode === m ? 'active' : ''} onClick={() => change(m)}>{ct(locale, m === 'login' ? 'signIn' : 'register')}</button>)}
      </div> : <button type="button" disabled={busy} className="access-back" onClick={() => change('login')}><ArrowLeft size={16} />{w('back')}</button>}
      <div className="access-title"><LockKeyhole size={23} /><h2>{w(mode === 'login' ? 'welcome' : mode === 'register' ? 'join' : 'reset')}</h2></div>
      <p className="access-subtitle">{w(mode === 'recover' ? 'help' : mode === 'register' ? 'free' : 'intro')}</p>
      <form className="commerce-form" key={mode} aria-busy={busy} onSubmit={async e => {
        e.preventDefault();
        const values = new FormData(e.currentTarget);
        if (mode !== 'login' && values.get('password') !== values.get('confirmPassword')) { setValidation(w('mismatch')); return; }
        setValidation(''); await onSubmit(e);
      }}>
        {mode === 'register' && <label>{membershipText(locale, 'email')}<input name="email" type="email" required maxLength={150} autoComplete="email" /></label>}
        <label>{copy[locale].phone}<input name="phone" type="tel" required autoComplete="username" inputMode="tel" placeholder="+381 60 123 4567" /></label>
        {mode === 'register' && <label>{copy[locale].name}<input name="name" required maxLength={120} autoComplete="name" /></label>}
        {mode === 'recover' && <label>{ct(locale, 'recovery')}<input name="recovery" required autoComplete="off" spellCheck={false} autoCapitalize="none" /></label>}
        <label>{mode === 'recover' ? w('newPassword') : w('password')}
          <span className="password-field"><input name="password" aria-label={w(mode === 'recover' ? 'newPassword' : 'password')} type={visible ? 'text' : 'password'} minLength={mode === 'login' ? undefined : 12} maxLength={200} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} aria-describedby={mode !== 'login' ? 'password-hint' : undefined} /><button type="button" onClick={() => setVisible(!visible)} aria-label={w(visible ? 'hide' : 'show')} aria-pressed={visible}>{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button></span>
        </label>
        {mode === 'login' ? <button type="button" disabled={busy} className="forgot-password" onClick={() => change('recover')}>{w('forgot')}</button> : <><p id="password-hint" className="field-hint">{w('hint')}</p><label>{w('confirm')}<input name="confirmPassword" type={visible ? 'text' : 'password'} required minLength={12} maxLength={200} autoComplete="new-password" /></label></>}
        {mode === 'register' && <>
          <details className="referral-details" open={!!referral}><summary>{w('referral')}</summary><label>{ct(locale, 'referral')}<input name="referral" value={referral} onChange={e=>{setReferral(e.target.value.toUpperCase());storeReferral(e.target.value);}} maxLength={20} autoCapitalize="characters" /></label></details>
          <label className="commerce-check"><input type="checkbox" name="consent" required /><span>{ct(locale, 'accountConsent')} <Link href={`/${locale}/privatnost`}>{copy[locale].privacy}</Link></span></label>
          <label className="commerce-check"><input type="checkbox" name="marketing" /><span>{ct(locale, 'marketing')}</span></label>
        </>}
        {(validation || error) && <p className="form-error" role="alert">{validation || error}</p>}
        <button className="button button-lime access-submit" disabled={busy}>{busy ? w('working') : mode === 'recover' ? w('reset') : ct(locale, mode === 'login' ? 'signIn' : 'register')}<ArrowRight size={18} /></button>
        {mode === 'recover' && <Link className="recovery-help" href={`/${locale}/kontakt`}>{w('noCode')}</Link>}
      </form>
      <div className="access-guest"><Link href={`/${locale}/katalog`}>{w('browse')} →</Link></div>
    </div>
  </div>;
}
