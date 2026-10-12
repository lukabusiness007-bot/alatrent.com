# Korpa, Klub majstora i WhatsApp

Program „Preporuči i zaradi”, uslovi puštanja i računica: [docs/referrals.md](referrals.md). Nova implementacija zamenjuje raniji predlog kredita za obe strane.

## Korišćenje

- Na stranici alata i u korpi bira se datum preuzimanja i trajanje: dugmad 1–7, unos 8–90 dana ili „Ne znam još”. Datum vraćanja i cena za poznato trajanje računaju se automatski; prvi i poslednji dan ulaze u obračun. Zajednički izbor za više alata u korpi otvara se po potrebi.
- „Ne znam još” čuva `openEnded: true` i prazan `end`, bez izmišljene konačne cene (`total: null`). Admin pre potvrde može dogovoriti dnevnu tarifu po komadu; tarifa, pravilo i postojeći članski popust čuvaju se u najmu. Potvrđen/aktivan najam zauzima alat do vraćanja i proverava sve buduće rezervacije. Nema podsetnika za nepostojeći rok niti zahteva za produženje. Admin kod aktivnog najma unosi stvarni datum vraćanja (za sve stavke bez roka u toj porudžbini); sistem obračunava stvarne dane po sačuvanim tarifama, pa se evidentira naplata i završetak. Kredit i kod preporuke zahtevaju poznatu ukupnu cenu.
- `/sr/korpa`: više alata, količine, zajednički ili pojedinačni datumi, dostava jednom po dogovorenoj porudžbini, pregled popusta i kredit. Dodavanje ne napušta katalog. Izbor ostaje u browseru; prijavljenim članovima se čuva i serverska kopija nakon unosa datuma.
- `/sr/klub` i `/sr/nalog`: besplatan nalog sa telefonom i lozinkom, istorija, adresa/firma, sačuvani projekti, ponovno dodavanje prethodnog seta i zahtev za produženje. Kod za oporavak prikazuje se samo posle registracije/oporavka; novi oporavak opoziva sve ranije sesije. Ovo nije OTP prijava: ne zavisi od SMS provajdera. Broj nije dokaz verifikovanog vlasništva i nikada se ne koristi za automatsko otkrivanje starih najmova.
- `/sr/paketi`: tri početna kompleta iz postojećeg kataloga (dvorište, pločice i dubinsko čišćenje). Admin može menjati sastav, procenat i objavljivanje. Proveriti kompatibilnost stvarnih modela pri potvrdi najma.
- Privatni link posle slanja zahteva vodi na detalje, uputstva i produženje. Čuvati ga kao pristupni link. Gost može preko ovog linka povezati svoj najam sa nalogom; samo poklapanje telefona ne daje pristup podacima.
- `/sr/uputstvo/<slug>`: javno uputstvo bez podataka kupca. QR nalepnica preuzima se u adminu nakon podešavanja javnog HTTPS domena.
- Tekstovi korisničkog interfejsa su dostupni na pet postojećih jezika. Uneta uputstva i nazivi paketa su sadržaj administratora; WhatsApp ima jedan eksplicitno podešen jezik odobrenih šablona.

## Admin → Prodaja i klub

Porudžbine, tarife, uputstva/preporuke, paketi, članovi, firme, WhatsApp i rezultati imaju zasebne kartice. Postojeći pojedinačni upiti ostaju sačuvani u starom odeljku. Kapacitet se proverava zajedno za stare potvrđene upite i nove potvrđene/aktivne porudžbine.

Tok: **čeka potvrdu → potvrđeno → oprema preuzeta → završeno**. Pre preuzimanja može se otkazati. Završavanje zahteva ručnu evidenciju plaćanja. Završeni/otkazani najmovi su zaključani. Aktivna oprema kojoj je prošao rok ostaje blokirana za nove rezervacije dok admin ne evidentira vraćanje/završetak ili odobri novi rok. Servisne blokade treba operativno evidentirati kroz raspoloživu količinu.

