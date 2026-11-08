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

  // Svara er sjølve lydane, så spørsmålet «Kva lyd lagar magen?» blir
  // bokstavleg. Stigninga knurr → rumling → buldring går oppover heile
  // vegen, slik at det største også høyrest størst ut.
  storleikar: [
    { id: 'enkel',   gram: 120, namn: 'Knurr' },
    { id: 'dobbel',  gram: 240, namn: 'Rumling' },
    { id: 'trippel', gram: 360, namn: 'Buldring' }
  ],

  // Kostar ekstra. På frå start, kunden hukar dei bort.
  ekstra: [
    { id: 'ost',   namn: 'Ost',   pris: 20 },
    { id: 'bacon', namn: 'Bacon', pris: 20 }
  ],

  // Kostar ingenting, men er AV frå start — dette er noko kunden legg
  // til, ikkje noko han tek bort. Mange spør om det på telefonen, så
  // det ville blitt sakna om det berre fanst munnleg.
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

  maksBurgarar: 10,
  telefon: '56 19 34 34',
  telefonLenke: '+4756193434'
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
  var l = { id: nesteId++, namn: '', storleik: 'enkel', ekstra: {}, sausar: {}, tilbehoer: {} };
  OPPSETT.ekstra.forEach(function (e) { l.ekstra[e.id] = true; });        // på frå start
  OPPSETT.sausar.forEach(function (s) { l.sausar[s.id] = false; });       // AV frå start
  OPPSETT.tilbehoer.forEach(function (t) { l.tilbehoer[t.id] = true; });  // på frå start
  return l;
}

var ordre = { linjer: [nyLinje()], luke: null };
var opptekneLuker = []; // kjem frå tenaren når han finst

function linjePris(l) {
  var sum = prisFor(l.storleik);
  OPPSETT.ekstra.forEach(function (e) { if (l.ekstra[e.id]) sum += e.pris; });
  return sum;
}

function totalPris() {
  return ordre.linjer.reduce(function (s, l) { return s + linjePris(l); }, 0);
}

function visingsnamn(l, i) {
  return l.namn.trim() || ('Burger ' + (i + 1));
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
  var full = ordre.linjer.length >= OPPSETT.maksBurgarar;
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
  merkelapp.innerHTML = '<span>Kven er burgeren til?</span>';

  var felt = document.createElement('input');
  felt.type = 'text';
  felt.value = l.namn;
  felt.placeholder = 't.d. Theodor';
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

  /* — ekstra som kostar — */
  kort.appendChild(bolk('Vil du ha noko ekstra?', chipRad(OPPSETT.ekstra, l.ekstra, l, true)));

  /* — saus, gratis, av frå start — */
  kort.appendChild(bolk('Litt saus attåt?', chipRad(OPPSETT.sausar, l.sausar, l, false)));

  /* — tilbehøyr som følgjer med — */
  kort.appendChild(bolk('På burgeren — hak bort det du ikkje vil ha',
    chipRad(OPPSETT.tilbehoer, l.tilbehoer, l, false)));

  /* — linjesum — */
  var sum = document.createElement('div');
  sum.className = 'burgerlinje-sum';
  sum.textContent = linjePris(l) + ',-';
  kort.appendChild(sum);

  return kort;
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

function chipRad(liste, tilstand, linje, visPris) {
  var rad = document.createElement('div');
  rad.className = 'chip-rad';

  liste.forEach(function (x) {
    var paa = !!tilstand[x.id];
    var c = document.createElement('button');
    c.type = 'button';
    c.className = 'chip' + (paa ? ' er-paa' : '');
    c.setAttribute('aria-pressed', paa ? 'true' : 'false');
    c.innerHTML =
      '<span class="chip-hake" aria-hidden="true">' + (paa ? '✓' : '+') + '</span>' +
      x.namn + (visPris ? ' <span class="chip-pris">+' + x.pris + '</span>' : '');
    c.addEventListener('click', function () {
      tilstand[x.id] = !tilstand[x.id];
      teiknAlt();
    });
    rad.appendChild(c);
  });

  return rad;
}

/* ──────────────────────────────────────────────────────────────────
   Oppteikning — hentetider
   ────────────────────────────────────────────────────────────────── */
function teiknLuker() {
  var rot = document.getElementById('luker');
  var luker = ledigeLuker({ now: new Date(), opptekne: opptekneLuker });

  rot.innerHTML = '';

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
    if (!l.ledig) { k.classList.add('er-teken'); k.title = 'Alt bestilt'; }
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
      .filter(function (e) { return l.ekstra[e.id]; })
      .map(function (e) { return e.namn.toLowerCase(); })
      .concat(OPPSETT.sausar
        .filter(function (s) { return l.sausar[s.id]; })
        .map(function (s) { return s.namn.toLowerCase(); }));

    var detaljar = [];
    if (med.length) detaljar.push('med ' + somListe(med));
    if (utan.length) detaljar.push('utan ' + somListe(utan));

    var rad = document.createElement('div');
    rad.className = 'sum-rad';
    rad.innerHTML =
      '<div><strong>' + escapeHtml(visingsnamn(l, i)) + '</strong>' +
      '<span class="sum-detalj">' + s.namn + ', ' + s.gram + ' g' +
      (detaljar.length ? ' · ' + escapeHtml(detaljar.join(', ')) : '') + '</span></div>' +
      '<span class="sum-pris">' + linjePris(l) + ',-</span>';
    liste.appendChild(rad);
  });

  document.getElementById('sum-tid').textContent =
    ordre.luke ? 'Henting kl. ' + ordre.luke : 'Inga hentetid vald';
  document.getElementById('sum-total').textContent = totalPris() + ',-';

  var knapp = document.getElementById('betal');
  knapp.disabled = !ordre.luke;
  knapp.textContent = ordre.luke
    ? 'Betal ' + totalPris() + ',- med Vipps'
    : 'Vel ei hentetid';
}

/* «ost», «ost og bacon», «ost, bacon og kebabsaus» — ikkje «ost og bacon
   og kebabsaus», som er det ein naiv join gjev når det blir tre ting. */
function somListe(ord) {
  if (ord.length < 2) return ord.join('');
  return ord.slice(0, -1).join(', ') + ' og ' + ord[ord.length - 1];
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

/* ──────────────────────────────────────────────────────────────────
   Oppstart
   ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('legg-til').addEventListener('click', function () {
    if (ordre.linjer.length < OPPSETT.maksBurgarar) {
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

  document.getElementById('betal').addEventListener('click', function () {
    document.getElementById('vipps-mangler').hidden = false;
  });

  teiknAlt();

  // Luker forsvinn etter kvart som tida går. Utan dette kunne ein kunde
  // sitje med sida open og velje ei luke som nett blei for nær i tid.
  setInterval(function () {
    var foer = ordre.luke;
    teiknLuker();
    var finst = Array.prototype.some.call(
      document.querySelectorAll('#luker .luke'),
      function (k) { return k.textContent === foer; }
    );
    if (foer && !finst) { ordre.luke = null; teiknAlt(); }
  }, 30000);
});
