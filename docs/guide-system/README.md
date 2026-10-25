# Plan za svakodnevnu izradu vodiča za Alat Rent

**Obnovljeno 25. oktobra 2026.** Projekat: `/Users/luka/Desktop/rent tools`. Aktuelni red: 34 teme, od toga 21 javni vodič, tri teme za istraživanje i deset odloženih. Režim je `publish_after_checks`, do tri korisna paketa dnevno od 08:00 Europe/Belgrade. [Izveštaj obnove i granice oporavka](restoration.md) imaju prednost nad istorijskim snimkom od 16. oktobra u nastavku.


Datum plana: 16. oktobar 2026. Jezik javnog sadržaja: srpski, latinica. Domen: `https://alatrent.rs`. Dogovoreni ritam: **do tri istražena i proverena vodiča sa objavom na sajtu, svakog dana od 08:00 po vremenu Europe/Belgrade**. Prvi redovni termin posle pripreme ovog plana je 17. oktobar 2026.

Cilj je više korisnih poseta i kvalitetnih upita za najam kroz pouzdane vodiče. Dnevni posao obuhvata istraživanje, izbor namere, nacrt, proveru, integraciju, stvarnu objavu i izveštaj. Korisnik je u dopuni od 16. oktobra izričito tražio i objavu; aktivni režim je `publish_after_checks`. Broj napisanih tekstova nije mera SEO uspeha. Objava zavisi od korisnosti, dokaza i provere; kada nema tri opravdane teme, prijavljuje se manjak umesto proizvodnje duplikata.

Ovaj paket zamenjuje dostavljeni API generator. Koristi Codex zakazivanje, dostupnu veb pretragu i pregled stranica, postojeći katalog i lokalne fajlove. Ne traži OpenAI, Perplexity, Replicate, SEO ili Vercel Blob API ključeve. Codex i dalje koristi raspoloživi paket i limite naloga; odsustvo dodatnih API računa ne znači neograničen rad.

## 1. Šta je pripremljeno i šta je sledeća faza

Pripremljeni su ovaj plan, operativni [dnevni prompt](daily-prompt.md), [urednička pravila](editorial-rules.md), [istraživanje tema](keyword-research.md), [backlog](keyword-backlog.json), [radni red](queue.json) i obrasci u `templates/`. Prva probna serija smešta se u `research/guide-drafts/2026-10-16/`. Zakazani posao nastavlja isti postupak u ovom razgovoru. Kreiranje aktivne automatizacije potvrđeno je aplikacionim alatom; identitet i ograničenja su u [automation.json](automation.json). Prvo zakazano izvršavanje još nije posmatrano.

Podrška za bogat prikaz, datume, staging i SEO provere sada je implementirana; javni JSON sadrži 21 vodič. Svaka naredna objava i dalje sprovodi [postupak objave](publishing.md). Nacrti do tada ostaju van aplikacije. Sadašnji niz u `lib/rental-guides.ts` **odmah predstavlja objavljeni sadržaj**; ne unositi neprovereni nacrt u njega.

Za čitanje prvo koristi odeljke 2–5. Za svakodnevni rad koristi `daily-prompt.md` i `editorial-rules.md`. Za izbor sledećih tema koristi backlog, postojeći katalog i sve ranije nacrte zajedno.

## 2. Polazno stanje koje moramo sačuvati

Pregled repozitorijuma 16. oktobra pokazuje:

| Oblast | Trenutno stanje | Posledica za sistem |
| --- | --- | --- |
| Objavljeni katalog | 188 objavljenih artikala, 11 kategorija u `lib/seed.json` | Svaku temu povezati sa stvarnim javnim artiklom; seed nije potvrda trenutnih zaliha |
| Mapa fraza | `docs/seo-keywords.json` ima 188 zapisa | To je urednička mapa iz kataloga, bez izmerenog obima, težine ili pozicija |
| Vodiči | Pet vodiča i hub `/sr/saveti` | Sačuvati svih pet slugova; novi vodiči ostaju u istoj strukturi |
| Jezici | Katalog ima pet jezika; vodiči trenutno samo srpski | Ne praviti izmišljene prevode niti hreflang ka nepostojećim vodičima |
| Prikaz teksta | `sections: [{heading, text}]` | Postojeći renderer ne podržava bogate liste, tabele i izvore; Markdown nije spreman za direktno ubacivanje |
| Datumi | Zajednički `GUIDES_UPDATED_AT`; vidljiv datum je fiksiran | Pre objave uvesti posebne datume svakog vodiča |
| SEO test | Očekuje tačno pet vodiča | Pre proširenja promeniti očekivanje uz zadržavanje stvarnih provera |
| Slike i modeli | Kataloške i reprezentativne fotografije; mnogi modeli nepotvrđeni | Ne predstavljati ih kao dokaz naše flote ili ličnog testiranja |

Sačuvani javni crawl u `research/indexing-2026-10-16/summary.json` beleži 1.031 sitemap URL, svih 1.031 sa statusom 200, bez evidentiranih tehničkih problema u tom obuhvatu. Svih 1.031 bilo je dohvatljivo kroz interne veze počevši od početne stranice. **To nije podatak o 1.031 indeksiranoj stranici.** Od 13 pojedinačno proverenih URL-ova, osam je potvrđeno u indeksu, pet nije; zbirni izveštaj se obrađivao. Ovo je vremenski snimak, a ne današnja kontinuirana provera Google-a.

