import { cookies } from 'next/headers';
import { sameOrigin, hashToken } from '@/lib/auth';
import { db } from '@/lib/db';
export async function POST(r: Request) {
  if (!sameOrigin(r)) return new Response(null, { status: 403 });
  const c = await cookies();
  const t = c.get('rental_admin')?.value;
  if (t) db.prepare('DELETE FROM sessions WHERE token=?').run(hashToken(t));
  c.delete('rental_admin');
  return Response.json({ ok: true });
}
