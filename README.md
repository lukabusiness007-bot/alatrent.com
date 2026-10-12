# Alat Rent

Sajt za iznajmljivanje sopstvenih alata na teritoriji grada Beograda, sa admin panelom. Vizuelni sistem preuzet je iz postojećeg projekta `tesla men`: Google Sans, crni header, mint akcenti, limeta dugmad sa crnom senkom i isti raspored sekcija/kartica.

## Pokretanje

Potreban je Node.js 24.15+ (koristi ugrađeni `node:sqlite`).

```sh
npm install
npm run admin:reset
npm run dev
```

Sajt: http://127.0.0.1:3010/sr
Admin: http://127.0.0.1:3010/admin

Admin lozinka se generiše kriptografski i čuva u **data/admin-access.txt** (dozvole 0600; nije u Gitu). `npm run admin:reset` postavlja novu lozinku i odjavljuje sve sesije. Opciono postaviti `ADMIN_PASSWORD` bezbednim upravljačem tajnama pre izvršavanja skripte. Lozinke se u bazi čuvaju kao scrypt hash sa slučajnom soli. Nema podrazumevane javne lozinke.

## Šta radi

- Javni sajt na srpskom, engleskom, ruskom, turskom i pojednostavljenom kineskom; srpski je podrazumevani jezik na `/sr`.
- Početna, katalog sa pretragom/sortiranjem, 10 kategorija, 98 vrsta alata, pojedinačne stranice alata, dostava, proces najma, kontakt i privatnost.
- Admin za dodavanje, menjanje i brisanje alata/kategorija, 5 prevoda naziva i opisa, fotografije, cene sa brzim izborom predloga, broj komada, objavljivanje i izdvajanje na početnoj.
- Supabase/PostgreSQL trajno čuva katalog, podešavanja, najmove, naloge, admin sesije i uploadovane fotografije. Lokalni razvoj bez `POSTGRES_URL` koristi SQLite i `data/uploads/`. Fotografije se poslužuju preko `/media/`.
- Upiti za najam računaju broj kalendarskih dana uključujući preuzimanje i vraćanje. Cene se računaju ponovo na serveru, ne prihvataju se iz browsera.
- Slanje upita ne rezerviše opremu automatski. Admin unosi ugovorenu cenu i potvrđuje upit. Potvrda proverava količinu i najveći broj istovremeno zauzetih komada, u SQLite transakciji.
- Za potvrdu su potrebni poznata količina i dogovorena cena. Otkazivanje oslobađa termin. Depozit se dogovara pojedinačno i evidentira odvojeno od najma i dostave pre potvrde. Članovi Kluba majstora imaju 5% popusta od učlanjenja; nakon tri plaćena i završena najma povezana s nalogom ne plaćaju depozit. Nema vremenskog ograničenja za brojanje najmova. Registracija zahteva email i telefon.
- Fotografije: JPG/PNG/WebP do 5 MB, provera potpisa formata; SVG/HTML se ne prihvataju.
- Sesije od 8 sati, HttpOnly/SameSite cookie, provera porekla upisa, ograničavanje pokušaja prijave i slanja upita.
- Responsive javni sajt i admin. Server-rendered sadržaj, metadata, canonical, hreflang, Open Graph, breadcrumb JSON-LD, robots i sitemap.

## Početni podaci

Inventar je izveden iz `research/beorental/catalog-draft.json`. Katalog sadrži **98 vrsta** opreme: 72 početne i 26 dodatih iz javnih DajNaDan oglasa, bez duplikata po marki, snazi ili napajanju. Po zahtevu korisnika postavljene su probne dnevne cene od **500 do 5.000 RSD**, promenljive u adminu. Dugmad nude 500, 1.000, 1.500, 2.000, 3.000 i 5.000 RSD; može se uneti i bilo koji drugi iznos. Količine ostaju prazne dok se ne potvrdi stvarni inventar. Depozit se ne naplaćuje.

`lib/catalog-enrichment.json` sadrži početne fotografije i cene. Jednokratna migracija dopunjava postojeću bazu: čuva ranije unete cene i fotografije, a depozite postavlja na nulu. Novi seed već sadrži iste podatke.
Standardna dostava + preuzimanje: **1.500 RSD**. Hitna dostava + redovno preuzimanje: **2.500 RSD**. To su početne ilustrativne cene po zahtevu korisnika i menjaju se u Podešavanjima. Adresa, telefon, email i javni domen čekaju unos.