Potvrda u jednoj SQLite transakciji proverava sve stavke, uključujući preklapanja istog alata unutar iste korpe. Nepoznata količina ili ukupna cena sprečavaju potvrdu. Stavka bez cene ne tretira se kao besplatna. Admin upisuje dogovorenu ukupnu cenu i po potrebi cenu dostave dok je zahtev na čekanju. Različiti termini mogu zahtevati više vožnji: cena dostave u korpi je procena jedne dogovorene isporuke/preuzimanja, a admin je koriguje pre potvrde.

Uputstva moraju odgovarati tačnom modelu. Uneti model, uputstvo, HTTPS link proizvođača i video. Pri preuzimanju se aktuelna uputstva kopiraju u porudžbinu. Nisu izmišljena uputstva za nepoznate modele.

## Obračun

Podrazumevana progresivna tarifa: prva dva dana 100% osnovne dnevne cene; dani 3–5 po 80%; od šestog dana po 70%. Za 50 jedinica/dan, pet dana je 220 jedinica. Valuta sajta je RSD. Najam uključuje prvi i poslednji kalendarski dan; vreme vraćanja je podesivo, početno 17:00, Europe/Belgrade.

Prioritet pravila: alat → kategorija → osnovna tarifa. Alternativne ponude su klupski/partnerski popust, paket, vikend (svi dani petak–nedelja) i mirni dani (svi dani pripadaju izabranom skupu). Bira se najpovoljnija ponuda uz donju granicu, početno 60% osnovne cene. Procenti se ne sabiraju. Za paket se traže svi alati u istom terminu. Kredit je odvojen način umanjenja cene i može se koristiti do podešenog dela najma, početno 20%, bez dostave.

Tarife i iznosi čuvaju se uz stavku. Produženje koristi te tarife, proverava novu raspoloživost i naplaćuje razliku. Zahtev kupca nije automatsko odobrenje. Produženje obuhvata sve stavke do novog zajedničkog roka. Za alat bez utvrđene dnevne tarife potreban je novi dogovoreni upit. Doplata poništava oznaku da je sve plaćeno.

## Klub i firme

Početno: 5% za najmanje tri plaćena, završena najma u poslednjih 365 dana. Admin može podesiti prag, procenat i pojedinačni partnerski popust. Novi program preporuka početno je isključen do unosa troškova: kupcu 10% do 1.000 RSD na prvi lični najam od najmanje 5.000 RSD pre popusta, preporučiocu 500 RSD posle plaćenog završetka, najviše 3 nagrade mesečno. Detalji, pilot i kalkulator su u „Preporuke i računica”. Pre potvrde proveravaju se identitet i doprinos posle stvarnih troškova. Registracija ne verifikuje telefon. Staro podešavanje referralCredit služi isključivo za ranije porudžbine; nove ne nagrađuju kupca dodatnim kreditom.

Kredit se rezerviše pri slanju zahteva i vraća pri otkazivanju. Neaktuelne upite treba otkazati da bi se rezervisani kredit oslobodio.

Admin može napraviti firmu, ugovoriti popust i dodeliti postojeće članove. Član u korpi bira lični ili firmin najam. Samo firmini najmovi su vidljivi sadašnjim članovima te firme. Uklanjanje člana opoziva zajednički pristup; sopstveni najmovi ostaju u njegovoj istoriji. Lični kredit ne koristi se na firminim porudžbinama.

## WhatsApp povezivanje

Potrebni su vaš Meta Business/WhatsApp nalog, poslovni broj, pristupni token i odobreni šabloni. Stvarno slanje je početno isključeno. Bez podešavanja se poruke čuvaju, a admin vidi da povezivanje nedostaje. Ne postoji tvrdnja o isporuci dok je Meta ne potvrdi.

