import publishedGuideData from './published-rental-guides.json';
import { mergePublishedGuides } from './guide-publishing.mjs';
import type { GuideBlock } from '@/components/GuideContent';

const LEGACY_GUIDES_PUBLISHED_AT = '2026-10-14T12:00:00.000Z';
export type RentalGuide = {
  slug: string; title: string; description: string; intro: string;
  sections?: { heading: string; text: string }[];
  blocks?: GuideBlock[];
  toolIds: string[];
  status: 'published';
  publishedAt: string; updatedAt: string;
};
export const guideHub = { title: 'Saveti za izbor i iznajmljivanje alata', description: 'Kako izabrati merdevine, vibro ploču, žirafu ili mašinu za dubinsko pranje i šta proveriti pri obračunu iznajmljivanja i dostave u Beogradu.' };
const legacyRentalGuides = [
  {
    slug: 'vibro-ploca-ili-vibro-zaba', title: 'Vibro ploča ili vibro žaba: šta izabrati za sabijanje podloge?',
    description: 'Razlika između vibro ploče i vibro nabijača, izbor prema podlozi i pristupu i šta navesti pre iznajmljivanja mašine za tabanje.',
    intro: 'Za širu površinu od odgovarajućeg peska i šljunka obično se razmatra vibro ploča. Za uske rovove i rad oko temelja razmatra se vibro nabijač, odnosno vibro žaba. Tačan izbor zavisi od materijala, vlage, slojeva i prostora za upravljanje.',
    sections: [
      { heading: 'Prvo razjasni šta znači „tabanje podova“', text: 'Sabijanje podloge pre poda razlikuje se od ravnanja svežeg betona ili brušenja gotove površine. Ako pripremaš podlogu, pošalji vrstu nasipa, površinu i plan slojeva. Ako radiš na već izlivenom podu, opiši da li je cilj ravnanje, skidanje sloja ili završna obrada. Na osnovu toga bira se druga vrsta mašine.' },
      { heading: 'Površina i pristup određuju izbor', text: 'Šira ploča omogućava prelaze preko otvorene površine; nabijač ima uži oslonac koji može biti prikladniji za ograničen pristup. Nijedna mašina nije univerzalna za svaki tip tla. Kod behatona se posebno proverava zaštitni dodatak i preporuka proizvođača popločanja. Debljinu sloja i broj prelaza određuje plan radova, a ne proizvoljan broj ponavljanja.' },
      { heading: 'Šta poslati pre rezervacije?', text: 'Navedi širinu najužeg prolaza, materijal, približnu površinu, način utovara i datum rada. Dogovori gorivo, transport i potrebne dodatke. Benzinske mašine koriste se u odgovarajućim spoljašnjim uslovima; zatvorena prostorija zahteva drugačije rešenje. Pre rada proveri uputstvo konkretnog modela.' },
    ], toolIds: ['crafter-62855', 'crafter-62858'],
  },
  {
    slug: 'kako-izabrati-merdevine', title: 'Kako izabrati merdevine za iznajmljivanje: visina, oslonac i pristup',
    description: 'Šta proveriti pre rentiranja merdevina: razlika između dužine i radne visine, način postavljanja, nosivost i uslovi na mestu rada.',
    intro: 'Merdevine biraj prema visini mesta rada i dozvoljenom načinu postavljanja konkretnog modela. Oznaka 3×10 opisuje konfiguraciju trodelnih merdevina; sama ne potvrđuje potrebnu radnu visinu niti nosivost.',
    sections: [
      { heading: 'Radna visina nije dužina merdevina', text: 'Nije dovoljno izmeriti rastojanje od poda do plafona i izabrati merdevine iste dužine. Potrebna visina zavisi od položaja, oslonca i dozvoljenog mesta stajanja. Za montažu na fasadi, krečenje plafona i pristup krovu uslovi su različiti. Navedi visinu radne tačke i vrstu posla; tačan domet proverava se u dokumentaciji modela.' },
      { heading: 'Proveri podlogu i raspoloživ prostor', text: 'Fotografija mesta rada može pomoći da se vidi pristup i prostor za postavljanje. Podloga mora odgovarati uputstvu: neravan teren, stepenice i klizava površina traže poseban plan. Trodelne merdevine ne mogu se proizvoljno postavljati u svaki položaj. Ako posao zahteva dug rad, bočno pružanje ili prenošenje teškog materijala, proveri da li je primerenija radna platforma.' },
      { heading: 'Dogovori komplet pre preuzimanja', text: 'Pošalji datum, visinu i način transporta. Traži potvrdu modela, nosivosti i dozvoljenih položaja i uračunaj alat u ukupno opterećenje. Pre upotrebe pregledaj oslonce i bravice prema uputstvu. U blizini električnih vodova aluminijumske merdevine zahtevaju posebno razmatranje bezbednosti; izbor opreme i radne zone treba rešiti pre iznajmljivanja.' },
    ], toolIds: ['crafter-20586'],
  },
  {
    slug: 'zirafa-i-usisivac-za-zidove', title: 'Žirafa za zidove: kako izabrati abraziv i usisivač',
    description: 'Izbor žirafe za brušenje zidova i plafona, odgovarajućeg abraziva i odvođenja prašine pre iznajmljivanja.',
    intro: 'Za brušenje odgovarajućeg gleta na zidovima i plafonima može se koristiti žirafa. Planiraj mašinu, abraziv i odvođenje prašine zajedno; sama brusilica ne određuje kvalitet završne površine.',
    sections: [
      { heading: 'Opiši sloj koji obrađuješ', text: 'Novi glet, stari premaz i tvrda mineralna podloga nisu isti posao. Navedi materijal, da li je suv i šta želiš da postigneš. Žirafa nije univerzalna zamena za brusilicu za beton. Kod nepoznatih starih premaza najpre utvrdi sastav i primeren postupak uklanjanja; obična kombinacija žirafe i usisivača ne rešava svaki rizik prašine.' },
      { heading: 'Proveri abraziv i spoj sa usisivačem', text: 'Prečnik, raspored otvora i granulacija moraju odgovarati mašini i materijalu. Za Mirka LEROS 950CV proverava se abraziv za ploču od 225 mm. Usisivač se bira prema prašini i zahtevu proizvođača alata. Proveri crevo, adapter, filter i vreću; to što priključak fizički staje ne znači da uređaj odgovara svakoj prašini.' },
      { heading: 'Šta navesti u upitu?', text: 'Pošalji kvadraturu, visinu plafona, vrstu sloja i raspoloživo napajanje. Potrošni abrazivi i usisivač potvrđuju se posebno ako nisu navedeni u kompletu. Probna obrada male površine pomaže pri izboru granulacije. Ne pritiskaj alat da bi nadoknadio istrošen ili pogrešan abraziv; prati uputstvo i proveravaj rezultat tokom rada.' },
    ], toolIds: ['crafter-62581'],
  },
  {
    slug: 'dubinsko-pranje-namestaja-izbor-masine', title: 'Mašina za dubinsko pranje nameštaja: šta proveriti pre iznajmljivanja',
    description: 'Kako izabrati ekstrakcijsku mašinu za garniture i auto-sedišta, proveriti materijal, nastavke i uslove sušenja.',
    intro: 'Ekstrakcijska mašina nanosi rastvor na tekstil i usisava ga nazad zajedno sa nečistoćom. Namenjena je materijalima koji dozvoljavaju mokro čišćenje. Pre rezervacije proveri oznaku održavanja nameštaja.',
    sections: [
      { heading: 'Materijal je važniji od veličine mašine', text: 'Garnitura, dušek i auto-sedište mogu imati različite presvlake, punjenje i preporuke čišćenja. Ako oznaka ili proizvođač ne dozvoljavaju pranje vodom, nemoj pretpostaviti da je ekstrakcija odgovarajuća. Za nepoznat materijal traži potvrdu načina održavanja. Mrlje različitog porekla ne uklanjaju se istim sredstvom, pa opiši i nečistoću koju želiš da očistiš.' },
      { heading: 'Dogovori nastavak i sredstvo', text: 'Za tapacirani nameštaj potreban je odgovarajući nastavak; nastavak za tepih može biti nepraktičan za sedišta i uglove. Proveri sadržaj kompleta, sredstvo koje odgovara i tekstilu i uređaju, kao i njegovu dozu. Ne koristi proizvoljan deterdžent koji stvara mnogo pene. Test na skrivenom delu prethodi čišćenju vidljive površine.' },
      { heading: 'Planiraj i sušenje', text: 'Izvlačenje rastvora ne znači da je punjenje potpuno suvo. Vreme sušenja zavisi od količine vlage, materijala, temperature i ventilacije; ne postoji jedno vreme za svaki komad nameštaja. Planiraj termin u kome se nameštaj može osušiti pre korišćenja. U upitu navedi broj komada, materijal i datum, a pri preuzimanju proveri uputstvo za punjenje, pražnjenje i vraćanje čiste mašine.' },
    ], toolIds: ['crafter-35551'],
  },
  {
    slug: 'cena-najma-alata-i-dostave', title: 'Kako se računa cena iznajmljivanja alata i dostave u Beogradu',
    description: 'Dnevna cena, izabrani datumi, dostava, depozit i potrošni materijal: šta proveriti da bi ponuda za iznajmljivanje bila potpuna.',
    intro: 'Početna dnevna cena je polazna informacija. Za konkretnu ponudu izaberi alat, datume i način preuzimanja. Obračun u formularu prikazuje te izbore, a termin, komplet i konačne uslove potvrđujemo pre iznajmljivanja.',
    sections: [
      { heading: 'Uporedi cenu za ceo posao', text: 'Dva alata sa sličnom dnevnom cenom mogu imati različitu namenu i učinak. Navedi obim rada da bismo proverili odgovarajući model. Broj dana, količina i primenljiva pravila iznajmljivanja utiču na obračun. Aktuelnu cenu vidiš na stranici konkretnog alata; ako je označena kao cena na upit, potrebna je ponuda za izabrani posao.' },
      { heading: 'Dostava i depozit su odvojene stavke', text: 'Dostava zavisi od izabrane opcije i potvrđuje se za adresu i termin na teritoriji grada Beograda. Ako planiraš preuzimanje, dogovori lokaciju i mogućnost transporta većeg alata. Depozit ima zasebne uslove: proveri iznos, način polaganja i uslove vraćanja pre rezervacije. Nemoj ga automatski računati kao trajni trošak iznajmljivanja.' },
      { heading: 'Proveri šta ulazi u komplet', text: 'Burgije, diskovi, abrazivi, sredstva, gorivo i dodatni uređaji ne treba da se podrazumevaju. Zatraži potvrdu sadržaja kompleta i potrošnog materijala. U jednom upitu pošalji alat, datume, količinu, opis posla i adresu ako želiš dostavu. Tako ponuda može da uključi potrebne dodatke, a ti možeš da uporediš ukupan planirani trošak.' },
    ], toolIds: ['crafter-30354', 'crafter-63590', 'crafter-63082', 'crafter-31501', 'tool-055'],
  },
];
export const rentalGuides = mergePublishedGuides(
  legacyRentalGuides.map(guide => ({ ...guide, status: 'published' as const, publishedAt: LEGACY_GUIDES_PUBLISHED_AT, updatedAt: LEGACY_GUIDES_PUBLISHED_AT })),
  publishedGuideData,
) as RentalGuide[];
if (new Set(rentalGuides.map(guide => guide.slug)).size !== rentalGuides.length) throw new Error('Duplicate published guide URL.');
// Only the hub uses the most recent update; article dates remain independent.
export const GUIDES_UPDATED_AT = rentalGuides.map(guide => guide.updatedAt).sort().at(-1) || LEGACY_GUIDES_PUBLISHED_AT;
export function guideDateLabel(value: string) {
  return new Intl.DateTimeFormat('sr-Latn-RS', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Belgrade' }).format(new Date(value));
}
