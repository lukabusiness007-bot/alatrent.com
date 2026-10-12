import QRCode from 'qrcode';
import { get, settings } from '@/lib/db';
import { authorized } from '@/lib/auth';
import type { Tool } from '@/lib/types';
export async function GET(r: Request) {
  if (!(await authorized())) return new Response('Prijavi se.', { status: 401 });
  const id = new URL(r.url).searchParams.get('toolId') || '';
  const tool = get<Tool>('tools', id),
    base = settings().siteUrl;
  if (!tool || !base)
    return new Response('Unesi javni HTTPS domen u podešavanjima pre štampanja QR koda.', {
      status: 400,
    });
  const svg = await QRCode.toString(`${base}/sr/uputstvo/${tool.slug}`, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 4,
    width: 400,
  });
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Content-Disposition': `attachment; filename="${tool.slug}-uputstvo.svg"`,
      'Cache-Control': 'no-store',
    },
  });
}
