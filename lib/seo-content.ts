import catalog from './seo-catalog.json';
import seed from './seed.json';
import { copy, money } from './i18n';
import type { Category, Locale, Tool } from './types';

export const SEO_CONTENT_UPDATED_AT = '2026-10-10T20:21:19.104Z';

type ToolContent = { term: string; aliases: string[]; use: string; selection: string };
export const toolContent = catalog as Record<string, ToolContent>;
export const categoryContent: Record<string, { title: string; intro: string; selection: string }> = {
  'ciscenje-i-pranje': {
    title: 'Iznajmljivanje mašina za čišćenje i pranje',
    intro: 'Oprema za dubinsko pranje nameštaja, čišćenje parom, pranje dvorišta i sakupljanje prašine. Uporedi uređaje prema površini koju čistiš i načinu rada.',
    selection: 'Za tekstil predviđen za mokro čišćenje razmotri ekstrakcijsku mašinu. Za tvrde spoljašnje površine proveri perač pod pritiskom, a za prašinu tokom radova odgovarajući industrijski usisivač. Dodatke i sredstva dogovaramo prema podlozi.',
  },
  'isusivanje-vazduh-i-pumpe': {
    title: 'Iznajmljivanje isušivača vazduha i pumpi',
    intro: 'Oprema za uklanjanje vode i kontrolu vlage u prostoru. Pumpa prebacuje tečnu vodu, dok odvlaživač smanjuje vlagu u vazduhu tokom sušenja.',
    selection: 'Za pumpu su važni vrsta vode, dubina, visina izbacivanja i dužina creva. Za isušivač navedi zapreminu i temperaturu prostora. Ozon generator ima posebnu namenu i nije zamena za uklanjanje izvora vlage.',
  },
  'basta-i-dvoriste': {
    title: 'Iznajmljivanje baštenskog alata',
    intro: 'Kosačice, trimeri, bušači zemlje i druga oprema za sezonsko uređenje dvorišta. Izaberi alat prema rastinju, površini i pristupu parceli.',
    selection: 'Redovno održavan travnjak, visoka trava i živa ograda zahtevaju različit alat. Za bušenje rupa navedi tip zemljišta i prečnik, a za seckanje grana njihov najveći prečnik. Pristup i transport većih mašina dogovaramo unapred.',
  },
  'busenje-rusenje-i-adaptacije': {
    title: 'Iznajmljivanje alata za bušenje i adaptacije',
    intro: 'Bušilice, pikameri, žirafe za brušenje i oprema za pripremu zidova. Uporedi alate za uklanjanje starih slojeva, postavljanje instalacija i završnu obradu.',
    selection: 'Za bušenje su važni podloga i dimenzije rupe; za štemovanje količina materijala i položaj rada. Žirafa je namenjena obradi odgovarajućeg gleta, dok obrada betona traži drugačiji alat. Odvođenje prašine planiraj zajedno sa izborom mašine.',
  },
  'obrada-drveta-i-parketa': {
    title: 'Iznajmljivanje alata za drvo i parket',
    intro: 'Testere, glodalice, rende i hoblerice za stolarske radove i obnovu drvenih površina. Izbor zavisi od vrste reza, dimenzija materijala i željene završne obrade.',
    selection: 'Ger testera, ubodna testera i stoni cirkular namenjeni su različitim rezovima. Ručno rende nije zamena za hoblericu za parket. Pre najma navedi materijal, debljinu i količinu posla kako bismo proverili listove, glodala ili abrazive.',
  },
  'metal-plastika-i-lemljenje': {
    title: 'Iznajmljivanje alata za metal i zavarivanje',
    intro: 'Oprema za sečenje i obradu metala, zavarivanje, nitovanje i lemljenje. Pronađi uređaj prema materijalu, vrsti spoja i raspoloživom napajanju.',
    selection: 'Rezanje profila, brušenje površine i spajanje delova traže različite dodatke. Za zavarivanje navedi materijal i debljinu, a za nitovanje prečnik zakovice. Diskove, elektrode, nastavke i ostali potrošni materijal potvrđujemo posebno.',
  },
  'keramika-i-vodovod': {
    title: 'Iznajmljivanje alata za keramiku i vodovod',
    intro: 'Sekači pločica, mikseri i alat za montažu cevnih instalacija. Oprema za pripremu materijala i ugradnju u kupatilu, kuhinji i drugim prostorima.',
    selection: 'Kod pločica proveri materijal, dužinu, debljinu i potreban ugao reza. Za cevne instalacije važni su materijal i prečnik cevi. Mešač biramo prema vrsti mase i količini po turi; nastavke dogovaramo pre najma.',
  },
  'merenje-i-detekcija': {
    title: 'Iznajmljivanje lasera i opreme za detekciju',
    intro: 'Laserski nivelatori, daljinomeri, kamere i detektori za proveru prostora i instalacija. Uporedi namene pre nego što izabereš uređaj.',
    selection: 'Nivelator daje referentne linije, a daljinomer meri rastojanje. Termalna kamera beleži temperaturne razlike, dok inspekciona kamera omogućava vizuelni pregled dostupne šupljine. Navedi cilj merenja i uslove da proverimo odgovarajući uređaj.',
  },
  'podizanje-i-transport': {
    title: 'Iznajmljivanje dizalica i transportnih kolica',
    intro: 'Oprema za podizanje materijala, pozicioniranje ploča i transport tereta. Izbor zavisi od mase, dimenzija, visine rada i uslova pristupa.',
    selection: 'Pošalji masu i dimenzije tereta, fotografiju pristupa ako je imaš i potrebnu visinu. Nosivost, oslonac i način pričvršćivanja proveravaju se za konkretan uređaj. Oprema za povlačenje nije nužno predviđena za podizanje.',
  },
  'struja-kompresori-i-grejanje': {
    title: 'Iznajmljivanje agregata, kompresora i grejalica',
    intro: 'Privremeno napajanje, komprimovani vazduh, radno osvetljenje i grejanje. Uporedi opremu prema potrošačima i uslovima na mestu rada.',
    selection: 'Za agregat navedi nazivne i startne snage potrošača, a za kompresor potreban protok i pritisak. Za grejanje su važni zapremina, napajanje i ventilacija. Produžne kablove i priključke biramo prema opterećenju.',
  },
};

