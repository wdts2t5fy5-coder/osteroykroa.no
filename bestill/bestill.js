/* Bestillingsflyt for Osterøyburger — pilot.
 *
 * Kvar burger er ei eiga linje med eige namn, eigen storleik og eigne
 * val. Det er difor modellen er ei liste og ikkje eit tal: eit par som
 * bestiller saman skal kunne gje Theodor og Semoa kvar sin burger med
 * kvar sine ingrediensar, og få dei merkte med namn i luka.
 *
 * Ingen betaling er kopla på enno; Vipps-avtalen er i bestilling.
 */

/* ──────────────────────────────────────────────────────────────────
   Innstillingar. Alt Roy skal kunne endre ligg her, og berre her.
   ────────────────────────────────────────────────────────────────── */
var OPPSETT = {
  grunnpris: 239,     // minste storleik
  oppgradering: 60,   // lagt på per steg opp

  // To namn på kvar storleik, med vilje:
  //   namn        — lyden. Står på valkorta, der jobben er å selje.
  //                 Spørsmålet «Kva lyd lagar magen?» blir bokstavleg,
  //                 og knurr → rumling → buldring stig heile vegen.
  //   produktnamn — det formelle. Står i oppsummeringa, som er ei
  //                 kvittering og ikkje ein salsplakat. Her skal kunden
  //                 kjenne att kva han faktisk har kjøpt.
  storleikar: [
    { id: 'enkel',   gram: 120, namn: 'Knurr',    produktnamn: 'Osterøymeny 120' },
    { id: 'dobbel',  gram: 240, namn: 'Rumling',  produktnamn: 'Osterøymeny 240' },
    { id: 'trippel', gram: 360, namn: 'Buldring', produktnamn: 'Osterøymeny 360' }
  ],

  // Topping kjem i tal skiver, ikkje av/på. Éi av kvar frå start, og
  // kunden kan gå opp eller heilt ned til null.
  ekstra: [
    { id: 'ost',   namn: 'Ost',   pris: 20, fraStart: 1, maks: 5 },
    { id: 'bacon', namn: 'Bacon', pris: 20, fraStart: 1, maks: 5 }
  ],

  // Drikke følgjer med menyen. Eitt val må stå, så denne gruppa oppfører
  // seg som radioknappar: å trykkje på den valde slår han ikkje av.
  // Energidrikk har aldersgrense, sjå ALDERSGRENSE under.
  drikke: [
    { id: 'mineralvatn',  namn: 'Mineralvatn', pris: 0 },
    { id: 'energidrikk',  namn: 'Energidrikk', pris: 10, aldersgrense: 16 }
  ],

  ALDERSGRENSE_TEKST:
    'Energidrikk krev at du er over 16 år. Er me i tvil, spør me om ' +
    'legitimasjon når du hentar.',

  // Kostar ingenting, men er AV frå start — dette er noko kunden legg
  // til, ikkje noko han tek bort. Mange spør om det på telefonen, så
  // det ville blitt sakna om det berre fanst munnleg.
  // Anten–eller: kebabsaus og bearnaise saman er ikkje ein rett me sel.
  sausar: [
    { id: 'kebabsaus', namn: 'Kebabsaus' },
    { id: 'bearnaise', namn: 'Bearnaise' }
  ],

  // Følgjer med. Ingen prisendring om dei blir tekne bort.
  // Skrivemåten følgjer menyen («løk», ikkje «lauk»), slik at kunden
  // kjenner att det same ordet båe stader.
  tilbehoer: [
    { id: 'salat',      namn: 'Salat' },
    { id: 'mais',       namn: 'Mais' },
    { id: 'dressing',   namn: 'Dressing' },
    { id: 'lok',        namn: 'Løk' },
    { id: 'sylteagurk', namn: 'Sylteagurk' }
  ],

  maksMenyar: 10,
  telefon: '56 19 34 34',
  telefonLenke: '+4756193434',

  // Forslag som blir «skrivne» i namnefeltet når det står tomt.
  // Rekkjefølgja blir stokka ved kvar sidelasting, så lista ikkje blir
  // forutsigbar for dei som bestiller ofte.
  //
  // Lokale former er med vilje: «Besto» og «Besten» for besteforeldra,
  // «Tante» i bestemt form slik det blir sagt her, «Damo» og «Typen».
  // Ordboksnynorsk ville vore framandt i ein kro på Osterøy.
  //
  // Korte er best: eit langt forslag brukar lang tid på å skrivast og
  // slettast, og rytmen i rotasjonen blir ujamn.
  namneforslag: [
    'Meg sjølv',
    'Ein god venn',
    'Besto',
    'Besten',
    'Tante',
    'Onkel',
    'Typen',
    'Damo',
    'Storebror',
    'Lillesøster',
    'Cowboyen',
    'Ein eg er glad i',
    'Ein som fortener det'
  ],

  // Vist i staden for animasjonen når feltet har fokus, og for alle
  // felt utanom det første tomme.
  namnPlassHaldar: 'Skriv eit namn'
};

