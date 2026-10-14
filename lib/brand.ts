// Use the business's preferred spelling in Search while preserving custom brands.
export function brandName(value: string) {
  return value.trim().toLowerCase() === 'alat rent' ? 'Alat Rent' : value;
}