export function toolHeading(tool: Tool, locale: Locale) {
  return locale === 'sr' && toolContent[tool.slug]
    ? `Iznajmljivanje ${toolContent[tool.slug].term}`
    : `${tool.name[locale]} — ${copy[locale].rentalWord}`;
}

// Replace only the original placeholder text; descriptions edited in the admin remain authoritative.
export function toolDescription(tool: Tool, locale: Locale) {
  const original = seed.tools.find(t => t.slug === tool.slug);
  if (locale === 'sr' && toolContent[tool.slug] && tool.description.sr === original?.description.sr)
    return toolContent[tool.slug].use;
  if (tool.description[locale] === original?.description[locale])
    return `${tool.name[locale]}. ${copy[locale].catalogText} ${copy[locale].requestHint}`;
  return tool.description[locale];
}

export function categoryHeading(category: Category, locale: Locale) {
  return locale === 'sr' && categoryContent[category.slug]
    ? categoryContent[category.slug].title
    : `${category.name[locale]} — ${copy[locale].rentalWord}`;
}

export function categoryDescription(category: Category, locale: Locale) {
  return locale === 'sr' && categoryContent[category.slug]
    ? categoryContent[category.slug].intro
    : `${category.name[locale]}. ${copy[locale].catalogText} ${copy[locale].depositNote}`;
}

export function rentalQuestions(tool: Tool, locale: Locale) {
  const t = copy[locale];
  if (locale !== 'sr') return [{ question: t.faq1, answer: t.faq1a }, { question: t.faq2, answer: t.faq2a }];
  const entry = toolContent[tool.slug];
  return [
    { question: `Koliko košta najam${entry ? ' ' + entry.term : ': ' + tool.name.sr}?`, answer: tool.price === null
      ? 'Cena se određuje na upit prema trajanju najma i potrebnoj opremi. Pošalji željene datume za konkretnu ponudu.'
      : `Prikazana osnovna dnevna cena je ${money(tool.price, locale)}. Obračun za izabrane datume vidiš u formularu; konačnu cenu i dodatke potvrđujemo pre najma. Dostava se obračunava posebno.` },
    { question: 'Šta treba navesti pre iznajmljivanja?', answer: entry?.selection || t.faq4a },
    { question: 'Da li je potrebna uplata depozita?', answer: t.depositNote },
    { question: 'Gde dostavljate i kako potvrđujem termin?', answer: `${t.faq2a} ${t.faq1a}` },
  ];
}

const cyrillic: Record<string, string> = Object.fromEntries(
  [...'абвгдђежзијклљмнњопрстћуфхцчџш'].map((letter, i) => [letter,
    ['a','b','v','g','d','dj','e','z','z','i','j','k','l','lj','m','n','nj','o','p','r','s','t','c','u','f','h','c','c','dz','s'][i]]),
);
export function normalizeSearch(value: string) {
  return value.toLowerCase().replace(/[а-яђјљњћџ]/g, letter => cyrillic[letter] || letter)
    .replace(/đ/g, 'dj').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
export function matchesTool(tool: Tool, locale: Locale, query: string) {
  const entry = toolContent[tool.slug];
  const haystack = normalizeSearch([tool.name[locale], tool.name.sr, entry?.term, ...(entry?.aliases || [])].join(' '));
  return normalizeSearch(query).split(/\s+/).every(word => haystack.includes(word));
}
