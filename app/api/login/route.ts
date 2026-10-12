import { databaseRoute } from '@/lib/db';
import { sameOrigin, rateLimit, verifyPassword, loginCookie } from '@/lib/auth';
async function dbPOST(r: Request) {
  if (!sameOrigin(r)) return Response.json({ error: 'Zahtev nije dozvoljen.' }, { status: 403 });
  if (!rateLimit('login', 20, 15 * 60_000))
    return Response.json({ error: 'Previše pokušaja. Pokušaj za 15 minuta.' }, { status: 429 });
  let b;
  try {
    b = await r.json();
  } catch {
    return Response.json({ error: 'Neispravan zahtev.' }, { status: 400 });
  }
  if (typeof b.password !== 'string' || b.password.length > 200 || !verifyPassword(b.password))
    return Response.json({ error: 'Pogrešna lozinka.' }, { status: 401 });
  await loginCookie(r);
  return Response.json({ ok: true });
}

export const POST = databaseRoute(dbPOST, true);
