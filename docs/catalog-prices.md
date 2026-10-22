# Cene alata

Vlasnikov cenovnik od 23. oktobra 2026. nalazi se u `lib/catalog-prices.json`: 186 dnevnih cena i dva alata na upit. Iznosi u EUR i RSD preneti su zasebno iz dostavljenog CSV fajla. Ne preračunavaju se po pretpostavljenom kursu.

`Tool.priceEur` određuje javnu dnevnu cenu i pregled tarifa u evrima. `Tool.price` ostaje dinarska dnevna cena koju server koristi za upite, korpu, ugovaranje, popuste i naplatu. Dostava, depozit i konačni obračun prikazuju se u RSD. Napomena o dinarskoj naplati postoji na svih pet jezika.

Pri prvom pokretanju nove verzije migracija primenjuje cenovnik na postojeće alate u lokalnoj ili PostgreSQL bazi. Ista inicijalizacija važi i za nov katalog. Ne menja zalihe, fotografije, vidljivost ili prethodno ugovorene cene i ne vraća obrisane alate. Nakon prvog uvoza izmene iz admina ostaju sačuvane pri restartu.

U adminu se cene za prikaz (EUR) i naplatu (RSD) unose odvojeno. Prazna dinarska cena znači „Cena na upit”. Ako stariji API klijent promeni dinarsku cenu bez slanja EUR cene, stara EUR cena se uklanja kako ne bi ostala prikazana uz novi iznos za naplatu.
