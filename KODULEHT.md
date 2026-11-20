# E-Service AS koduleht

Päris töötav koduleht, mis on ehitatud artefakti „E-Service AS koduleht · prototüüp“ põhjal.
Kujundus, tekstid, päringuvormi harud ja suunamisreeglid on prototüübist üle võetud.
Prototüübi brauserisimulatsioonid on asendatud päris serveri, andmebaasi ja e-postiga.

## Käivitamine

```
npm install
cp .env.example .env     # täida vähemalt ADMIN_PASSWORD, PUBLIC_URL ja SMTP_*
npm start                # http://localhost:3000
npm test                 # testid
npm run lint
```

Vaja on Node.js 22.9 või uuemat. Andmebaas on Node'i sisseehitatud SQLite (`node:sqlite`), eraldi andmebaasiserverit pole vaja.

## Mis on prototüübiga võrreldes päriselt olemas

| Prototüübis | Nüüd |
|---|---|
| `#teenus-…` aadressid ühel lehel | Päris URL-id (`/teenused/elektritood`, `/paring/abi` jne), serveris renderdatud. Otsingumootorid näevad sisu, lisatud on sitemap.xml, robots.txt, canonical ja schema.org. Vanad `#`-lingid suunatakse ümber. |
| Päringud ainult brauseri localStorage'is | Päringud salvestatakse andmebaasi (`DATA_DIR/eservice.db`), failid kausta `DATA_DIR/uploads/`. |
| E-posti kanal ühendamata | Päring saadetakse SMTP kaudu otsustustabeli järgi õigele inimesele koos failidega ja koopiatega. Kliendile läheb kinnituskiri. Kui kiri ei lähe, päring ei kao: halduses on „Saada teavitus uuesti“. |
| Suunamine brauseris | Server arvutab saaja ise uuesti; kliendilt tulnud saajat ei usaldata. Vormi kontroll on sama mõlemal pool (`site/data.js`). |
| Haldus ilma sisselogimiseta, kasutaja valik rippmenüüst | Sisselogimine (parool, sessioon, CSRF-kaitse, katsete piirang). Rollid: administraator, teenuse omanik, keeletoimetaja. |
| Teenuslehtede töövoog simuleeritud | Sama töövoog päriselt: omanik muudab → keelekontroll → avaldamine. Avalik leht näitab ainult avaldatud versiooni. Meeldetuletused ja eskalatsioonid saadetakse e-postiga (kord tunnis kontroll, sama teavitus ei lähe topelt). |
| Testpaneel | Halduses: päringute nimekiri ja staatus, otsustustabel, vormi statistika (ilma isikuandmeteta), teavitused, muudatuste logi. |

Lisaks: rämpspäringute kaitse (peidetud väli ja IP-põhine piirang), failitüüpide ja -suuruste piirang (5 faili, igaüks kuni 10 MB),
turvapäised (CSP jne), päringute automaatne kustutamine pärast säilitusaega (vaikimisi 24 kuud, muudetav seadetes) ja privaatsusleht.

## Haldus

Aadress `/haldus`. Esimene kasutaja on `admin`; parool tuleb `ADMIN_PASSWORD`-ist või genereeritakse ja trükitakse käivitamisel konsooli.
Teistele kasutajatele (teenuste omanikud, keeletoimetaja) määrab parooli administraator lehel **Seaded → Kasutajad**.

- Administraator näeb kõiki päringuid. Teised kasutajad näevad päringuid, mille saaja või koopia saaja on nende e-posti aadress.
- Päringu kustutamine on ainult administraatoril.

## Enne avalikustamist tuleb ettevõttes kinnitada

Need andmed on prototüübist ja olid seal märgitud **pakutuks**:

1. **Päringute saajad ja suunamisreeglid** (`RECIPIENTS` ja `FLOW` failis `site/data.js`): kas õiged inimesed ja aadressid (nt `solar@`, `autolaadijad@` on olemas?).
2. **„Sageli tellitakse koos“** seosed (muudetavad halduses teenuse lehel).
3. **Kontaktisikud, telefonid ja numbrid** (150+ töötajat, 350+ objekti, 15 mln € käive).
4. **Privaatsustingimuste** tekst lehel `/privaatsus` (`site/render.js`, `pagePrivacy`) peaks üle vaatama andmekaitse eest vastutaja.
5. **Klientide logode loetelu** (avaleht ja „Tehtud tööd“): kas nimesid tohib avalikult kasutada.

## Serverisse paigaldamine

- Käivita `npm start` protsessihalduriga (systemd, pm2 või Docker) ja pane ette pöördproksi (nginx/Caddy) HTTPS-iga. Sea `NODE_ENV=production`, `TRUST_PROXY=true` ja `PUBLIC_URL`.
- **Varunda kausta `DATA_DIR`** (andmebaas ja üleslaaditud failid).
- Testkeskkonnas sea `MAIL_REDIRECT_TO`, et kirjad ei läheks päris saajatele.

## Failid

```
server.js              rakendus, turvapäised, ajastatud tööd
site/data.js           teenused, vormi küsimused, otsustustabel, kontroll (server + brauser)
site/render.js         avalike lehtede HTML
site/admin-views.js    halduse HTML
site/inquiries.js      päringute salvestamine, failid, e-post
site/cms.js            kasutajad, sessioonid, teenuslehtede töövoog, meeldetuletused
site/db.js, mailer.js  andmebaas ja SMTP
routes/pages.js        avalikud lehed, sitemap, robots
routes/api.js          POST /api/paringud, /api/funnel
routes/admin.js        /haldus
public/                CSS, brauseri JS, pildid
tests/site.test.js     testid
```