Stariji delovi `README.md` i `docs/seo.md` pominju 98 alata, 10 kategorija, 575 URL-ova ili nepovezan domen. Za ovaj plan prednost imaju noviji kod, podaci i datirani dokazi. Dnevni posao ne pokreće `seo:report` samo radi čitanja: ta komanda prepisuje dve postojeće mape i koristi seed, ne živu bazu.

## 3. Šta menjamo u starom promptu

| Staro pravilo | Novo pravilo i razlog |
| --- | --- |
| Svaki tekst mora imati 6.000+ reči | Obim prati pitanje. Složen vodič može biti dug; jednostavan izbor može stati u nekoliko jasnih odeljaka. Google nema propisan poželjan broj reči [1] |
| Objavljuj po rasporedu bez dodatne procene | Raspored pokreće istraživanje i nacrte; svaka objava prolazi proveru |
| Piši kao stručnjak sa ličnim iskustvom | Navedi stvarno uredništvo i stvarnog recenzenta. Lično iskustvo koristi samo uz sačuvan dokaz |
| Obaveznih 5–10 statistika | Brojke samo kada odgovaraju pitanju i imaju proveren primarni izvor |
| U naslov stavi sledeću godinu | Godina samo kad ima sadržajnu ulogu. Datum izmene odgovara stvarnoj značajnoj promeni [1, 7] |
| Analiziraj Google top 10 preko AI sažetka | Sačuvaj stvarno otvorene rezultate i metod pretrage; nepotpun uzorak tako i nazovi |
| Izlistaj PAA pitanja i proceni obim | PAA samo ako su viđena; inače su to urednički predlozi pitanja. Nepoznat obim ostaje `null` |
| Raspodeli ključne reči po odeljcima | Organizuj pitanja, pojmove i kriterijume izbora; nema gustine niti kvota ponavljanja |
| Maksimalno dve rečenice u svakom pasusu | Kratki, povezani pasusi; dužina prati razumljivost |
| Boldovanje ključnih reči donosi kaznu | Uklanja se neosnovana tvrdnja o posebnoj kazni; naglašavanje služi čitaocu |
| Automatski pet metaforičnih fotografija | Korisna postojeća fotografija, tabela ili dijagram; proverena prava, tačan opis i mala datoteka |
| Isti generički alt tekst za slike | Alt opisuje konkretnu sliku i njenu ulogu |
| Linkovi na 20%, 50% i 80% teksta | Link se postavlja tamo gde čitaocu treba sledeći korak |
| Novi blog URL za svaku frazu | Jedna glavna namera ima odgovarajući postojeći ili novi URL; sinonimi ostaju na istoj stranici |
| AI tekst je sam po sebi prekršaj | Problem je nekoristan sadržaj i zloupotreba obima; AI izlaz treba proveriti [2, 3] |
| FAQ schema je put do proširenog rezultata | Pitanja ostaju korisna čitaocu; Google FAQ rich results više ne prikazuje od 7. maja 2026. [4] |
| HTML cleanup uklanja kodne ograde i komentare | To ne predstavlja sanitizaciju. Za budući renderer koristiti kontrolisane blokove i bezbedno kodiranje, bez izvršavanja proizvoljnog generisanog HTML-a |
| Cron veruje javnom zaglavlju `x-vercel-cron` | Obično HTTP zaglavlje nije dokaz identiteta pošiljaoca. Novi postupak nema javni generator endpoint niti ovaj način autorizacije |
| Red prvo bira stavku, zatim je odvojeno zauzima | Takav niz može dvaput izabrati istu stavku. U novoj proceduri jedan koordinator proverava bravu i trajni identitet paketa pre pisanja |
| Stari modeli i troškovi po tekstu prenose se u novi sistem | Te procene ne važe za Codex raspored. Koristi se postojeći nalog i njegovi limiti, bez izmišljene cene po vodiču |
| Izuzetan SEO znači da nema pada | Postavljamo merljive kontrole i reagovanje na probleme; pozicije zavise i od konkurencije i Google sistema |

## 4. Poslovna svrha i vrste stranica

Vodič pomaže da čovek izabere odgovarajuću vrstu opreme, razume ograničenja i pošalje potpuniji upit. Produkt stranica služi konkretnom najmu. Kategorija pomaže u izboru više srodnih artikala. Stranice dostave i uslova objašnjavaju naše poslovanje.

Primer podele namere:

| Upit | Poželjno odredište | Uloga vodiča |
| --- | --- | --- |
| `iznajmljivanje bušilice Beograd` | Postojeći artikal/kategorija | Vodič ka toj stranici vodi nakon objašnjenja izbora |
| `udarna bušilica ili bušilica čekić` | Vodič sa poređenjem | Objašnjava mehanizam, materijal, prihvat i šta potvrditi |
| `cena najma alata i dostave` | Postojeći vodič o ceni | Dopuna postojećeg URL-a, bez drugog cenovnog vodiča |
| `žirafa za zidove usisivač` | Postojeći vodič o žirafi | Dopuna istog vodiča kada je namera ista |
| `iznajmljivanje alata Novi Beograd` | Postojeće poslovne i komercijalne stranice | Lokalni kontekst samo kada pomaže odluci |

Ne pravimo desetine istih tekstova za naselja, varijante `najam/rentiranje/iznajmljivanje`, ćirilicu ili upite bez dijakritike. Vodiči koriste prirodnu srpsku latinicu; sinonimi ulaze u objašnjenje gde imaju smisla. Brend i model ne smeju potisnuti jasno objašnjenje namene.

## 5. Klasteri i redosled razvoja

Prvi talas se vezuje za stvarni katalog, dostupne primarne izvore i odluke koje ljudi donose pre najma. Backlog je lista kandidata, a ne obećanje zasebnog URL-a za svaki zapis.

