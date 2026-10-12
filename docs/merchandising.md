# Prodajna logika za najam

## Puštanje

Admin → Prodaja i klub → **Prodajna logika** sadrži poslove, akcije i preporuke sa razlogom. Preporuke i nove akcije imaju nezavisne prekidače, oba početno isključena. Objavljeni poslovi odmah su dostupni na početnoj i u katalogu. Nova akcija počinje bez popusta i isključena je dok administrator ne unese sve uslove.

Javni paketi, uključujući direktnu `/sr/paketi` stranicu i sitemap, ostaju sakriveni preko postojećeg `showProjectKits`. Postojeći podaci, admin i ugovoreni tarifni mehanizam paketa nisu izbrisani. Komercijalna ponuda sadrži iznajmljivanje alata i postojeće usluge dostave; nema kupovine potrošnog materijala ni nove online naplate.

## Izbor i preporuke

Katalog prihvata `q`, `sort`, `job`, `maxPrice`, `start`, `end` i `available=1`. Maksimalna cena je osnovna dnevna tarifa u RSD. Pretraga prepoznaje postojeće sinonime, ćirilicu/latinicu i nazive objavljenih poslova. Datum mora zadovoljavati postojeća pravila najma, do 90 dana. Poznata raspoloživost proverava celu količinu u izabranom periodu. Nepoznata količina je „potrebna potvrda” i ne ulazi u filter „samo raspoloživi”. Filteri se ne indeksiraju; canonical ostaje stranica kataloga ili kategorije.

Admin unosi odobrene veze sa razlogom na svih pet jezika: dopunski alat, nadogradnja, povoljnija ili neutralna alternativa. Redosled je podesiv. Stare `relatedIds` i `alternativeIds` se čuvaju; eksplicitna nova veza za isti alat ima prednost. Alternativa iz iste kategorije ne bira se automatski. Prikazuje se najviše tri dopunska alata, najviše devet preporuka ukupno. Skriveni, duplirani i neraspoloživi alati ne prikazuju se kao ponude.

Dopunski alat nasleđuje izabrani period polazne stavke, uz početnu količinu jedan. Zamena čuva količinu i period polaznog alata. Različiti termini drugih stavki ostaju sačuvani. Za najam bez roka `openEnded` i prazan datum vraćanja ostaju sačuvani; ne prikazuje se izmišljena konačna doplata. Nepoznata cena ili zaliha traži potvrdu. Povoljna alternativa prikazuje se tek kada poznat obračun cele korpe potvrdi uštedu.

`POST /api/commerce/recommendations` prima `items`, opcioni `sourceIndex` i postojeći kontekst obračuna (`delivery`, `useCredit`, `teamId`, `referralCode`). Vraća početni javni obračun ili `null` ako je korpa neraspoloživa, kao i ponude sa novim stavkama, celim javnim obračunom i razlikom u ceni. `POST /api/commerce/compare` prima i `nextItems`, ponovo računa cenu i proverava kapacitet pre prihvatanja ponude. Ni jedan endpoint ne rezerviše opremu. Troškovi i interna pravila kampanje nisu deo javnog odgovora.

## Akcije i računica

Sezonska akcija obuhvata izabrane alate i ceo period najma mora biti u njenom vremenskom prozoru. Kombinaciona akcija dodatno zahteva sve obuhvaćene alate u istom terminu. Administrator zadaje procenat, najveći ukupan popust i ciljni doprinos posle troškova. Limit se deli srazmerno osnovnoj ceni stavki uz zaokruživanje u pare. Najpovoljnija dozvoljena kampanja poredi se sa postojećim tarifama, klubom i preporukom; kampanje se međusobno ne sabiraju i ne dodaju procente na već sniženu cenu.

Primena zahteva poznatu cenu, trajanje i troškove za sve stavke. Minimalni doprinos računa se posle kredita i eventualne nagrade preporučiocu, bez dostave. Nepotpuni troškovi ili neisplativa akcija ostavljaju redovan obračun. Aktiviranje akcije zahteva poznate troškove obuhvaćenih alata. Donja granica tarife ostaje na snazi.

Porudžbina čuva internu kopiju izabrane kampanje i tarifnih pravila. Kasnija promena ili isključivanje kampanje ne menja dogovoreni najam. Pri produženju koristi se sačuvana politika sa svojim prvobitnim vremenskim prozorom i limitom; ako produženi period više ne zadovoljava uslove, obračun koriste sačuvane redovne tarife. Produženje zahteva potvrdu administratora i proveru kapaciteta. Pri potvrdi se ponovo proverava doprinos i čuvaju stvarni troškovi; ručna izmena cene ne može zaobići taj uslov.

## Ponavljanje i analitika

Istorija i sačuvani projekti prvo otvaraju izbor novih datuma, uz obračun po današnjim cenama i proveru trenutne raspoloživosti. Dodavanje zatim vodi u postojeću korpu. Slanje zahteva, potvrđivanje, krediti, klub, firme i privatni pristupni linkovi ostaju postojeći mehanizmi. Podsetnici na korpu i raspoloživost koriste postojeći WhatsApp outbox, njegove saglasnosti, isključenje slanja i odobrene šablone.

Analitika je početno isključena za posetioca. Opcija **Podešavanja analitike** nalazi se ispod footera; izbor se može opozvati u svakom trenutku. Marketinška i analitička saglasnost su zasebne. Tek nakon dozvole nastaje nasumični identifikator sesije browser taba. Ne šalju se telefon, email, ime, tekst pretrage ni URL. Privatne stranice najma i uputstva nisu instrumentirane.

`POST /api/commerce/event` prima samo dozvoljene događaje i površine, ID postojećeg alata i interni ključ ponude. Zahtevi za najam beleže se server-side po jednom nastalom najmu, uključujući zaštitu od duplog slanja. Ponuda se broji kada njena kartica uđe u vidljivi deo ekrana. Događaji se čuvaju do 90 dana, sa čišćenjem pri sledećem analitičkom upisu.

Rezultati prikazuju konverziju poseta i prihvatanje ponuda po sesiji u poslednjih 30 dana, isključivo za uzorak sa saglasnošću. Potvrđivanje zahteva i vrednost završenog plaćenog najma koriste sve porudžbine. Postojeći doprinos obuhvata samo završene najmove sa poznatim troškovima i prikazuje veličinu tog uzorka; nije neto dobit.

## Provere

`npm run typecheck`, `npm run build`, `npm test`. Novi `tests/merchandising.test.mjs` koristi sopstvenu privremenu bazu i produkcioni server. Pokriva nezavisne prekidače, admin, prevode, ponude, cene, kapacitet, granice akcija, troškove, limit, tarife, produženje, privatnost, idempotentnost i filtere. Testovi ne šalju poruke stvarnim kupcima.
