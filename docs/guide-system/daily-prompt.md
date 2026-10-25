# Dnevni zadatak za tri vodiča za Alat Rent

Ovo je operativni prompt za Codex zadatak koji se izvršava svakog dana u 08:00 u vremenskoj zoni Europe/Belgrade. Radi u postojećem projektu:

`/Users/luka/Desktop/rent tools`

Prvi terminalski poziv i svaki zavisan poziv pokreni sa izričitim `workdir: /Users/luka/Desktop/rent tools`; putanja starog razgovora može biti nepostojeća.

## Zadatak i rezultat

Istraži, pripremi, proveri i objavi na sajtu **do tri potpuna, različita, korisna vodiča ili opravdane dopune postojećih vodiča** za iznajmljivanje alata u Beogradu. Piši prirodnim srpskim jezikom, latinicom. Svaki paket mora da sadrži `brief.json`, `research.json`, `article.md` i `review.json`. Sačuvaj trajni napredak i kratak izveštaj sa linkovima ka fajlovima.

Raspored određuje početak rada. Nema obaveznog vremena završetka, broja reči, statistika, slika, FAQ pitanja ili ponavljanja fraze. Ako tri opravdana i proverljiva paketa nisu moguća, dovrši ono što možeš i navedi tačan razlog manjka. Kvalitet i istina imaju prednost nad kvotom. Ne preskoči istraživanje zbog obima.

Koristi ugrađenu veb pretragu, otvaranje javnih stranica, dostupni browser i obične lokalne fajlove. Ne uvodi i ne pozivaj dodatne OpenAI, Perplexity, Replicate, FLUX, SEO, Search Console ili Blob API-je; ne instaliraj generatore ili servise. Objava koristi postojeći hosting i autorizovano povezivanje; nema novih AI/generacijskih/SEO servisa ili naloga.

## Obavezni kontekst pre svakog rada

Pročitaj `AGENTS.md`, `docs/guide-system/README.md`, `docs/guide-system/editorial-rules.md`, `docs/guide-system/queue.json`, `docs/guide-system/keyword-backlog.json`, relevantni deo `keyword-research.md`, `docs/guide-system/publishing.md` i obrasce iz `templates/`. Korisnik je 16. oktobra izričito autorizovao objavljivanje; aktivni režim je `publish_after_checks`.

Pročitaj sav javni inventar u `lib/published-rental-guides.json` i istorijske vodiče u `lib/rental-guides.ts` i pregledaj sve postojeće pakete u `research/guide-drafts/`. Katalog potvrđuj pomoću `lib/seed.json`, `docs/seo-keywords.json`, javnih stranica i, kada je potrebno, `lib/product-data.json`. Seed i referentni model nisu dokaz raspoložive opreme, stvarne tarife ili našeg terenskog iskustva. Poslovne činjenice proveri u `lib/business-identity.ts`, `lib/contact.ts` i aktuelnim javnim uslovima.

Pregledaj `git status --short`; sačuvaj tuđe izmene. Dnevni rad sme da menja samo `research/guide-drafts/`, sopstveni red/backlog i istraživačke beleške unutar `docs/guide-system/`, i datirane agregirane izveštaje u `research/guide-performance/`. Ne prepisuj plan, prompt ili pravila samo da opravdaš loš rezultat. Ako je potrebno poboljšanje pravila, navedi ga u izveštaju.

Dozvoljene su uske izmene potrebne za integraciju vodiča, provereni commit/push i stvarni deploy kroz postojeći autorizovani tok prema `publishing.md`. Podrška za tabele/liste/izvore, pojedinačne datume i SEO provere već je u repozitorijumu. Proveri je pre objave; pre aplikacionih izmena pročitaj lokalne Next.js vodiče. Sačuvaj pet postojećih `/sr/saveti/...` putanja. Ne menjaj poslovnu bazu, cene, kontakte, korisničke podatke, tuđe nepovezane izmene, nove automatizacije ili poruke drugim osobama. Nacrti ne ulaze u javni loader pre provere.

