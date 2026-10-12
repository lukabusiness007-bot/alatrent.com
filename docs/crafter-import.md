# Crafter katalog — 12. oktobar 2026.

Korisnik je odobrio import i SEO optimizaciju svih 1.813 modela označenih kao `included` u istraživanju. Ukupan početni katalog ima 1.997 stavki u 11 kategorija: prethodne 184 stavke i novih 1.813 modela. Potrošni materijal, pribor i 114 graničnih stavki za dodatni pregled nisu deo importa.

## Cena najma

Za kompletne modele osnovica je redovna prodajna cena u RSD sa Craftera. Formula je progresivna: prvih 15.000 RSD deli se sa 15, narednih 45.000 sa 30, a deo preko 60.000 sa 60. Rezultat se zaokružuje na najbližih 100 RSD, sa minimumom od 500 RSD dnevno. Na primer, osnovica od 8.250 RSD daje cenu najma od 600 RSD dnevno.

Ukupno 1.473 modela ima izračunatu cenu. Za 340 modela označenih kao Solo ili bez baterije/punjača cena je na upit dok se ne potvrdi komplet. Količina i depozit ostaju nepoznati; dostupnost dobavljača nije naš lager. Prodajne ponude se u administraciji vode odvojeno od cena rente.

## Import i izmene

`scripts/prepare-crafter-import.py` generiše podatke iz `research/crafter-2026-10-12/products-review.json`. Identitet modela je Crafter product ID, tako da se različiti modeli iste vrste alata ne spajaju. Jednokratna migracija `crafter-models-2026-10-12-v1` čuva postojeće stavke i izmene u administraciji. Ne vraća obrisane modele pri ponovnom pokretanju.

Svaki model čuva izvornu adresu, šifru, kupovnu i redovnu cenu, datum posmatranja i podatak o nepotpunom kompletu. Fotografije koriste javne adrese Craftera i zavise od njihove dostupnosti.

## SEO

Modeli imaju zasebne adrese, naslove, opise, H1, breadcrumbs i strukturirane podatke za uslugu najma. Katalog prikazuje 24 stavke po stranici, sa dostupnim linkovima ka narednim stranicama i zasebnim canonical adresama. Filtrirane i sortirane stranice ostaju `noindex`. Sitemap obuhvata javne proizvode i kategorije na pet jezika; cene nisu označene kao potvrđene ponude niti je izmišljen lager.

Javni domen se podešava kroz `settings.siteUrl` odnosno `SITE_URL`. Bez važećeg javnog HTTPS domena aplikacija ostaje `noindex`.

Pre produkcionog importa sačuvan je lokalni backup prethodnog kataloga i podešavanja u ignorisanom `output/crafter-import/live-before.json`. Backup nije deo Git repozitorijuma.