1. **Bušenje i pričvršćivanje:** obična bušilica, vibraciona bušilica i bušilica-čekić; vrsta materijala, prihvat, dodatak i opis posla. Jedna glavna tabela izbora sprečava ponavljanje definicija.
2. **Merenje i planiranje:** daljinomer, metar i nivelator kao različiti zadaci; vidljivost, prepreke i kontrola merenja. Ne objavljivati tvrdnje o konkretnoj tačnosti bez dokumentacije modela.
3. **Keramika i podloge:** ručni/električni sekač, dužina i tip reza, obrada ivica, priprema kompleta. Odvojiti izbor alata od opasnih operativnih postupaka.
4. **Zidovi i završni radovi:** prvo proširiti postojeći vodič o žirafi; novu temu otvoriti samo za zasebnu odluku, npr. izbor načina uklanjanja odgovarajućeg sloja.
5. **Čišćenje:** proširiti vodič o ekstrakciji; odvojeni vodiči samo kada se promeni materijal, oprema i odluka, ne kada se promeni naziv komada nameštaja.
6. **Sabijanje i beton:** postojeće poređenje ploče i žabe je matični vodič. Dopuniti kriterijume, ne generisati drugo gotovo isto poređenje.
7. **Vlaga, vazduh i pumpe:** povezati izvor vlage, prostor i ograničenja. Za poplave, električne rizike i nepoznate materijale traži se stručna procena; tekst ne zamenjuje sanaciju.
8. **Priprema najma:** transport, pristup, potrošni delovi, datumi i obračun. Poslovne činjenice se povezuju na postojeće uslove, bez umnožavanja cenovnih tekstova.

Dnevno ciljamo tri različite odluke. Kada ista namera već postoji, rezultat tog termina može biti nacrt dopune, sa tačno navedenim postojećim URL-om i delovima koji se menjaju. Ne pretvaramo svaku dopunu u novi vodič samo radi broja tri.

## 6. Istraživanje ključnih reči bez dodatnih API-ja

### 6.1. Redosled izvora

Prvo pregledati objavljene vodiče, backlog i sve nacrte. Zatim pogledati katalog, nazive koje korisnici koriste i dostupne agregirane upite. Sačuvani upiti kupaca mogu pomoći samo bez ličnih podataka i uz postojeće pravo pristupa. Ne izvoziti telefone, adrese ili privatne razgovore u istraživačke fajlove.

Veb pretraga zatim proverava da li kandidati odgovaraju stvarnoj korisničkoj nedoumici. Prednost imaju srpski rezultati i namera relevantna za naš katalog. Rezultate pretrage koristiti za razumevanje pitanja i formata, a fabričke izvore za tehničke tvrdnje. Ne prepisivati konkurentske tekstove, fotografije ili strukturu pasus po pasus.

Ako je dostupna prijavljena Search Console sesija, pročitati izveštaj kroz interfejs i izvesti CSV. Ako nije, koristiti prethodni izvoz uz datum ili upisati da podaci nedostaju. Ne uvoditi API integraciju radi popunjavanja praznine. Ne pokušavati zaobilaženje prijave, CAPTCHA ili ograničenja pretrage.

### 6.2. Obavezni zapis po pretrazi

Sačuvati: tačan upit, vreme, korišćen alat/pretraživač, stvarno dostupnu zemlju i jezik, uređaj ako je poznat, otvorene URL-ove i kratko opažanje. Nepoznata lokacija ostaje `null`; srpski jezik upita nije dokaz da je pretraga izvršena iz Beograda. Rezultate Codex pretrage ne nazivati kontrolisanim Google top 10.

Za kandidata proveriti osnovni upit, formulaciju problema i komercijalnu varijantu. Primer: `udarna bušilica ili bušilica čekić`, `bušenje betona koju bušilicu izabrati`, `iznajmljivanje bušilice čekića Beograd`. Broj upita nije fiksna kvota: dodaje se kada postoji nerešena razlika u nameri.

### 6.3. Kako biramo prioritet

Interni skor služi redosledu rada, ne predstavlja Google ocenu ili prognozu pozicije:

| Kriterijum | Maksimum | Šta donosi bodove |
| --- | --- | --- |
| Poslovna relevantnost | 30 | Jasan izbor ili priprema za opremu koju stvarno iznajmljujemo |
| Zasebna potreba | 25 | Postojeći sadržaj ne rešava istu odluku; novi koristan doprinos je konkretan |
| Dokazi i mogućnost tačnog odgovora | 20 | Otvoreni primarni izvori i proverljivi podaci |
| Dokaz interesovanja | 15 | Upiti iz GSC ili korisničkih nedoumica; vidljiv obrazac rezultata, uz slabije poverenje nego za GSC |
| Vreme i spremnost | 10 | Sezona, dostupni materijali i mogućnost da tema sada bude završena |

Svaka ocena sadrži obrazloženje. Ako nema podataka o potražnji, taj deo se označava kao nepoznat i skor kao privremen. Ne izmišljati ocene preciznosti, mesečni obim ili težinu. Prednost može imati potpuno dokumentovan manji problem nad popularnijom temom bez pouzdanog odgovora.

### 6.4. Novi tekst ili dopuna

Uporediti: kome se odgovara, koju odluku donosi, koji alat se bira i koji završni odgovor očekuje. Dva različita naslova mogu imati istu nameru. Ako postojeći vodič može potpuno odgovoriti dopunom jednog ili dva odeljka, pripremiti dopunu. Ako nova tema menja zadatak i kriterijume izbora, dozvoljen je zaseban vodič uz link ka matičnoj temi.

