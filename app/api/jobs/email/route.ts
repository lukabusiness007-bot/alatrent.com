import { timingSafeEqual } from 'node:crypto';
import { processEmailQueue } from '@/lib/email/queue';

export const maxDuration = 60;
async function run(r: Request) {
  const secret = process.env.CRON_SECRET || process.env.COMMERCE_JOB_SECRET;
  const received = r.headers.get('authorization') || '';
  const expected = 'Bearer ' + secret;
  if (!secret || received.length !== expected.length || !timingSafeEqual(Buffer.from(received), Buffer.from(expected)))
    return new Response(null, { status: 401 });
  try { return Response.json(await processEmailQueue(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'Email processing unavailable' }, { status: 503 }); }
}
export const GET = run;
export const POST = run;
