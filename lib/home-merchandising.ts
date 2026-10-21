import type { Tool } from './types';
import { reductionEntry } from './catalog-reduction';

// Editorial selections informed by the research in docs/home-merchandising.md.
// These are seasonal suggestions, not a ranking of measured search volumes.
const yearRound = ['crafter-35551', 'crafter-63590', 'crafter-62581', 'crafter-638'];
const seasonal = {
  spring: ['crafter-22401', 'crafter-32934', 'crafter-31501', 'crafter-30901'],
  summer: ['crafter-31501', 'crafter-32934', 'crafter-32639', 'crafter-22013'],
  autumn: ['crafter-35684', 'crafter-35687', 'tool-011', 'crafter-34588'],
  winter: ['crafter-63798', 'tool-011', 'tool-143', 'crafter-22013'],
};

export function homeFeaturedTools(tools: Tool[], date = new Date()): Tool[] {
  const month = Number(new Intl.DateTimeFormat('en', {
    month: 'numeric', timeZone: 'Europe/Belgrade',
  }).format(date));
  const season = month >= 3 && month <= 5 ? 'spring'
    : month >= 6 && month <= 8 ? 'summer'
    : month >= 9 && month <= 11 ? 'autumn' : 'winter';
  const publicTools = tools.filter(tool => tool.published && tool.quantity !== 0);
  const selected = [...seasonal[season], ...yearRound].flatMap(id => {
    const replacementId = reductionEntry(id)?.replacementId;
    const tool = publicTools.find(tool => tool.id === id || tool.id === replacementId);
    return tool ? [tool] : [];
  });
  const fallback = [...publicTools].sort((a, b) => Number(b.featured) - Number(a.featured));
  return [...new Map([...selected, ...fallback].map(tool => [tool.id, tool])).values()].slice(0, 8);
}

// Alternate categories so the first visible cards already show the range.
export function homeMarqueeTools(tools: Tool[]): Tool[] {
  const groups = new Map<string, Tool[]>();
  for (const tool of tools.filter(tool => tool.published && tool.image)) {
    const group = groups.get(tool.categoryId) || [];
    group.push(tool);
    groups.set(tool.categoryId, group);
  }
  const ordered: Tool[] = [];
  const longest = Math.max(0, ...[...groups.values()].map(group => group.length));
  for (let index = 0; index < longest; index++) {
    for (const group of groups.values()) if (group[index]) ordered.push(group[index]);
  }
  return ordered;
}
