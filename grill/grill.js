/* Grillskjermen — nettbrett på veggen i grillen.
 *
 * Premisset: ei ordre er ikkje motteken før nokon her har trykt «Godta».
 * Betalinga gjekk gjennom hjå kunden, men maten blir ikkje til av det.
 * Difor pip skjermen, og difor eskalerer han om ingen svarar.
 *
 * Skjermen snakkar berre med Ordrekjelde, aldri med tenaren direkte.
 */
'use strict';

var OPPSETT = {
  lagTidMinutt: 12,       // når skjermen seier LAG NO
  eskalerSekund: 180,     // uakseptert så lenge → kraftigare varsel
  pipKvartSekund: 20,     // kor ofte det pip medan noko ventar
  telefonRoy: '+4756193434'
};

/* ──────────────────────────────────────────────────────────────────
   Lyd

   Nettlesarar blokkerer lyd til brukaren har gjort noko. På eit
   veggnettbrett tyder det at nokon må trykkje éin gong etter kvar
   omstart. Det er ikkje til å kome utanom, så me gjer det tydeleg i
   staden for å la lyden stille feile.
   ────────────────────────────────────────────────────────────────── */
var Lyd = (function () {
  var ctx = null;

  function slaaPaa() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!ctx) ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume();
      pip(1);
      return true;
    } catch (e) {
      return false;
    }
  }

  function tone(start, frekvens, lengd) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = frekvens;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + lengd);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + lengd + 0.02);
  }

  function pip(gonger) {
    if (!ctx || ctx.state !== 'running') return;
    var t = ctx.currentTime;
    for (var i = 0; i < gonger; i++) {
      tone(t + i * 0.26, 880, 0.14);
      tone(t + i * 0.26 + 0.13, 1320, 0.13);
    }
  }

  return {
    slaaPaa: slaaPaa,
    pip: pip,
    erPaa: function () { return !!ctx && ctx.state === 'running'; }
  };
})();

/* ──────────────────────────────────────────────────────────────────
   Hald skjermen vaken

   Eit nettbrett som søv er ein skjerm ingen ser. Wake Lock finst ikkje
   overalt, så dette er ein bonus og ikkje noko me stolar på — difor
   seier statuslinja frå om det ikkje gjekk.
   ────────────────────────────────────────────────────────────────── */
var vaken = null;
function haldVaken() {
  if (!('wakeLock' in navigator)) return;
  navigator.wakeLock.request('screen').then(function (l) {
    vaken = l;
    oppdaterStatuslinje();
  }).catch(function () { /* nekta eller ikkje støtta */ });
}
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible' && !vaken) haldVaken();
});

/* ──────────────────────────────────────────────────────────────────
   Hjelp
   ────────────────────────────────────────────────────────────────── */
