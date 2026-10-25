# Objava vodiča na sajtu i otkrivanje u Google pretrazi

Korisnik je 16. oktobra 2026. izričito dopunio zadatak: napravljeni vodiči treba da se objavljuju na sajtu. Aktivni režim je `publish_after_checks`. Dnevni posao u 08:00 Europe/Belgrade obuhvata istraživanje, pisanje ili dovršavanje postojećih paketa, proveru, integraciju, objavu i proveru javnog rezultata. Objavljivanje vodiča u ovom obimu ne zahteva novo pitanje za dozvolu pri svakom pokretanju.

Predmet objave je `https://alatrent.rs/sr/saveti/{slug}`. Pojavljivanje na Google-u je zaseban događaj posle otkrivanja, popisivanja i indeksiranja; lokalni fajl, Git commit, deployment koji još traje i prihvaćen zahtev za indeksiranje nisu dokaz da je stranica na Google-u.

## 1. Koji tekst može da se objavi

Prvo pregledaj postojeće neobjavljene pakete, uključujući tri probna vodiča od 16. oktobra. Ne ostavljaj ih zauvek na čekanju dok generišeš nove kopije. Njihov tekst i izvore pročitaj ponovo prema važećim pravilima. Upotrebi iste ID-eve i iste direktorijume; dnevni manifest samo upućuje na postojeće pakete.

Cilj je do tri proverene objave dnevno. Dovršavanje ranije pripremljenog vodiča može zauzeti dnevno mesto, bez predstavljanja tog teksta kao ponovo napisanog. U izveštaju posebno navedi nove nacrte, objavljene nove vodiče i dopune postojećih vodiča. Ako nema dovoljno proverljivog sadržaja, objavi manje i navedi stvaran razlog.

Status `ready_to_publish` zahteva ceo tekst, izvore, rešeno preklapanje, proverene interne putanje, najmanje 90/100 interne uredničke provere i nijednu otvorenu tvrdu grešku. Broj poena sam ne odobrava tvrdnju. Pre objave proveri i konkretna otvorena pitanja prethodne recenzije: ukloni neobaveznu nedokazanu tvrdnju ili je kvalifikuj tako da ne menja istinitost odgovora.

`humanReview.status` ostaje `pending` ili `not_performed` ako čovek nije pregledao tekst; automatska objava ne sme biti predstavljena kao ljudska stručna recenzija. Poseban zahtev za stručnu potvrdu ostaje prepreka kada bez njega rizičan ili nepoznat podatak čini osnovni odgovor nepouzdanim. Takav vodič dobija `needs_human_review` ili `blocked_source`, uz tačno pitanje. Rutinsko buduće potvrđivanje izdatog kompleta nije blokada generičkog vodiča koji ne tvrdi da je neki komplet ili model garantovano dostupan.

## 2. Jednokratna priprema aplikacije pri prvoj objavi

Na dan pisanja ove dopune automatska objava još nije implementirana u kodu. Postojeći renderer prikazuje samo `sections: [{heading, text}]`, koristi zajednički datum i SEO test očekuje pet vodiča. **Pre prvog deploya** izvrši potrebne izmene iz odeljka 14 glavnog plana i proveri ih. Prompt sam po sebi ne menja renderer.

Minimalni obim implementacije je:

1. Odvojiti neobjavljene uredničke pakete od javnog sadržaja. U javni loader ulaze samo izričito objavljene stavke.
2. Obezbediti bezbedan prikaz pasusa, tabela, lista i proverenih linkova/izvora, bez izvršavanja generisanog HTML-a. Nije prihvatljivo da se Markdown tabela ili linkovi prikazuju kao sirov tekst.
3. Uvesti `publishedAt` i `updatedAt` po vodiču. Sačuvati stvarne datume pet postojećih vodiča; njihov datum se ne menja zbog dodavanja šestog.
4. Uskladiti vidljive datume, Article JSON-LD i sitemap `lastmod`. Ne izmišljati autora, recenzenta, fotografiju ili datum ljudske provere.
5. Sačuvati postojeće `/sr/saveti/...` putanje i srpski jezik. Proveriti hub, veze sa opremom i smislen prikaz novih vodiča na početnoj.
6. Zameniti očekivanje tačno pet vodiča proverom stvarnog objavljenog inventara, uz nezavisne provere celog teksta, canonical-a, izvora, datuma, sr-only ruta i neobjavljenih nacrta.

Pre izmene Next.js koda pročitati relevantne vodiče u `node_modules/next/dist/docs/`. Ne uvoditi dodatne AI/generacijske/SEO API-je. Koristi postojeći mehanizam hostovanja i deploymenta; nova baza, CMS, cron endpoint i kupovina servisa nisu potrebni samo radi objave.

