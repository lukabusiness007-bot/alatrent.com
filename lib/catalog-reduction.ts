import manifest from './catalog-reduction.json';
import type { Tool, Localized } from './types';
export const reductionManifest = manifest;
const entries=new Map(manifest.entries.map(e=>[e.id,e]));
const bySlug=new Map(manifest.entries.map(e=>[e.slug,e]));
export const reductionEntry=(id:string)=>entries.get(id);
export const reductionBySlug=(slug:string)=>bySlug.get(slug);
export type RetiredTool = { id: string; name: Localized; replacementId: string | null };
export function retiredTools(tools:Tool[]):RetiredTool[]{
 const publicIds=new Set(tools.filter(t=>t.published).map(t=>t.id));
 return tools.flatMap(t=>{const e=entries.get(t.id);return !t.published&&e&&e.action!=='keep'?[{id:t.id,name:t.name,replacementId:e.replacementId&&publicIds.has(e.replacementId)?e.replacementId:null}]:[];});
}
export function mappedPurpose(id:string){return entries.get(id)?.purposeKey;}
