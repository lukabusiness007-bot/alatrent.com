# Rent Tools

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
- Početna, katalog sa pretragom/sortiranjem, 10 kategorija, 72 početne vrste alata, pojedinačne stranice alata, dostava, proces najma, kontakt i privatnost.
- Admin za dodavanje, menjanje i brisanje alata/kategorija, 5 prevoda naziva i opisa, fotografije, cene sa brzim izborom predloga, broj komada, objavljivanje i izdvajanje na početnoj.
- SQLite baza trajno čuva katalog, podešavanja, upite, admin sesije i ograničenja zahteva. Fotografije se čuvaju u `data/uploads/` i poslužuju preko `/media/`.
- Upiti za najam računaju broj kalendarskih dana uključujući preuzimanje i vraćanje. Cene se računaju ponovo na serveru, ne prihvataju se iz browsera.
- Slanje upita ne rezerviše opremu automatski. Admin unosi ugovorenu cenu i potvrđuje upit. Potvrda proverava količinu i najveći broj istovremeno zauzetih komada, u SQLite transakciji.
- Za potvrdu su potrebni poznata količina i dogovorena cena. Otkazivanje oslobađa termin. Svi najmovi su bez depozita. Server postavlja depozit na 0 i za nove alate i za upite, bez obzira na poslatu vrednost.
- Fotografije: JPG/PNG/WebP do 5 MB, provera potpisa formata; SVG/HTML se ne prihvataju.
- Sesije od 8 sati, HttpOnly/SameSite cookie, provera porekla upisa, ograničavanje pokušaja prijave i slanja upita.
- Responsive javni sajt i admin. Server-rendered sadržaj, metadata, canonical, hreflang, Open Graph, breadcrumb JSON-LD, robots i sitemap.

## Početni podaci

Inventar je izveden iz `research/beorental/catalog-draft.json`. Katalog sadrži **72 vrste** opreme. Po zahtevu korisnika postavljene su probne dnevne cene od **500 do 5.000 RSD**, promenljive u adminu. Dugmad nude 500, 1.000, 1.500, 2.000, 3.000 i 5.000 RSD; može se uneti i bilo koji drugi iznos. Količine ostaju prazne dok se ne potvrdi stvarni inventar. Depozit se ne naplaćuje.

`lib/catalog-enrichment.json` sadrži početne fotografije i cene. Jednokratna migracija dopunjava postojeću bazu: čuva ranije unete cene i fotografije, a depozite postavlja na nulu. Novi seed već sadrži iste podatke.
Standardna dostava + preuzimanje: **1.500 RSD**. Hitna dostava + redovno preuzimanje: **2.500 RSD**. To su početne ilustrativne cene po zahtevu korisnika i menjaju se u Podešavanjima. Adresa, telefon, email i javni domen čekaju unos.

Svih 72 početnih alata ima lokalnu katalošku fotografiju proizvoda (`public/images/catalog/`); početna sekcija koristi iste stvarne fotografije. To nisu fotografije korisnikove flote. Na stranicama alata prikazuje se napomena da su slike reprezentativne za tip opreme i da se model potvrđuje pri najmu. Izvori i SHA-256 svake datoteke su u `docs/product-photo-sources.json`. Beorental reklamne fotografije i kontakti nisu upotrebljeni. Fotografije se mogu zameniti sopstvenim u adminu. Pre javne upotrebe potvrditi prava za kataloške fotografije ili zameniti svojim. Prevodi novih alata unose se ručno u 5 jezičkih kartica.

## Objavljivanje

### Vercel: pregled kataloga

Na Vercelu (`VERCEL=1`) aplikacija prikazuje početni katalog iz baze u memoriji, bez pokušaja pisanja u `/var/task/data`. Vidljivo obaveštenje označava da online rezervacije i registracija nisu dostupne. API upisi (uključujući porudžbine, prijave, upload i webhook) vraćaju 503; obračun cene ostaje dostupan. Baza je posle inicijalizacije zaključana za upise. Admin prikazuje objašnjenje umesto forme za prijavu.

Ovo rešava učitavanje javnog sajta, ali **nije produkciono rešenje za porudžbine i admin**. Za njih je potrebna migracija na spoljašnju trajnu bazu i skladište fotografija ili Node server sa trajnim diskom. `DATA_DIR=/tmp/...` na Vercelu ne obezbeđuje trajnost i ne uključuje upise.

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

```sh
npm run typecheck
npm run build
npm test
```

Integracioni testovi pokreću produkcioni server na portu 3011 sa zasebnom privremenom bazom i brišu isključivo svoje test podatke po završetku. Pokrivaju jezike/SEO, zaštićen admin, CRUD, upite, server-side obračun, sprečavanje dvostruke rezervacije, upload, podešavanja i odjavu.

## SEO sadržaj i indeksiranje

Detalji optimizacije, mapa ključnih fraza za svih 72 alata, provera domena i koraci javnog puštanja nalaze se u [docs/seo.md](docs/seo.md). Dostava je isključivo na teritoriji grada Beograda, uključujući Obrenovac, Sremčicu i Železnik. `npm run seo:report` obnavlja mapu fraza iz uredničkog kataloga. Telefon i adresa se naknadno unose u admin; javni domen se uključuje tek nakon registracije i postavljanja sajta.
