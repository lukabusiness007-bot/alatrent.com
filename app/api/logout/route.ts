import { databaseRoute } from '@/lib/db';
import { cookies } from 'next/headers';
import { sameOrigin, hashToken } from '@/lib/auth';
import { db } from '@/lib/db';
async function dbPOST(r: Request) {
  if (!sameOrigin(r)) return new Response(null, { status: 403 });
  const c = await cookies();
  const t = c.get('rental_admin')?.value;
  if (t) db.prepare('DELETE FROM sessions WHERE token=?').run(hashToken(t));
  c.delete('rental_admin');
  return Response.json({ ok: true });
}

export const POST = databaseRoute(dbPOST, true);
