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
  // Same id-ar som bestillingssida brukar, så dei to snakkar same språk.
  var TILBEHOER = ['salat', 'mais', 'dressing', 'lok', 'sylteagurk'];

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
    // Stengde luker tel som opptekne — ei testordre skal ikkje kunne
    // hamne i ei luke kjøkenet nettopp har stengt.
    var opptekne = ordrar
      .filter(function (o) { return o.status !== 'avvist'; })
      .map(function (o) { return o.hentetid; })
      .concat(Ordrekjelde.hentStengde());

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

      var gronsaker = {};
      TILBEHOER.forEach(function (g) { gronsaker[g] = Math.random() > 0.18; });

      var pris = PRIS[produkt] + (ost ? 20 : 0) + (bacon ? 20 : 0) + (energi ? 10 : 0);
      sum += pris;

      // Forma på ei ordrelinje. Dette er kontrakten grillskjermen les,
      // og den tenaren skal levere når han kjem: eigne felt for kvar
      // ting, ikkje lister med tekst. Skjermen skal sleppe å tolke.
      linjer.push({
        namn: slump(FORNAMN),
        produkt: produkt,
        ost: ost,
        bacon: bacon,
        saus: Math.random() > 0.7 ? slump(['Kebabsaus', 'Bearnaise']) : null,
        gronsaker: gronsaker,
        drikke: energi ? 'Energidrikk' : 'Mineralvatn',
        aldersgrense: energi,
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

    /* Luker kjøkenet har stengt for nettbestilling. Dei må overleve at
       sida blir lasta på nytt — ei stengd luke som kjem att av seg
       sjølv er verre enn inga stenging. */
    hentStengde: function () {
      try {
        var raa = localStorage.getItem(NOKKEL + '-stengde');
        return raa ? JSON.parse(raa) : [];
      } catch (e) {
        return [];
      }
    },

    steng: function (tid) {
      var liste = Ordrekjelde.hentStengde();
      if (liste.indexOf(tid) === -1) liste.push(tid);
      try {
        localStorage.setItem(NOKKEL + '-stengde', JSON.stringify(liste));
      } catch (e) { /* privat modus */ }
      varsle();
    },

    /** Berre i testmodus. Den ekte kjelda får ordrar frå Vipps. */
    lagTestordre: lagTestordre,

    tomTestdata: function () {
      try { localStorage.removeItem(NOKKEL + '-stengde'); } catch (e) {}
      skriv([]);
    },

    erTestkjelde: true
  };

  global.Ordrekjelde = Ordrekjelde;
})(window);
