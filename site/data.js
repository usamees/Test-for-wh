/* E-Service AS koduleht – jagatud andmed ja vormiloogika.
   Sama fail töötab serveris (require) ja brauseris (window.ES), et päringuvormi
   harud, kontroll ja suunamine oleksid mõlemal pool täpselt samad.
   Teenuste tekstid on siin vaikeväärtused; avaldatud sisu tuleb haldusest (applyContent). */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ES = api;
})(typeof self !== "undefined" ? self : this, function () {
"use strict";
/* ===== ANDMED: püsivad ID-d ===== */
const ORG = {
  name: "E-Service AS", reg: "10360030", vat: "EE100265745",
  phone: "+372 670 1066", hot: "+372 512 3001", hotHref: "tel:+3725123001", email: "info@eservice.ee",
  offices: [
    { id: "O1", city: "Tallinn", addr: "Salve tn 2a, Tallinn 11612", phone: "+372 670 1066", email: "info@eservice.ee", note: "Peakontor ja baas" },
    { id: "O2", city: "Tartu", addr: "Tehnika 11, Tartu 50104", phone: "+372 512 3046", email: "tartu@eservice.ee", note: "Lõuna-Eesti üksus" },
    { id: "O3", city: "Pärnu", addr: "Härma tn 16, Pärnu 80034", phone: "+372 512 3033", email: "info@eservice.ee", note: "" }
  ]
};

/* Päringute saajad (PAKUTUD jaotus; isikud ja aadressid praeguselt kontaktilehelt) */
const RECIPIENTS = {
  R_EHITUS: { role: "Ehitusosakond", person: "Vaido Sooäär", email: "vaido@eservice.ee" },
  R_ALAJ:   { role: "Jaamade ja alajaamade projektijuht", person: "Pavel Maltsev", email: "pavel@eservice.ee" },
  R_SISE:   { role: "Siseelektritööde projektijuht", person: "Viktor Badjonkin", email: "viktor@eservice.ee" },
  R_TARTU:  { role: "Tartu üksus", person: "Tartu kontor", email: "tartu@eservice.ee" },
  R_PROJ:   { role: "Projekteerimisosakond", person: "Indrek Lillemäe", email: "indrek.lillemae@eservice.ee" },
  R_SOLAR:  { role: "Päikeseenergia ja akud", person: "Jaan Räni", email: "solar@eservice.ee" },
  R_ARIK:   { role: "Äriarendus", person: "Madis Hunt", email: "madis.hunt@eservice.ee" },
  R_EV:     { role: "Autolaadijad", person: "Autolaadijate meeskond", email: "autolaadijad@eservice.ee" },
  R_KAIT:   { role: "Käiduosakond", person: "Evgeny Emeliyanov", email: "evgeny@eservice.ee" },
  R_LAB:    { role: "Mõõtelabor", person: "Ahti Sillat", email: "ahti@eservice.ee" },
  R_VORK:   { role: "Võrguhoolduse osakond", person: "Priit Paltmann", email: "priit.paltmann@eservice.ee" },
  R_INFO:   { role: "Üldkontakt", person: "Klienditeenindus", email: "info@eservice.ee" }
};

const ORDER_DEFAULT = [ // PAKUTUD
  ["Saadate päringu", "Vormi vastused jõuavad kohe teenuse eest vastutava inimeseni."],
  ["Täpsustame vajaduse", "Vastutaja võtab ühendust ja vajadusel vaatab objekti üle."],
  ["Saate pakkumise", "Pakkumises on tööde ulatus ja hind."],
  ["Teostame töö", "Pärast kokkulepet teeme töö ja anname vajalikud dokumendid üle."]
];

const SERVICES = [
 { id: "S01", slug: "elektritood", facts: [["i-tower", "Kuni 35 kV", "pistikupesast võrguni"], ["i-cal", "Alates 1992", "elektritööde kogemus"], ["i-gauge", "Kaablilabor", "rikete otsimine ja teimid"]], group: "ehitus", icon: "i-tower", name: "Elektritööd kuni 35 kV",
   lead: "Teeme elektritöid alates 1992. aastast: pistikupesast kuni 35 kV elektrivõrguni.",
   problem: "Objektile on vaja uut elektriühendust, kaabel- või õhuliini, alajaama või hoone elektritöid ning soovite, et kõik teeks üks teostaja.",
   forWho: ["Ehitajad ja arendajad", "Hoonete omanikud ja haldurid", "Tööstus- ja kaubandusettevõtted", "Võrguettevõtted"],
   includes: ["Kuni 35 kV maakaabelliinid, muhvid ja liinide ümbertõstmine", "Õhuliinide asendamine maakaablitega", "Komplekt- ja hoonesisesed alajaamad, nende renoveerimine ja ajutised alajaamad", "Õhuliinid: isekandvad kaablid, paljad ja kaetud juhtmed, mastid", "Uute ja renoveeritavate hoonete siseelektritööd", "Kaablilabor: rikete otsimine, trasside leidmine ja keskpingekaablite teim"],
   order: ORDER_DEFAULT, contact: { name: "Vaido Sooäär", role: "Ehitusosakonna juht", email: "vaido@eservice.ee", phone: "+372 512 3043" } },
 { id: "S02", slug: "projekteerimine", facts: [["i-pen", "Kuni 35 kV", "elektrivõrgud ja paigaldised"], ["i-users", "~10 projekteerijat", "täiskohaga meeskond"], ["i-file", "Servituudid", "läbirääkimised maaomanikega"]], group: "ehitus", icon: "i-pen", name: "Projekteerimine",
   lead: "Projekteerime kuni 35 kV nimipingega elektrivõrke ja -paigaldisi ning sidevõrke.",
   problem: "Ehituseks, liitumiseks või loa saamiseks on vaja elektri- või sideprojekti ning kokkuleppeid maaomanikega.",
   forWho: ["Arendajad ja ehitajad", "Hoonete omanikud", "Päikesejaamade ja laadimistaristu rajajad", "Võrguettevõtted"],
   includes: ["Välis- ja siseelektrivarustuse projektid", "Välis- ja sisevalgustuse projektid", "Sidevarustuse projektid", "Päikeseelektrijaamade ja laadimispunktide projekteerimine", "Servituudilepingud ja läbirääkimised maaomanikega"],
   note: "Projekteerimisosakonnas on ligi kümme täiskohaga projekteerijat; suuremate projektide jaoks kaasame lisajõude.",
   order: ORDER_DEFAULT, contact: { name: "Indrek Lillemäe", role: "Projekteerimisosakonna juht", email: "indrek.lillemae@eservice.ee", phone: "+372 512 3057" } },
 { id: "S03", slug: "paikesejaamad", facts: [["i-file", "Tasuvusarvutus", "koos toodangu simulatsiooniga"], ["i-sun", "Ka off-grid", "võrguta hoonetele"], ["i-shield", "Käit 24/7", "hooldus ja mõõtmised"]], group: "ehitus", icon: "i-sun", name: "Päikesejaamad",
   lead: "Rajame katuse- ja maapealseid päikesejaamu ning võrguga ühendamata (off-grid) lahendusi.",
   problem: "Soovite toota ise elektrit, vähendada elektri- ja võrgutasusid ning müüa ülejäägi võrku.",
   forWho: ["Eraisikud", "Ettevõtted", "Korteriühistud", "Võrguga ühendamata hoonete omanikud"],
   includes: ["Liitumistaotlus elektrivõrguga", "Projekt koos toodangu simulatsiooni ja tasuvusarvutusega", "Ehitus ja nõutavad dokumendid", "Off-grid lahendused akudega", "Hooldus, DC/AC mõõtmised ja 24/7 käidukorraldus"],
   order: [["Liitumine", "Taotleme liitumise elektrivõrguga."], ["Projekt", "Koostame projekti, toodangu simulatsiooni ja tasuvusarvutuse."], ["Pakkumine ja leping", "Saate võrreldava pakkumise ja sõlmime lepingu."], ["Ehitus ja dokumendid", "Ehitame jaama ja esitame nõutavad dokumendid."]],
   contact: { name: "Päikeseenergia", role: "Päikesejaamade ja akude meeskond", email: "solar@eservice.ee", phone: "+372 512 3005" } },
 { id: "S04", slug: "akusysteemid", facts: [["i-zap", "Varutoide", "katkestuste ajaks"], ["i-battery", "Börsihind", "odava elektri salvestus"], ["i-gauge", "Sagedusturg", "tulu võrgu stabiliseerimisest"]], group: "ehitus", icon: "i-battery", name: "Akusüsteemid",
   lead: "Akud energia juhtimiseks: autonoomsus, kokkuhoid ja tulu paindlikkusturult.",
   problem: "Soovite vähendada sõltuvust elektrivõrgust, kasutada odavamat börsielektrit ja olla katkestuste ajaks kaitstud.",
   forWho: ["Eraisikud", "Ettevõtted", "Päikesejaama omanikud"],
   includes: ["Erineva võimsuse ja mahutavusega akusüsteemid", "Projekteerimine kuni lubade hankimiseni ja paigaldus", "Juhtimine turutingimuste järgi", "Osalemine sagedusreservide turul partneri Markedroid kaudu"],
   note: "Eeldus: objekt on liitunud võrguga vähemalt mikrotootjana ja peakaitse on vähemalt 3×25 A.",
   order: ORDER_DEFAULT, contact: { name: "Jaan Räni", role: "Akusüsteemid", email: "solar@eservice.ee", phone: "+372 5782 8234" } },
 { id: "S05", slug: "autolaadijad", facts: [["i-zap", "Kuni 400 kW", "kiirlaadijad ärikliendile"], ["i-check", "Täisteenus", "projektist toeni"], ["i-cal", "Alates 1992", "elektritööde kogemus"]], group: "ehitus", icon: "i-plug", name: "Autolaadijad",
   lead: "Paigaldame elektriauto laadijaid kodudesse, kontoritesse ja avalikesse kohtadesse.",
   problem: "Vajate kodu- või ettevõtte laadijat või avalikku laadimistaristut koos projekti ja elektritöödega.",
   forWho: ["Eramuomanikud", "Korteriühistud", "Ettevõtted ja kontorid", "Avaliku laadimise pakkujad"],
   includes: ["Konsultatsioon ja vajaduste analüüs", "Projekteerimine", "Elektritööd ja paigaldus", "Ärikliendile kiirlaadijad kuni 400 kW", "Seadistamine, lõppkontroll ja vajadusel nõuetekohasuse audit"],
   order: [["Konsultatsioon", "Selgitame vajaduse ja võimalused."], ["Projekteerimine", "Koostame lahenduse."], ["Paigaldus", "Teeme elektritööd ja paigaldame laadija."], ["Seadistus ja tugi", "Seadistame, kontrollime ning pakume garantiid ja tuge."]],
   contact: { name: "Autolaadijad", role: "Laadimislahenduste meeskond", email: "autolaadijad@eservice.ee", phone: "+372 5620 6422" } },
 { id: "S06", slug: "kait-ja-hooldus", facts: [["i-zap", "24/7", "operatiivne käiduteenus"], ["i-gear", "350+", "objekti üle Eesti"], ["i-cal", "Alates 1996", "käidukorraldus"]], group: "too", icon: "i-tools", name: "Käit ja hooldus 24/7",
   lead: "Hoiame elektripaigaldisi töös ööpäev läbi. Käidukorraldusega tegeleme alates 1996. aastast.",
   problem: "Elektripaigaldis peab töötama korrektselt ja ohutult ning rikke korral on vaja kiiret abi.",
   forWho: ["Kinnisvara omanikud ja haldurid", "Tööstus- ja kaubandusettevõtted", "Päikesejaamade omanikud", "Avalik sektor"],
   includes: ["Lülitamine, juhtimine, kontroll ja hooldus", "Käidukava koostamine", "24/7 operatiivne käiduteenus", "Rikete kõrvaldamine"],
   note: "Jälgime üle Eesti enam kui 350 objekti.",
   order: ORDER_DEFAULT, contact: { name: "Evgeny Emeliyanov", role: "Käiduosakonna juht", email: "evgeny@eservice.ee", phone: "+372 512 3014" } },
 { id: "S07", slug: "jarelevaataja", facts: [["i-award", "Pädevustunnistus", "järelevaatajal"], ["i-shield", "Vastutus meil", "paigaldise käidu eest"], ["i-file", "Käidukava", "koostame ja hoiame"]], group: "too", icon: "i-shield", name: "Järelevaataja teenus",
   lead: "Võtame elektripaigaldise kasutamise järelevalve enda vastutusele.",
   problem: "Omanik peab määrama järelevaataja esimese liigi paigaldisele, üle 100 A peakaitsmega madalpingepaigaldisele ja kõigile kõrgepingepaigaldistele.",
   forWho: ["Kinnisvara omanikud ja haldurid", "Tööstusettevõtted", "Kõrgepingepaigaldise omanikud"],
   includes: ["Pädevustunnistusega järelevaataja määramine", "Vastutus paigaldise käidu eest", "Käidukava koostamine ja hoidmine", "Kontrollid ja hooldus koos käiduteenusega"],
   order: ORDER_DEFAULT, contact: { name: "Evgeny Emeliyanov", role: "Käiduosakonna juht", email: "evgeny@eservice.ee", phone: "+372 512 3014" } },
 { id: "S08", slug: "mootelabor", facts: [["i-award", "Akrediteeritud", "alates 2003, L121"], ["i-sun", "Päikesejaamad", "akrediteering alates 2022"], ["i-gauge", "Kuni 35 kV", "kaablite ja trafode teim"]], group: "too", icon: "i-gauge", name: "Mõõtelabor ja audit",
   lead: "Akrediteeritud mõõtelabor alates 2003. aastast (Eesti Akrediteerimiskeskus, L121).",
   problem: "Elektripaigaldise ohutus tuleb mõõtmistega tõendada või kaabli ja seadme rike kiiresti üles leida.",
   forWho: ["Eramute ja korterelamute omanikud", "Ehitajad", "Päikesejaamade omanikud", "Võrgu- ja tööstusettevõtted"],
   includes: ["Elektripaigaldiste kontrollmõõtmised", "Päikeseelektrisüsteemide mõõtmine (akrediteeritud alates 2022)", "Võrguparameetrite ja valgustiheduse mõõtmine", "Kuni 35 kV kaablite ja trafode teim", "Kaabli rikkekoha otsimine ja trasseerimine", "Põhjalikud mõõtmised elektripaigaldise auditiks"],
   order: ORDER_DEFAULT, contact: { name: "Ahti Sillat", role: "Mõõtelabori juht", email: "ahti@eservice.ee", phone: "+372 512 3004" } },
 { id: "S09", slug: "raamlepingud", facts: [["i-cal", "Alates 1996", "koostöö Elektrileviga"], ["i-pin", "2 piirkonda", "Lääne-Harjumaa ja Tartumaa"], ["i-tools", "Kogu tsükkel", "projekt, ehitus, hooldus, rike"]], group: "too", icon: "i-hand", name: "Raamlepingud",
   lead: "Oleme Elektrilevi raamlepingu partner Lääne-Harjumaal ja Tartumaal alates 1996. aastast.",
   problem: "Võrgu või paigaldiste töökindlus vajab pikaajalist partnerit, kes teeb projekteerimise, ehituse, hoolduse ja rikketööd.",
   forWho: ["Võrguettevõtted", "Suured tellijad pikaajalise koostöö jaoks"],
   includes: ["Projekteerimistööd võrgus", "Elektriehitustööd", "Hooldustööd", "Rikketööd"],
   order: ORDER_DEFAULT, contact: { name: "Priit Paltmann", role: "Võrguhoolduse osakonna juht", email: "priit.paltmann@eservice.ee", phone: "+372 512 3002" } }
];
const SVC = Object.fromEntries(SERVICES.map(s => [s.slug, s]));
const GROUPS = { ehitus: "Ehitame ja paigaldame", too: "Hoiame töös" };

const COUNTIES = ["Harjumaa","Hiiumaa","Ida-Virumaa","Jõgevamaa","Järvamaa","Läänemaa","Lääne-Virumaa","Põlvamaa","Pärnumaa","Raplamaa","Saaremaa","Tartumaa","Valgamaa","Viljandimaa","Võrumaa","Mitu maakonda"];
const SOUTH = ["Tartumaa","Jõgevamaa","Põlvamaa","Valgamaa","Viljandimaa","Võrumaa"];

/* ===== OTSUSTUSTABEL (PAKUTUD – ettevõte ei ole veel kinnitanud) =====
   when: tingimus; route: esimene sobiv reegel määrab saaja; cc: kõik sobivad lisatakse koopiasse */
const o = (...pairs) => pairs.map(([v, l]) => ({ v, l }));
const URGENT = { type: "info", tone: "hot", text: "Kui elekter on praegu ära või olukord on ohtlik, helistage 24/7 operatiivtelefonil. Vorm ei ole kiireim kanal." };
const FLOW = {
 elektritood: { q: [
   { id: "el_type", text: "Millist elektritööd vajate?", type: "choice", opts: o(["sise","Hoone siseelektritööd"],["liin","Kaabel- või õhuliin"],["alajaam","Alajaam"],["liitumine","Uus liitumine või võimsuse muutus"],["rike","Rike või avarii"],["muu","Midagi muud"]) },
   { id: "el_urgent", text: "Kas elektrivarustus on praegu katkenud või on olukord ohtlik?", type: "choice", when: { q: "el_type", in: ["rike"] }, opts: o(["kohe","Jah, abi on vaja kohe"],["plaan","Ei, töö saab planeerida"]) },
   { id: "el_info", ...URGENT, when: { q: "el_urgent", in: ["kohe"] } },
   { id: "el_building", text: "Mis tüüpi hoonega on tegu?", type: "choice", when: { q: "el_type", in: ["sise"] }, opts: o(["eramu","Eramu"],["korter","Korterelamu"],["ari","Äri- või büroohoone"],["tootmine","Tootmis- või laohoone"],["avalik","Avalik hoone"]) },
   { id: "el_stage", text: "Kas tegu on uusehituse või olemasoleva hoonega?", type: "choice", when: { q: "el_type", in: ["sise"] }, opts: o(["uus","Uusehitus"],["reno","Renoveerimine"],["laiendus","Olemasoleva paigaldise laiendus"]) },
   { id: "el_voltage", text: "Millise pingega on töö?", type: "choice", when: { q: "el_type", in: ["liin","alajaam","liitumine"] }, opts: o(["madal","Madalpinge (kuni 1 kV)"],["kesk","Keskpinge (6–35 kV)"],["eitea","Ei tea"]) },
   { id: "el_project", text: "Kas tööde projekt on olemas?", type: "choice", when: { q: "el_type", not: ["rike"] }, opts: o(["jah","Jah"],["ei","Ei, vajame ka projekteerimist"],["eitea","Ei tea"]) } ],
   route: [ { when: { q: "el_type", in: ["rike"] }, to: "R_KAIT" },
            { when: { q: "loc", in: SOUTH }, to: "R_TARTU" },
            { when: { any: [{ q: "el_type", in: ["alajaam"] }, { q: "el_voltage", in: ["kesk"] }] }, to: "R_ALAJ" },
            { when: { q: "el_type", in: ["sise"] }, to: "R_SISE" },
            { to: "R_EHITUS" } ],
   cc: [ { when: { q: "el_project", in: ["ei"] }, to: "R_PROJ" } ] },
 projekteerimine: { q: [
   { id: "pr_type", text: "Mida on vaja projekteerida?", type: "choice", opts: o(["valis","Väliselektrivarustus"],["sise","Siseelektrivarustus"],["valgus","Välis- või sisevalgustus"],["side","Sidevarustus"],["paike","Päikeseelektrijaam"],["laadija","Laadimispunktid"],["servituut","Servituudid ja maaomanikud"]) },
   { id: "pr_voltage", text: "Millise pingega on väliselektrivarustus?", type: "choice", when: { q: "pr_type", in: ["valis"] }, opts: o(["madal","Madalpinge (kuni 1 kV)"],["kesk","Keskpinge (6–35 kV)"],["eitea","Ei tea"]) },
   { id: "pr_stage", text: "Mis etapis on objekt?", type: "choice", when: { q: "pr_type", not: ["servituut"] }, opts: o(["idee","Idee või eelprojekt"],["luba","Ehitusloa taotlemine"],["pohi","Põhiprojekt"],["too","Tööprojekt"],["eitea","Ei tea"]) },
   { id: "pr_build", text: "Kas soovite pärast projekti ka ehitustöid?", type: "choice", when: { q: "pr_type", not: ["servituut"] }, opts: o(["jah","Jah"],["ei","Ei"],["hiljem","Otsustame hiljem"]) } ],
   route: [ { to: "R_PROJ" } ],
   cc: [ { when: { q: "pr_build", in: ["jah"] }, to: "R_EHITUS" } ] },
 paikesejaamad: { q: [
   { id: "pv_client", text: "Kes on tellija?", type: "choice", opts: o(["eraisik","Eraisik"],["ettevote","Ettevõte"],["kyhistu","Korteriühistu"],["avalik","Avalik sektor või muu"]) },
   { id: "pv_grid", text: "Kas hoone või kinnistu on elektrivõrguga ühendatud?", type: "choice", opts: o(["jah","Jah"],["ei","Ei, vajan võrguta (off-grid) lahendust"]) },
   { id: "pv_place", text: "Kuhu jaam tuleks?", type: "choice", opts: o(["katus","Katusele"],["maa","Maapinnale"],["eitea","Ei tea"]) },
   { id: "pv_size", text: "Kui suurt jaama kaalute?", type: "choice", opts: o(["s15","Kuni 15 kW"],["s50","15–50 kW"],["s1000","50 kW – 1 MW"],["big","Üle 1 MW"],["eitea","Ei tea"]) },
   { id: "pv_battery", text: "Kas soovite koos jaamaga ka akusüsteemi?", type: "choice", opts: o(["jah","Jah"],["ei","Ei"],["eitea","Ei tea"]) } ],
   route: [ { when: { all: [{ q: "pv_size", in: ["s1000","big"] }, { q: "pv_client", not: ["eraisik"] }] }, to: "R_ARIK" }, { to: "R_SOLAR" } ],
   cc: [] },
 akusysteemid: { q: [
   { id: "bat_client", text: "Kes on tellija?", type: "choice", opts: o(["eraisik","Eraisik"],["ettevote","Ettevõte"]) },
   { id: "bat_pv", text: "Kas objektil on päikesejaam?", type: "choice", opts: o(["jah","Jah"],["plaan","Ei, planeerime koos akuga"],["ei","Ei"]) },
   { id: "bat_goal", text: "Mis on aku peamine eesmärk?", type: "choice", opts: o(["varu","Varutoide katkestuste ajaks"],["saast","Kokkuhoid börsihinna abil"],["sagedus","Tulu sagedusturult"],["mitu","Mitu eesmärki"]) },
   { id: "bat_fuse", text: "Kui suur on objekti peakaitse?", type: "choice", opts: o(["ge","3×25 A või suurem"],["lt","Väiksem kui 3×25 A"],["eitea","Ei tea"]) },
   { id: "bat_info", type: "info", tone: "note", text: "Aku eeldab vähemalt 3×25 A peakaitset ja mikrotootja liitumist. Saatke päring siiski: vaatame üle, mida tuleks liitumises muuta.", when: { q: "bat_fuse", in: ["lt"] } } ],
   route: [ { to: "R_SOLAR" } ], cc: [] },
 autolaadijad: { q: [
   { id: "ev_place", text: "Kuhu laadija tuleb?", type: "choice", opts: o(["eramu","Eramu"],["korter","Korterelamu"],["firma","Ettevõte või kontor"],["avalik","Avalik laadimine"]) },
   { id: "ev_count", text: "Mitu laadijat on vaja?", type: "choice", opts: o(["1","Üks"],["2-5","2–5"],["5+","Rohkem kui 5"]) },
   { id: "ev_power", text: "Millist laadimist vajate?", type: "choice", when: { q: "ev_place", in: ["firma","avalik"] }, opts: o(["ac","Tavalaadija (AC)"],["dc","Kiirlaadija (DC)"],["eitea","Ei tea"]) },
   { id: "ev_charger", text: "Kas laadija seade on juba olemas?", type: "choice", opts: o(["jah","Jah, vajan ainult paigaldust"],["ei","Ei, vajan ka laadijat"],["eitea","Ei tea"]) } ],
   route: [ { to: "R_EV" } ],
   cc: [ { when: { q: "ev_power", in: ["dc"] }, to: "R_PROJ" } ] },
 "kait-ja-hooldus": { q: [
   { id: "km_need", text: "Mida vajate?", type: "choice", opts: o(["leping","Pikaajalist käidulepingut"],["hooldus","Ühekordset hooldust või kontrolli"],["rike","Abi rikke korral praegu"]) },
   { id: "km_info", ...URGENT, when: { q: "km_need", in: ["rike"] } },
   { id: "km_type", text: "Millise paigaldisega on tegu?", type: "choice", when: { q: "km_need", not: ["rike"] }, opts: o(["mp","Madalpinge, peakaitse kuni 100 A"],["mp100","Madalpinge, peakaitse üle 100 A"],["kp","Kõrgepinge"],["pv","Päikeseelektrijaam"],["eitea","Ei tea"]) },
   { id: "km_count", text: "Mitu objekti see puudutab?", type: "choice", when: { q: "km_need", in: ["leping"] }, opts: o(["1","Üks"],["2-10","2–10"],["10+","Rohkem kui 10"]) } ],
   route: [ { to: "R_KAIT" } ], cc: [] },
 jarelevaataja: { q: [
   { id: "jv_type", text: "Millisele paigaldisele on järelevaatajat vaja?", type: "choice", opts: o(["mp100","Madalpinge, peakaitse üle 100 A"],["kp","Kõrgepinge"],["pv","Päikeseelektrijaam"],["muu","Muu või ei tea"]) },
   { id: "jv_now", text: "Kas paigaldisel on praegu järelevaataja?", type: "choice", opts: o(["ei","Ei"],["vahetus","Jah, soovime vahetada"],["eitea","Ei tea"]) },
   { id: "jv_plan", text: "Kas käidukava on olemas?", type: "choice", opts: o(["jah","Jah"],["ei","Ei"],["eitea","Ei tea"]) } ],
   route: [ { to: "R_KAIT" } ], cc: [] },
 mootelabor: { q: [
   { id: "ml_type", text: "Millist mõõtmist või teimi vajate?", type: "choice", opts: o(["kontroll","Paigaldise kontrollmõõtmine"],["pv","Päikeseelektrijaama mõõtmine"],["kaabel","Kaabliteim või rikkekoha otsimine"],["trafo","Trafo või jaotusseadme teim"],["valgus","Valgustiheduse mõõtmine"],["audit","Elektripaigaldise audit"]) },
   { id: "ml_obj", text: "Millist paigaldist mõõdame?", type: "choice", when: { q: "ml_type", in: ["kontroll"] }, opts: o(["ajutine","Ajutine paigaldis või kilp"],["eramu","Eramu või korterelamu ühispaigaldis"],["suur","Äri-, tootmis- või avalik hoone"]) },
   { id: "ml_urgent", text: "Kas tegu on avariiga?", type: "choice", when: { q: "ml_type", in: ["kaabel","trafo"] }, opts: o(["plaan","Ei, töö on planeeritud"],["avarii","Jah, seade või kaabel on rikkis"]) },
   { id: "ml_info", ...URGENT, when: { q: "ml_urgent", in: ["avarii"] } },
   { id: "ml_voltage", text: "Millise pingega kaabel või seade on?", type: "choice", when: { q: "ml_type", in: ["kaabel","trafo"] }, opts: o(["madal","Madalpinge"],["kesk","Keskpinge (kuni 35 kV)"],["eitea","Ei tea"]) } ],
   route: [ { when: { q: "ml_urgent", in: ["avarii"] }, to: "R_KAIT" }, { to: "R_LAB" } ],
   cc: [ { when: { q: "ml_urgent", in: ["avarii"] }, to: "R_LAB" } ] },
 raamlepingud: { q: [
   { id: "rl_who", text: "Keda esindate?", type: "choice", opts: o(["vork","Võrguettevõtet"],["firma","Ettevõtet, kes soovib raamlepingut"],["muu","Muud organisatsiooni"]) },
   { id: "rl_scope", text: "Milliseid töid leping hõlmaks?", type: "choice", opts: o(["hooldus","Hooldus- ja rikketööd"],["ehitus","Ehitus- ja projekteerimistööd"],["koik","Mõlemad"]) } ],
   route: [ { when: { q: "rl_who", in: ["vork"] }, to: "R_VORK" }, { when: { q: "rl_scope", in: ["hooldus"] }, to: "R_KAIT" }, { to: "R_INFO" } ], cc: [] },
 abi: { q: [
   { id: "help_desc", text: "Kirjeldage lühidalt, mida vajate", type: "text", req: true, min: 10, ph: "Nt vajame majale uut elektriühendust ja ei tea, kust alustada." },
   { id: "help_who", text: "Kes on tellija?", type: "choice", opts: o(["eraisik","Eraisik"],["ettevote","Ettevõte"],["avalik","Avalik sektor"]) } ],
   route: [ { to: "R_INFO" } ], cc: [] }
};
const COMMON = [
  { id: "loc", text: "Kus objekt asub?", type: "select", opts: COUNTIES.map(c => ({ v: c, l: c })) },
  { id: "time", text: "Millal sooviksite tööga alustada?", type: "choice", opts: o(["kohe","Esimesel võimalusel"],["3k","1–3 kuu jooksul"],["hiljem","Hiljem"],["eitea","Ei tea veel"]) },
  { id: "desc", text: "Lisainfo ja failid", type: "text", req: false, ph: "Objekti aadress, mahud, tähtajad või muu oluline (valikuline)", files: true }
];
const HELP = { slug: "abi", name: "Vajan abi teenuse valikul", id: "S00" };


/* ===== KAASNEVAD TEENUSED (PAKUTUD – vajab kinnitust) ===== */
const RELATED = {
  elektritood:      [["projekteerimine","Kui tööde projekt puudub"],["mootelabor","Kontrollmõõtmised enne üleandmist"],["kait-ja-hooldus","Valminud paigaldise käit ja hooldus"]],
  projekteerimine:  [["elektritood","Ehitustööd projekti järgi"],["paikesejaamad","Päikesejaama rajamine"],["autolaadijad","Laadimispunktide paigaldus"]],
  paikesejaamad:    [["akusysteemid","Toodangu salvestamine ja varutoide"],["kait-ja-hooldus","Jaama käit ja hooldus 24/7"],["mootelabor","DC/AC mõõtmised"]],
  akusysteemid:     [["paikesejaamad","Aku koos päikesejaamaga"],["projekteerimine","Lahendus ja load"]],
  autolaadijad:     [["projekteerimine","Kiirlaadijate ja suuremate lahenduste projekt"],["elektritood","Liitumise või võimsuse muutus"],["mootelabor","Nõuetekohasuse audit"]],
  "kait-ja-hooldus":[["jarelevaataja","Järelevaataja määramine"],["mootelabor","Korralised kontrollmõõtmised"]],
  jarelevaataja:    [["kait-ja-hooldus","Käit ja hooldus 24/7"],["mootelabor","Kontrollmõõtmised ja audit"]],
  mootelabor:       [["kait-ja-hooldus","Leitud puuduste kõrvaldamine ja hooldus"],["elektritood","Remont- ja ümberehitustööd"]],
  raamlepingud:     [["kait-ja-hooldus","Hooldus- ja rikketööd"],["elektritood","Ehitustööd"]]
};
function extraQ(svc) {
  const r = RELATED[svc]; if (!r) return null;
  return { id: "extra", text: "Kas soovite pakkumist ka nendele teenustele?", type: "multi", req: false,
    hint: "Valikuline. Sageli tellitakse need koos teenusega „" + SVC[svc].name + "“.",
    opts: r.map(([s, why]) => ({ v: s, l: SVC[s].name, sub: why })) };
}

/* ===== LOOGIKA (puhas, testitav) ===== */
function cond(c, a) {
  if (!c) return true;
  if (c.all) return c.all.every(x => cond(x, a));
  if (c.any) return c.any.some(x => cond(x, a));
  const v = a[c.q];
  if (c.in) return v !== undefined && c.in.includes(v);
  if (c.not) return v !== undefined && !c.not.includes(v);
  return true;
}
function questionsFor(svc) { if (!svc) return []; const x = extraQ(svc); return [...FLOW[svc].q, ...(x ? [x] : []), ...(svc === "abi" ? [] : COMMON)]; }
function visibleQs(svc, a) { return questionsFor(svc).filter(q => cond(q.when, a)); }
function stepList(svc, a) { return svc ? ["svc", ...visibleQs(svc, a).map(q => q.id), "contact", "summary"] : ["svc"]; }
function prune(svc, a) { // eemaldab vastused, mis ei kuulu enam valitud harusse
  let changed = true;
  while (changed) { changed = false;
    const keep = new Set(visibleQs(svc, a).map(q => q.id));
    for (const k of Object.keys(a)) if (!keep.has(k)) { delete a[k]; changed = true; } }
  if (Array.isArray(a.extra)) { const ok = (RELATED[svc] || []).map(x => x[0]); a.extra = a.extra.filter(v => ok.includes(v)); if (!a.extra.length) delete a.extra; }
  return a;
}
function routeFor(svc, a) {
  const f = FLOW[svc]; const r = f.route.find(x => cond(x.when, a));
  const extraTo = (a.extra || []).map(s => FLOW[s].route.find(x => !x.when).to);
  const cc = [...new Set([...f.cc.filter(x => cond(x.when, a)).map(x => x.to), ...extraTo])].filter(x => x !== r.to);
  return { to: r.to, cc };
}
function svcName(slug) { return slug === "abi" ? HELP.name : SVC[slug].name; }
function svcId(slug) { return slug === "abi" ? HELP.id : SVC[slug].id; }
function labelOf(q, v) { if (q.type === "text") return v; if (Array.isArray(v)) return v.map(x => labelOf(q, x)).join(", "); const x = (q.opts || []).find(x => x.v === v); return x ? x.l : v; }
function buildPayload(F) {
  const qs = visibleQs(F.svc, F.a).filter(q => q.type !== "info" && F.a[q.id] !== undefined && F.a[q.id] !== "" && !(Array.isArray(F.a[q.id]) && !F.a[q.id].length));
  const r = routeFor(F.svc, F.a);
  return { key: F.key, service: { id: svcId(F.svc), slug: F.svc, name: svcName(F.svc) }, startedFrom: F.from || "üldvorm",
    answers: qs.map(q => ({ qid: q.id, question: q.text, value: F.a[q.id], label: labelOf(q, F.a[q.id]) })),
    files: (F.files || []).slice(), contact: { ...F.c },
    recipient: { to: r.to, cc: r.cc }, createdAt: new Date().toISOString() };
}
function emailText(p) {
  const R = RECIPIENTS[p.recipient.to];
  const lines = [`Saaja: ${R.person} <${R.email}>`];
  if (p.recipient.cc.length) lines.push("Koopia: " + p.recipient.cc.map(k => `${RECIPIENTS[k].person} <${RECIPIENTS[k].email}>`).join(", "));
  lines.push(`Teema: Uus päring ${p.id || ""} · ${p.service.name}`, "", `Teenus: ${p.service.name} (${p.service.id})`, `Alustatud: ${p.startedFrom}`, "");
  p.answers.forEach(x => lines.push(`${x.question}\n  → ${x.label}`));
  if (p.files.length) lines.push("", "Failid: " + p.files.join(", "));
  const c = p.contact;
  lines.push("", "KONTAKT", `Nimi: ${c.name}`, c.company ? `Ettevõte: ${c.company}` : null, `E-post: ${c.email}`, c.phone ? `Telefon: ${c.phone}` : null, `Eelistab: ${c.pref === "tel" ? "telefoni" : "e-posti"}`);
  return lines.filter(x => x !== null).join("\n");
}

/* ===== Avaldatud sisu (haldusest) ===== */
const CONTENT_FIELDS = ["name", "lead", "problem", "note", "forWho", "includes", "order", "facts", "related", "contact"];
const clone = x => JSON.parse(JSON.stringify(x));
function defaultContent(slug) {
  const s = SVC[slug]; const out = {};
  CONTENT_FIELDS.forEach(f => { out[f] = clone(f === "related" ? (DEFAULT_RELATED[slug] || []) : (s[f] ?? "")); });
  return out;
}
const DEFAULT_RELATED = clone(RELATED);
const DEFAULTS = Object.fromEntries(SERVICES.map(s => [s.slug, null]));
SERVICES.forEach(s => { DEFAULTS[s.slug] = defaultContent(s.slug); });
function applyContent(map) { // map: slug -> avaldatud sisu
  for (const s of SERVICES) {
    const p = map && map[s.slug]; if (!p) continue;
    CONTENT_FIELDS.forEach(f => {
      if (f === "related") RELATED[s.slug] = (p.related || []).filter(x => SVC[x[0]] && x[0] !== s.slug);
      else if (p[f] !== undefined) s[f] = clone(p[f]);
    });
    if (!RELATED[s.slug] || !RELATED[s.slug].length) delete RELATED[s.slug];
  }
}

/* ===== Kontroll (sama reegel brauseris ja serveris) ===== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s-]{5,}$/;
const LIMITS = { text: 4000, name: 200, company: 200, email: 254, phone: 40 };
function contactErrors(c) {
  const e = {}; c = c || {};
  if (!c.name || !String(c.name).trim()) e.c_name = "Sisestage nimi.";
  else if (String(c.name).length > LIMITS.name) e.c_name = "Nimi on liiga pikk.";
  if (!EMAIL_RE.test(c.email || "") || String(c.email).length > LIMITS.email) e.c_email = "Sisestage korrektne e-posti aadress.";
  if (c.pref === "tel" && !c.phone) e.c_phone = "Telefoni eelistamisel sisestage telefoninumber.";
  if (c.phone && (!PHONE_RE.test(c.phone) || String(c.phone).length > LIMITS.phone)) e.c_phone = "Kontrollige telefoninumbrit.";
  if (c.company && String(c.company).length > LIMITS.company) e.c_company = "Ettevõtte nimi on liiga pikk.";
  if (!c.consent) e.c_consent = "Päringu saatmiseks on vaja nõusolekut.";
  return e;
}
function answerError(q, v) {
  if (!q || q.type === "info") return null;
  if (q.type === "text") {
    if (v !== undefined && typeof v !== "string") return "Vigane vastus.";
    if (v && v.length > LIMITS.text) return "Tekst on liiga pikk.";
    if (q.req && (!v || v.length < (q.min || 1))) return `Kirjeldage vajadust vähemalt ${q.min || 1} tähemärgiga.`;
    return null;
  }
  if (q.type === "multi") {
    if (v === undefined) return null;
    if (!Array.isArray(v) || v.some(x => !q.opts.some(o => o.v === x))) return "Vigane valik.";
    return null;
  }
  if (v === undefined || v === "") return q.type === "select" ? "Valige maakond." : "Valige üks vastus.";
  if (!q.opts.some(o => o.v === v)) return "Vigane valik.";
  return null;
}
function validateAll(svc, a, c) { // kogu päringu kontroll enne salvestamist
  const errs = {};
  if (!svc || !(svc === "abi" || (SVC[svc] && FLOW[svc]))) { errs.svc = "Valige teenus."; return errs; }
  for (const q of visibleQs(svc, a)) { const m = answerError(q, a[q.id]); if (m) errs[q.id] = m; }
  Object.assign(errs, contactErrors(c));
  return errs;
}

return { ORG, RECIPIENTS, SERVICES, SVC, GROUPS, COUNTIES, SOUTH, FLOW, COMMON, HELP, RELATED, DEFAULTS, CONTENT_FIELDS,
  extraQ, cond, questionsFor, visibleQs, stepList, prune, routeFor, svcName, svcId, labelOf, buildPayload, emailText,
  applyContent, defaultContent, contactErrors, answerError, validateAll, LIMITS };
});