U `brief.json` navesti pregledane najbliže postojeće URL-ove i nacrte, odluku `new` ili `refresh`, razlog razdvajanja i vlasnički komercijalni URL. `overlapWith: []` samo po sebi nije dokaz da je provera urađena.

## 7. Šta mora da dobije svaki vodič

Jedan urednički paket sadrži četiri fajla:

- `brief.json`: namera, ključna fraza, varijante, konkretna publika, odluka koju tekst rešava, ciljna putanja, artikli, konkurentske interne teme i jedinstveni doprinos.
- `research.json`: pretrage, otvoreni izvori, relevantne tvrdnje sa mestom u izvoru, granice primene, model i nepoznate činjenice.
- `article.md`: kompletan čitljiv nacrt sa prirodnim naslovom, odgovorom, potrebnim poređenjem/koracima izbora, linkovima i izvorima.
- `review.json`: interna ocena, činjenične provere, preklapanja, problemi, rezultat i odvojeni status ljudske stručne provere.

Tekst u prvim pasusima odgovara na glavno pitanje. Uvod ne treba da bude priča o važnosti alata. Zatim se obrađuju kriterijumi koji menjaju odluku: materijal, dimenzije, pristup, napajanje, prihvat, dodaci i uslovi posla. Gde tabela pojednostavljuje poređenje, koristi se tabela. Gde je važan redosled pripreme, koristi se lista.

Zaokružen vodič obično sadrži direktan odgovor, nekoliko kriterijuma, konkretnu tabelu ili kontrolnu listu, granice primene, uobičajene greške i šta poslati pre najma. FAQ je dozvoljen samo za pitanja koja nisu već jasno obrađena. Broj naslova, pitanja i reči se ne propisuje kao SEO uslov.

Završni poziv na akciju traži potrebne podatke: opis materijala i posla, mere, termin, način preuzimanja i željene dodatke. Vodi na stvarni javni artikal ili kontakt. Ne obećava slobodan termin, odgovarajući komplet ili garantovan rezultat.

## 8. Dokazi i poreklo tvrdnji

Svaka brojčana, tehnička, bezbednosna ili promenljiva poslovna tvrdnja mora imati izvor u istraživačkom zapisu. Izvor se stvarno otvara; naslov rezultata pretrage nije dovoljan. Za PDF navesti stranu i tačan model/varijantu. Za veb stranicu navesti odeljak i smisao relevantnog pasusa. Ne čuvati velike kopije zaštićenih tekstova.

Priručnik konkretnog modela ima prednost nad generičkom stranicom za specifikacije. Prodajna stranica proizvođača može podržati namenu i funkciju, ali ne zamenjuje potpuno uputstvo za rizičan postupak. Konkurentska cena nije naša cena. Kataloški referentni model nije potvrđena mašina u našoj floti.

Potrebna su obično najmanje dva otvorena kvalitetna izvora za poređenje. To je urednička kontrola, a ne Google zahtev. Jedno potpuno primarno uputstvo može biti dovoljno za uzak odgovor; recenzija mora objasniti zašto. Dva nepovezana članka ne popravljaju odsustvo izvora za ključnu tvrdnju.

Statusi dokaza: `verified_primary`, `verified_business`, `needs_model_confirmation`, `unsupported`. Nepotvrđenu tvrdnju ukloniti ili precizno ograničiti; ne popunjavati prazninu samouverenim stilom. Za izvor koji se ne otvara pronaći drugi pouzdan izvor ili zadržati nacrt na proveri.

## 9. Naše poslovne činjenice

Javni identitet dolazi iz `lib/business-identity.ts`, `lib/contact.ts` i aktuelnih podešavanja sajta. Trenutno: Alat Rent, domen `alatrent.rs`, telefon `062 9751270`, adresa Antifašističke borbe 32, Novi Beograd. Dolazak, preuzimanje i vraćanje se unapred dogovaraju; ne izmišljati radno vreme ili slobodan dolazak. Email je `office@alatrenta.rs`; njegov drugačiji domen ne ispravljati nagađanjem.

Dostava je ograničena na administrativnu teritoriju grada Beograda, uključujući Obrenovac, Sremčicu i Železnik. Ne proširivati zonu na celu Srbiju. Cene, tarifa, depozit i klupska pravila proveravaju se na živim stranicama i u važećim podacima, ne u starom tekstu dokumentacije.

Najam računa kalendarske dane uključujući preuzimanje i vraćanje. Najam bez depozita posle tri plaćena i završena najma povezana sa nalogom razlikuje se od klupskog popusta. Ne pisati da svaki prvi najam nema depozit. Umesto zamrzavanja svih iznosa u vodiču, povezati na aktuelni obračun i postojeći vodič o ceni.

## 10. Tri nacrta dnevno i radni red

Dnevni ključ je datum u `Europe/Belgrade`; primer `2026-10-17`. Termin 08:00 je početak rada, ne obećano vreme isporuke. Letnje i zimsko računanje prati lokalni raspored; pri promeni vremena proveriti sledeći termin u aplikaciji.

`keyword-backlog.json` je istraživački izvor. `queue.json` je jedini autoritativni operativni red. Stavka backlog-a koja još nema unos u redu nije zauzeta. Pre izbora u red se dodaje zapis sa istim stabilnim ID-em. Svaki pokret proverava sve nacrte, ne samo status reda; time se sprečava dupliranje posle prekida između upisa.

Tok stanja:

`pending_research → researching → brief_ready → drafting → internal_review → ready_to_publish → publishing → published`

