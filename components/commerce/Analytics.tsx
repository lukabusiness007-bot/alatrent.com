'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/commerce/analytics-browser';
export default function Analytics() {
  const path = usePathname();
  const [consent, setConsent] = useState(false);
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
  return null;
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
