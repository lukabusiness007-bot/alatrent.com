import type { Locale, PublicData } from '../types';
import { dailyPrice } from '../catalog-pricing.mjs';
import type { RentalJob } from './merchandising-types';
import { matchesTool, normalizeSearch } from '../seo-content';
import { cartItems } from './data';
import { availability } from './merchandising';
export type CatalogFilters = {
  job?: string;
  maxPrice?: string;
  start?: string;
  end?: string;
  available?: boolean;
};
export function selectCatalog(
  data: PublicData,
  jobs: RentalJob[],
  locale: Locale,
  q: string,
  categoryId: string | undefined,
  filters: CatalogFilters,
) {
  let periodValid = false;
  if (filters.start && filters.end && data.tools.length) {
    try {
      cartItems([
        { toolId: data.tools[0].id, start: filters.start, end: filters.end, quantity: 1 },
      ]);
      periodValid = true;
    } catch {}
  }
  const selectedJob = jobs.find((j) => j.id === filters.job);
  const matchingJobs = q
    ? jobs.filter((j) => normalizeSearch(j.name[locale]).includes(normalizeSearch(q)))
    : [];
  const maxPrice = filters.maxPrice?.trim() ? Number(filters.maxPrice) : null;
  const statuses: Record<string, 'available' | 'confirmation' | 'unavailable'> = {};
  const tools = data.tools.filter((tool) => {
    if (categoryId && tool.categoryId !== categoryId) return false;
    if (filters.job && (!selectedJob || !selectedJob.toolIds.includes(tool.id))) return false;
    if (
      q &&
      !matchesTool(tool, locale, q) &&
      !matchingJobs.some((j) => j.toolIds.includes(tool.id))
    )
      return false;
    if (
      maxPrice !== null &&
      Number.isFinite(maxPrice) &&
      maxPrice >= 0 &&
      (dailyPrice(tool) === null || dailyPrice(tool)! > maxPrice)
    )
      return false;
    if (periodValid)
      statuses[tool.id] = availability({
        toolId: tool.id,
        start: filters.start!,
        end: filters.end!,
        quantity: 1,
      });
    if (filters.available && (!periodValid || statuses[tool.id] !== 'available')) return false;
    return true;
  });
  return {
    tools,
    statuses,
    periodValid,
    periodError: !!filters.available && !periodValid,
    selectedJob,
  };
}
