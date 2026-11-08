/* Ordrekjelde for grillskjermen.
 *
 * Dette er eit MELLOMLEGG. Skjermen snakkar berre med dette grensesnittet,
 * aldri med tenaren direkte. Når Workers og D1 er på plass, blir denne
 * fila bytt ut med ein som gjer verkelege kall — og grill.js treng ikkje
 * endrast i det heile.
 *
 * Fram til då ligg ordrane i localStorage, slik at dei overlever at
 * nettbrettet blir lada ut eller sida lasta på nytt under testing.
 *
 * STATUSAR
 *   ny        venter på at nokon i grillen godtek. Dette er den einaste
 *             statusen som utløyser lyd og eskalering.
 *   godteken  kjøkenet har sagt ja. Kunden har fått stadfesting.
 *   klar      ligg i luka, venter på kunden.
 *   henta     ferdig.
 *   avvist    me klarte ikkje levere. Krev refusjon.
 */
(function (global) {
  'use strict';

  var NOKKEL = 'osteroykroa-grill-testordrar';
  var lyttarar = [];

  /* ── Lagring ──────────────────────────────────────────────────── */
  function les() {
    try {
      var raa = localStorage.getItem(NOKKEL);
      return raa ? JSON.parse(raa) : [];
    } catch (e) {
      return [];
    }
  }

  function skriv(ordrar) {
    try {
      localStorage.setItem(NOKKEL, JSON.stringify(ordrar));
    } catch (e) {
      /* privat modus e.l. — skjermen skal framleis verke i minnet */
    }
    varsle();
  }

  function varsle() {
    var ordrar = les();
    lyttarar.forEach(function (fn) { fn(ordrar); });
  }

  /* ── Testdata ─────────────────────────────────────────────────── */
  var FORNAMN = ['Theodor', 'Semoa', 'Besto', 'Onkel', 'Tante', 'Cowboyen',
                 'Storebror', 'Lillesøster', 'Damo', 'Typen'];
  var PRODUKT = ['Osterøymeny 120', 'Osterøymeny 240', 'Osterøymeny 360'];
  var PRIS = { 'Osterøymeny 120': 239, 'Osterøymeny 240': 299, 'Osterøymeny 360': 359 };
  var TILBEHOER = ['salat', 'mais', 'dressing', 'løk', 'sylteagurk'];

  function slump(liste) {
    return liste[Math.floor(Math.random() * liste.length)];
  }

  function nesteOrdrenummer(ordrar) {
    var hogst = 0;
    ordrar.forEach(function (o) {
      var n = parseInt(String(o.id).replace(/\D/g, ''), 10);
      if (n > hogst) hogst = n;
    });
    return 'A' + (hogst + 1);
  }

  /** Lagar ei realistisk testordre til neste ledige luke. */
  function lagTestordre() {
    var ordrar = les();
    var opptekne = ordrar
      .filter(function (o) { return o.status !== 'avvist'; })
      .map(function (o) { return o.hentetid; });

    var luke = (typeof nesteLedige === 'function')
      ? nesteLedige({ now: new Date(), opptekne: opptekne })
      : null;
    if (!luke) return null;

    var tal = 1 + Math.floor(Math.random() * 2);
    var linjer = [];
    var sum = 0;
    for (var i = 0; i < tal; i++) {
      var produkt = slump(PRODUKT);
      var ost = Math.random() > 0.3;
      var bacon = Math.random() > 0.5;
      var energi = Math.random() > 0.75;
      var utan = TILBEHOER.filter(function () { return Math.random() > 0.82; });
      var med = [];
      if (ost) med.push('ost');
      if (bacon) med.push('bacon');
      if (Math.random() > 0.7) med.push(slump(['kebabsaus', 'bearnaise']));

      var pris = PRIS[produkt] + (ost ? 20 : 0) + (bacon ? 20 : 0) + (energi ? 10 : 0);
      sum += pris;

      linjer.push({
        namn: slump(FORNAMN),
        produkt: produkt,
        drikke: energi ? 'Energidrikk' : 'Mineralvatn',
        aldersgrense: energi,
        med: med,
        utan: utan,
        pris: pris
      });
    }

    var ordre = {
      id: nesteOrdrenummer(ordrar),
      motteke: Date.now(),
      hentetid: luke.tid,
      status: 'ny',
      kunde: { namn: slump(FORNAMN), telefon: '9' + (10000000 + Math.floor(Math.random() * 89999999)) },
      linjer: linjer,
      sum: sum
    };

    ordrar.push(ordre);
    skriv(ordrar);
    return ordre;
  }

  /* ── Grensesnittet skjermen brukar ────────────────────────────── */
  var Ordrekjelde = {
    /** Kallast med heile lista no, og på nytt ved kvar endring. */
    lytt: function (fn) {
      lyttarar.push(fn);
      fn(les());
    },

    hent: les,

    settStatus: function (id, status) {
      var ordrar = les();
      ordrar.forEach(function (o) {
        if (o.id === id) {
          o.status = status;
          if (status === 'godteken') o.godteke = Date.now();
        }
      });
      skriv(ordrar);
    },

    /** Berre i testmodus. Den ekte kjelda får ordrar frå Vipps. */
    lagTestordre: lagTestordre,

    tomTestdata: function () {
      skriv([]);
    },

    erTestkjelde: true
  };

  global.Ordrekjelde = Ordrekjelde;
})(window);