## 3. Priprema objave i tuđe izmene

Utvrdi kako je stvarno objavljen postojeći domen: postojeća Git/hosting veza, grana i poslednja produkciona verzija. Čitaj konfiguraciju i dostupnu prijavljenu sesiju bez ispisivanja tokena ili tajni. Ne nagađaj nalog, projekat, granu ili komandu za deploy. Raniji pregled nije našao `.vercel` direktorijum ili lokalni `vercel` u PATH-u; to samo po sebi ne dokazuje da pristup hostingu nije moguć.

Radna kopija već sadrži brojne ranije korisničke izmene. Ne koristiti `git add .`, reset, force push ili deploy cele prljave kopije bez razumevanja razlike prema produkciji. Izdvoji samo sopstvene izmene publikacionog toka i sadržaja na osnovu proverene produkcione revizije. Ako se postojeća neobjavljena izmena prepliće sa potrebnom promenom, sačuvaj je i uskladi je čitanjem razlike; ne pripisuj je ovoj automatizaciji.

Dozvoljeni su ciljani commit/push i stvarni deploy za ovaj zadatak kroz postojeće autorizovano povezivanje. Ako odgovarajući pristup ili pouzdana produkciona osnova nisu dostupni, sačuvaj spreman paket i `publication_blocked` sa tačnom preprekom. Ne predstavljaj planiranu objavu kao izvršenu. Ne instaliraj novi hosting ili novi nalog kao prečicu.

## 4. Provere pre deploya

Za prvu implementaciju i svaku kasniju izmenu koda sprovesti:

```sh
npm run typecheck
npm run build
node --test --test-concurrency=1 tests/seo.test.mjs
```

Kada obim izmene zahteva širu regresiju pokrenuti i `npm test`. Ako se kasnije menjaju samo validirani podaci vodiča, koristiti postojeći testirani publikacioni postupak i relevantne provere, bez preskakanja builda koji hosting zahteva.

Pre produkcije proveriti svaku novu stranicu i pet starih vodiča: HTTP 200, ceo tekst, jedan H1 po šablonu, title/description, self-canonical bez parametara, dozvoljeno indeksiranje, Article i breadcrumb podaci, stvarni datumi, funkcionalni linkovi, liste/tabele i mobilni prikaz. Nacrti i nepostojeći slugovi moraju ostati nejavni/404. Ne menjati cene, kontakt, dostupnost ili podatke kupaca radi testa.

## 5. Stvarna objava na sajtu

Sačuvaj deployment identitet i tačan skup vodiča pre pokretanja. Sačekaj uspešan završetak hostinga. Ne označavaj vodič kao `published` na osnovu uspešnog push-a ili početka builda.

Zatim proveri nad `https://alatrent.rs`:

- Novi javni URL vraća 200 i prikazuje očekivani naslov, odgovor i prepoznatljiv deo teksta iz ove verzije.
- Canonical upućuje na isti produkcioni URL, robots ne sprečava indeksiranje i nema `noindex` u HTML-u ili zaglavlju.
- `/sr/saveti` sadrži novi vodič; odgovarajuća oprema ili srodna stranica daju smislen put do njega.
- `/sitemap.xml` sadrži svaki novi javni vodič jednom i koristi stvarni datum odgovarajuće izmene.
- Pet starih vodiča i njihove postojeće putanje rade; nije promenjen njihov datum objave zbog nove serije.

Tek tada upisati `published`, `publishedAt`, `publicUrl`, `deploymentId`, `publicVerifiedAt` i rezultate provera. `updatedAt` menjati samo za stvarnu sadržajnu izmenu. Pri grešci zabeležiti `publication_blocked` ili `publishing` sa neuspehom, sačuvati nacrt i ispraviti samo sopstvenu izmenu. Ne vraćati naslepo ceo sajt na verziju koja bi uklonila tuđe novije izmene.

## 6. Google i Search Console bez API integracije

Sitemap i interne veze omogućavaju otkrivanje novih URL-ova. Postojeći sitemap je već predat prema sačuvanom dokazu od 16. oktobra; proveri aktuelni status u dostupnom Search Console interfejsu. Ne šalji istu nepromenjenu mapu ili iste URL-ove beskonačno.

Ako je dostupna postojeća prijavljena Search Console sesija za `alatrent.rs`, posle potvrđene javne objave pregledaj nove URL-ove kroz URL Inspection. Zatraži indeksiranje do tri nove stranice u okviru dostupne kvote, bez zaobilaženja ograničenja. Sačuvaj datum i stvarni odgovor. Koristi interfejs; ne uvoditi Indexing API ili Search Console API ključ.

