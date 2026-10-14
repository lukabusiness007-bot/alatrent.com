# SEO implementacija — 10. oktobar 2026.

## Obuhvat

Optimizovan je lokalni Next.js projekat za najam alata. Domena još nije registrovana/povezana, javno indeksiranje nije uključeno, a telefon i adresa čekaju unos. Poslovanje i dostava su ograničeni na administrativnu teritoriju grada Beograda, uključujući Obrenovac, Sremčicu i Železnik, prema potvrdi vlasnika.

Katalog posle dopune od 12.10.2026. ima 98 vrsta alata i 10 kategorija. [Mapa fraza](seo-keywords.md) sadrži glavnu frazu, dodatne nazive i odredišnu stranicu za svaki alat. [JSON izvoz](seo-keywords.json) uključuje sekundarne fraze, varijante bez dijakritike, namenu i pitanja za izbor. Mapa se obnavlja komandom `npm run seo:report`. Ne sadrži izmišljene mesečne obime pretrage, pozicije ili procene konkurencije.

## Šta je sprovedeno

### Fraze prema nameni i potvrđen telefon — 14.10.2026.

Za svih 188 objavljenih artikala fraze u `lib/seo-catalog.json` usklađene su sa Google Business uslugama: vrsta alata i namena vode naslov stranice, H1, SEO opis, rental `Service` i pitanja o najmu. Marka, model i specifikacije ostaju u odeljku „Model iz kataloga“. Postojeći URL-ovi i canonical linkovi su sačuvani. Sinonimi, najam i rentiranje uključeni su u pretragu kataloga; originalni nazivi modela ostaju pretraživi. Sadržaj modela objašnjava primenu i izbor opreme; ručni opisi i nazivi iz admina imaju prednost. Mapa ključnih fraza sada obuhvata samo objavljene artikle.

Vlasnik je potvrdio telefon `062 9751270` (`+381629751270`). Postavljen je u produkcionim podešavanjima i na Google Business profilu. Poziv, Viber, WhatsApp i JSON-LD koriste isti broj. Jednokratna migracija zamenjuje stari primer broja ili praznu vrednost, a čuva kasnije administratorske izmene. Google potvrđuje prijem izmene i prikazuje status na čekanju.

- Ručno pripremljena posebna namena i kriterijumi izbora za svih 98 vrsta alata u `lib/seo-catalog.json`. Srpski tekst nije samo zamena imena alata u istom pasusu.
- Posebni naslovi, opisi i smernice za 10 kategorija; primarne fraze u H1 i title elementima. Naslov početne stranice jasno navodi iznajmljivanje alata u Beogradu.
- Dinamični title i description za sve javne stranice na pet jezika, uključujući posebne opise za kontakt, dostavu, proces najma, pakete i klub. Detaljne smernice o nameni svakog alata napisane su na srpskom; strani jezici koriste svoje nazive i lokalizovan tekst usluge.
- Osnovna cena u odgovorima o najmu dolazi iz aktivnog kataloga; formular i dalje računa trajanje najma. Nikakve brojke o snazi, nosivosti, kapacitetu, zalihama ili potvrđenom modelu nisu izmišljene.
- Administratorski opisi ostaju sačuvani. Javni prikaz obogaćuje samo originalne početne opise i ne upisuje preko podataka u bazi.
- Vidljiva pitanja i odgovori na stranicama alata, linkovi ka dostavi, uslovima i kontaktu, veze između kategorija i pojedinačnih alata. Nema dodatnih gotovo istih stranica za sinonime ili svako naselje.
- Pretraga razume sinonime, latinične upite bez dijakritike i srpsku ćirilicu. Sve te varijante vode na isti URL alata.
- Canonical bez parametara; usaglašeni `sr-Latn`, `en`, `ru`, `tr`, `zh-Hans` i `x-default` u metapodacima i sitemap-u. Neispravne putanje i skriveni alati daju 404.
- Korpa, nalog, privatnost, privatni najmovi, interna pretraga/sortiranje, prazne kategorije i operativna uputstva nisu za indeksiranje. Za neindeksabilne stranice ne generišu se jezičke alternative. Uputstva ostaju dostupna za QR kodove i korisnike.
- Sitemap obuhvata 575 javnih URL-ova proširenog kataloga: 115 stranica × 5 jezika. Koristi fotografije alata, stvarne datume izmena uz datum SEO revizije sadržaja, i izostavlja neobjavljene alate/prazne kategorije. Nema izmišljenog ažuriranja datuma pri svakom zahtevu.
- `Organization`, `WebSite`, `BreadcrumbList`, `CollectionPage`/`ItemList` i rental `Service` JSON-LD. Kada se unese adresa, poslovni entitet postaje `LocalBusiness`. Kontakt, koordinate, recenzije i radno vreme se ne izmišljaju. Ponude i stanje zaliha nisu označeni kao potvrđeni dok su cene okvirne i model/dostupnost se potvrđuju kroz upit. Ovo ne obećava prikaz Product/FAQ rich results.
- Deljenje stranice alata koristi njegovu fotografiju kroz Open Graph i Twitter kartice. Fotografije imaju alt tekst i responsive sizes; glavna slika dobija viši prioritet učitavanja. Uklonjena je zastarela Next Image `priority` upotreba.
- HTTPS domen se normalizuje centralno. Nedostajući ili neispravan domen ostavlja preview noindex, blokiran robots-om i bez URL-ova u sitemap-u.
- Podrška za Google i Bing verifikacione tokene preko promenljivih okruženja.

