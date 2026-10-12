import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { db, settings } from './db';
export function hashToken(t: string) {
  return createHash('sha256').update(t).digest('hex');
}
export async function authorized() {
  const t = (await cookies()).get('rental_admin')?.value;
  if (!t) return false;
  return !!db
    .prepare('SELECT token FROM sessions WHERE token=? AND expires>?')
    .get(hashToken(t), Date.now());
}
export function sameOrigin(r: Request) {
  try {
    const origin = new URL(r.headers.get('origin') || '');
    const requestUrl = new URL(r.url);
    const configured = settings().siteUrl || process.env.SITE_URL;
    return (
      origin.host === r.headers.get('host') &&
      (origin.protocol === requestUrl.protocol || origin.origin === configured)
    );
  } catch {
    return false;
  }
}
export function rateLimit(key: string, max: number, ms: number) {
  const now = Date.now();
  db.prepare('DELETE FROM limits WHERE expires<?').run(now);
  const r = db.prepare('SELECT count,expires FROM limits WHERE key=?').get(key) as
    { count: number; expires: number } | undefined;
  if (r && r.count >= max) return false;
  db.prepare(
    'INSERT INTO limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',
  ).run(key, now + ms);
  return true;
}
export function verifyPassword(password: string) {
  const row = db.prepare('SELECT salt,hash FROM auth WHERE id=1').get() as
    { salt: string; hash: string } | undefined;
  if (!row) return false;
  return timingSafeEqual(Buffer.from(row.hash, 'hex'), scryptSync(password, row.salt, 64));
}
export async function loginCookie(r: Request) {
  const token = randomBytes(32).toString('hex');
  db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
  db.prepare('INSERT INTO sessions VALUES(?,?)').run(hashToken(token), Date.now() + 8 * 3600_000);
  (await cookies()).set('rental_admin', token, {
    httpOnly: true,
    secure: new URL(r.headers.get('origin') || r.url).protocol === 'https:',
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 3600,
  });
}
