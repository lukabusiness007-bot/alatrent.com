'use client';
import Link from 'next/link';
import { CartLink } from './commerce/CartProvider';
import { ct } from '@/lib/commerce/copy';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { copy, href, languageNames, locales } from '@/lib/i18n';
import type { Locale } from '@/lib/types';
import { ArrowRight, ChevronDown, Globe2, Menu, X, Sparkles, Check } from './Icons';
export function Brand({ name = 'alat rent' }: { name?: string }) {
  return (
    <span className="brand rental-brand">
      {name}
      <span className="brand-spark">
        <Sparkles size={22} strokeWidth={1.7} />
      </span>
    </span>
  );
}
export default function Header({ locale, brand }: { locale: Locale; brand: string }) {
  const t = copy[locale];
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [languages, setLanguages] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(false);
        setLanguages(false);
      }
    };
    const outside = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setLanguages(false);
    };
    document.addEventListener('keydown', close);
    document.addEventListener('click', outside);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('click', outside);
    };
  }, []);
  return (
    <header className="site-header">
      <a className="skip-link" href="#main">
        {t.catalog}
      </a>
      <div className="header-inner">
        <Link
          href={href(locale)}
          className="brand-link"
          onClick={() => setMenu(false)}
          aria-label={brand + ' — ' + t.home}
        >
          <Brand name={brand} />
        </Link>
        <nav className={`main-nav ${menu ? 'nav-open' : ''}`} aria-label={t.navigation}>
          {[
            [t.home, ''],
            [t.catalog, 'katalog'],
            [t.how, 'kako-funkcionise'],
            [ct(locale, 'packages'), 'paketi'],
            [ct(locale, 'club'), 'klub'],
          ].map(([label, path]) => (
            <Link
              key={path}
              className={pathname === href(locale, path) ? 'active' : ''}
              href={href(locale, path)}
              onClick={() => setMenu(false)}
            >
              {label}
            </Link>
          ))}
          <Link
            className="mobile-nav-contact"
            href={href(locale, 'kontakt')}
            onClick={() => setMenu(false)}
          >
            {t.contact}
          </Link>
        </nav>
        <div className="header-actions"><CartLink locale={locale} />
          <Link className="contact-link" href={href(locale, 'nalog')}>
            {ct(locale, 'account')}
          </Link>
          <div className="language-picker" ref={ref}>
            <button
              className="language-button"
              onClick={() => setLanguages(!languages)}
              aria-label={t.language}
              aria-expanded={languages}
            >
              <Globe2 size={16} />
              <span>{locale.toUpperCase()}</span>
              <ChevronDown size={13} />
            </button>
            {languages && (
              <div className="language-options">
                {locales.map((l) => (
                  <Link
                    href={pathname.replace(/^\/(sr|en|ru|tr|zh)(?=\/|$)/, '/' + l)}
                    key={l}
                    lang={l}
                    hrefLang={l === 'zh' ? 'zh-Hans' : l}
                    aria-current={l === locale ? 'true' : undefined}
                    onClick={() => setLanguages(false)}
                  >
                    {languageNames[l]}
                    {l === locale && <Check size={15} />}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link className="header-book" href={href(locale, 'katalog')}>
            {t.browse}
            <ArrowRight size={17} />
          </Link>
          <button
            className="rental-menu"
            aria-label={menu ? t.close : t.menu}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
