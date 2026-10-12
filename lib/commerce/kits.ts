import type { Bundle } from './types';
// Only catalog IDs go into rental carts. Supply lists are planning suggestions, not stock.
export const kitIdeas = [
  ['kit-paint', 'Krečenje stana', 'Priprema zidova, mešanje boje i nanošenje. Za osveženje jedne ili više prostorija.', ['026', '051', '028'], 'Renoviranje', ['Brusni diskovi odgovarajućeg prečnika', 'Zaštitna folija', 'Krep traka']],
  ['kit-drywall', 'Montaža gips ploča', 'Podizanje ploča, šrafljenje i nivelisanje za pregradne zidove i plafone.', ['066', '031', '055'], 'Renoviranje', ['Vijci za odgovarajuću podlogu', 'Bitovi za šrafilicu', 'Bandaž traka']],
  ['kit-channels', 'Kanali za instalacije', 'Provera položaja instalacija, sečenje kanala i završna obrada štemericom. Usisavanje i kompatibilnost opreme dogovaramo prema podlozi.', ['061', '025', '024'], 'Renoviranje', ['Dijamantski diskovi prema materijalu', 'Vreće za šut']],
  ['kit-remove-tiles', 'Skidanje starih pločica', 'Štemerica za demontažu i mikser za kasniju pripremu podloge. Nastavke biramo prema poslu.', ['024', '051'], 'Renoviranje', ['Vreće za šut', 'Odgovarajuće dleto']],
  ['kit-floors', 'Obnova drvenih podova', 'Hoblovanje i rad renovatorom na detaljima. Za ivice i uglove proveravamo potreban nastavak.', ['037', '034'], 'Drvo i montaža', ['Brusne trake prema modelu', 'Brusni listovi za renovator']],
  ['kit-laminate', 'Postavljanje laminata', 'Precizno merenje, poprečni rezovi i prilagođavanje oko uglova i cevi.', ['033', '039', '056'], 'Drvo i montaža', ['Listovi testere za laminat', 'Podloga za laminat', 'Distanceri']],
  ['kit-furniture', 'Montaža nameštaja', 'Šrafljenje, poravnanje i sečenje detalja tokom montaže kuhinje ili plakara.', ['031', '039', '055'], 'Drvo i montaža', ['Bitovi', 'Burgije prema materijalu', 'Vijci i tiplovi']],
  ['kit-wood', 'Radionica za drvo', 'Sečenje i obrada ivica uz šrafilicu za sklapanje. Radni prostor i prihvat prašine planiraj unapred.', ['040', '036', '031'], 'Drvo i montaža', ['Odgovarajući list testere', 'Glodala prema zahvatu', 'Vijci za drvo']],
  ['kit-hedge', 'Živa ograda i granje', 'Orezivanje žive ograde, usitnjavanje prikladnih grana i skupljanje lišća.', ['019', '022', '021'], 'Dvorište', ['Vreće za zeleni otpad', 'Baštenske rukavice']],
  ['kit-fence', 'Postavljanje ograde', 'Bušenje rupa za stubove, nivelisanje i zavrtanje spojeva. Pre bušenja proveri podzemne instalacije.', ['020', '055', '032'], 'Dvorište', ['Vijci i spojnice za ogradu', 'Odgovarajući nastavci']],
  ['kit-paving', 'Osveženje behatona', 'Mehaničko čišćenje, pranje pod pritiskom i skupljanje suvog lišća pre pranja.', ['009', '001', '021'], 'Čišćenje', ['Sredstvo prikladno za podlogu', 'Džakovi za otpad']],
  ['kit-steam', 'Detaljno čišćenje doma', 'Paročistač i mašina za dubinsko pranje za različite površine. Prikladnost za tekstil i obloge proveravamo odvojeno.', ['002', '003'], 'Čišćenje', ['Sredstvo za ekstrakciono pranje', 'Mikrofiber krpe']],
  ['kit-drying', 'Ispumpavanje i isušivanje', 'Pumpa do nultog nivoa i odvlaživač za uklanjanje vode i naknadno isušivanje. Vrstu vode i uslove rada proveravamo pre potvrde.', ['014', '011'], 'Čišćenje', ['Odgovarajuća creva i spojnice', 'Vreće za otpad']],
  ['kit-pipes', 'Montaža plastičnih cevi', 'Varilica, klešta i stega za pripremu i spajanje kompatibilnih vodovodnih cevi.', ['052', '053', '054'], 'Instalacije i metal', ['Cevi i fitinzi prema sistemu', 'Odgovarajući zaptivni materijal']],
  ['kit-metal', 'Radovi sa metalom', 'Sečenje profila, priprema spojeva i varenje. Pribor usklađujemo sa materijalom i aparatom.', ['041', '043', '042'], 'Instalacije i metal', ['Rezne ploče prema materijalu', 'Elektrode ili žica prema aparatu']],
  ['kit-site-light', 'Osvetljenje radnog prostora', 'Reflektor i motalica za radni prostor sa postojećim priključkom. Dužinu kabla i dozvoljeno opterećenje proveravamo pri preuzimanju.', ['070', '069'], 'Renoviranje', []],
] as const;
export const extraKits: Bundle[] = kitIdeas.map(([id, name, description, ids]) => ({
  id, name, description, toolIds: ids.map(id => 'tool-' + id), discount: 5, published: true,
}));
export function kitDetails(id: string) {
  const row = kitIdeas.find(k => k[0] === id);
  if (row) return { group: row[4] as string, supplies: [...row[5]] as string[] };
  if (id === 'kit-garden') return { group: 'Dvorište', supplies: ['Struna prema modelu trimera', 'Vreće za zeleni otpad'] };
  if (id === 'kit-tiles') return { group: 'Renoviranje', supplies: ['Disk prema materijalu pločice', 'Krstići ili klipse za nivelaciju', 'Sunđeri za fugovanje'] };
  if (id === 'kit-clean') return { group: 'Čišćenje', supplies: ['Kompatibilno sredstvo za pranje', 'Mikrofiber krpe'] };
  return { group: 'Ostali poslovi', supplies: [] as string[] };
}