## Nastavljanje i sprečavanje duplog rada

1. Odredi datum u `Europe/Belgrade` i pročitaj `research/guide-drafts/YYYY-MM-DD/run.json` ako postoji. Pročitaj završetke prethodnih pokretanja; ne oslanjaj se samo na istoriju četa.
2. Pre upisa stekni ekskluzivnu bravu atomskim kreiranjem direktorijuma `research/guide-drafts/.run-lock/`; zapiši `owner.json` sa svojim run ID-em, početkom i vremenom isteka za dva sata. Obnavljaj zakup dok radiš. Ako brava već postoji, proveri vlasnika i postojeći rad. Ne uklanjaj je samo zato što je stara; ako aktivnost nije moguće utvrditi, prijavi prepreku i završi bez konkurentnog upisa.
3. Ako je prethodni posao dokazano prekinut, zabeleži oporavak i nastavi njegove fajlove. Izbor ID-a i sluga čuva se pre početka nacrta. Stabilan ID koristi i za dopunu iste teme; ne pravi novi ID posle pada.
4. `queue.json` je autoritativan za status, a backlog za ideje. Jedan izvršilac menja red i `run.json`. Odvoji faze pisanja i kritične provere.
5. Piši JSON preko privremenog fajla u istom direktorijumu, parsiraj ga pa preimenuj na ciljnu putanju. Sačuvaj fazu posle svakog paketa. Ako postoji ručna izmena nacrta, pročitaj je i sačuvaj; ne prepisuj je slepo.
6. Ako već postoje tri pripremljena današnja paketa, ne generiši nove; dovrši njihovu neizvršenu integraciju/objavu. Ako su tri već javno objavljena i proverena za ovaj dnevni posao, ne objavljuj dodatne. Piloti G001/G002/G003 su već objavljeni; ne generiši njihove kopije. Pri obnovi 25. oktobra vraćen je red sa potvrđenim javnim inventarom; pročitaj `docs/guide-system/restoration.md`. Izgubljeni stari paket nije nova neobjavljena tema. Prekinuti posao nastavi. Propušteni dan ne nadoknađuj masovnom serijom.
7. Najviše tri pokušaja po stavci i dve uredničke dorade po pokretanju; zatim sačuvaj tačan status i razlog. Na kraju ukloni samo sopstvenu bravu kada se vlasnički run ID poklapa, uključujući neuspešan završetak.

Ove kontrole izvršavaš svojim alatima; samo prisustvo ovog prompta nije dokaz da postoji zaseban programski red ili servis. Ne prijavljuj uspeh kontrole koju nisi sproveo.

## Izbor tri potrebe

Pregledaj `pending_research`, `needs_revision` i opravdane dopune. Za svaku temu uporedi publiku, pitanje, zadatak, kriterijume odluke i završni odgovor sa objavljenim vodičima i nacrtima. Sačuvaj pregledane interne putanje i obrazloženje.

Ako postojeći vodič već rešava istu nameru, napiši nacrt dopune za njegov URL (`action: refresh`), sa odeljcima koji se menjaju i razlogom. Ne pravi kopiju za sinonim, drugo naselje, ćirilicu, drugu godinu ili duži naslov. Komercijalne fraze za najam ostaju vlasništvo proizvoda i kategorija; vodič rešava pitanje izbora.

Proveri odgovarajući objavljeni tool ID i tačnu putanju. Ako članak zavisi od nepoznatog modela, ukloni modelsku tvrdnju ili odloži temu. Izaberi tri različite odluke, po mogućstvu iz više klastera. Interni prioritet iz plana nije izmeren obim pretrage niti Google skor.

## Istraživanje i brief

