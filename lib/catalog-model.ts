import type { Tool } from './types';
import { equipmentType } from './equipment-type';

export function catalogIdentity(tool: Pick<Tool, 'name' | 'catalogModel'>) {
  return tool.catalogModel
    ? `${tool.catalogModel.source}:${tool.catalogModel.productId}`
    : equipmentType(tool.name.sr);
}

export function isCrafterImage(image: string) {
  try {
    const url = new URL(image);
    return url.protocol === 'https:' && url.hostname === 'www.crafter.rs'
      && !url.username && !url.password && !url.port
      && url.pathname.startsWith('/media/catalog/product/');
  } catch { return false; }
}