function naaMinutt() {
  var d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function tidTilMinutt(tid) {
  var d = tid.split(':');
  return parseInt(d[0], 10) * 60 + parseInt(d[1], 10);
}

function minuttTekst(m) {
  if (m < 0) return 'for ' + Math.abs(m) + ' min sidan';
  if (m === 0) return 'no';
  if (m < 60) return 'om ' + m + ' min';
  var t = Math.floor(m / 60);
  return 'om ' + t + ' t ' + (m % 60) + ' min';
}

function el(tag, klasse, tekst) {
  var e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (tekst != null) e.textContent = tekst;
  return e;
}

/* ──────────────────────────────────────────────────────────────────
   Oppteikning
   ────────────────────────────────────────────────────────────────── */
var ordrar = [];
var stengdeLuker = [];

function sorterPaaTid(a, b) {
  return tidTilMinutt(a.hentetid) - tidTilMinutt(b.hentetid);
}

function teikn() {
  var nye = ordrar.filter(function (o) { return o.status === 'ny'; }).sort(sorterPaaTid);
  var aktive = ordrar.filter(function (o) {
    return o.status === 'godteken' || o.status === 'klar';
  }).sort(sorterPaaTid);
  var ferdige = ordrar.filter(function (o) {
    return o.status === 'henta' || o.status === 'avvist';
  }).sort(sorterPaaTid);

  teiknBlokk('nye', nye);
  teiknBlokk('aktive', aktive);
  teiknBlokk('ferdige', ferdige);

  document.getElementById('blokk-nye').hidden = !nye.length;
  document.getElementById('blokk-ferdige').hidden = !ferdige.length;
  document.getElementById('tomt').hidden = !!(nye.length || aktive.length);

  oppdaterStatuslinje();
}

function teiknBlokk(id, liste) {
  var rot = document.getElementById(id);
  rot.innerHTML = '';
  liste.forEach(function (o) { rot.appendChild(byggOrdre(o)); });
}

function byggOrdre(o) {
  var att = tidTilMinutt(o.hentetid) - naaMinutt();
  var fase = finnFase(o, att);

  var kort = el('article', 'ordre ordre--' + fase);

  /* — topplinje — */
  var topp = el('div', 'ordre-topp');
  topp.appendChild(el('span', 'ordre-tid', o.hentetid));
  topp.appendChild(el('span', 'ordre-nedtel', minuttTekst(att)));
  topp.appendChild(el('span', 'ordre-id', o.id));
  kort.appendChild(topp);

  if (fase === 'ny' || fase === 'eskalert' || fase === 'lag') {
    var merke = el('div', 'ordre-merke', {
      ny: 'NY — må godtakast',
      eskalert: 'IKKJE GODTEKEN',
      lag: 'LAG NO'
    }[fase]);
    kort.appendChild(merke);
  }

  /* — linjene — */
  var ul = el('ul', 'ordre-linjer');
  o.linjer.forEach(function (l) {
    var li = el('li');
    li.appendChild(el('span', 'linje-namn', l.namn));
    li.appendChild(el('span', 'linje-produkt', l.produkt));

    var d = el('span', 'linje-detalj');
    if (l.med && l.med.length) {
      d.appendChild(el('span', 'merke-med', '+ ' + l.med.join(', ')));
    }
    // Utan-lista er det som oftast går gale, så ho skal rope.
    if (l.utan && l.utan.length) {
      d.appendChild(el('span', 'merke-utan', 'UTAN ' + l.utan.join(', ')));
    }
    d.appendChild(el('span', 'merke-drikke', l.drikke));
    if (l.aldersgrense) {
      d.appendChild(el('span', 'merke-alder', 'SJEKK ALDER 16+'));
    }
    li.appendChild(d);
    ul.appendChild(li);
  });
  kort.appendChild(ul);

  /* — knappar — */
  var rad = el('div', 'ordre-knappar');
  if (o.status === 'ny') {
    rad.appendChild(knapp('Godta', 'kn kn--ja', function () {
      Ordrekjelde.settStatus(o.id, 'godteken');
    }));
    rad.appendChild(knapp('Kan ikkje levere', 'kn kn--nei', function () {
      if (confirm('Avvise ordre ' + o.id + '?\n\nKunden har betalt, så dette krev refusjon.')) {
        Ordrekjelde.settStatus(o.id, 'avvist');
      }
    }));
  } else if (o.status === 'godteken') {
    rad.appendChild(knapp('Klar i luka', 'kn kn--ja', function () {
      Ordrekjelde.settStatus(o.id, 'klar');
    }));
  } else if (o.status === 'klar') {
    rad.appendChild(knapp('Henta', 'kn kn--ferdig', function () {
      Ordrekjelde.settStatus(o.id, 'henta');
    }));
  }

  if (o.status === 'ny' || o.status === 'godteken' || o.status === 'klar') {
    var tlf = el('a', 'kn kn--tlf', 'Ring kunden');
    tlf.href = 'tel:' + (o.kunde.telefon || '');
    rad.appendChild(tlf);
  }
  kort.appendChild(rad);

  var botn = el('div', 'ordre-botn');
  botn.appendChild(el('span', null, o.kunde.namn + ' · ' + o.kunde.telefon));
  botn.appendChild(el('span', 'ordre-sum', o.sum + ',-'));
  kort.appendChild(botn);

  return kort;
}

function finnFase(o, minuttAtt) {
  if (o.status === 'ny') {
    var ventaSek = (Date.now() - o.motteke) / 1000;
    return ventaSek > OPPSETT.eskalerSekund ? 'eskalert' : 'ny';
  }
  if (o.status === 'godteken' && minuttAtt <= OPPSETT.lagTidMinutt) return 'lag';
  if (o.status === 'klar') return 'klar';
  if (o.status === 'henta') return 'henta';
  if (o.status === 'avvist') return 'avvist';
  return 'venter';
}

function knapp(tekst, klasse, fn) {
  var b = el('button', klasse, tekst);
  b.type = 'button';
  b.addEventListener('click', fn);
  return b;
}

/* ──────────────────────────────────────────────────────────────────
   Statuslinje og klokke
   ────────────────────────────────────────────────────────────────── */
function oppdaterStatuslinje() {
  var nye = ordrar.filter(function (o) { return o.status === 'ny'; }).length;
  var paagaar = ordrar.filter(function (o) {
    return o.status === 'godteken' || o.status === 'klar';
  }).length;

  document.getElementById('tal-nye').textContent = nye;
  document.getElementById('tal-paagaar').textContent = paagaar;
  document.getElementById('body').classList.toggle('har-nye', nye > 0);

  var lyd = document.getElementById('lydstatus');
  lyd.textContent = Lyd.erPaa() ? 'Lyd på' : 'Lyd AV — trykk her';
  lyd.classList.toggle('av', !Lyd.erPaa());

  var vak = document.getElementById('vakenstatus');
  vak.hidden = !!vaken || !('wakeLock' in navigator);
}

function oppdaterKlokke() {
  var d = new Date();
  document.getElementById('klokke').textContent =
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/* ──────────────────────────────────────────────────────────────────
   Varsling

   Pip så lenge noko ventar på å bli godteke. Det sluttar av seg sjølv
   når nokon trykkjer Godta — det er heile poenget.
   ────────────────────────────────────────────────────────────────── */
var sistPip = 0;
function sjekkVarsel() {
  var nye = ordrar.filter(function (o) { return o.status === 'ny'; });
  if (!nye.length) { sistPip = 0; return; }

  var no = Date.now();
  if (no - sistPip < OPPSETT.pipKvartSekund * 1000) return;
  sistPip = no;

  var eskalert = nye.some(function (o) {
    return (no - o.motteke) / 1000 > OPPSETT.eskalerSekund;
  });
  Lyd.pip(eskalert ? 5 : 2);
}

/* ──────────────────────────────────────────────────────────────────
   Oppstart
   ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  Ordrekjelde.lytt(function (liste) {
    ordrar = liste;
    teikn();
    sjekkVarsel();
  });

  document.getElementById('lydstatus').addEventListener('click', function () {
    Lyd.slaaPaa();
    oppdaterStatuslinje();
  });

  document.getElementById('steng-luke').addEventListener('click', function () {
    var luker = ledigeLuker({ now: new Date(), opptekne: stengdeLuker });
    if (!luker.length) { alert('Det er ingen fleire luker i dag.'); return; }
    var neste = luker[0].tid;
    if (confirm('Stenge ' + neste + ' for nettbestilling?\n\n' +
                'Kundar kan då ikkje velje den tida.')) {
      stengdeLuker.push(neste);
      alert('Lukka ' + neste + ' er stengd.\n\n' +
            'MERK: I denne testversjonen gjeld det berre på denne skjermen. ' +
            'Først når tenaren er på plass når det fram til bestillingssida.');
    }
  });

  var test = document.getElementById('testordre');
  if (Ordrekjelde.erTestkjelde) {
    test.addEventListener('click', function () {
      if (!Ordrekjelde.lagTestordre()) alert('Ingen ledige luker igjen i dag.');
    });
    document.getElementById('tom-test').addEventListener('click', function () {
      if (confirm('Slette alle testordrar?')) Ordrekjelde.tomTestdata();
    });
  } else {
    document.getElementById('testverktoy').hidden = true;
  }

  haldVaken();
  oppdaterKlokke();
  teikn();

  // Tida går, så fasane endrar seg utan at nokon rører noko:
  // «om 20 min» blir «LAG NO», og ei ugodteken ordre blir eskalert.
  setInterval(function () {
    oppdaterKlokke();
    teikn();
    sjekkVarsel();
  }, 5000);
});