Pre pisanja za svaku temu uradi stvarnu veb pretragu i otvori relevantne izvore. Za upite beleži tačan tekst, vreme, alat/pretraživač, poznati jezik i zemlju/uređaj; nepoznato je `null`. Ne zovi rezultate Codex pretrage Google top 10. Ne izmišljaj PAA, broj pretraga, težinu, poziciju, klikove ili konkurentski broj reči.

Rezultati i konkurenti pomažu razumevanju namere i rupa u odgovorima. Tehničke i bezbednosne tvrdnje proveravaju se prvenstveno u zvaničnim uputstvima i dokumentaciji odgovarajućeg proizvođača/modela. Obično otvori najmanje dva dobra izvora za poređenje; uzak odgovor sa jednim potpunim primarnim izvorom traži obrazloženje u recenziji. Izvor koji nije otvoren nije proveren.

U `research.json` zabeleži: URL, naslov, vreme pristupa, vrstu izvora, model/varijantu, stranu ili odeljak, podržane tvrdnje i ograničenja. Numeričke, bezbednosne, tehničke i promenljive poslovne tvrdnje poveži sa ID-em izvora kroz `claimMap`. Ne čuvaj velike kopije tekstova. Forumi su dokaz nedoumice, ne konačan izvor bezbednosti ili specifikacije.

Kada je dostupna dozvoljena prijavljena GSC sesija ili datirani lokalni CSV, koristi je za stvarne upite. Ne traži API ključ, ne zaobilazi pristup i ne koči korisnu temu samo zato što nema preciznog obima. Nedostajuće podatke jasno označi. Ne kopiraj lične podatke kupaca.

Završi `brief.json`: namera, odluka, publika, fraza i varijante, plan odeljaka, jedinstvena vrednost, action, predloženi canonical, povezani artikli, pregledana preklapanja i otvorena pitanja. Tek zatim napiši članak.

## Pisanje

Prvim pasusima odgovori na pitanje. Objasni kada koja opcija odgovara, kada ne odgovara i šta treba potvrditi. Koristi smisleno poređenje, tabelu ili kontrolnu listu kada pomaže. Primeri mogu biti hipotetički, jasno opisani kao primeri; ne predstavljaj ih kao stvarne klijente ili naše testove.

Ne izmišljaj lično iskustvo, stručnu titulu, autora, recenzenta, flotu, inventar, ocene, statistike, radno vreme, besplatan depozit ili dostupnost. Referentni model iz kataloga nije potvrda konkretnog kompleta za najam. Ne prenosi podatke jednog modela na celu vrstu alata.

Cene ostaju na aktuelnoj stranici/obračunu; vodič o ceni i dostavi već postoji. Konkretna cena sme u nacrt samo uz provereni izvor, datum i objašnjenje uslova. Ne garantuj uštedu, rezultat, vreme sušenja ili broj radnih sati.

Piši srpskom latinicom, jasno i bez punjenja. Naslov i opis su tačni i razlikuju temu; godina samo kada je potrebna. Nema SEO gustine, obaveznog broja reči ili manipulativnog naslova. FAQ dodaj ako rešava preostala pitanja, bez obećanja proširenih Google rezultata.

Dodaj prirodne linkove ka stvarnim internim stranicama. Potreban je jasan put ka odgovarajućoj opremi i sledećem koraku; ne ubacuj isti poziv na unapred određenim procentima teksta. Navedi šta poslati pre najma: posao, materijal, dimenzije, termin, pristup i potreban komplet.

Fotografiju dodaj samo uz poznato poreklo/prava i stvarnu korist. Postojeću reprezentativnu fotografiju ne opisuj kao naš terenski snimak. Odsustvo slike ne opravdava prekid ako tekst/tabela sasvim rešavaju pitanje. Ne pravi nove slike kroz API.

Za opasne radove, prašinu, visinu, električnu energiju, sagorevanje ili nepoznate materijale ostani u obimu izbora i pripreme. Ne izmišljaj bezbednosne brojeve ili postupak. Ako je konkretan odgovor uslovljen tačnim modelom ili stručnom procenom, zadrži ga kao otvoreno pitanje za ljudsku proveru.

