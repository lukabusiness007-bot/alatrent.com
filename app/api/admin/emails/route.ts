import { withDatabase } from '@/lib/db';
import { authorized, sameOrigin, rateLimit } from '@/lib/auth';
import { processEmailQueue } from '@/lib/email/queue';

export const maxDuration = 60;
export async function POST(r: Request) {
  try {
    const allowed = await withDatabase(async () => sameOrigin(r) && await authorized() && rateLimit('email-admin', 20, 60_000), true);
    if (!allowed) return Response.json({ error: 'Prijavi se ponovo.' }, { status: 403 });
    return Response.json(await processEmailQueue(), { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Red trenutno nije dostupan.' }, { status: 503 }); }
}
