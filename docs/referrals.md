# Preporuči i zaradi — implementacija i računica

Status, 10.10.2026: funkcionalnost je implementirana. Program na stvarnim podacima ostaje isključen jer vlasnik još nema procene troškova. Nisu upisani izmišljeni troškovi, slati pozivi članovima niti aktivirana javna promocija. U pregledanoj lokalnoj bazi: 72 objavljena alata, dnevne cene 500–5.000 RSD, 0 alata sa oba troška, 0 članova i 0 završenih najmova. Ovo nije analiza eventualne druge produkcione baze.

## Uslovi

- Novi kupac: 10% na prvi lični najam, do 1.000 RSD; minimum 5.000 RSD po osnovnom cenovniku pre popusta, bez dostave.
- Preporučilac: 500 RSD kredita tek posle plaćenog i završenog najma; najviše 3 nagrade u kalendarskom mesecu, Europe/Belgrade, po redosledu završetka. Otkazivanje nema nagradu. Prekoračenje limita ne oduzima kupcu već odobren popust.
- Kredit: postojeći limit, početno do 20% najma posle izabrane tarife; ne za firmin najam, dostavu, materijal ili isplatu u novcu. Negativan saldo posle poništavanja već potrošene nagrade ne može se koristiti kao negativno plaćanje.
- Popusti se porede po stavci. Tarifa za trajanje, paket, klub, vikend i preporuka ne sabiraju se. Najbolja tarifa pobeđuje, uz postojeću donju granicu. Kredit je poseban način umanjenja plaćanja.
- Nagrada može nastati i kada bolji paket/trajanje pobedi kod; kod tada ne pravi dodatnu uštedu. Ukupni plafon preporuke važi za celu porudžbinu, uključujući produženje, ne zasebno po stavci ili produženju.
- Korisnik može ručno uneti ili ukloniti kod u korpi, kao i prilikom registracije. Link `/<locale>/klub?ref=KOD` čuva ga u localStorage do 30 dana. Registraciona atribucija takođe ističe za 30 dana. Izričito prazan kod znači nastavak bez preporuke.
- Kod se zaključava uz zahtev. Otkazani zahtev oslobađa pravo; postojeći neotkazani zahtevi i prethodni najmovi po nalogu ili normalizovanom telefonu sprečavaju drugo korišćenje. Proveravaju se i stari pojedinačni upiti.
- Telefon nije verifikovan registracijom. Admin zato mora potvrditi proveru identiteta i istorije pre odobravanja; ovo nije tvrdnja da softver može prepoznati istu osobu sa drugim brojem.
- Član dobija zbirne podatke; tuđi kontakt podaci, adrese i porudžbine mu nisu dostupni.

## Da li možemo dati popust?

**Uslovno da, ali stvarna isplativost još nije dokazana.** Nemamo trošak habanja, servisa, čišćenja, rada i pripreme. Postojeći cenovnik nije dokaz marže. Ne treba procente automatski uključiti za sve alate samo zato što je popust ograničen.

Konzervativno računamo punu nominalnu nagradu od 500 RSD kao obavezu, bez pretpostavke da će deo kredita propasti. Ciljni doprinos je početno 20% naplaćenog rental dela, posle direktnih troškova i rezervisane nagrade. To je poslovna postavka, ne univerzalno dobra marža ili neto dobit.

Formula:

`naplaćeni najam = cena posle najpovoljnije tarife − iskorišćeni kredit`

`doprinos = naplaćeni najam − troškovi najma − rezervisana nagrada`

`najveći dozvoljeni troškovi = naplaćeni najam × (1 − ciljni procenat/100) − rezervisana nagrada`

Sledeći scenariji su bez drugih boljih tarifa i bez dostave/materijala. Svi iznosi moraju biti na istoj poreskoj osnovi. Troškovni plafon obuhvata sve količine i sve dane najma.

| Osnovni najam | Popust | Naplaćeno bez kredita kupca | Nagrada | Najveći troškovi za cilj 20% |
|---:|---:|---:|---:|---:|
| 5.000 | 500 | 4.500 | 500 | 3.100 |
| 10.000 | 1.000 | 9.000 | 500 | 6.700 |
| 20.000 | 1.000 | 19.000 | 500 | 14.700 |
| 5.000, uz 5% umesto 10% | 250 | 4.750 | 500 | 3.300 |
| 5.000, uz 10% i 900 kredita | 500 | 3.600 | 500 | 2.380 |

Na najmu od 5.000 RSD pogodnosti nominalno iznose 1.000 RSD (20% osnovne cene) bez dodatnog kredita kupca. Ako troškovi iznose hipotetičkih 2.500 RSD, doprinos je 1.500 RSD; ako su 3.500 RSD, doprinos je samo 500 RSD i ne ispunjava cilj 20% naplaćenih 4.500 RSD. Ovi troškovi su isključivo ilustracija i nisu sačuvani kao stvarni podaci.

