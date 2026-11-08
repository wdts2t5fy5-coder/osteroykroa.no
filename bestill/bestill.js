/* Bestillingsflyt for Osterøyburger — pilot.
 *
 * Ingen betaling er kopla på enno; Vipps-avtalen er i bestilling.
 * Knappen til slutt viser kva som vil skje, men sender ingenting.
 */

/* ──────────────────────────────────────────────────────────────────
   Innstillingar. Alt Roy skal kunne endre ligg her, og berre her.
   ────────────────────────────────────────────────────────────────── */
var OPPSETT = {
  // PRISANE ER PLASSHALDARAR og må stadfestast av Roy.
  // Til samanlikning, «ta med»-prisar frå menyen i dag:
  //   Osterøy burger (éi storleik) 239
  //   Jafs Burger 200 g 255 · 320 g 309 · 500 g 439
  storleikar: [
    { id: 'enkel',   gram: 120, namn: 'Litt sulten?',  pris: 239, plasshaldar: true },
    { id: 'dobbel',  gram: 240, namn: 'Sulten.',       pris: 299, plasshaldar: true },
    { id: 'trippel', gram: 360, namn: 'Kjempe-sulten!', pris: 359, plasshaldar: true }
  ],

  // Alternativt namnesett, om Roy heller vil ha dette:
  //   Lunsj · Middag · Festmåltid

  maksPerOrdre: 10,
  telefon: '56 19 34 34',
  telefonLenke: '+4756193434'
};

/* ──────────────────────────────────────────────────────────────────
   Tilstand
   ────────────────────────────────────────────────────────────────── */
var valt = {
  storleik: null,
  tal: 1,
  luke: null
};

// Opptekne luker. Kjem frå tenaren når han finst; tom i piloten.
var opptekneLuker = [];

/* ──────────────────────────────────────────────────────────────────
   Oppteikning
   ────────────────────────────────────────────────────────────────── */
function teiknStorleikar() {
  var rot = document.getElementById('storleikar');
  rot.innerHTML = '';

  OPPSETT.storleikar.forEach(function (s) {
    var kort = document.createElement('button');
    kort.type = 'button';
    kort.className = 'val-kort' + (valt.storleik === s.id ? ' er-valt' : '');
    kort.setAttribute('aria-pressed', valt.storleik === s.id ? 'true' : 'false');
    kort.innerHTML =
      '<span class="val-kort-namn">' + s.namn + '</span>' +
      '<span class="val-kort-gram">' + s.gram + ' g</span>' +
      '<span class="val-kort-pris">' + s.pris + ',-</span>';
    kort.addEventListener('click', function () {
      valt.storleik = s.id;
      teiknAlt();
    });
    rot.appendChild(kort);
  });
}

function teiknTal() {
  document.getElementById('tal-verdi').textContent = valt.tal;
  document.getElementById('tal-ned').disabled = valt.tal <= 1;

  // Over grensa stoppar me ikkje kunden med ein vegg, men ber dei ringje.
  var over = valt.tal >= OPPSETT.maksPerOrdre;
  document.getElementById('tal-opp').disabled = over;
  document.getElementById('stor-ordre').hidden = !over;
}

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
    var knapp = document.createElement('button');
    knapp.type = 'button';
    knapp.className = 'luke' + (valt.luke === l.tid ? ' er-valt' : '');
    knapp.textContent = l.tid;
    knapp.disabled = !l.ledig;
    if (!l.ledig) {
      knapp.classList.add('er-teken');
      knapp.title = 'Alt bestilt';
    }
    knapp.addEventListener('click', function () {
      valt.luke = l.tid;
      teiknAlt();
    });
    rot.appendChild(knapp);
  });
}

function teiknOppsummering() {
  var s = finnStorleik();
  var klar = s && valt.luke;
  var sum = s ? s.pris * valt.tal : 0;

  document.getElementById('sum-linje').textContent = s
    ? valt.tal + ' × ' + s.namn + ' (' + s.gram + ' g)'
    : 'Ingen burger vald enno';
  document.getElementById('sum-tid').textContent = valt.luke
    ? 'Henting kl. ' + valt.luke
    : 'Inga hentetid vald';
  document.getElementById('sum-total').textContent = sum ? sum + ',-' : '–';

  var knapp = document.getElementById('betal');
  knapp.disabled = !klar;
  knapp.textContent = klar ? 'Betal ' + sum + ',- med Vipps' : 'Vel burger og hentetid';
}

function teiknAlt() {
  teiknStorleikar();
  teiknTal();
  teiknLuker();
  teiknOppsummering();
}

function finnStorleik() {
  for (var i = 0; i < OPPSETT.storleikar.length; i++) {
    if (OPPSETT.storleikar[i].id === valt.storleik) return OPPSETT.storleikar[i];
  }
  return null;
}

/* ──────────────────────────────────────────────────────────────────
   Oppstart
   ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('tal-ned').addEventListener('click', function () {
    if (valt.tal > 1) { valt.tal--; teiknAlt(); }
  });
  document.getElementById('tal-opp').addEventListener('click', function () {
    if (valt.tal < OPPSETT.maksPerOrdre) { valt.tal++; teiknAlt(); }
  });

  document.getElementById('telefon-stor-ordre').textContent = OPPSETT.telefon;
  document.getElementById('telefon-stor-ordre').href = 'tel:' + OPPSETT.telefonLenke;

  document.getElementById('betal').addEventListener('click', function () {
    document.getElementById('vipps-mangler').hidden = false;
  });

  teiknAlt();

  // Luker forsvinn etter kvart som tida går. Utan dette kunne ein kunde
  // sitje med sida open og velje ei luke som nett blei for nær i tid.
  setInterval(function () {
    var foer = valt.luke;
    teiknLuker();
    var finst = Array.prototype.some.call(
      document.querySelectorAll('#luker .luke'),
      function (k) { return k.textContent === foer; }
    );
    if (foer && !finst) { valt.luke = null; teiknAlt(); }
  }, 30000);
});
