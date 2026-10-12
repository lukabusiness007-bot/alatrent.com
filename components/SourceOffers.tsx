'use client';

import { useState } from 'react';
import catalog from '@/lib/catalog-source-offers.json';
import { normalizedEquipmentName } from '@/lib/equipment-type';
import type { Tool } from '@/lib/types';

const kindNames: Record<string, string> = { rental: 'Najam', service: 'Usluga', sale: 'Prodaja' };

export default function SourceOffers({ tools, toolId, onEdit, onApply }: {
  tools: Tool[];
  toolId?: string;
  onEdit?: (tool: Tool) => void;
  onApply?: (price: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('');
  const [kind, setKind] = useState('');
  const offers = catalog.offers.filter(offer => (!toolId || offer.toolIds.includes(toolId))
    && (!source || offer.source === source) && (!kind || offer.kind === kind)
    && normalizedEquipmentName([offer.name, offer.priceText, ...offer.toolIds.map(id => tools.find(t => t.id === id)?.name.sr || '')].join(' '))
      .includes(normalizedEquipmentName(query)));
  function download() {
    const safeCell = (value: string) => '"' + (/^[=+\-@]/.test(value) ? "'" : '') + value.replaceAll('"', '""') + '"';
    const rows = [['Alat / ponuda', 'Izvor', 'Vrsta cene', 'Objavljena cena', 'PDV, dodaci i popusti', 'Depozit izvora', 'Neslaganje', 'Datum provere', 'URL'],
      ...offers.map(offer => [offer.name, offer.source, kindNames[offer.kind], offer.priceText,
        offer.priceNotes.join('\n'), offer.depositText, offer.discrepancy, offer.observedAt, offer.url])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(safeCell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'cene-alata-2026-10-12.csv'; link.click(); URL.revokeObjectURL(url);
  }
  return <section className="admin-card source-offers">
    <h2>{toolId ? 'Objavljene cene drugih ponuđača' : 'Cene i ponude iz četiri izvora'}</h2>
    <p className="field-note">Provereno 12.10.2026. Svaka varijanta i komplet imaju zaseban zapis. Iznosi u EUR, mesečne tarife, trošenje pribora i usluge prikazani su u originalnoj jedinici. Ove cene ne menjaju naš cenovnik.</p>
    {!toolId && <div className="source-filters">
      <label>Pretraga<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Alat, model ili cena" /></label>
      <label>Izvor<select value={source} onChange={e => setSource(e.target.value)}><option value="">Svi izvori</option>{[...new Set(catalog.offers.map(o => o.source))].map(s => <option key={s} value={s}>{s}</option>)}</select></label>
      <label>Vrsta cene<select value={kind} onChange={e => setKind(e.target.value)}><option value="">Sve vrste</option>{Object.entries(kindNames).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select></label>
      <button className="button button-plain" type="button" onClick={download}>Preuzmi CSV ({offers.length})</button>
    </div>}
    <p className="field-note">{offers.length} {toolId ? 'povezanih ponuda' : 'ponuda i cena'}</p>
    <div className="source-table-scroll"><table className="source-table"><thead><tr><th>Ponuda i izvor</th><th>Objavljena cena</th><th>Uslovi i provera</th></tr></thead><tbody>
      {offers.map(offer => {
        const usablePrice = offer.kind === 'rental' && offer.toolIds.length === 1 && !offer.discrepancy
          ? offer.prices.find(price => price.currency === 'RSD' && price.unit === 'day' && price.vat === 'included') : undefined;
        return <tr key={offer.id}>
          <td><strong>{offer.name}</strong><a href={offer.url} target="_blank" rel="noopener noreferrer">{offer.source} ↗</a><small>{kindNames[offer.kind]}</small>
            {!toolId && onEdit && offer.toolIds.map(id => { const tool = tools.find(t => t.id === id); return tool ? <button className="source-tool-link" type="button" key={id} onClick={() => onEdit(tool)}>Uredi: {tool.name.sr}</button> : null; })}
          </td>
          <td><strong>{offer.priceText || 'Cena na upit'}</strong>{offer.kind !== 'rental' && <small>{offer.kind === 'service' ? 'Po usluzi / intervenciji' : 'Prodajna cena uređaja ili opreme'}</small>}
            {toolId && onApply && usablePrice && <button className="button button-plain" type="button" onClick={() => onApply(usablePrice.amount)}>Unesi {usablePrice.amount.toLocaleString('sr-RS')} RSD / dan</button>}
          </td>
          <td>{offer.discrepancy && <p className="source-price-conflict">{offer.discrepancy}</p>}
            <details><summary>PDV, depozit, dodaci i popusti</summary>{offer.priceNotes.map((note, i) => <p key={i}>{note}</p>)}{offer.depositText && <p>{offer.depositText}</p>}</details>
          </td>
        </tr>;
      })}
    </tbody></table></div>
    {!offers.length && <p className="field-note">Nema povezanih ponuda za izabrani filter. Dnevni najam ove vrste nije objavljen u izvorima.</p>}
  </section>;
}