## Domen

### Favicon i slike — 14.10.2026.

Proveren javni sajt `https://alatrent.rs`: početna stranica preusmerava na `/sr`, canonical i robots koriste taj domen, indeksiranje je uključeno, a postojeća Open Graph slika vraća HTTP 200. Objavljena verzija je prijavljivala samo `/favicon.svg`, dok je `/favicon.ico` vraćao 404.

Iz postojećeg SVG znaka pripremljeni su `/favicon.png` (96×96), `/favicon.ico` (16, 32, 48 i 96 px), `/apple-touch-icon.png` (180×180) i `/images/brand-logo.png` (512×512). ICO koristi Next.js file-based metadata u `app/favicon.ico`; PNG i Apple linkovi dolaze iz zajedničkih metapodataka javnog i admin layout-a, uključujući privatne stranice. Svi resursi su statički i dostupni bez baze ili prijave. `Organization`/`LocalBusiness` sada ima eksplicitan `logo` i reprezentativnu `image`, a podrazumevana Open Graph slika deklarisane dimenzije, format i apsolutni URL. Stranice alata zadržavaju sopstvenu fotografiju.

Posle deploya proveriti ove resurse na `https://alatrent.rs`, pa u Google Search Console tražiti ponovno indeksiranje početne stranice. [Google smernice za favicon](https://developers.google.com/search/docs/appearance/favicon-in-search) navode da obrada može trajati nekoliko dana do nekoliko nedelja i da prikaz nije garantovan. Logo i Open Graph slika takođe ne garantuju thumbnail u rezultatima pretrage; izbor zavisi od Google-a. SVG ostaje dostupan na starom URL-u.

Direktni upiti `whois.rnids.rs:43` od 10.10.2026. sačuvani su u `research/seo-2026-10-10/domain-check.json`. Registar je vratio `Domain is not registered` za `rentajalat.rs`, `renttools.rs`, `alatnadom.rs`, `uzmialat.rs`, `alatoteka.rs` i `alatzanajam.rs`. `alatnadan.rs` i `iznajmialat.rs` su aktivni/zauzeti.

Preporuka: `rentajalat.rs` za jasno, lako pamtljivo lokalno ime; `renttools.rs` ako se zadržava postojeći brend. Provera ne rezerviše domen. Konačna mogućnost registracije potvrđuje se kod ovlašćenog registra. Neregistrovan domen još nije unet kao canonical domen.

## Provere

`npm run build`, `npm run typecheck` i `npm test`. Posebna SEO integraciona provera koristi privremenu bazu, testni domen i server na portu 3014. Prolazi kroz svih 575 sitemap URL-ova i proverava status, jedan H1, jedinstvene metapodatke, canonical, hreflang i ispravan JSON-LD. Dodatno proverava skrivene stranice, prazne kategorije, sinonime/ćirilicu, bezbedno kodiranje JSON-LD i čuvanje administratorskih izmena.

Vizuelna provera u browseru obuhvata početnu stranicu, alat, kategoriju i mobilni prikaz. Produkciona brzina i Core Web Vitals moraju se meriti nakon postavljanja stvarnog domena; lokalno renderovanje nije terensko merenje.

## Pre javnog puštanja i naredni rad

1. Registrovati izabrani domen, uskladiti naziv brenda i povezati HTTPS sa hostingom. Projekat koristi SQLite i zahteva trajni disk; postojeće smernice u README-u ostaju važeće.
2. Potvrditi stvarne cene, inventar, fotografije i poslovne uslove. Uneti stvarni telefon i adresu u Podešavanja. Trenutne kataloške fotografije predstavljaju tip opreme, ne potvrđen model flote.
3. Na produkciji upisati osnovni domen u admin `siteUrl` ili `SITE_URL`, bez podputanje. Ne uključivati produkcioni domen u javni staging: isti runtime sa popunjenim domenom dozvoljava indeksiranje.
4. Verifikovati domen u Google Search Console (DNS ili `GOOGLE_SITE_VERIFICATION`) i Bing Webmaster Tools (`BING_SITE_VERIFICATION`). Poslati `/sitemap.xml`, proveriti reprezentativne URL-ove pomoću URL Inspection i strukturirane podatke pomoću Rich Results Test / Schema Validator.
5. Otvoriti/potvrditi Google Business Profile sa stvarnim podacima i zonom rada. Ako se klijenti ne primaju na adresi, profil treba podesiti prema stvarnom modelu poslovanja. Ovo nije urađeno iz lokalnog projekta.
6. Pratiti upite i odredišne stranice, indeksiranje, stvarne konverzije, Core Web Vitals i stvarne recenzije. Dalje proširivati sadržaj prema merljivim pitanjima kupaca, sopstvenim modelima i fotografijama. Nisu kreirane lažne lokacije, recenzije ni backlinkovi.

## Primarni izvori

- [Google: struktura navigacije kataloga](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure)
- [Google: URL struktura, canonical i prazne kategorije](https://developers.google.com/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites)
- [Google: jezičke verzije i hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google: strukturirani podaci za lokalna preduzeća](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Google: Product strukturirani podaci i ograničenja prikaza](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)
- [RNIDS: provera nacionalnih domena](https://www.rnids.rs/sr/whois)
- Dokumentacija instaliranog Next.js 16.4.0: `node_modules/next/dist/docs/`, pročitana pre implementacije.
