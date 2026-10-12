'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/types';
import { mt } from '@/lib/commerce/merchandising-copy';
import { track } from '@/lib/commerce/analytics-browser';
export default function Analytics({ locale }: { locale: Locale }) {
  const path = usePathname();
  const [open, setOpen] = useState(false),
    [consent, setConsent] = useState(false);
  useEffect(() => {
    try {
      setConsent(localStorage.getItem('rent-tools-analytics') === 'yes');
    } catch {}
  }, []);
  useEffect(() => {
    if (!consent) return;
    const parts = path.split('/');
    // Private rental URLs and credentials never enter telemetry.
    if (
      parts[2] === 'alat' ||
      parts[2] === 'najam' ||
      parts[2] === 'uputstvo' ||
      parts[2] === 'privatnost'
    )
      return;
    track(
      'view',
      parts[2] === 'alat'
        ? 'tool'
        : parts[2] === 'korpa'
          ? 'cart'
          : parts[2] === 'nalog'
            ? 'account'
            : parts[2]
              ? 'catalog'
              : 'home',
    );
  }, [path, consent]);
  function choose(value: boolean) {
    try {
      localStorage.setItem('rent-tools-analytics', value ? 'yes' : 'no');
      if (!value) sessionStorage.removeItem('rent-tools-analytics-session');
    } catch {}
    window.dispatchEvent(new Event('rent-tools-analytics'));
    setConsent(value);
    setOpen(false);
  }
  return (
    <div className="analytics-settings container">
      <button
        type="button"
        className="text-link"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {mt(locale, 'analytics')}
      </button>
      {open && (
        <section className="commerce-card analytics-panel">
          <p>{mt(locale, 'analyticsHint')}</p>
          <div className="button-row">
            <button type="button" className="button button-lime" onClick={() => choose(true)}>
              {mt(locale, 'allow')}
            </button>
            <button type="button" className="button button-plain" onClick={() => choose(false)}>
              {mt(locale, 'decline')}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export function ToolView({ toolId }: { toolId: string }) {
  useEffect(() => {
    const viewed = () => track('view', 'tool', toolId);
    viewed();
    window.addEventListener('rent-tools-analytics', viewed);
    return () => window.removeEventListener('rent-tools-analytics', viewed);
  }, [toolId]);
  return null;
}
