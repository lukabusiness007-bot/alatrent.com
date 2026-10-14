import manifest from './catalog-reduction.json';
import seed from './seed.json';
import type { Tool, Localized } from './types';
export const reductionManifest = manifest;
const entries=new Map(manifest.entries.map(e=>[e.id,e]));
const bySlug=new Map(manifest.entries.map(e=>[e.slug,e]));
const originalNames=new Map(seed.tools.map(t=>[t.id,t.name]));
export const reductionEntry=(id:string)=>entries.get(id);
export const reductionBySlug=(slug:string)=>bySlug.get(slug);
export type RetiredTool = { id: string; name: Localized; replacementId: string | null };
export function retiredTools(tools:Tool[], archived:Tool[]=[]):RetiredTool[]{
 const publicIds=new Set(tools.filter(t=>t.published).map(t=>t.id));
 const saved=new Map([...tools,...archived].map(t=>[t.id,t]));
 // Browser carts can outlive unused database archives. The static reduction
 // map keeps their original labels and replacement links available.
 return manifest.entries.flatMap(e=>{
  const tool=saved.get(e.id),name=tool?.name||originalNames.get(e.id);
  return e.action!=='keep'&&!tool?.published&&name?[{id:e.id,name,replacementId:e.replacementId&&publicIds.has(e.replacementId)?e.replacementId:null}]:[];
 });
}
export function mappedPurpose(id:string){return entries.get(id)?.purposeKey;}