1. U opštim podešavanjima postaviti stvarni HTTPS domen.
2. U `.env.local`/tajne hosting servisa postaviti `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_API_VERSION`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` i nezavisni nasumični `COMMERCE_JOB_SECRET` (najmanje 24 znaka). Verziju Graph API izabrati prema aplikaciji u Meta nalogu, nije tvrdo kodirana. Ne koristiti `NEXT_PUBLIC_` za ove vrednosti.
3. U Meta aplikaciji povezati `https://DOMEN/api/whatsapp/webhook`, verification token i pretplatu na poruke/statuse. POST zahtevi se proveravaju HMAC SHA-256 potpisom nad originalnim telom.
4. Odobriti šablone i uneti njihova imena u adminu. Svaki ima **četiri body text parametra**: `{{1}}` ime, `{{2}}` broj najma/naslov, `{{3}}` detalji, `{{4}}` pun link. Primer tela: „Zdravo {{1}}, obaveštenje za {{2}}: {{3}} Detalji: {{4}}. Za pomoć odgovori na poruku; za odjavu pošalji STOP.” Stvarnu kategoriju i tekst odobrava Meta; marketinški podsetnik na korpu mora imati odgovarajuće odobrenje i posebnu saglasnost.
5. Povezati događaje `received`, `confirmed`, `active`, `reminder`, `extension`, `completed`, `cancelled`, `availability`, `cart`. Upisati tačan odobreni jezik šablona, početno `sr`.
6. Uključiti slanje u adminu i pokrenuti worker uz web server: `npm run commerce:worker`. Za proveru jednog prolaza: `npm run commerce:tick`. U produkciji worker nadzirati istim process managerom kao aplikaciju ili pozivati autentifikovani POST `/api/jobs/commerce` jednom u minutu. Ne izlagati tajnu u URL-u/logovima. Posao radi dok su web server i worker aktivni.
7. Pre puštanja proveriti testnim brojem: zahtev → potvrda → preuzimanje/uputstva → podsetnik → završetak; dostavu webhook statusa i STOP. Troškovi poruka zavise od Meta naloga i kategorija.

Worker atomarno preuzima do 10 poruka, sprečava da ih dva radnika pošalju istovremeno i koristi eksponencijalno čekanje za ograničenje protoka. Nepoznat ishod prekida veze ne ponavlja automatski da ne pošalje duplikat; admin prvo proverava kod provajdera. Zastarele poruke o statusu se preskaču. Nedostajući šablon i neisporučene poruke ostaju vidljivi u adminu. STOP/ODJAVA se proveravaju i pre stvarnog slanja. Dolazne tekstualne poruke prikazane su administratoru; za odgovor treba poslovni WhatsApp inbox ili kontakt sa kupcem.

Podsetnik za vraćanje je dan pre roka. Obaveštenje o raspoloživosti zahteva poseban zahtev prijavljenog kupca; nije rezervacija. Podsetnik na sačuvanu korpu šalje se jednom po sačuvanoj verziji posle 24h i samo prijavljenom članu sa marketinškom saglasnošću, ako u međuvremenu nije poručio. Poruke se ne šalju anonimnim posetiocima. Upit/porudžbina i saglasnost se vremenski beleže.