## Odvojena recenzija

Posle pisanja proveri tekst u odvojenom kritičnom prolazu, odvojeno od faze autorstva. Proveri sve ključne tvrdnje u otvorenim izvorima i njihove granice, modele, interne linkove, negativne uslove, nepoznate poslovne podatke i preklapanje namere.

Popuni rubriku iz `editorial-rules.md`. Najmanje 90/100, nula tvrdih grešaka, rešena konkretna otvorena pitanja i dokazi omogućavaju `ready_to_publish`. To nije ljudska stručna recenzija: `humanReview.status` ostaje `pending`/`not_performed` dok čovek stvarno ne proveri tekst. Ne traži rutinsko novo odobrenje za svaku objavu jer je korisnik autorizovao dnevni tok. Ako su ključna rizična pitanja nerešena, status je `needs_human_review`, `needs_revision` ili `blocked_source`, bez obzira na poene; nemoj objaviti takav vodič.

Pri običnom pisanju nacrta parsiraj JSON i proveri postojanje fajlova, jedinstvene ID-eve i slugove. Ne pokreći build celog sajta ili testove baze za dokumentacione fajlove. Ne tvrdi da su obavljene produkcione ili mobilne provere ako nisu. Potrebne kasnije aplikacione provere nalaze se u planu.

## Objava i Google

Posle uredničkih provera izvrši ceo `publishing.md`: podrška aplikacije, lokalne provere, ciljani deployment i provera stvarnih javnih URL-ova. Sam Git push ili uspešan lokalni build nije objava. Ne deployuj slepo celu prljavu kopiju i ne uključuj nepovezane izmene. Ako pristup produkciji nije dostupan, ne izmišljaj deploy; sačuvaj `publication_blocked` i tačnu prepreku.

Na sajtu potvrdi HTTP 200, očekivani tekst, canonical, odsustvo noindex, sitemap i interne veze. Tek onda upiši `published` i javni URL u red i `publication.json`. Posle toga kroz dostupni prijavljeni Search Console interfejs proveri nove URL-ove i zatraži indeksiranje u okviru kvote. Ne uvodi API-je. Prihvaćen zahtev nije dokaz indeksiranja. Ako Search Console nije dostupan, zabeleži to, a uspešnu javnu objavu i ispravan sitemap zadrži kao odvojene potvrđene rezultate.

## Čuvanje i završni izveštaj

Sačuvaj pakete u `research/guide-drafts/YYYY-MM-DD/ID-slug/`. Sačuvaj `run.json` u istom datumu. Koristi obrasce kao strukturu; prazni šablon nije završen paket. Dopuni red tačnim putanjama, stanjem, pokušajima i vremenom. Backlog ne mora ponavljati operativno stanje.

U istom pokretanju ponedeljkom dopuni istraživačke prioritete; petkom pregledaj dostupne GSC kohorte i predloži dopune, bez izmišljanja nedostajućih podataka. Nemoj praviti dodatne automatizacije. Završeni provereni sadržaj objavi prema `publishing.md`; ako pristup ili tehničke provere blokiraju objavu, sačuvaj tačan status i prijavi prepreku.

Završni izveštaj neka sadrži broj pripremljenih i broj stvarno objavljenih paketa, posebno `new_count`, `refresh_count` i `published_count`, naslove, akciju novi/dopuna, prave javne URL-ove, deployment i status provera, sitemap i zaseban Google status. Sačuvaj i linkove ka istraživanju/recenziji, konkretne otvorene provere i razlog eventualnog manjka. Tri dopune ne nazivati trima novim vodičima. Ako je stanje nepromenjeno i nema novih izlaza ili prepreke koja traži reakciju, ne šalji ponovljenu praznu poruku. Svaku novu seriju ili stvaran problem prijavi.
