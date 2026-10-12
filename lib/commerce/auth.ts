import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { get, all, put, remove } from '../db';
import { hashToken } from '../auth';
import { text } from '../validation';
import type { Customer } from './types';
import { normalizeReferral } from './referrals';
export function phoneNumber(v: unknown) {
  let phone = text(v, 40).replace(/[ ().-]/g, '');
  if (phone.startsWith('00')) phone = '+' + phone.slice(2);
  if (phone.startsWith('0')) phone = '+381' + phone.slice(1);
  if (!/^\+[1-9]\d{7,14}$/.test(phone))
    throw new Error('Unesi broj sa pozivnim kodom, npr. +381601234567.');
  return phone;
}
export async function currentCustomer() {
  const token = (await cookies()).get('rental_customer')?.value;
  if (!token) return undefined;
  const session = get<{ customerId: string; expires: number }>(
    'customerSessions',
    hashToken(token),
  );
  if (!session || session.expires < Date.now()) return undefined;
  return get<Customer>('customers', session.customerId);
}
export async function customerCookie(r: Request, id: string) {
  const token = randomBytes(32).toString('hex');
  put('customerSessions', hashToken(token), {
    id: hashToken(token),
    customerId: id,
    expires: Date.now() + 30 * 86400000,
  });
  (await cookies()).set('rental_customer', token, {
    httpOnly: true,
    secure: new URL(r.headers.get('origin') || r.url).protocol === 'https:',
    sameSite: 'strict',
    path: '/',
    maxAge: 30 * 86400,
  });
}
export async function logoutCustomer() {
  const c = await cookies(),
    token = c.get('rental_customer')?.value;
  if (token) remove('customerSessions', hashToken(token));
  c.delete('rental_customer');
}
export function credentials(v: unknown) {
  const password = text(v, 200);
  if (password.length < 12) throw new Error('Lozinka mora imati najmanje 12 znakova.');
  return password;
}
export function authenticate(phone: string, password: string) {
  const c = all<Customer>('customers').find((c) => c.phone === phone);
  const digest = scryptSync(password, c?.salt || 'rental-dummy-login-salt', 64);
  if (!c || !timingSafeEqual(Buffer.from(c.hash, 'hex'), digest))
    throw new Error('Neispravan broj telefona ili lozinka.');
  return c;
}
export function register(b: Record<string, unknown>) {
  const phone = phoneNumber(b.phone),
    password = credentials(b.password);
  if (all<Customer>('customers').some((c) => c.phone === phone))
    throw new Error('Nalog nije moguće napraviti. Pokušaj prijavu ili oporavak.');
  const recovery = randomBytes(24).toString('hex'),
    salt = randomBytes(24).toString('hex');
  const code = normalizeReferral(b.referral || '');
  const ref = code ? all<Customer>('customers').find(c => c.referralCode === code) : undefined;
  if (code && (!ref || ref.referralPaused || ref.phone === phone)) throw new Error('Proveri kod preporuke ili nastavi bez koda.');
  let referralCode: string;
  do { referralCode = 'MAJSTOR-' + randomBytes(4).toString('hex').toUpperCase(); }
  while (all<Customer>('customers').some(c=>c.referralCode === referralCode));
  const c: Customer = {
    id: randomUUID(),
    phone,
    name: text(b.name, 120),
    address: '',
    company: '',
    salt,
    hash: scryptSync(password, salt, 64).toString('hex'),
    recoveryHash: hashToken(recovery),
    credit: 0,
    referralCode,
    referredBy: ref?.id,
    referredAt: ref ? new Date().toISOString() : undefined,
    partnerPercent: 0,
    marketing: b.marketing === true,
    createdAt: new Date().toISOString(),
  };
  put('customers', c.id, c);
  return { customer: c, recovery };
}