Zvanične reference: [WhatsApp pravila](https://business.whatsapp.com/policy), [Meta Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/), [Meta webhook potpisi](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/).

## Provera i održavanje

`npm run typecheck`, `npm run build`, `npm test`.

Testovi pokrivaju stare upite i novi sistem: cene, ograničenja popusta, više stavki, konkurentne potvrde, izolaciju naloga, oporavak, produženja, kredite, firme, povezivanje gostujućih najmova, QR, potpis webhooka, opt-out, konkurentne workere i prekide slanja. Testovi za slanje koriste lažni provajder i ne kontaktiraju kupce.

Čuvati redovne rezervne kopije SQLite baze i upload direktorijuma. Linkovi za najam i outbox sadrže poverljive podatke; nisu javni izveštaji. Prikaz prihoda nije neto dobit. Procena doprinosa koristi samo kompletno unete troškove po danu i pripreme. Iskorišćenost poslednjih 30 dana poredi nove porudžbine sa trenutnim količinama, pa je procena, ne istorijski knjigovodstveni obračun flote.

## Plan razvoja Kluba majstora i potrošnog materijala — 10.10.2026.

Cilj kluba: član brže završava posao i ređe gubi vreme na preuzimanje, izbor pribora i dogovaranje. Popust ostaje jedna od pogodnosti, ali nije jedini razlog za članstvo. Članstvo ostaje besplatno.

### Šta je sada na sajtu

- Prijava i registracija imaju zasebnu stranicu naloga. Klub je posebna prezentaciona stranica sa uslovima popusta iz administracije, pregledom pogodnosti, koracima učlanjenja, ponudom za ekipe i čestim pitanjima. Dugme za učlanjenje vodi na `/nalog?mode=register`, a prijava na `/nalog`. Sadržaj kluba postoji na svih pet jezika.
- „Zaboravio sam šifru” nalazi se ispod lozinke. Otvara zaseban prikaz sa povratkom na prijavu, postojećim sigurnosnim kodom i novom lozinkom. Dodati su prikaz/sakrivanje lozinke, potvrda lozinke, stanja slanja i pomoć kada korisnik nema kod. Ovo nije SMS/WhatsApp oporavak; taj servis još nije povezan.
- Postojeće mogućnosti: istorija najma, sačuvani projekti, ponavljanje najma, pregled statusa, zahtev za produženje i timski najmovi nakon administratorskog povezivanja firme. Neke od ovih mogućnosti dostupne su i gostima preko privatnog linka i ne treba ih oglašavati kao isključivo klupske.
- Redovni član po početnom pravilu dobija 5% nakon 3 plaćena i završena najma u poslednjih 12 meseci. Parametri se menjaju u administraciji; popusti se ne sabiraju.
- Dodato je 16 paketa uz postojeća 3, ukupno 19 u početnom katalogu. Novi paketi koriste postojeće alate i početni paket popust 5%. Administratorske izmene postojećih paketa se čuvaju. Broj javno prikazanih paketa zavisi od objavljenih alata/kategorija.
- Paketi imaju filtere, fotografije alata, listu sadržaja, redovnu dnevnu cenu kada je poznata i dodavanje celog kompleta. Konačna cena sa najpovoljnijom tarifom obračunava se u korpi za izabrane datume.
- Liste potrošnog materijala uz pakete služe pripremi posla. Nisu stvarne zalihe, ne dodaju se u porudžbinu i nisu uključene u cenu.

### Predloženi benefiti — poslovni plan, još nisu obećani kupcima

| Prioritet | Benefit | Predlog uslova | Trošak i kontrola | Šta treba uraditi |
|---|---|---|---|---|
| 1 | Brzo preuzimanje pripremljenog kompleta | Član bira termin, najam prethodno potvrđen; komplet pripremljen pre dolaska | Trošak pripreme postoji i sada; ne obećavati preuzimanje za 5 minuta bez merenja | Polja termina, spisak za pripremu, oznaka „spremno”, odgovorna osoba |
| 1 | Pomoć pri izboru alata i pribora | Jedna kratka konsultacija do 10 minuta po poslu, tokom radnog vremena | Meriti utrošene minute; ne obećavati stručni projekat ili nadzor radova | Kratak upit: posao, podloga, površina, iskustvo; odgovor sa konkretnim kompletom |
| 1 | Priprema potrošnog materijala uz alat | Član unapred bira odobrene dodatke; materijal plaća zasebno | Marža na priboru pokriva pripremu; nema automatskog dodavanja | Kompatibilnost, cenovnik, zalihe i izdvajanje robe za preuzimanje |
| 1 | Kratka demonstracija pri preuzimanju | Prema tačnom modelu i uputstvu proizvođača | Uračunati vreme u pripremu | Kontrolna lista i potvrda predaje; osnovnu bezbednosnu obuku pružiti svakom kupcu, ne samo članu |
| 2 | Jedno pomeranje termina bez administrativne naknade | Zahtev najmanje 24 h ranije, nova oprema/datum raspoloživi; razlika cene se plaća | Ne preuzimati trošak već organizovanog transporta | Tok promene datuma, provera zaliha i nova potvrda; ovo nije besplatan dodatni dan |
| 2 | Povrat kasnije istog dana | Jednom u 90 dana za redovne članove, do 2 h i samo unutar radnog vremena; unapred potvrđeno, bez sledeće rezervacije | Beležiti iskorišćen benefit; limit po članu i najmu | Evidencija vremenskih slotova i odobrenja; sadašnji obračun po datumima nije dovoljan |
| 2 | Kredit za preporuku | Raniji predlog 500 RSD oboma zamenjen je programom iz [referrals.md](referrals.md): prvi popust kupcu, kredit preporučiocu | Najviše 20% rental dela sledeće porudžbine; bez isplate u novcu | Postojeći mehanizam kredita nadograditi mesečnim limitom i proverom zloupotrebe pre aktiviranja |
| 2 | Klupski kredit za dostavu | Test 500 RSD, jednom mesečno, za najam od najmanje 10.000 RSD unutar određene zone | Subvencija najviše 5% tog praga; express nije uključen | Posebna vrsta kredita za dostavu, zona i limit; postojeći rental kredit se ne koristi za to |
| 3 | Rani pristup sezonskim terminima | Članovi prvi dobijaju poziv da rezervišu novu opremu; nema preskakanja već potvrđenih rezervacija | Nizak direktni trošak; traži zasebnu marketinšku saglasnost | Evidencija saglasnosti i raspoloživosti, kampanja kroz odobren kanal |
| 3 | Pogodnosti za ekipu | Povezani članovi, dogovoreno preuzimanje, zajednički projekti, mesečni pregled potrošnje | Individualni dogovor prema obimu i urednosti vraćanja | Postojeći timski najmovi + uloge članova i pregled; odloženo plaćanje samo nakon zasebnog dogovora |

Predlog početnog paketa: brzo preuzimanje + pomoć pri izboru + unapred pripremljen pribor. Za redovne članove kasnije dodati fleksibilnije pomeranje termina i mali kredit za preporuku. Za partnere ponuditi timske pogodnosti i dogovorenu dostavu. Ne uvoditi dodatne nivoe članstva dok ne prikupimo bar 60–90 dana podataka.

Benefiti koji stvaraju trošak ne uključuju se automatski ovim planom. Ne obećavati neograničenu besplatnu dostavu, stalno besplatan dan najma, preskakanje potvrđenih rezervacija ili sabiranje svih popusta.

### Potrošni materijal: preporuka je da, uz mali početni asortiman

Kupac uz alat može odmah da dobije ono što mu treba za rad. Sličan model koristi [HSS sa prodajom diskova, listova i brusnog pribora](https://www.hss.com/buy/c/power-tool-accessories). [Hilti nudi upravljanje i dopunu potrošnog pribora](https://www.hilti.com/content/resources/purchasing-and-logistics/local/tools-on-demand). To potvrđuje obrazac ponude, ali ne dokazuje našu buduću maržu; nju moramo proveriti nabavnim cenama i prodajom.

Početak: 10–15 konkretnih artikala koji odgovaraju najčešće iznajmljivanim modelima, umesto široke prodavnice građevinskog materijala.

| Posao / alat | Prvi dodaci za pilot | Obavezna provera |
|---|---|---|
| Brušenje zidova | Brusni diskovi u 2–3 granulacije | Prečnik, raspored otvora, prihvat, materijal |
| Dubinsko pranje | Odmereno kompatibilno sredstvo, mikrofiber | Dozvoljeno sredstvo za mašinu i površinu; doziranje proizvođača |
| Krečenje | Krep traka, zaštitna folija | Podloga i namena trake; boju ne uvoditi u početku |
| Keramika | Krstići/klipse, sunđeri; diskovi tek po proveri | Prečnik, otvor, broj obrtaja i vrsta keramike |
| Košenje i trimer | Struna, vreće za otpad | Dozvoljena debljina strune i tip glave |
| Sečenje i šrafljenje | Odgovarajući listovi, bitovi, male kutije vijaka | Materijal, prihvat, dimenzije; ne tvrditi da sve odgovara svim alatima |

Zaštitne rukavice, naočare i drugi artikli mogu biti dodatna ponuda kada postoje odgovarajući proizvodi i specifikacije; obavezna zaštita i bezbednosna uputstva moraju biti jasni svima. Gorivo, gas, široku paletu hemije i velike zalihe boja/lepka odložiti zbog skladištenja, logistike i velikog broja varijanti.

Tok na sajtu: alat/paket → najviše 3 relevantna dodatka → korisnik bira količinu → odvojene stavke „Najam” i „Materijal za kupovinu” u korpi. Ništa nije unapred čekirano. Materijal se plaća po komadu/pakovanju i nikada se ne množi brojem dana najma. Produženje najma ne povećava količinu materijala. Rental popust i kredit ne važe za potrošni materijal osim ako postoji zasebno, izričito pravilo.

Model podataka za implementaciju: SKU, naziv, jedinica prodaje, stanje zaliha, nabavna cena, prodajna cena, kompatibilni modeli, varijante, objavljeno. Prodajna stavka mora imati sopstveni tip, količinu i zamrznutu cenu u porudžbini; ne modelirati je kao alat sa dnevnim najmom. Pri potvrdi rezervisati zalihe, pri otkazivanju osloboditi rezervisanu robu, pri preuzimanju evidentirati izdavanje; ponovljeni zahtev ne sme dvaput skinuti zalihe. Povrat i reklamacija materijala obrađuju se odvojeno od vraćanja alata.

Ilustrativni račun, na istoj poreskoj osnovi: nabavka pakovanja 300 RSD, prodaja 500 RSD → razlika 200 RSD, bruto marža 40% pre pakovanja, kartičnih naknada i ostalih troškova. Ako priprema košta 30 RSD, ostaje 170 RSD pre ostalih troškova. Ako 30 od 100 najmova kupi jedno pakovanje, to je 5.100 RSD dodatnog doprinosa u tom primeru. To je scenario za planiranje, ne prognoza. Popust od 10% na materijal smanjuje prodajnu cenu na 450 RSD i isti doprinos na 120 RSD; zato klubu prvo ponuditi pripremljen pribor i pogodnost, ne automatski još jedan popust.

### Redosled uvođenja i kriterijumi

1. Sada: novi izgled naloga, 19 paketa i liste potrebnog pribora. Pregledati pakete prema stvarnim modelima, zalihama i sposobnosti usluge. Za neodgovarajuće komplete isključiti objavu u administraciji.
2. Pilot 2–4 nedelje: operativno uvesti termine preuzimanja i konsultacije; odabrati 10–15 SKU artikala, dobiti nabavne cene, prodajne cene i kompatibilnost. Listu predloga na sajtu zameniti stvarnom prodajom tek nakon unosa tih podataka i testiranja korpe/zaliha.
3. Posle pilot perioda: aktivirati ograničene preporuke, promenu termina i eventualni kredit za dostavu ako dodatni doprinos pokriva trošak. Za oporavak naloga povezati proveren SMS/WhatsApp authentication servis: kratkotrajan jednokratni kod, generički odgovor bez otkrivanja postojanja naloga, limit pokušaja i rotacija sesija.
4. Posle 60–90 dana: porediti ponovne najmove, prosečan broj alata po porudžbini, udeo najmova sa materijalom, doprinos posle benefita, vreme pripreme, kašnjenja i otpis zaliha. Širiti samo artikle i benefite sa pozitivnim doprinosom ili merljivim smanjenjem vremena usluge.

Vlasnik bira uslove i budžet; operativa vodi pripremu i izdavanje; razvoj implementira evidenciju i obračun. Za start su potrebni stvarni modeli i kompatibilan pribor, nabavne cene, radno vreme i zona dostave. Plan je spreman za te podatke, bez objavljivanja neproverenih zaliha ili obećanja.
