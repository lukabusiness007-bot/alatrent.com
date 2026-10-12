import type { NextConfig } from 'next';
const config: NextConfig = {
  devIndicators: false,
  turbopack: { root: process.cwd() },
  serverExternalPackages: ['node:sqlite', 'pg'],
  outputFileTracingIncludes: { '/*': ['./config/certs/supabase-ca.crt'] },
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
