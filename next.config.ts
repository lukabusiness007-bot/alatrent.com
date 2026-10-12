import type { NextConfig } from 'next';
import reduction from './lib/catalog-reduction.json';
const config: NextConfig = {
  devIndicators: false,
  images: { remotePatterns: [{ protocol: 'https', hostname: 'www.crafter.rs', pathname: '/media/catalog/product/**', search: '' }] },
  turbopack: { root: process.cwd() },
  serverExternalPackages: ['node:sqlite', 'pg'],
  outputFileTracingIncludes: { '/*': ['./config/certs/supabase-ca.crt'] },
  redirects() {
    const targets=new Map(reduction.groups.map(g=>[g.selectedId,g.selectedSlug]));
    return reduction.entries.filter(e=>e.action==='replace'&&e.replacementId).map(e=>({
      source:`/:locale(sr|en|ru|tr|zh)/alat/${e.slug}`,
      destination:`/:locale/alat/${targets.get(e.replacementId!)}`,
      permanent:true,
    }));
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};
export default config;