function prisFor(storleikId) {
  for (var i = 0; i < OPPSETT.storleikar.length; i++) {
    if (OPPSETT.storleikar[i].id === storleikId) {
      return OPPSETT.grunnpris + i * OPPSETT.oppgradering;
    }
  }
  return OPPSETT.grunnpris;
}

/* ──────────────────────────────────────────────────────────────────
   Tilstand
   ────────────────────────────────────────────────────────────────── */
var nesteId = 1;

function nyLinje() {
  var l = {
    id: nesteId++, namn: '', storleik: 'enkel',
    ekstra: {}, drikke: {}, sausar: {}, tilbehoer: {}
  };
  OPPSETT.ekstra.forEach(function (e) { l.ekstra[e.id] = e.fraStart; });  // tal skiver
  OPPSETT.drikke.forEach(function (d, i) { l.drikke[d.id] = i === 0; });  // mineralvatn
  OPPSETT.sausar.forEach(function (s) { l.sausar[s.id] = false; });       // AV frå start
  OPPSETT.tilbehoer.forEach(function (t) { l.tilbehoer[t.id] = true; });  // på frå start
  return l;
}

function valdDrikke(l) {
  for (var i = 0; i < OPPSETT.drikke.length; i++) {
    if (l.drikke[OPPSETT.drikke[i].id]) return OPPSETT.drikke[i];
  }
  return OPPSETT.drikke[0];
}

var ordre = { linjer: [nyLinje()], luke: null, telefon: '' };

function linjePris(l) {
  var sum = prisFor(l.storleik);
  OPPSETT.ekstra.forEach(function (e) { sum += e.pris * (l.ekstra[e.id] || 0); });
  sum += valdDrikke(l).pris;
  return sum;
}

function totalPris() {
  return ordre.linjer.reduce(function (s, l) { return s + linjePris(l); }, 0);
}

function visingsnamn(l, i) {
  return l.namn.trim() || ('Meny ' + (i + 1));
}

/* ──────────────────────────────────────────────────────────────────
   Oppteikning — burgerlinjer
   ────────────────────────────────────────────────────────────────── */
function teiknLinjer() {
  var rot = document.getElementById('linjer');

  // Fokus skal ikkje hoppe medan ein skriv namn, så me teiknar berre
  // heile lista på nytt når talet på linjer endrar seg.
  rot.innerHTML = '';

  ordre.linjer.forEach(function (l, i) {
    rot.appendChild(byggLinje(l, i));
  });

  var leggTil = document.getElementById('legg-til');
  var full = ordre.linjer.length >= OPPSETT.maksMenyar;
  leggTil.disabled = full;
  document.getElementById('stor-ordre').hidden = !full;
}

