/* Ordrekjelde for grillskjermen — no mot ekte data.
 *
 * Dette er same mellomlegget som før, men innmaten er bytt ut: i staden
 * for testordrar i localStorage spør han tenaren. grill.js er ikkje
 * endra — det var heile poenget med å ha eit mellomlegg.
 *
 * Skjermen spør kvart femte sekund. Det er ikkje elegant, men det er
 * robust: skjermen hentar seg inn att av seg sjølv etter ein nettbrot,
 * ei omstart eller eit tapt wifi, utan at nokon treng gjere noko.
 */
(function (global) {
  'use strict';

  var NOKKEL_TOKEN = 'osteroykroa-grill-token';
  var INTERVALL_MS = 5000;

  var lyttarar = [];
  var ordrar = [];
  var stengde = [];
  var sisteFeil = null;

  function token() {
    try { return localStorage.getItem(NOKKEL_TOKEN) || ''; } catch (e) { return ''; }
  }

  function settToken(t) {
    try { localStorage.setItem(NOKKEL_TOKEN, t); } catch (e) {}
  }

  function kall(sti, val) {
    val = val || {};
    val.headers = Object.assign({
      'authorization': 'Bearer ' + token(),
      'content-type': 'application/json'
    }, val.headers || {});
    return fetch('/api/grill/' + sti, val).then(function (r) {
      if (r.status === 401) throw new Error('LOYVE');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function varsle() {
    lyttarar.forEach(function (fn) { fn(ordrar); });
  }

  function hentNo() {
    return kall('ordrar').then(function (d) {
      ordrar = d.ordrar || [];
      stengde = d.stengde || [];
      sisteFeil = null;
      varsle();
    }).catch(function (e) {
      // Me held på det me har. Ein skjerm som tømmer seg sjølv fordi
      // wifien blunka, er verre enn ein som viser litt gamle data.
      sisteFeil = String(e.message || e);
      varsle();
    });
  }

  var Ordrekjelde = {
    lytt: function (fn) {
      lyttarar.push(fn);
      fn(ordrar);
    },

    hent: function () { return ordrar; },

    hentStengde: function () { return stengde; },

    settStatus: function (id, status) {
      var o = ordrar.filter(function (x) { return x.id === id; })[0];
      if (!o) return;

      // Vis endringa med ein gong, og la tenaren stadfeste etterpå.
      // Eit kjøkken skal ikkje måtte vente på nettverket for å sjå at
      // trykket gjekk inn.
      o.status = status;
      varsle();

      kall('status', {
        method: 'POST',
        body: JSON.stringify({ nr: o.nr, status: status })
      }).then(hentNo).catch(hentNo);
    },

    steng: function (tid) {
      return kall('steng', {
        method: 'POST',
        body: JSON.stringify({ hentetid: tid })
      }).then(function (d) { return hentNo().then(function () { return d; }); });
    },

    /* Statuslinja spør om dette for å kunne seie frå når skjermen har
       mista kontakten. */
    sisteFeil: function () { return sisteFeil; },

    harToken: function () { return !!token(); },
    settToken: function (t) { settToken(t); return hentNo(); },

    erTestkjelde: false,

    start: function () {
      hentNo();
      setInterval(hentNo, INTERVALL_MS);
    }
  };

  global.Ordrekjelde = Ordrekjelde;
})(window);