Svih 72 početnih alata ima lokalnu katalošku fotografiju proizvoda (`public/images/catalog/`); početna sekcija koristi iste stvarne fotografije. To nisu fotografije korisnikove flote. Na stranicama alata prikazuje se napomena da su slike reprezentativne za tip opreme i da se model potvrđuje pri najmu. Izvori i SHA-256 svake datoteke su u `docs/product-photo-sources.json`. Beorental reklamne fotografije i kontakti nisu upotrebljeni. Fotografije se mogu zameniti sopstvenim u adminu. Pre javne upotrebe potvrditi prava za kataloške fotografije ili zameniti svojim. Novih 26 vrsta ima nazive i opise na svih pet jezika; koriste postojeće ilustracije dok se ne unesu sopstvene fotografije. Za novih 26 vrsta postavljene su okvirne dnevne cene od 500 do 4.500 RSD, promenljive u adminu. Količine ostaju prazne do potvrde stvarnog inventara. Oglasi drugih vlasnika nisu evidencija naše dostupnosti.

## Uvoz DajNaDan alata — 12.10.2026.

Pregledano je 349 javnih oglasa sa 17 stranica kategorija građevinskog i baštenskog alata, čišćenja i građevinske opreme. Iz poslednje su uzeti samo alati i prenosiva radna oprema; vozila, bageri, platforme, skele i uslužni oglasi nisu uvezeni. Nazivi su normalizovani po funkciji, a marka, snaga, dimenzije i napajanje ne stvaraju nove unose. Trag svake odluke je u `research/dajnadan/import-review.json`.

`lib/catalog-import.json` i jednokratna migracija u `lib/db.ts` dopunjavaju postojeću SQLite bazu. Migracija čuva izmenjene alate, cene, količine, fotografije, skrivene unose i već postojeće tipove pod drugim ID-em. Kasnije obrisan uvezeni alat ne vraća se pri restartu. Admin odbija novi duplikat prepoznate vrste (npr. novu šrafilicu druge marke), sa porukom koji unos treba izmeniti.

## Objavljivanje

### Vercel sa Supabase bazom

Server koristi `POSTGRES_URL` iz bezbednih environment podešavanja hostinga. Sa njim su admin, nalozi, porudžbine i upload dostupni i na Vercelu. Bez njega Vercel zadržava pregled kataloga bez upisa; postavljanje `/tmp` kao direktorijuma ne aktivira trajan rad.

Podaci su u zasebnoj PostgreSQL šemi `alat_rent`, van javne Supabase Data API šeme. RLS je uključen, a `anon` i `authenticated` nemaju pristup šemi. Privatni ključevi i connection string ostaju na serveru. TLS proverava naziv hosta i zvanične Supabase CA sertifikate.

Svaki zahtev učitava nov konzistentan snapshot iz PostgreSQL-a. Poslovna pravila rade nad zasebnom SQLite bazom u memoriji, dok je PostgreSQL jedino trajno skladište. Upisi zaključavaju aplikacionu transakciju preko PostgreSQL advisory lock-a i upisuju izmene pre uspešnog API odgovora, uključujući paralelne server instance. Uploadovane slike se trajno čuvaju kao binarni podaci u `alat_rent.media`.

`npm run db:migrate` prenosi postojeći lokalni katalog i admin hash bez prepisivanja udaljenih unosa. Sesije se ne prenose. `npm run admin:reset` namerno resetuje admin u aktivnoj bazi i zapisuje novu lozinku u lokalni, ignorisani `data/admin-access.txt`; ne pokretati radi običnog deploya. Prvi potpuno novi deploy može dobiti pristup preko server-only `ADMIN_PASSWORD` promenljive.

Integracioni testovi podrazumevano koriste izolovane lokalne baze i izričito isključuju production connection string. `tests/postgres.test.mjs` koristi samo eksplicitni `TEST_POSTGRES_URL` i zasebnu privremenu šemu, koju briše posle provere. Proverava paralelne instance, admin, cene, duplikate, slike, sesije i restart bez upisivog diska.

### Alternativa: Render sa trajnim diskom