function byggLinje(l, i) {
  var kort = document.createElement('div');
  kort.className = 'burgerlinje';

  /* — topp: namn og fjerning — */
  var topp = document.createElement('div');
  topp.className = 'burgerlinje-topp';

  var merkelapp = document.createElement('label');
  merkelapp.className = 'namnefelt';
  merkelapp.innerHTML = '<span>Kven er menyen til?</span>';

  var felt = document.createElement('input');
  felt.type = 'text';
  felt.value = l.namn;
  felt.placeholder = OPPSETT.namnPlassHaldar;
  felt.maxLength = 24;
  felt.autocomplete = 'off';
  felt.addEventListener('input', function () {
    l.namn = felt.value;
    teiknOppsummering(); // berre summen, slik at skrivinga ikkje blir avbroten
  });
  merkelapp.appendChild(felt);
  topp.appendChild(merkelapp);

  if (ordre.linjer.length > 1) {
    var fjern = document.createElement('button');
    fjern.type = 'button';
    fjern.className = 'fjern-linje';
    fjern.setAttribute('aria-label', 'Fjern ' + visingsnamn(l, i));
    fjern.innerHTML = '&times;';
    fjern.addEventListener('click', function () {
      ordre.linjer = ordre.linjer.filter(function (x) { return x.id !== l.id; });
      teiknAlt();
    });
    topp.appendChild(fjern);
  }
  kort.appendChild(topp);

  /* — storleik — */
  kort.appendChild(bolk('Kva lyd lagar magen?', (function () {
    var rad = document.createElement('div');
    rad.className = 'storleik-rad';
    OPPSETT.storleikar.forEach(function (s) {
      var k = document.createElement('button');
      k.type = 'button';
      k.className = 'storleik' + (l.storleik === s.id ? ' er-valt' : '');
      k.setAttribute('aria-pressed', l.storleik === s.id ? 'true' : 'false');
      k.innerHTML =
        '<span class="storleik-namn">' + s.namn + '</span>' +
        '<span class="storleik-gram">' + s.gram + ' g</span>' +
        '<span class="storleik-pris">' + prisFor(s.id) + ',-</span>';
      k.addEventListener('click', function () { l.storleik = s.id; teiknAlt(); });
      rad.appendChild(k);
    });
    return rad;
  })()));

  /* — topping, i tal skiver — */
  kort.appendChild(bolk('Topping', toppingRad(l)));

  /* — saus, gratis, av frå start, anten–eller.
       «attåt» ville tydd ved sida av, i ei skål. Denne sausen går på
       burgeren, så det måtte seiast. — */
  kort.appendChild(bolk('Litt saus på burgeren? Vel éin',
    chipRad(OPPSETT.sausar, l.sausar, { eksklusiv: true })));

  /* — drikke, som følgjer med menyen — */
  var drikkebolk = bolk('Drikke til',
    chipRad(OPPSETT.drikke, l.drikke, { visPris: true, eksklusiv: true, paakravd: true }));

  // Aldersgrensa står berre framme når ho gjeld, rett under valet.
  if (valdDrikke(l).aldersgrense) {
    var aldersmerknad = document.createElement('p');
    aldersmerknad.className = 'aldersmerknad';
    aldersmerknad.textContent = OPPSETT.ALDERSGRENSE_TEKST;
    drikkebolk.appendChild(aldersmerknad);
  }
  kort.appendChild(drikkebolk);

  /* — tilbehøyr som følgjer med.
       Kan ikkje heite «på burgeren» no som sausen gjer det. «Dette
       følgjer med» forklarar dessutan kvifor dei står avkryssa. — */
  kort.appendChild(bolk('Dette følgjer med — hak bort det du ikkje vil ha',
    chipRad(OPPSETT.tilbehoer, l.tilbehoer, {})));

  /* — linjesum — */
  var sum = document.createElement('div');
  sum.className = 'burgerlinje-sum';
  sum.textContent = linjePris(l) + ',-';
  kort.appendChild(sum);

  return kort;
}

/* Topping blir talde, ikkje hukte av, så chip-en duger ikkje her — ein
   chip har to tilstandar, og dette har seks.
   Ein rad per topping med minus, tal og pluss er tydelegare enn å pakke
   eit tal inn i ein chip, og trykkflatene blir store nok til tommelen. */