Mogući izlazi: `needs_revision`, `blocked_source`, `blocked_overlap`, `deferred`, `failed`. `needs_human_review` koristi se kada konkretno nerešeno stručno pitanje stvarno sprečava pouzdan odgovor. Rutinsko novo ljudsko odobrenje nije potrebno za svaku objavu jer je korisnik autorizovao proces. Ljudska odluka, kada postoji, može biti `approved_for_integration`; AI je ne izmišlja. `publication_blocked` znači nedostupan pristup ili neuspelu tehničku proveru; `published` se upisuje tek kada javni URL stvarno radi i provere prođu.

Za svaki rad sačuvati `research/guide-drafts/YYYY-MM-DD/run.json`: lokalni datum, početak/kraj sa vremenskom zonom, odabrane ID-eve, završene ID-eve, greške i sledeće korake. Posle svake dovršene faze upisati napredak; ne čekati kraj sva tri teksta. Pri ponavljanju istog datuma nastaviti nepotpun paket. Ako su tri paketa već završena, ne praviti četvrti, osim izričite nove instrukcije.

Jedan posao ima radnu bravu u `research/guide-drafts/.run-lock/`. Brava sadrži `owner.json` sa run ID-em, vremenom i zakupom od dva sata, obnavljanim tokom rada. Postojanje brave ne znači automatski zaglavljen posao. Ako vlasnik još radi ili to nije moguće proveriti, ne preuzimati rad i ne brisati bravu. Istek sam po sebi nije dokaz da je proces stao. Posle dokazane neaktivnosti oporavak zabeležiti u novom manifestu.

Pisati privremeni fajl u istom direktorijumu, proveriti JSON i zatim preimenovati; ne ostavljati polovičan `queue.json`. Jedan izvršilac menja red i manifest; pisanje i kritičnu proveru obaviti kao odvojene faze. Delegiranje koristiti samo kada ga korisnik ili primenljiva uputstva izričito traže. Najviše tri pokušaja iste stavke; nakon toga `failed` sa uzrokom, bez beskrajnog ponavljanja. Najviše dve uredničke dorade u istom pokretanju; nerešen problem ostaje vidljiv. Ovo su obavezni postupci koje Codex sprovodi alatima pri izvršavanju; ovaj dokument ne predstavlja zasebno implementiran i testiran servis za red, zaključavanje ili oporavak. Manifest mora pokazati koje kontrole su zaista izvršene.

Propušten dan se ne nadoknađuje masovnim nizom. Sledeći redovni pokret nastavlja prioritetne teme, najviše tri, i prijavljuje prekid ako utiče na rezultat. Ako uređaj nije dostupan, lokalni posao ne može pouzdano raditi nad njegovim fajlovima. Potrebno je da računar bude uključen, aplikacija radi i projekat bude dostupan [9].

## 11. Tačan dnevni postupak

1. Pročitati `AGENTS.md`, ovaj plan, prompt, urednička pravila, red, backlog i prethodni izveštaj. Pre bilo kakve izmene aplikacionog koda pročitati odgovarajuću lokalnu Next.js dokumentaciju.
2. Pregledati `git status --short`; sačuvati tuđe izmene. Ne pokretati reset, automatski commit ili deploy.
3. Proveriti dnevni manifest i bravu. Nastaviti isti rad ako je prekinut; ne praviti duplu seriju.
4. Pročitati aktuelnu listu objavljenih vodiča i sve nacrte. Uporediti njihove namere sa vrhom reda.
5. Izabrati do tri različite potrebe; za svaku odlučiti novi vodič ili dopuna. Dati prednost stvarnom najmu i temama koje možemo dokazati.
6. Potvrditi najmanje jedan odgovarajući objavljeni artikal, njegov ID i putanju. Ako javni sajt nije dostupan, zabeležiti da je potvrda samo iz lokalnog kataloga.
7. Istražiti upite i pregledati rezultate. Sačuvati metod i otvorene izvore. Pre pisanja završiti osnovni `brief.json` i `research.json`.
8. Napraviti raspored pitanja i jedinstveni doprinos. Ako ne postoji jasna nova vrednost, preći na dopunu ili odložiti temu.
9. Napisati ceo `article.md` i prirodno povezati stvarne interne putanje. Dodati izvore uz bitne tehničke tvrdnje.
10. Odvojeno proveriti činjenice, modele, jedinice, negacije, preklapanja i obećanja. Drugi agent može proveriti prvi nacrt, ali to nije ljudska stručna recenzija.
11. Proveriti naslov, opis, strukturu, linkove, eventualnu sliku i mobilnu čitljivost u formatu nacrta. Ne tvrditi da je renderer sajta testiran ako je pregledan samo Markdown.
12. Doraditi do dva puta. Tvrdi pad kvaliteta blokira status spremnosti bez obzira na ukupan broj bodova.
13. Upisati `review.json`, stanje reda i završetak manifesta. Nepotpun rezultat sačuvati sa tačnim statusom.
14. Izvršiti `publishing.md`: proveriti i objaviti sadržaj, potvrditi javne URL-ove, sitemap i interne veze, pa kroz odobren i dostupan Search Console interfejs zatražiti indeksiranje. Prikazati naslove, javne linkove, šta je stvarno objavljeno i koje konkretne provere ostaju. Posebno navesti broj novih vodiča i broj dopuna; tri dopune nisu tri nova vodiča. Bez izveštaja o izmišljenim pozicijama ili očekivanom procentu rasta.

Ponedeljkom u istom pokretanju dopuniti prioritete backlog-a; petkom pregledati dostupne GSC izvoze i ranije objavljene kohorte. To su delovi istog posla, ne dodatne automatske objave. Kada podaci nisu dostupni, stanje je nepoznato, ne nula.

