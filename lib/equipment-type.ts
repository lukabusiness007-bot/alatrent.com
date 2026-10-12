import types from './equipment-types.json';

const cyrillic: Record<string, string> = Object.fromEntries(
  [...'абвгдђежзијклљмнњопрстћуфхцчџш'].map((letter, i) => [letter,
    ['a', 'b', 'v', 'g', 'd', 'dj', 'e', 'z', 'z', 'i', 'j', 'k', 'l', 'lj', 'm', 'n', 'nj', 'o', 'p', 'r', 's', 't', 'c', 'u', 'f', 'h', 'c', 'c', 'dz', 's'][i]]),
);
const transliterate = (name: string) => name.toLowerCase().replace(/[а-яђјљњћџ]/g, letter => cyrillic[letter] || letter);

export function normalizedEquipmentName(name: string) {
  return transliterate(name).replace(/đ/g, 'dj').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// Exact canonical names win. Aliases identify the function, not brand or power.
export function equipmentType(name: string): string {
  const normalized = normalizedEquipmentName(name);
  const exact = types.find(type => normalizedEquipmentName(type.name) === normalized);
  if (exact) return exact.slug;
  // Keep punctuation for patterns describing multi-purpose tools or bundles.
  const searchable = transliterate(name).replace(/đ/g, 'dj').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return types.find(type => type.pattern && new RegExp(type.pattern).test(searchable))?.slug
    || types.find(type => (' ' + normalized + ' ').includes(' ' + normalizedEquipmentName(type.name) + ' '))?.slug
    || normalized;
}