function toppingRad(l) {
  var rot = document.createElement('div');
  rot.className = 'topping-liste';

  OPPSETT.ekstra.forEach(function (e) {
    var n = l.ekstra[e.id] || 0;

    var rad = document.createElement('div');
    rad.className = 'topping' + (n ? ' er-paa' : '');

    rad.appendChild(lag('span', 'topping-namn', e.namn));

    var tel = document.createElement('div');
    tel.className = 'topping-tel';
    tel.appendChild(steg('&minus;', 'Færre ' + e.namn.toLowerCase(), n <= 0, function () {
      l.ekstra[e.id] = Math.max(0, n - 1); teiknAlt();
    }));
    var verdi = lag('span', 'topping-tal', String(n));
    verdi.setAttribute('aria-live', 'polite');
    verdi.setAttribute('aria-label', n + ' ' + e.namn.toLowerCase());
    tel.appendChild(verdi);
    tel.appendChild(steg('+', 'Fleire ' + e.namn.toLowerCase(), n >= e.maks, function () {
      l.ekstra[e.id] = Math.min(e.maks, n + 1); teiknAlt();
    }));
    rad.appendChild(tel);

    rad.appendChild(lag('span', 'topping-pris', n ? '+' + (n * e.pris) : ''));
    rot.appendChild(rad);
  });

  return rot;
}

function lag(tag, klasse, tekst) {
  var e = document.createElement(tag);
  e.className = klasse;
  if (tekst != null) e.textContent = tekst;
  return e;
}

function steg(teikn, merkelapp, av, fn) {
  var b = document.createElement('button');
  b.type = 'button';
  b.className = 'topping-knapp';
  b.innerHTML = teikn;
  b.setAttribute('aria-label', merkelapp);
  b.disabled = av;
  b.addEventListener('click', fn);
  return b;
}

function bolk(tittel, innhald) {
  var d = document.createElement('div');
  d.className = 'bolk';
  var h = document.createElement('span');
  h.className = 'bolk-tittel';
  h.textContent = tittel;
  d.appendChild(h);
  d.appendChild(innhald);
  return d;
}

/* Tre oppførslar, styrte av `val`:
     (ingen)      fritt av og på        — topping, tilbehøyr
     eksklusiv    anten–eller, eller    — saus: éin eller ingen
                  ingen
     eksklusiv +  anten–eller, må       — drikke: ein må alltid stå,
     paakravd     velje éin               så trykk på den valde gjer ingenting

   `visPris` viser «+10» og liknande. Prisen blir utelaten når han er 0,
   så «Mineralvatn +0» aldri dukkar opp. */
function chipRad(liste, tilstand, val) {
  val = val || {};
  var rad = document.createElement('div');
  rad.className = 'chip-rad';

  liste.forEach(function (x) {
    var paa = !!tilstand[x.id];
    var c = document.createElement('button');
    c.type = 'button';
    c.className = 'chip' + (paa ? ' er-paa' : '');
    c.setAttribute('aria-pressed', paa ? 'true' : 'false');

    var prislapp = (val.visPris && x.pris)
      ? ' <span class="chip-pris">+' + x.pris + '</span>' : '';
    c.innerHTML =
      '<span class="chip-hake" aria-hidden="true">' + (paa ? '✓' : '+') + '</span>' +
      x.namn + prislapp;

    c.addEventListener('click', function () {
      if (val.paakravd && paa) return; // det valde kan ikkje slåast av
      var nyVerdi = !tilstand[x.id];
      if (val.eksklusiv && nyVerdi) {
        liste.forEach(function (y) { tilstand[y.id] = false; });
      }
      tilstand[x.id] = nyVerdi;
      teiknAlt();
    });
    rad.appendChild(c);
  });

  return rad;
}

/* ──────────────────────────────────────────────────────────────────
   Oppteikning — hentetider
   ────────────────────────────────────────────────────────────────── */
/* Lukene kjem frå tenaren. Nettlesaren reknar dei ikkje ut sjølv —
   han veit ikkje kva andre har bestilt, og alt han reknar ut kan
   endrast av den som vil. */
var luker = [];
var lukerLasta = false;
var lukerFeila = false;