## 12. Urednička provera i bezbednost

Detaljna kontrola i prag su u `editorial-rules.md`. Interna ocena od 90/100 i nula tvrdih grešaka mogu označiti završen interni nacrt. Ta ocena nije procena Google pozicije niti zamena za stručnjaka. Ljudska provera ostaje posebno polje sa stvarnim imenom tek posle stvarne provere.

Tvrde greške obuhvataju izmišljeno iskustvo, netačne modele, nepostojeće izvore, neosnovane cene i zalihe, opasan savet, kopiranje i duplu nameru bez razloga. Izbacivanje problematične tvrdnje je bolje od prikrivanja problematične tvrdnje opštim upozorenjem na kraju.

Za rad na visini, struju, agregate i sagorevanje, rezanje mineralnih materijala/prašinu, gas, pritisak, noseće konstrukcije, kontaminiranu vodu i nepoznate stare premaze, nacrt prvenstveno pomaže izboru i pripremi razgovora sa stručnjakom. Ne izmišljati univerzalne udaljenosti, vremena provetravanja, granulacije, brzine, dubine ili dozvoljene kombinacije. Gde je za odgovor nužan bezbednosni postupak konkretnog modela, potreban je taj priručnik i stručna provera pre objave.

## 13. Naslovi, linkovi, slike i jezik

Naslov jasno opisuje odluku, bez superlativa i obećanja. Približno 45–65 karaktera može biti urednička smernica, ali nije Google ograničenje; važni su jasnoća, prikaz i razlikovanje stranica [10]. Meta opis je kratak, tačan sažetak; ne treba ga produžavati da dostigne 160 karaktera. Google može izabrati drugačiji prikaz.

Jedan H1 je standard našeg šablona. H2 grupiše pitanja, H3 se koristi samo kada podtema to opravdava. Fraza prirodno ulazi u naslov i odgovor kada zaista opisuje temu. Nema procenta gustine, veštačkih sinonima ili skrivenog teksta.

Svaki vodič povezuje relevantnu opremu i potreban sledeći korak. Kada ima smisla, povezuje matični vodič ili srodnu odluku. Posle objave najmanje jedna odgovarajuća postojeća stranica treba da vodi nazad ka njemu; proveriti stvarne ID veze umesto pretpostavke. Sidro opisuje odredište. Ne ponavljati istu komercijalnu frazu kroz sve linkove.

Slika se koristi samo ako pomaže da se razume oprema, prihvat, razlika ili položaj. Prvo proveriti postojeće resurse i prava u evidenciji izvora fotografija. Reprezentativna slika ne sme dobiti opis „naša mašina na poslu“. Ne preuzimati konkurentske fotografije. Ne generisati fotografije izmišljenih terenskih iskustava. Tabele i jednostavni dijagrami često su korisniji od pet dekorativnih slika.

Plan slika treba da sadrži putanju, izvor/prava, svrhu, alt, dimenzije i da li slika stvarno odgovara modelu. Za budući renderer definisati širinu/visinu, responsive veličine i razumno učitavanje bez pomeranja sadržaja. Detalji implementacije slede lokalnu Next.js dokumentaciju; ne kopirati stare API primere iz dostavljenog generatora.

## 14. Implementacija objavljivanja u postojećem projektu

Ovo su konkretni uslovi prve objave, koje zakazani posao treba da implementira i proveri pre deploya ako još nedostaju. Njihovo navođenje nije tvrdnja da su već implementirani:

| Korak | Datoteke | Uslov prihvatanja |
| --- | --- | --- |
| Posebni datumi | `lib/rental-guides.ts`, `components/RentalGuides.tsx`, `app/sitemap.ts` | Svaki vodič ima stvarni `publishedAt` i `updatedAt`; objava novog ne menja datume starih |
| Odvojeni nacrti i objava | Urednički podaci i javni loader | Samo izričito objavljen sadržaj ulazi u rutu, hub, related liste i sitemap |
| Bogat sadržaj | Tip vodiča i renderer | Podržane liste, tabele, izvori i unutrašnji linkovi; kontrolisani tipovi blokova, bez proizvoljnog AI HTML-a |
| Autorstvo i pregled | Podaci vodiča i vidljivi potpis | Stvarno uredništvo; proverio samo kada je provera urađena; vidljivi i schema podaci saglasni |
| Stabilni URL-ovi | Catch-all ruta i SEO podaci | Svih pet postojećih putanja ostaje isto; nema migracije na `/blog` ili `/vodici` |
| Metadata | `lib/seo.ts` i postojeći SEO tok | Poseban title/description/canonical; Article podaci odgovaraju vidljivom tekstu [5] |
| Sitemap | `app/sitemap.ts` | Novi javni vodič jednom u sitemap-u; nacrti izostavljeni; `lastmod` stvaran [6] |
| Hub i isticanje | `components/RentalGuides.tsx` | Odluka o sortiranju/istaknutim vodičima eksplicitna; `slice(0,3)` ne skriva sve nove tekstove zauvek |
| Testovi | `tests/seo.test.mjs` | Dinamičan očekivani broj objavljenih vodiča, uz nezavisne provere datuma, ID-eva, sr-only ruta i nacrta |

Predloženi javni model obuhvata `slug`, `title`, `description`, `intro`, `blocks`, `toolIds`, `status`, `publishedAt`, `updatedAt`, `author`, `reviewer`, `sources`, `cluster` i opcionu proverenu sliku. Uredničke ključne reči, bodovi i napomene o konkurenciji ostaju interni. `datePublished` nastaje pri prvoj stvarnoj objavi, ne pri pravljenju nacrta. `dateModified` se menja posle suštinske izmene, uz zapis šta je promenjeno.