Odvojeni status `googleDiscovery.status` može biti `not_checked`, `sitemap_available`, `request_submitted`, `indexed` ili `not_indexed`. `indexed` zahteva stvarni dokaz iz Search Console, uz datum. Prihvaćen zahtev označava se samo kao `request_submitted`. Odsustvo pristupa Google nalogu ne poništava uspešnu javnu objavu; prijavi pristup kao otvoren korak i ostavi sitemap i interne veze ispravnim.

Google navodi da popisivanje može trajati od nekoliko dana do nekoliko nedelja i da zahtev ne garantuje uključivanje u rezultate. Višestruko podnošenje istog URL-a ne ubrzava postupak. [Google smernice za ponovno popisivanje](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).

## 7. Ponavljanje rada i izveštaj

Pre svakog pokušaja pročitaj `publication.json` u paketu, red i javni URL. Već objavljeni isti sadržaj ne commitovati i ne objavljivati ponovo radi novog datuma. Ako je prošli posao objavio sajt, a prekinuo se pre upisa reda, potvrdi javnu verziju i samo dovrši evidenciju. Ne stvaraj duplu stranicu.

Piloti G001/G002/G003 objavljeni su 17. oktobra; ne pripremati njihove kopije. Pri narednom pokretanju proveri javni manifest i red, pa nastavi samo neobjavljen rad. Ako tehničke provere ili pristup sprečavaju objavu, prijavi konkretnu prepreku. Ne preskoči testove radi kvote.

Dnevni izveštaj navodi broj napisanih/objavljenih novih vodiča i dopuna, prave javne linkove, deployment i status provera, status sitemap-a i zaseban Google status. Lokalni put nije zamena za javni link. Ako nije objavljeno, to jasno napiši i navedi jednu konkretnu prepreku i sledeći potreban korak.

## 8. Potvrđeni tok i naredni ciklus

Postojeći `main` na GitHub-u pokreće Vercel projekat `luka-drugi-nalog-s-projects/alatrent-com`. Za prvu seriju upotrebljena je izvorna produkciona revizija `8aaaf04301b517693c382f6d6ac3acf0650fc50e`, izdvojeno je deset relevantnih fajlova i objavljen je samo njihov diff. Aktuelnu udaljenu reviziju uvek proveri ponovo; nemoj koristiti ovaj istorijski SHA kao osnovu sledeće objave.

Radna kopija nije prepisana. Posle `git fetch --no-tags origin main`, lokalni main i index usklađeni su direktnim fast-forward pomeranjem na objavljeni commit, tek nakon provere da nema staged korisničkih izmena. Nije korišćen reset niti upis radnih fajlova; njihovi hash-evi pre i posle su isti. Za sledeću izolovanu pripremu ipak proveri aktuelni udaljeni commit. Sačuvaj ranije korisničke izmene i čitaj razlike pre izbora fajlova.

Povezana GitHub integracija dozvolila je čitanje, ali je upis Git tree-a vratio 403. Postojeća GitHub CLI prijava ima odgovarajuća prava i upotrebljena je za ciljani upis bez novih ključeva ili promena dozvola. Sandbox nema DNS za javne domene; javne HTTP/Git provere zahtevaju odobren mrežni izlaz. Ne tretiraj taj mrežni neuspeh kao dokaz da je postojeća CLI prijava nevažeća.

Novi provereni paket može da se pripremi komandom `node scripts/stage-guide-publication.mjs DIREKTORIJUM_PAKETA STVARNI_RELEASE_ISO_TRENUTAK`, tek uz `review.status: ready_to_publish`, dovoljan rezultat i rešena ključna pitanja. Komanda proverava izvore, stvarne tool ID-eve i strukturu i menja samo javni JSON. To je priprema za deploy, ne dokaz javne objave. Dopuna starog vodiča zahteva namenski diff na istom URL-u i očuvanje datuma prvog objavljivanja.

Proverena objavljena serija, svi HTTP rezultati, deployment plan i zapis pokretanja nalaze se u `research/guide-drafts/2026-10-17/`. Google status ostaje odvojen: sitemap radi, ali automatska provera odobravanja nije dopustila otvaranje Chrome profila „Luka“ bez jasne dozvole za taj konkretni profil. Zatražena je potvrda; ne pokušavati drugi put do iste privatne sesije kao zaobilazni postupak.

## 9. Obnova radne kopije — 25. oktobar 2026.

Aktuelni projekat je `/Users/luka/Desktop/rent tools`. Vidi [izveštaj obnove](restoration.md). Bogat prikaz, odvojeni datumi i publikacioni/SEO testovi već postoje u kloniranoj verziji; istorijski opis prve implementacije iznad nije nalog da se ona ponovi. Pre svake nove serije proveri aktuelni udaljeni commit i postojeći kod. Istorijski lokalni dokazi mogu nedostajati i ne smeju se izmišljati.
