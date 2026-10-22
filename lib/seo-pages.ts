import { copy } from './i18n';
import { ct } from './commerce/copy';
import type { Locale } from './types';

export function pageCopy(locale: Locale): Record<string, { title: string; description: string }> {
  const t = copy[locale];
  const pages = {
    '': { title: t.rentalSeo, description: `${t.catalogText} ${t.depositNote}` },
    katalog: { title: `${t.catalog} — ${t.categorySeo}`, description: t.catalogText },
    'kako-funkcionise': { title: `${t.how} — ${t.rentalWord}`, description: `${t.step1Text} ${t.step2Text} ${t.step3Text}` },
    dostava: { title: `${t.delivery} — ${t.area}`, description: t.faq2a },
    kontakt: { title: `${t.contact} — ${t.rentalSeo}`, description: t.contactText },
    privatnost: { title: t.privacy, description: t.privacyText },
    korpa: { title: ct(locale, 'cart'), description: t.requestHint },
    nalog: { title: ct(locale, 'account'), description: t.privacyText },
    klub: { title: `${ct(locale, 'club')} — ${t.rentalWord}`, description: `${ct(locale, 'club')}. ${t.heroNote} ${t.catalogText}` },
    paketi: { title: ct(locale, 'packages'), description: `${ct(locale, 'packages')}. ${t.ctaText} ${t.catalogText}` },
  };
  if (locale === 'sr') Object.assign(pages, {
    '': { title: 'Iznajmljivanje alata u Beogradu', description: 'Najniže cene i najveći izbor alata za rentiranje u Beogradu. Građevinski i baštenski alat, mašine za pranje. Pogledaj cene i dogovori dostavu.' },
    katalog: { title: 'Alati za iznajmljivanje Beograd — katalog i cene', description: 'Najniže cene i najveći izbor alata za rentiranje u Beogradu. Uporedi dnevne cene, izaberi alat i dogovori preuzimanje ili dostavu.' },
    'kako-funkcionise': { title: 'Kako iznajmiti alat — uslovi iznajmljivanja i depozita', description: 'Izaberi alat i datume, pošalji upit i dogovori preuzimanje ili dostavu. Saznaj kako se potvrđuju dostupnost, cena i vraćanje alata. Depozit po dogovoru i klupske pogodnosti.' },
    dostava: { title: 'Dostava alata u Beogradu — preuzimanje i cene', description: 'Dostava i preuzimanje alata isključivo na teritoriji grada Beograda, uključujući Obrenovac, Sremčicu i Železnik. Standardna i hitna dostava uz potvrdu termina.' },
    kontakt: { title: 'Kontakt za iznajmljivanje alata u Beogradu', description: 'Pošalji upit za iznajmljivanje alata u Beogradu. Navedi posao, željene datume i adresu dostave da potvrdimo odgovarajući alat, dostupnost i konačnu cenu.' },
    klub: { title: 'Klub majstora — popust i iznajmljivanje bez depozita', description: 'Učlani se besplatno u Klub majstora: 5% popusta odmah i iznajmljivanje bez depozita nakon tri plaćena i završena iznajmljivanja u Beogradu.' },
    paketi: { title: 'Paketi alata za iznajmljivanje — Beograd', description: 'Pogledaj pakete alata za povezane radove. Izaberi potrebnu opremu i datume iznajmljivanja, pa zatraži potvrdu cene i dostave na teritoriji grada Beograda.' },
  });
  return pages;
}