Ne uvodimo Prisma, novu bazu, admin generator, javni cron endpoint ili ISR poziv samo zato što ih stari prompt sadrži. Postojeći projekat koristi drugačiji sistem i već ima metadata i sitemap. Za pregledni sadržaj strukturisani fajlovi mogu biti dovoljni. Baza ima smisla tek kada urednički rad i prava pristupa zahtevaju takvu arhitekturu.

## 15. Provere pri integraciji i posle objave

Za samo ovaj dokumentacioni paket proveriti da su JSON fajlovi validni, ID-evi i slugovi jedinstveni, putanje dokumenata postoje i nacrti nisu u javnom nizu. Za to nisu potrebni build ni testovi celog sajta.

Kada se menja aplikacija, prvo pokrenuti `npm run typecheck`, zatim `npm run build`, pa ciljanu SEO proveru `node --test --test-concurrency=1 tests/seo.test.mjs`. Širi `npm test` pokrenuti kada obim izmene zahteva regresiju i po pravilima repozitorijuma. Provere koriste zasebne test baze; nikada ne resetovati admin ili menjati produkcioni katalog radi SEO testa.

Lokalno proveriti nove i svih pet starih vodiča: HTTP status, jedan H1 po šablonu, naslov/opis, canonical, jezičke alternative, Article i breadcrumb podatke, slike, interne linkove i vidljive datume. Proveriti da nacrt nije javno dostupan i da nepostojeći slug vraća 404. Na mobilnom prikazu pregledati tabelu, prelome naslova i dodirne mete.

Posle budućeg deploya ponoviti provere nad javnim domenom, proveriti sitemap i stvarni HTML. Ako je dostupna Search Console, pregledati novi reprezentativni URL i eventualne greške. Zahtev za indeksiranje nije dokaz indeksiranja; robots i sitemap nisu garancija. Ne slati svaki dan ponovo sve URL-ove i ne koristiti Indexing API za obične vodiče.

## 16. Merenje uspeha bez API integracija

Pre objavljivanja nove serije sačuvati početno stanje iz Search Console interfejsa: poslednjih 28 dana i prethodnih 28 dana, tip pretrage Web, zemlja Srbija posebno i ukupno posebno, uređaji posebno. Za nov sajt bez dovoljno istorije sačuvati ono što postoji i ne prikazivati procenat rasta od nule.

Izvesti dostupne tabele Pages i Queries u datirane lokalne CSV fajlove u `research/guide-performance/YYYY-MM-DD/`. Ne tvrditi da dva odvojena izvoza daju potpunu matricu upit×stranica. Za sumnju na preklapanje primeniti filter upita i pregled Pages u interfejsu. Zabeležiti obuhvat i ograničenja izvoza. GSC agregira podatke i nije evidencija svakog pojedinačnog upita.

| Mera | Kako je čitamo | Šta ne zaključujemo |
| --- | --- | --- |
| Organski klikovi i impresije | Po stranici, klasteru, Srbiji i uređaju | Veći zbir impresija nije automatski više najmova |
| CTR | Zajedno sa upitom i prosečnom pozicijom | Nizak CTR nije samostalni razlog za menjanje svega |
| Prosečna pozicija | Trend istog skupa stranica/upita | Nije fiksna pozicija za svaku osobu u Beogradu |
| Indeksiranje | URL Inspection i zbirni izveštaj uz datum | HTTP 200 ili sitemap ne znače da je stranica indeksirana |
| Put do upita | Postojeća evidencija upita i postojeće merenje, ako ga ima | Bez atribucije ne tvrdimo da je vodič doneo svaki upit |
| Kvalitet upita | Da li korisnik navodi alat, posao, termin i uslove | Ne čuvamo lične podatke u SEO izveštaju |
| Brzina | GSC terenski izveštaji ako postoje; laboratorijski test odvojeno | Jedan lokalni Lighthouse rezultat nije terenski Core Web Vitals |

Prvu kontrolu novog URL-a raditi posle približno 7 dana, sadržajnu posle 28 i ozbiljniju odluku posle 56–90 dana ili kada se skupi dovoljno podataka. Ovo su operativni termini pregleda, a ne obećani Google rokovi. Pre promene zaključka proveriti kašnjenje podataka, sezonalnost, promenu upita i tehničke događaje [8].

## 17. Kako reagujemo na pad

Odmah reagovati na pouzdano utvrđen `noindex`, pogrešan canonical, 404/5xx, nestanak važnih internih linkova ili nečitljiv sadržaj. Zadržati nove objave do otklanjanja uzroka, dok istraživanje i nacrti mogu nastaviti. Ne brisati postojeće tekstove ili menjati slugove radi pokušaja oporavka.

Za promenu saobraćaja prvo razdvojiti brendirane i nebrendirane upite, vodiče i komercijalne stranice, uređaje, zemlju i datume. Pad na jednoj maloj stranici nije isto što i problem celog sajta. Kod novog sajta nekoliko klikova može napraviti veliki procenat bez značajne promene.

Interni signal za istragu, kada postoji dovoljno podataka: najmanje 20% manje klikova i bar 20 klikova apsolutnog pada u uporedivih 28 dana, potvrđeno na sledećem pregledu. Ovo je početni alarm za ovaj projekat, ne Google prag. Ako nema dovoljnog uzorka, raditi pregled konkretnih upita i tehničkih simptoma umesto procentualnog alarma.

