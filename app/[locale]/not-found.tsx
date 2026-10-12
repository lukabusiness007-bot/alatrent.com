'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { copy, isLocale, href } from '@/lib/i18n';
export default function NotFound() {
  const p = useParams();
  const l = typeof p.locale === 'string' && isLocale(p.locale) ? p.locale : 'sr';
  return (
    <div className="container empty-state">
      <span className="eyebrow">404</span>
      <h1>{copy[l].notFound}</h1>
      <Link className="button button-lime" href={href(l, 'katalog')}>
        {copy[l].catalog}
      </Link>
    </div>
  );
}