`render.yaml` priprema jednu Node uslugu sa trajnim diskom na `/var/data`, gde se čuvaju SQLite baza i uploadovane fotografije. Render veza i aktiviranje usluge još nisu podešeni; usluga sa trajnim diskom je plaćena. Build koristi odvojen privremeni direktorijum, a runtime `npm start` sluša na dodeljenom `PORT` portu.

Na prvom startu `ADMIN_PASSWORD` (tajna generisana u hostingu) pravi admin hash ako pristup još ne postoji. Restart i deploy ne menjaju postojeću lozinku. Promenljiva ne sme imati `NEXT_PUBLIC` prefiks; lozinku vlasnik preuzima iz bezbednog hosting okruženja. `npm run admin:reset` ostaje lokalni postupak za nameran reset. Jedan primerak servera i trajni disk potrebni su za SQLite i fotografije. Vercel bez PostgreSQL konfiguracije ostaje pregled kataloga; sa `POSTGRES_URL` koristi Supabase.

### Node server sa trajnim diskom

Sajt je trenutno lokalni. Potreban je Node server sa **trajnim diskom**, jednim aktivnim app procesom i HTTPS reverse proxyjem (prosleđuje originalni Host). Ne postavljati SQLite/fotografije na prolazni serverless filesystem. `DATA_DIR` može da pokaže na montirani trajni volumen. Obezbediti ograničenje tela zahteva na proxyju (npr. 6 MB), automatske rezervne kopije i nadzor procesa.

```sh
npm run build
npm start
```

Pre javnog puštanja:

1. U adminu proveriti inventar, fotografije, količine, cene i sve prevode.
2. Uneti stvarni naziv brenda, kontakt, adresu, zonu dostave i cene paketa.
3. Dopuniti poslovne podatke i konkretne ugovorne uslove najma, privatnosti i zadržavanja podataka prema stvarnom poslovanju.
4. Povezati domen/HTTPS i uneti domen u Podešavanja (ili `SITE_URL`). Do tada je preview `noindex` i robots blokira indeksiranje. Nakon toga sitemap obuhvata 5 verzija javnih stranica; admin/API su isključeni. Ne postoji obećanje prvog mesta na Google-u.
5. Povezati Search Console i, po potrebi, obaveštenja emailom/SMS-om. Stari pojedinačni upiti ostaju u adminu. Nove porudžbine koriste odeljak „Prodaja i klub” i red za WhatsApp poruke.

Dodati su korpa, višednevne tarife, korisnički nalozi, Klub majstora, firme, paketi i WhatsApp integracija. Online naplata nije povezana; administrator evidentira da je najam plaćen. Podešavanje i rad sistema opisani su u [docs/commerce.md](docs/commerce.md).

## Provere

Katalog ima 184 vrste alata. Prikupljeno je 237 ponuda i cena iz IznajmiAlat, RentMašina, zadatog PozajmiMe profila i BeoDetect cenovnika. U adminu su dostupni „Cene iz izvora”, izvorne valute/jedinice, PDV, doplate, depoziti i CSV izvoz. Obuhvat, nedostupna kategorija i neslaganja u izvorima opisani su u [docs/catalog-sources.md](docs/catalog-sources.md). Novi alati bez objavljene dnevne tarife prikazuju cenu na upit; postojeće administrativne cene i zalihe se ne prepisuju.

```sh
npm run typecheck
npm run build
npm test
```

Integracioni testovi pokreću produkcioni server na portu 3011 sa zasebnom privremenom bazom i brišu isključivo svoje test podatke po završetku. Pokrivaju jezike/SEO, zaštićen admin, CRUD, upite, server-side obračun, sprečavanje dvostruke rezervacije, upload, podešavanja i odjavu.

## SEO sadržaj i indeksiranje

Detalji optimizacije, mapa ključnih fraza za svih 98 alata, provera domena i koraci javnog puštanja nalaze se u [docs/seo.md](docs/seo.md). Dostava je isključivo na teritoriji grada Beograda, uključujući Obrenovac, Sremčicu i Železnik. `npm run seo:report` obnavlja mapu fraza iz uredničkog kataloga. Telefon i adresa se naknadno unose u admin; javni domen se uključuje tek nakon registracije i postavljanja sajta.
