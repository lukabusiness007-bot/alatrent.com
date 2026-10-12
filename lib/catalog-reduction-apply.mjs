/** Apply the approved selection without changing rental history or equipment attributes. */
export function applyCatalogReduction(db, manifest) {
 const read=(kind,id)=>{const r=db.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get(kind,id);return r?JSON.parse(r.value):undefined;};
 const all=kind=>db.prepare('SELECT id,value FROM entities WHERE kind=?').all(kind).map(r=>({id:r.id,value:JSON.parse(r.value)}));
 const put=(kind,id,value)=>db.prepare('INSERT INTO entities(kind,id,value) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value').run(kind,id,JSON.stringify(value));
 if(read('meta',manifest.migration))return false;
 const groups=new Map(manifest.groups.map(g=>[g.selectedId,g]));
 const entries=new Map(manifest.entries.map(e=>[e.id,e]));
 const resolve=id=>{const e=entries.get(id);return e?(e.action==='keep'?id:e.replacementId):id;};
 const ids=list=>[...new Set(list.map(resolve).filter(id=>id&&read('tools',id)?.published))];
 db.exec('BEGIN IMMEDIATE');
 try{
  for(const entry of manifest.entries){const tool=read('tools',entry.id);if(!tool)continue;const published=entry.action==='keep';const next={...tool,published,featured:published&&tool.featured};const purchase=tool.catalogModel?.rentalPriceBase||tool.catalogModel?.regularPurchasePrice||tool.catalogModel?.purchasePrice;
   if(published&&tool.price==null&&groups.get(tool.id)?.confirmedComplete&&Number.isFinite(purchase)&&purchase>0)next.price=Math.max(500,Math.round((Math.min(purchase,15000)/15+Math.max(Math.min(purchase,60000)-15000,0)/30+Math.max(purchase-60000,0)/60)/100)*100);
   if(tool.published!==published||tool.price!==next.price)put('tools',tool.id,{...next,updatedAt:manifest.createdAt});
  }
  for(const correction of manifest.categoryCorrections||[]){const tool=read('tools',correction.id);if(tool&&tool.categoryId===correction.before)put('tools',tool.id,{...tool,categoryId:correction.after,updatedAt:manifest.createdAt});}
  for(const correction of manifest.corrections||[]){const tool=read('tools',correction.id);if(!tool)continue;const name={...tool.name},description={...tool.description};let changed=false;for(const locale of Object.keys(correction.before)){if(name[locale]===correction.before[locale]){name[locale]=correction.after[locale];description[locale]=description[locale]?.replace(correction.before[locale],correction.after[locale]);changed=true;}}if(changed)put('tools',tool.id,{...tool,name,description,updatedAt:manifest.createdAt});}
  for(const kind of ['bundles','rentalJobs'])for(const {id,value}of all(kind)){
   const toolIds=ids(value.toolIds||[]);const next={...value,toolIds,...(toolIds.length<(kind==='bundles'?2:1)?{published:false}:{})};
   if(JSON.stringify(value)!==JSON.stringify(next))put(kind,id,next);
  }
  for(const {id,value}of all('promotions')){const toolIds=ids(value.toolIds||[]);const next={...value,toolIds,...(toolIds.length<(value.kind==='combination'?2:1)?{enabled:false}:{})};if(JSON.stringify(value)!==JSON.stringify(next))put('promotions',id,next);}
  for(const {id,value}of all('toolOptions')){
   const recommendations=(value.recommendations||[]).map(r=>({...r,toolId:resolve(r.toolId)})).filter((r,i,list)=>r.toolId&&r.toolId!==resolve(id)&&read('tools',r.toolId)?.published&&list.findIndex(x=>x.toolId===r.toolId&&x.kind===r.kind)===i);
   const next={...value,...(value.recommendations?{recommendations}:{}),relatedIds:ids(value.relatedIds||[]).filter(x=>x!==resolve(id)),alternativeIds:ids(value.alternativeIds||[]).filter(x=>x!==resolve(id))};
   if(JSON.stringify(next)!==JSON.stringify(value))put('toolOptions',id,next);
   // Copy generic instructions to the selected model only when none exist.
   const target=resolve(id);if(target&&target!==id&&!read('toolOptions',target))put('toolOptions',target,{instructions:next.instructions||'',manualUrl:'',videoUrl:'',model:'',relatedIds:next.relatedIds,alternativeIds:next.alternativeIds,...(next.recommendations?{recommendations:next.recommendations}:{})});
  }
  put('meta',manifest.migration,true);db.exec('COMMIT');return true;
 }catch(e){db.exec('ROLLBACK');throw e;}
}