Smanjenje popusta na 5% oslobađa samo 200 RSD dodatnog dozvoljenog troška na minimalnom najmu pri istom cilju. Ako troškovi prelaze i 3.300 RSD, treba promeniti minimalan najam, nagradu ili cenovnik, a ne samo smanjiti procenat. Višednevni najam često već ima bolju tarifu; i tada dodatnih 500 RSD nagrade mora biti pokriveno.

Ne sabirati dva izveštaja koji istovremeno rezervišu nagradu pri preporuci i odbijaju iskorišćeni kredit u kasnijem najmu: to dvaput računa isti nominalni trošak. Kalkulator i provera pojedinačnog najma služe konzervativnom odobravanju; nisu zamena za knjigovodstveni bilans. Povraćaj novca za najam evidentira se zasebno od poništavanja nagrade.

## Administracija i puštanje pilota

1. `Prodaja i klub → Uputstva i preporuke`: uneti trošak po danu i pripreme za svaki objavljeni alat sa cenom. Prazno znači nepoznato; nula je dozvoljena samo ako je trošak stvarno nula. U dnevni trošak uključiti procenu servisa, habanja i rada; u pripremu čišćenje/predaju.
2. `Preporuke i računica`: proveriti scenario bez popusta, sa programom, sa 5% i sa maksimalnim iskorišćenjem kredita. Uslovi su podesivi. Kalkulator prikazuje doprinos i najveće dozvoljene troškove; nepoznati troškovi ne prikazuju se kao nula.
3. Izabrati 10–20 stvarnih članova u listi pilota i postaviti kraj za 30 dana. Prazna lista znači svi; prazan kraj znači bez vremenskog roka. Aktivirati tek posle unosa troškova. Ovaj rad ne stvara testne članove u pravoj bazi niti samostalno šalje WhatsApp poruke.
4. Pri potvrdi svakog preporučenog najma proveriti identitet. Server proverava stvarne cene, troškove, kredit, nagradu i minimalni doprinos. Neisplativa ponuda ne može se potvrditi. Dogovorenu cenu menjati samo uz dogovor sa kupcem; ne podizati je automatski.
5. I sledeći najam koji troši kredit mora imati troškove i zadati doprinos. Cena i troškovi se čuvaju uz odobrenu porudžbinu; naknadna izmena kataloga ne menja raniju računicu. Produženje ponovo prolazi proveru, uz istu tarifu, plafon i nagradu.
6. Pratiti završene preporuke, dodatni popust, kredit, procenu doprinosa i opšte ponovne dolaske u kartici Rezultati. Meriti i operativno vreme; program proširiti tek kad doprinos pokrije stvarne troškove.

Kod se može pauzirati. Pauza ili istek pilota sprečavaju nove preporuke; već prihvaćeni zahtevi zadržavaju svoje uslove. Nagrade preko mesečnog limita ne prenose se automatski u sledeći mesec. Povraćaj ili zloupotreba: izabrati dodeljenu nagradu, uneti razlog i poništiti je; ledger ostaje, ponavljanje radnje ne skida saldo ponovo i ne oslobađa mesečni limit.

## Tehničke osobine i provera

Postojeći kodovi i salda nisu promenjeni. Nova registracija dobija jedinstven `MAJSTOR-…` kod. Stari završeni događaji ne dobijaju retroaktivnu nagradu. Stare porudžbine bez verzije programa zadržavaju prethodni tok nagrađivanja; nove nose `referralVersion: 2` i ne daju kupcu dodatni kredit.

Slanje zahteva, rezervacija kredita, prva preporuka, dodela i poništavanje nagrade izvršavaju se u SQLite transakcijama. Jedan ledger ključ po porudžbini sprečava duplu dodelu. Pravila i atribucija su sačuvani uz porudžbinu. Troškovi se uklanjaju iz javnih odgovora; admin dobija zaseban izveštaj. Deljenje preko WhatsApp-a otvara korisnikov sastavljač poruke, ne šalje je samo.

Provera: `npm run typecheck`, `npm run build`, `npm test`. Testovi koriste odvojene privremene baze; ne menjaju pravu bazu niti kontaktiraju kupce. Dodatna provera u pregledaču pokriva karticu člana, kod iz linka, registraciju, korpu i administratora na desktop i mobilnom prikazu.

Završna provera: 37/37 integracionih i regresionih testova prolazi. Build i TypeScript provera prolaze. U browseru: link → automatski kod u registraciji → prijavljen kupac → korpa 5.000/4.500 RSD → uspešno slanje zahteva. Desktop i mobilni prikaz provereni; screenshotovi su u `output/playwright/referral-*.png`. Stvarna baza ostala je bez testnih članova i porudžbina, sa neaktivnim programom.
