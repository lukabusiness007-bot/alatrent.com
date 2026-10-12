export const defaultContact = {
  phone: '+381 60 123 4567',
  email: 'office@alatrenta.rs',
};

export function contactPhone(phone: string) {
  const number = phone.replace(/[^+\d]/g, '');
  if (number.startsWith('00')) return '+' + number.slice(2);
  if (number.startsWith('0')) return '+381' + number.slice(1);
  return number.startsWith('+') ? number : '+' + number;
}