function hentLuker() {
  return fetch('/api/luker', { cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (d) {
      luker = d.luker || [];
      lukerLasta = true;
      lukerFeila = false;
      teiknAlt();
    })
    .catch(function () {
      // Viktig skilje: «ingen tider igjen» og «fekk ikkje kontakt» ser
      // like ut herifrå, men betyr heilt ulike ting for kunden. Den
      // første er ei opplysning, den andre er noko som kan prøvast om att.
      lukerLasta = true;
      lukerFeila = true;
      teiknAlt();
    });
}

function teiknLuker() {
  var rot = document.getElementById('luker');

  rot.innerHTML = '';

  if (!lukerLasta) {
    rot.innerHTML = '<p class="luker-tomt">Hentar ledige tider …</p>';
    return;
  }

  if (lukerFeila) {
    rot.innerHTML = '<p class="luker-tomt">Me fekk ikkje henta hentetidene akkurat no. ' +
      'Prøv å laste sida på nytt, eller ring oss på ' +
      '<a href="tel:' + OPPSETT.telefonLenke + '">' + OPPSETT.telefon + '</a>.</p>';
    return;
  }

  if (!luker.length) {
    rot.innerHTML = '<p class="luker-tomt">Det er ikkje fleire hentetider i dag. ' +
      'Prøv igjen i morgon, eller ring oss på ' +
      '<a href="tel:' + OPPSETT.telefonLenke + '">' + OPPSETT.telefon + '</a>.</p>';
    return;
  }

  luker.forEach(function (l) {
    var k = document.createElement('button');
    k.type = 'button';
    k.className = 'luke' + (ordre.luke === l.tid ? ' er-valt' : '');
    k.textContent = l.tid;
    k.disabled = !l.ledig;
    if (!l.ledig) {
      // Overstreking åleine seier ikkje kvifor. Skjermlesarar og
      // musepeikarar får forklaringa; sjølve ordet ville sprengt chipen.
      k.classList.add('er-teken');
      k.title = 'Alt bestilt';
      k.setAttribute('aria-label', l.tid + ' — alt bestilt');
    }
    k.addEventListener('click', function () { ordre.luke = l.tid; teiknAlt(); });
    rot.appendChild(k);
  });
}

/* ──────────────────────────────────────────────────────────────────
   Oppteikning — oppsummering
   ────────────────────────────────────────────────────────────────── */
function teiknOppsummering() {
  var liste = document.getElementById('sum-liste');
  liste.innerHTML = '';

  ordre.linjer.forEach(function (l, i) {
    var s = OPPSETT.storleikar.filter(function (x) { return x.id === l.storleik; })[0];

    var utan = OPPSETT.tilbehoer
      .filter(function (t) { return !l.tilbehoer[t.id]; })
      .map(function (t) { return t.namn.toLowerCase(); });

    // Ekstra og saus står saman i «med», sidan kunden ikkje tenkjer på
    // dei som to kategoriar — berre som ting han har lagt på.
    var med = OPPSETT.ekstra
      .filter(function (e) { return l.ekstra[e.id] > 0; })
      .map(function (e) {
        var n = l.ekstra[e.id];
        return (n > 1 ? n + '\u00d7 ' : '') + e.namn.toLowerCase();
      })
      .concat(OPPSETT.sausar
        .filter(function (s) { return l.sausar[s.id]; })
        .map(function (s) { return s.namn.toLowerCase(); }));

    var detaljar = [valdDrikke(l).namn.toLowerCase()];
    if (med.length) detaljar.push('med ' + somListe(med));
    if (utan.length) detaljar.push('utan ' + somListe(utan));

    var rad = document.createElement('div');
    rad.className = 'sum-rad';
    rad.innerHTML =
      '<div><strong>' + escapeHtml(visingsnamn(l, i)) + '</strong>' +
      // Produktnamnet, ikkje lyden. Gramtalet ligg alt i namnet, så det
      // skal ikkje gjentakast.
      '<span class="sum-detalj">' + s.produktnamn +
      (detaljar.length ? ' · ' + escapeHtml(detaljar.join(', ')) : '') + '</span></div>' +
      '<span class="sum-pris">' + linjePris(l) + ',-</span>';
    liste.appendChild(rad);
  });

  document.getElementById('sum-tid').textContent =
    ordre.luke ? 'Henting kl. ' + ordre.luke : 'Inga hentetid vald';
  document.getElementById('sum-total').textContent = totalPris() + ',-';

  var knapp = document.getElementById('betal');
  var harTlf = gyldigTelefon(ordre.telefon);
  knapp.disabled = !ordre.luke || !harTlf;
  knapp.textContent = !ordre.luke ? 'Vel ei hentetid'
    : !harTlf ? 'Skriv telefonnummeret ditt'
    : 'Betal ' + totalPris() + ',- med Vipps';
}

/* ──────────────────────────────────────────────────────────────────
   Skrivemaskin i namnefeltet

   Forslaga blir «skrivne» og «sletta» i plasshaldaren, som eit hint om
   kva feltet er til. Tre val er verdt å merke seg:

   1. Berre det FØRSTE tomme feltet animerer. Fem felt som skriv same
      ordet i takt ser ut som ein feil, ikkje som ein effekt.
   2. Animasjonen stoppar med ein gong feltet får fokus eller innhald.
      Ein plasshaldar som skriv medan du skriv er berre støy.
   3. prefers-reduced-motion slår han heilt av. Rørsle som ikkje kan
      skruast av er eit tilgjengeproblem, ikkje ein detalj.

   Tilstanden ligg utanfor DOM-en med vilje: teiknAlt() byggjer linjene
   på nytt ved kvart klikk, og ein animasjon festa til elementet ville
   då starta på nytt heile tida.
   ────────────────────────────────────────────────────────────────── */
function stokk(arr) {
  var ut = arr.slice();
  for (var i = ut.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = ut[i]; ut[i] = ut[j]; ut[j] = t;
  }
  return ut;
}

function startSkrivemaskin() {
  if (!OPPSETT.namneforslag || !OPPSETT.namneforslag.length) return;

  // Stokka per sidelasting. Ein fast rekkjefølgje ville blitt gjenkjenneleg
  // for stamkundar, og då sluttar forslaga å overraske.
  var forslag = stokk(OPPSETT.namneforslag);

  var roleg = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function tommeFelt() {
    return Array.prototype.filter.call(
      document.querySelectorAll('.namnefelt input'),
      function (f) { return !f.value && f !== document.activeElement; });
  }

  function vis(tekst) {
    var alle = document.querySelectorAll('.namnefelt input');
    var tomme = tommeFelt();
    Array.prototype.forEach.call(alle, function (f) {
      f.placeholder = (f === tomme[0]) ? tekst : OPPSETT.namnPlassHaldar;
    });
  }

  if (roleg) {
    vis(forslag[0]);
    setInterval(function () { vis(forslag[0]); }, 400);
    return;
  }

  var i = 0, n = 0, slettar = false;

  function tikk() {
    var ord = forslag[i];
    var vent;

    if (!slettar) {
      n++;
      if (n >= ord.length) { slettar = true; vent = 1900; }
      else vent = 58 + Math.random() * 50; // ujamn takt les som ei hand
    } else {
      n--;
      if (n <= 0) { slettar = false; i = (i + 1) % forslag.length; vent = 450; }
      else vent = 30;
    }

    vis(ord.slice(0, n) + (n < ord.length ? '|' : ''));
    setTimeout(tikk, vent);
  }

  tikk();
}

/* «ost», «ost og bacon», «ost, bacon og kebabsaus» — ikkje «ost og bacon
   og kebabsaus», som er det ein naiv join gjev når det blir tre ting. */
function somListe(ord) {
  if (ord.length < 2) return ord.join('');
  return ord.slice(0, -1).join(', ') + ' og ' + ord[ord.length - 1];
}

/* Åtte siffer, eventuelt med +47 eller 0047 føre. Me krev eit gyldig
   nummer fordi grillen må kunne nå kunden — eit felt som godtek kva
   som helst, er same som ikkje å spørje. */
function reinTelefon(verdi) {
  return String(verdi).replace(/[^\d+]/g, '');
}

function gyldigTelefon(verdi) {
  var t = reinTelefon(verdi).replace(/^(\+47|0047)/, '');
  return /^\d{8}$/.test(t);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function teiknAlt() {
  teiknLinjer();
  teiknLuker();
  teiknOppsummering();
}

/* Mellombels kvittering. Når Vipps er kopla til, går kunden herifrå
   til betaling i staden, og kvitteringa kjem etterpå. */
function visKvittering(d) {
  var ramme = document.querySelector('.oppsummering');
  ramme.innerHTML =
    '<h2><span class="steg-nr">\u2713</span> Bestillinga er motteken</h2>' +
    '<p class="kvitt-tid">Hent kl. <strong>' + d.hentetid + '</strong></p>' +
    '<p>Bestillingsnummer <strong>' + d.nr + '</strong> \u00b7 ' + d.sum + ',-</p>' +
    '<div class="merknad merknad-aatvaring"><strong>Betaling er ikkje kopla til enno.</strong> ' +
    'Bestillinga er lagra og ligg på grillskjermen, men ingen pengar er trekte. ' +
    'Når Vipps er på plass, blir dette steget betaling.</div>';
  ramme.scrollIntoView({ block: 'center' });
}

function visFeil(melding) {
  var boks = document.getElementById('vipps-mangler');
  boks.hidden = false;
  boks.innerHTML = '<strong>' + escapeHtml(melding) + '</strong>';
  var knapp = document.getElementById('betal');
  knapp.disabled = false;
  teiknOppsummering();
}

/* ──────────────────────────────────────────────────────────────────
   Oppstart
   ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('legg-til').addEventListener('click', function () {
    if (ordre.linjer.length < OPPSETT.maksMenyar) {
      ordre.linjer.push(nyLinje());
      teiknAlt();
      var felt = document.querySelectorAll('#linjer input[type=text]');
      if (felt.length) felt[felt.length - 1].focus();
    }
  });

  Array.prototype.forEach.call(document.querySelectorAll('.tlf'), function (a) {
    a.textContent = OPPSETT.telefon;
    a.href = 'tel:' + OPPSETT.telefonLenke;
  });

  var tlf = document.getElementById('kundetlf');
  tlf.addEventListener('input', function () {
    ordre.telefon = tlf.value;
    tlf.classList.toggle('er-ugyldig', tlf.value.length > 3 && !gyldigTelefon(tlf.value));
    teiknOppsummering();
  });

  document.getElementById('betal').addEventListener('click', function () {
    var knapp = document.getElementById('betal');
    knapp.disabled = true;
    knapp.textContent = 'Sender …';

    fetch('/api/ordre', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hentetid: ordre.luke,
        telefon: ordre.telefon,
        linjer: ordre.linjer.map(function (l) {
          return {
            namn: l.namn,
            storleik: l.storleik,
            ost: l.ekstra.ost || 0,
            bacon: l.ekstra.bacon || 0,
            saus: OPPSETT.sausar.filter(function (x) { return l.sausar[x.id]; })
                    .map(function (x) { return x.namn; })[0] || null,
            gronsaker: l.tilbehoer,
            drikke: valdDrikke(l).namn
          };
        })
      })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (svar) {
        if (svar.ok) {
          visKvittering(svar.d);
        } else {
          // Vanlegaste tilfellet: nokon tok tida medan kunden valde.
          // Me hentar lukene på nytt så lista er sann med ein gong.
          visFeil(svar.d.feil || 'Noko gjekk gale. Prøv igjen.');
          hentLuker();
        }
      })
      .catch(function () {
        visFeil('Fekk ikkje kontakt. Sjekk nettet og prøv igjen.');
        teiknAlt();
      });
  });

  teiknAlt();
  startSkrivemaskin();

  // Luker forsvinn etter kvart som tida går. Utan dette kunne ein kunde
  // sitje med sida open og velje ei luke som nett blei for nær i tid.
  hentLuker();
  setInterval(function () {
    var foer = ordre.luke;
    hentLuker().then(function () {
      // Tida kan ha gått ut, eller nokon andre kan ha teke henne
      // medan sida stod open. Begge delar ser like ut herifrå.
      var finst = luker.some(function (l) { return l.tid === foer && l.ledig; });
      if (foer && !finst) { ordre.luke = null; teiknAlt(); }
    });
  }, 30000);
});
