# Automatski mejlovi

Amazon SES u `eu-north-1` šalje transakcione poruke sa `Alat Rent <noreply@alatrent.rs>`. Odgovori odlaze na server-only `SES_REPLY_TO`, podrazumevano postojeću kontaktnu adresu `office@alatrenta.rs`.

## Kada se šalju

- Kontakt forma na `/sr/kontakt` i ostala četiri jezika: potvrda da je upit sačuvan. Upit, email i poruka dostupni su u adminu pod **Prodaja i klub → Obaveštenja → Kontakt upiti**.
- Nova registracija preko stranice naloga ili klupskog prozora: dobrodošlica sa popustom i uslovom za najam bez depozita iz aktivnih postavki članstva. Lozinka, kod oporavka i privatni pristupni tokeni ne ulaze u email.
- Zahtev iz korpe ili pojedinačni zahtev za najam sa emailom: potvrda prijema zahteva, uz jasno objašnjenje da dostupnost i najam još čekaju potvrdu.

Šabloni su prevedeni na `sr`, `en`, `ru`, `tr` i `zh`; koriste postojeći Alat Rent znak, Google Sans uz fallback za email klijente, ugalj, limetu, mint i svetlu pozadinu. Šalju se i HTML i obična tekstualna verzija. Proizvoljna poruka iz kontakt forme ne reflektuje se u automatski odgovor. Nisu uvedene marketinške kampanje.

## Trajan red za slanje

`lib/email/queue.ts` upisuje poruku u `emails` u istoj transakciji kao upit ili nalog. `withEmailDelivery` obavija spoljašnji database handler: Next.js `after()` poziva slanje tek nakon što PostgreSQL potvrdi upis. Svako preuzimanje reda i potvrda ishoda koriste zasebnu kratku transakciju; poziv SES-u ne drži aplikacioni DB lock.

Kontakt forma koristi UUID koji ostaje isti pri ponovnom pokušaju. Korpa koristi postojeći idempotency mehanizam, a klupska poruka ima jedinstveni ključ po korisniku. Paralelni procesi atomski preuzimaju najviše tri poruke po pozivu. SES SDK ima jedan pokušaj po pozivu, kako mrežni prekid ne bi automatski poslao duplikat.

Privremena SES odbijanja mogu se ponoviti do četiri pokušaja, sa odlaganjem. Definitivna odbijanja ostaju zabeležena. Kod prekida veze ili izgubljene potvrde ishod postaje `unknown` i ne ponavlja se automatski; proveriti SES pre odluke o novom slanju. `sent` znači da je SES prihvatio poruku i vratio Message ID, ne da je isporučena ili pročitana.

Admin **Prodaja i klub → Obaveštenja** prikazuje poslednjih 100 poruka i omogućava obradu čekajućeg reda. `/api/admin/emails` zahteva admin sesiju i isti origin. `/api/jobs/email` prihvata isključivo `Authorization: Bearer ...` sa `CRON_SECRET` ili postojećim `COMMERCE_JOB_SECRET`. Vercel dnevni cron u 07:00 UTC obrađuje eventualno zaostale poruke; nove poruke se obrađuju odmah nakon slanja forme, a sledeći uspešan API zahtev takođe može obraditi dospeli red.

## AWS pristup

Vercel koristi kratkotrajne OIDC kredencijale preko `@vercel/oidc-aws-credentials-provider`, bez trajnih AWS ključeva. `config/aws/alat-rent-ses-trust.json` ograničava preuzimanje role isključivo na produkciju projekta `alatrent-com` u timu `luka-drugi-nalog-s-projects`. `config/aws/alat-rent-ses-permissions.json` dozvoljava samo `ses:SendEmail`, samo SES identitet `alatrent.rs` u postojećem AWS nalogu i samo pošiljaoca `noreply@alatrent.rs`.

Produkcija zahteva `SES_ENABLED=true`, `SES_REGION=eu-north-1`, `SES_ROLE_ARN` i `CRON_SECRET` u Vercel environment podešavanjima. Nijedna vrednost ne koristi `NEXT_PUBLIC`. Dok pristup nije podešen, forme čuvaju upite i mejlove u redu bez pokušaja slanja. Stari upiti i stari članovi se ne šalju retroaktivno.

## Provera i pregled

`node scripts/preview-emails.mjs` generiše tri HTML i tekstualna primera u ignorisanom `output/email-preview/` direktorijumu. `node --test tests/email.test.mjs` koristi privremenu SQLite bazu i isključuje SES; proverava validaciju, CSRF, admin zaštitu, lokalizaciju, upis reda, paralelne radnike, ponovne pokušaje i izbegavanje duplikata. Pre integracionih testova pokrenuti produkcioni build. Ako je port 3012 zauzet lokalnim preview-om, za ceo paket koristiti `TEST_COMMERCE_PORT=3030 npm test`.
