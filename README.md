# Osterøykroa 2.0

Utviklingskopi av osterøykroa.no. Her byggjer me nettbestilling av
Osterøyburger-meny, og seinare arrangementsdelen.

Den live sida held fram som før og blir ikkje påverka av noko som skjer her.

## Korleis dette heng saman

Dette er **same git-repo** som produksjonssida, berre ein annan mappe og ein
annan gren. Det er med vilje: ei frakopla kopi ville drive frå kvarandre, og
alt måtte flyttast manuelt til slutt.

| | Mappe | Gren | Går til |
|---|---|---|---|
| Produksjon | `Web/Osterøykroa` | `main` | osterøykroa.no |
| Utvikling | `Web/Osterøykroa 2.0` | `v2` | preview-URL på pages.dev |

Begge mappene peikar på `git@github.com:wdts2t5fy5-coder/osteroykroa.no.git`.

### Hente rettingar frå den live sida inn hit

Gjer du ei hasteretting på produksjon, hentar du henne inn i 2.0 slik:

    git fetch origin
    git merge origin/main

### Sende 2.0 ut i produksjon, når den tida kjem

    git checkout main
    git merge v2
    git push origin main

## Testdomenet

Cloudflare Pages lagar automatisk ei preview-utrulling for kvar gren som
blir pusha. Grenen `v2` hamnar på `v2.osteroykroa-no.pages.dev`.

Cloudflare set `X-Robots-Tag: noindex` på alle preview-utrullingar av seg
sjølv, så Google indekserer dei ikkje og den ekte sida får ikkje
duplikatinnhald. Det kan stadfestast med:

    curl -I https://v2.osteroykroa-no.pages.dev | grep -i x-robots-tag

URL-en er likevel open for den som kjenner han. Skal han vere verkeleg
lukka, slå på **Settings → General → Enable access policy** i Pages-
prosjektet. Då krevst innlogging med Cloudflare-kontoen.

## Testmerket

`js/main.js` legg ei blå stripe øvst på alle sider som **ikkje** køyrer på
det ekte domenet, med teksten «TESTVERSJON». Han ser på vertsnamnet, ikkje
på grenen, og slår difor aldri ut i produksjon. Han treng ikkje fjernast før
samanslåing.

## Nettbestilling

Sjå `bestill/`.

- `slots.js` — lukelogikken. Rein funksjon, ingen nettverkskall.
- `slots.test.html` — 20 testar. Opne i nettlesar; alle skal vere grøne.

Reglane for hentetider:

- To luker per time, heil og halv.
- Éi ordre fyller heile luka.
- Minst 15 minutt frå bestilling til henting. Kl. 13:15 er siste minutt ein
  kan velje 13:30; kl. 13:16 er neste ledige 14:00.
- Passerte luker fell ut av lista etter kvart som dagen går.
- Siste luka ligg 30 minutt før stengjetid. **Dette er ei antaking** — må
  stadfestast med Roy.

### Uavklart

- Kor mange burgarar kan éi ordre innehalde?
- Skal siste henting vere 30 minutt før stengjetid, eller nærare?
- Vipps-bedriftsavtale må vere på plass før betaling kan testast.

## Køyre lokalt

    python3 -m http.server 8790

Merk at den lokale filtenaren ikkje kan reine adresser utan `.html`, slik
Cloudflare Pages kan. Lokalt må du skrive `/kontakt.html`, ikkje `/kontakt`.
