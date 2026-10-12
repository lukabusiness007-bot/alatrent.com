'use client';
import { useState } from 'react';
import type { CommerceConfig, ReferralReward, ReferralSummary } from '@/lib/commerce/types';
import { money } from '@/lib/i18n';
import { round } from '@/lib/commerce/pricing';
export type ReferralAdminData = {
  members: (ReferralSummary & {id:string;name:string;code:string;paused:boolean})[];
  rewards: ReferralReward[];
  costedTools:number;
  publishedTools:number;
  orders: {id:string;code:string;status:string;referralStatus:string;discount:number;cash:number|null;costs:number|null;reward:number;contribution:number|null;maxCosts:number|null;percent:number|null;safe:boolean}[];
};
export default function ReferralAdmin({data,config,setConfig,save,busy}:{data:ReferralAdminData;config:CommerceConfig;setConfig:(c:CommerceConfig)=>void;save:(b:unknown)=>Promise<unknown>;busy:boolean}) {
  const [base,setBase]=useState(5000),[costs,setCosts]=useState<number|null>(null),[credit,setCredit]=useState(0),[other,setOther]=useState(0);
  const [reverse,setReverse]=useState(''),[reason,setReason]=useState('');
  const p=config.referralProgram;
  const patch=(value:Partial<typeof p>)=>setConfig({...config,referralProgram:{...p,...value}});
  const amount=(n:number|null)=>n===null?'Nedostaju troškovi':money(n,'sr');
  const status:Record<string,string>={pending:'Čeka završetak',granted:'Kredit dodeljen',limit:'Dostignut mesečni limit',reversed:'Kredit poništen',rejected:'Ne ispunjava uslove'};
  const completed=data.orders.filter(o=>o.status==='completed');
  return <div className="referral-admin">
    <form className="admin-card commerce-form" onSubmit={e=>{e.preventDefault();save({action:'config',config});}}>
      <h2>Preporuči i zaradi</h2>
      <p>Popust za novog kupca, kredit za preporučioca. Aktivacija zahteva unete troškove; svaki preporučeni najam se ponovo proverava pri potvrdi. Spuštanje ciljnog doprinosa povećava rizik.</p>
      <p className={data.costedTools<data.publishedTools?'form-error':'admin-notice'}>Troškovi uneti: {data.costedTools} / {data.publishedTools} objavljenih alata. Trošak po danu uključuje procenu habanja, servisa i rada; priprema uključuje čišćenje i predaju. Nula znači stvarno nula, ne „nepoznato”. Unosi se u kartici „Uputstva i preporuke”.</p>
      <label className="commerce-check"><input type="checkbox" checked={p.enabled} onChange={e=>patch({enabled:e.target.checked})}/>Program aktivan</label>
      <div className="commerce-inline">{([
        ['percent','Popust novom kupcu (%)',50],['maxDiscount','Najveći popust (RSD)',10000000],['minimum','Minimalan najam pre popusta (RSD)',10000000],
        ['reward','Kredit preporučiocu (RSD)',10000000],['monthlyLimit','Nagrade po članu mesečno',100],['minContributionPercent','Najmanji doprinos posle troškova (%)',90],
      ] as const).map(([key,label,max])=><label key={key}>{label}<input type="number" min={key==='monthlyLimit'?1:0} max={max} step={key==='monthlyLimit'?1:0.01} required value={p[key]} onChange={e=>patch({[key]:Number(e.target.value)})}/></label>)}</div>
      <label>Kraj pilota (UTC; prazno = bez roka)<input type="datetime-local" value={p.pilotEndsAt.slice(0,16)} onChange={e=>patch({pilotEndsAt:e.target.value?new Date(e.target.value+'Z').toISOString():''})}/></label>
      <button type="button" className="button button-plain" onClick={()=>patch({pilotEndsAt:new Date(Date.now()+30*86400000).toISOString()})}>Postavi pilot od 30 dana</button>
      <label>Članovi pilota (bez izbora = svi članovi)<select multiple value={p.memberIds} onChange={e=>patch({memberIds:Array.from(e.target.selectedOptions,o=>o.value)})}>{data.members.map(m=><option key={m.id} value={m.id}>{m.name} · {m.code}</option>)}</select></label>
      <p>Biraj 10–20 stvarnih članova za početni pilot. Limit se računa po završenim najmovima u kalendarskom mesecu, Europe/Belgrade. Poništavanje ne oslobađa mesečni limit. Promena uslova važi za nove zahteve; već poslati zadržavaju svoju ponudu. Pauza zaustavlja nove preporuke.</p>
      <button className="button button-lime" disabled={busy}>Sačuvaj program</button>
    </form>
    <section className="admin-card commerce-form">
      <h2>Da li se popust isplati?</h2>
      <p>Scenario koristi isti procentualni limit i plafon popusta. Unesi stvarne troškove na istoj poreskoj osnovi kao prihod. Doprinos nije neto dobit: iz njega se pokrivaju režije i drugi troškovi koji nisu u unetim iznosima. Nagrada se rezerviše u punom iznosu čak i kada kredit još nije potrošen.</p>
      <div className="commerce-inline">
        <label>Najam pre popusta (RSD)<input type="number" min={0} value={base} onChange={e=>setBase(Math.max(0,Number(e.target.value)))}/></label>
        <label>Postojeća ušteda: paket / trajanje (RSD)<input type="number" min={0} max={base} value={other} onChange={e=>setOther(Math.max(0,Math.min(base,Number(e.target.value))))}/></label>
        <label>Troškovi celog najma (RSD)<input type="number" min={0} placeholder="Unesi stvarne troškove" value={costs??''} onChange={e=>setCosts(e.target.value===''?null:Math.max(0,Number(e.target.value)))}/></label>
        <label>Kredit kupca (% posle popusta)<input type="number" min={0} max={config.creditLimitPercent} value={credit} onChange={e=>setCredit(Math.max(0,Math.min(config.creditLimitPercent,Number(e.target.value))))}/></label>
      </div>
      {base<p.minimum && <p className="form-error">Ovaj najam ne ispunjava minimalni prag programa; redovi su samo simulacija.</p>}
      <div className="referral-table"><table><thead><tr><th>Scenario</th><th>Naplaćen najam</th><th>Budžet nagrade</th><th>Najveći troškovi za cilj {p.minContributionPercent}%</th><th>Doprinos posle unetih troškova</th></tr></thead><tbody>
      {[{label:'Bez preporuke',percent:0,reward:0},{label:`Program: ${p.percent}%`,percent:p.percent,reward:p.reward},{label:'Poređenje: 5%',percent:5,reward:p.reward}].map(s=>{
        const rental=round(base-Math.max(Math.min(base,other),Math.min(base*s.percent/100,p.maxDiscount)));
        const cash=round(rental*(1-credit/100));
        const max=round(cash*(1-p.minContributionPercent/100)-s.reward);
        const contribution=costs===null?null:round(cash-s.reward-costs);
        return <tr key={s.label}><th>{s.label}</th><td>{amount(cash)}</td><td>{amount(s.reward)}</td><td>{amount(max)}</td><td>{amount(contribution)}{contribution!==null && <strong className={costs!<=max?'saving-text':'form-error'}> · {costs!<=max?'Pokriva cilj':'Ispod cilja'}</strong>}</td></tr>;
      })}</tbody></table></div>
      <p>U realnoj korpi sistem poredi tarife po stavci i poštuje donju granicu cene. Simulacija je za ukupan najam; dostava i materijal su isključeni. Sa kreditom od {config.creditLimitPercent}% ostaje manje za troškove — proveri i taj scenario. Nemoj odobriti program samo zato što su iznosi u kalkulatoru pozitivni.</p>
    </section>
    <section className="admin-card"><h2>Rezultati preporuka</h2>
      <p>{completed.length} završenih najmova · {amount(completed.reduce((n,o)=>n+o.discount,0))} dodatnih popusta · {amount(data.rewards.filter(r=>!r.reversedAt).reduce((n,r)=>n+r.amount,0))} odobrenog kredita.</p>
      <p>Doprinos je procena po najmu uz rezervisanu punu nagradu. Ne sabirati ga sa doprinosom drugih najmova koji već odbija iskorišćen kredit: to bi dvaput računalo isti trošak. Povraćaj novca evidentira se u poslovnoj evidenciji; poništavanje ispod menja samo nagradu.</p>
      {!data.orders.length?<p>Još nema preporučenih najmova.</p>:<div className="referral-table"><table><thead><tr><th>Najam / kod</th><th>Status nagrade</th><th>Popust</th><th>Troškovi</th><th>Procena doprinosa</th></tr></thead><tbody>{data.orders.map(o=><tr key={o.id}><td>{o.id}<br/>{o.code}<br/>{o.status}</td><td>{status[o.referralStatus]||o.referralStatus}</td><td>{amount(o.discount)}</td><td>{amount(o.costs)}</td><td>{amount(o.contribution)}{o.percent!==null?` (${o.percent}%)`:''}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="admin-card"><h2>Kodovi članova</h2>{!data.members.length && <p>Još nema članova. Novi članovi automatski dobijaju kod.</p>}{data.members.map(m=><div className="order-line-admin" key={m.id}><div><strong>{m.name} · {m.code}</strong><p>{m.successful} uspešnih · {m.pending} na čekanju · preostalo {m.remaining} nagrada ovog meseca</p></div><button className="button button-plain" disabled={busy} onClick={()=>save({action:'referral-pause',id:m.id,paused:!m.paused})}>{m.paused?'Aktiviraj kod':'Pauziraj kod'}</button></div>)}</section>
    <form className="admin-card commerce-form" onSubmit={async e=>{e.preventDefault();const result=await save({action:'referral-reverse',id:reverse,reason});if(result){setReason('');setReverse('');}}}>
      <h2>Poništi nagradu uz evidenciju</h2><p>Za povraćaj novca ili potvrđenu zloupotrebu. Ako je kredit već iskorišćen, saldo može postati negativan; buduće nagrade prvo pokrivaju taj dug. Poništena nagrada ostaje u evidenciji i ne dodeljuje se ponovo.</p>
      <label>Dodeljena nagrada<select required value={reverse} onChange={e=>setReverse(e.target.value)}><option value="">Izaberi najam</option>{data.rewards.filter(r=>!r.reversedAt).map(r=><option key={r.orderId} value={r.orderId}>{r.orderId} · {amount(r.amount)}</option>)}</select></label>
      <label>Razlog<input required minLength={5} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label>
      <button className="button button-plain" disabled={busy||!reverse}>Poništi izabranu nagradu</button>
      {data.rewards.filter(r=>r.reversedAt).map(r=><p key={r.orderId}>{r.orderId} · {r.reversedAt} · {r.reason}</p>)}
    </form>
  </div>;
}