Ako se dve naše stranice pojavljuju za isti upit, proveriti da li zaista rešavaju istu potrebu i da li je slabija stranica potisnula bolju. Sličan upit sam po sebi nije dokaz štetne kanibalizacije. Mogući odgovor je bolja diferencijacija, dopuna matične stranice ili pažljivo spajanje uz opravdano preusmerenje. Ne pokretati masovne redirect/noindex akcije iz dnevnog pisanja.

## 18. Plan za prvih 90 dana

| Period | Konkretan rad | Uslov za prelazak |
| --- | --- | --- |
| Dan 0 | Pregled starog generatora; sačuvana SEO osnova; tri probna paketa; zakazan dnevni posao | Prompt je razumljiv, izlaz sa izvorima i greškama može da se pregleda |
| Dani 1–3 | Tri nacrta dnevno; proveriti prve serije; početi po jednu odluku iz više klastera | Nema ponovljenih namera ni izmišljenih činjenica |
| Dani 4–7 | Dorada prompta prema stvarnim greškama; popuna bar narednih sedam radnih dana u backlog-u | Red i evidencija prekida rade; izabrane teme imaju izvore |
| Prva objava | Implementacija uredničkog modela, bogatog prikaza i pojedinačnih datuma; testovi; deploy prve proverene serije | Provere prolaze i stvarni javni URL-ovi rade; nerešene stručne tvrdnje ostaju van objave |
| Nedelje 3–4 | Kontrola indeksiranja i upita; dopune pet postojećih vodiča; širenje tek kada je namera nova | Moguće je povezati objavljeni sadržaj sa jasnim korisničkim zadatkom |
| Dani 29–60 | Pregled 28-dnevnih kohorti; dorada naslova/odgovora gde podaci opravdavaju; jačanje smislenih linkova | Postoje dokumentovane odluke, bez masovnih promena na osnovu malo podataka |
| Dani 61–90 | Oceniti koji klasteri donose relevantne posete i upite; odbaciti duple ideje; plan sledećeg kvartala | Ritam objave prati dokazani kvalitet, preglede i poslovnu korist |

Tri nacrta dnevno znače do 21 nedeljno i do 90 u 30 dana. To je kapacitet pripreme, ne cilj od 90 indeksiranih URL-ova. Backlog se obnavlja iz dokaza; kada se iscrpe opravdane potrebe, više rada ide na dopune i istraživanje. Plan se ne održava pravljenjem sinonimskih kopija.

## 19. Šta automatizacija sme da menja

Dnevni posao sme da piše nacrte i istraživanja u `research/guide-drafts/`, sopstveni radni red `docs/guide-system/queue.json`, backlog i istraživačku belešku, i datirane agregirane izveštaje u `research/guide-performance/` ako su podaci dostupni. Poštuje tuđe izmene i ne prepisuje ručno uređene tekstove bez čitanja razlike.

Korisnikova dopuna od 16. oktobra uključuje ciljane izmene prikaza vodiča, metadata i sitemap podrške, odgovarajuće testove, commit/push/deploy i proveru javne objave kroz postojeći hosting. Sprovodi se [publishing.md](publishing.md), uz očuvanje pet postojećih URL-ova i tuđih nepovezanih izmena. Poslovni podaci, cene, korisnički podaci, novi servisi/automatizacije i poruke drugim osobama ostaju van obima. Ne označavati stvarnu objavu kao uspešnu bez javne provere; Google zahtev voditi odvojeno od potvrđenog indeksiranja.

## 20. Izvori i evidencija

U nastavku su primarne smernice proverene 16. oktobra 2026. One podržavaju navedena SEO pravila. Prioriteti, interni skorovi, ritam pregleda i arhitektura fajlova predstavljaju odluke ovog projekta.

1. [Google smernice za koristan sadržaj](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — vrednost, tačnost, iskustvo, broj reči i stvarno ažuriranje.
2. [Google smernice za generativni AI sadržaj](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content) — činjenična i urednička provera pre objave.
3. [Google spam pravila](https://developers.google.com/search/docs/essentials/spam-policies) — scaled content i sadržaj bez dodatne vrednosti.
4. [Google promene dokumentacije](https://developers.google.com/search/updates) — ukidanje FAQ rich results od 7. maja 2026. i uklanjanje dokumentacije.
5. [Google Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article) — podaci o autoru i datumima usklađeni sa sadržajem.
6. [Google izrada i slanje sitemap-a](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) — javni URL-ovi i tačan `lastmod`.
7. [Google datumi objave](https://developers.google.com/search/docs/appearance/publication-dates) — stvarni datumi i dosledan prikaz.
8. [Google dijagnostika pada saobraćaja](https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops) i [Search Console pregled](https://developers.google.com/search/docs/monitor-debug/search-console-start) — podaci i provera mogućih uzroka.
9. [OpenAI dokumentacija zakazanih zadataka](https://learn.chatgpt.com/docs/automations?surface=app) — lokalni fajlovi, raspored i pregled rezultata.
10. [Google naslovi u rezultatima pretrage](https://developers.google.com/search/docs/appearance/title-link) — jasan, opisni naslov i način prikaza.

Projektni izvori: `lib/rental-guides.ts`, `components/RentalGuides.tsx`, `components/ToolRentalContent.tsx`, `app/sitemap.ts`, `lib/seo.ts`, `tests/seo.test.mjs`, `lib/seed.json`, `docs/seo-keywords.json`, `lib/product-data.json`, `lib/business-identity.ts`, `lib/contact.ts`, `docs/ai-visibility-implementation.md`, `research/indexing-2026-10-16/summary.json`. Za promenljive činjenice uvek proveriti noviji izvor pre korišćenja.
