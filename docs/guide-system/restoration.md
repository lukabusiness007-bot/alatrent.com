# Obnova plana i reda — 25. oktobar 2026.

Projekat je vraćen sa GitHuba u `/Users/luka/Desktop/rent tools`. Plan, dnevni prompt, postupak objave, urednička pravila, mapa ključnih reči, red i pet JSON šablona vraćeni su iz sačuvane istorije ovog razgovora. Tekst iz istorije korišćen je kao podatak, bez pokretanja starih shell komandi.

## Šta je vraćeno

- Glavni detaljni plan i njegove naknadne izmene publikacionog režima.
- Poslednji sačuvani dnevni prompt, sa novom putanjom i ispravljenom pretpostavkom da piloti još nisu objavljeni.
- Postupak objave i beleške o postojećem GitHub → Vercel toku.
- Urednička pravila: raspoloživi originalni tekst i rekonstruisan završetak, uz prag 90/100, nula tvrdih grešaka, odvojenu ljudsku recenziju i stvarnu javnu proveru.
- 34 stabilna ID-a. Potpuno vraćeno 32 zapisa backlog-a; G019/G021 delimično rekonstruisani i ostavljeni u `hold/deferred`. Originalni agregirani metapodaci istraživanja nisu u celini sačuvani.
- 21 potvrđen javni vodič, tri `pending_research` teme i deset odloženih tema. Objavljenim vodičima očuvani su stvarni datumi iz javnog manifesta.

## Javna provera

Svih 21 vodiča ponovo je provereno: HTTP 200, očekivani naslov, jedan H1, canonical, dozvoljeno indeksiranje, sitemap i link sa huba. Izveštaj je [live-verification.json](../../research/guide-system-recovery/2026-10-25/live-verification.json). Prvi pokušaj provere huba koristio je završnu kosu crtu; Python biblioteka nije pratila HTTP 308. Ponovljena provera koristi kanonsku putanju `/sr/saveti` i prolazi. To nije bio nestanak vodiča.

## Granice oporavka

Stari `brief/research/article/review/publication` paketi, snimci ekrana i kompletna dnevna evidencija nisu vraćeni kao originalni fajlovi. Ne postoji osnova da se zbog toga regeneriše već objavljen tekst. Javni sadržaj je očuvan u `lib/published-rental-guides.json`; red čuva ranije uočene putanje u `recovery.previousDraftDirectory`, a aktivni `draftDirectory` ostaje `null` dok novi paket stvarno ne postoji.

Obnova nije nova serija vodiča i ne zauzima `research/guide-drafts/2026-10-25/run.json`. Ne popunjava propuštene dane. Ne izmišlja stare rezultate recenzije, ljudsko odobrenje ili broj pokušaja kada podatak nije sačuvan.

Google indeks nije proveren i nisu poslati novi zahtevi za indeksiranje. Prethodna prihvatanja zahteva ne smeju se ponavljati ili pretvarati u tvrdnju `indexed` bez stvarne provere. Ranije odbijeni pristup prijavljenom Chrome profilu se ne zaobilazi.

## Sledeće pokretanje

Raspored ostaje svakog dana u 08:00 Europe/Belgrade, u istom razgovoru. Prvi shell poziv koristi izričit `workdir` nove putanje. Proveriti aktuelni udaljeni commit, stanje reda i javni manifest; tek zatim zaključati red, istražiti opravdane teme i pratiti `daily-prompt.md` i `publishing.md`. Ako zavisnosti nisu instalirane posle kloniranja, pripremiti ih prema lockfile-u pre provera aplikacije. Obnova dokumentacije ne zahteva produkcionu bazu ili nove API ključeve.

Raspored je ažuriran i pročitan iz sačuvane konfiguracije: ista automatizacija `alat-rent-tri-vodi-a-dnevno`, ista konverzacija, status ACTIVE i 08:00 Europe/Belgrade; promenjeni su putanja i zastarele pretpostavke o pilotima.
