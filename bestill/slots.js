/* Lukelogikk for nettbestilling — Osterøykroa pilot.
 *
 * Reglar (frå Roy):
 *   - To hentetider per time: heil og halv.
 *   - Éi ordre fyller heile luka. Er luka teken, er ho borte.
 *   - Minst 15 minutt frå bestilling til henting, fordi maten skal lagast.
 *     Kl. 13:15 er siste minutt ein kan velje 13:30. Kl. 13:16 er neste
 *     ledige 14:00.
 *   - Luker som har passert forsvinn frå sida etter kvart som dagen går.
 *
 * Funksjonen er rein: han gjer ingen kall ut og les ikkje klokka sjølv.
 * Det er difor han kan testast på grensetilfella.
 */

var OSTEROYKROA_OPNINGSTIDER = {
  0: [13 * 60, 21 * 60], // sundag
  1: [11 * 60, 21 * 60], // måndag
  2: [11 * 60, 21 * 60],
  3: [11 * 60, 21 * 60],
  4: [11 * 60, 21 * 60], // torsdag
  5: [11 * 60, 22 * 60], // fredag
  6: [13 * 60, 22 * 60]  // laurdag
};

/**
 * @param {Object} o
 * @param {Date}   o.now            Noverande tidspunkt.
 * @param {Object} [o.opningstider] Minutt etter midnatt, [opnar, stengjer], per vekedag.
 * @param {string[]} [o.opptekne]   Luker som alt er bestilte, som "13:30".
 * @param {number} [o.framdrift]    Minste minutt frå no til henting.
 * @param {number} [o.lukeLengd]    Minutt mellom luker.
 * @param {number} [o.sisteFoerStengt] Minutt før stengjetid siste luka kan liggje.
 * @returns {{tid: string, minutt: number, ledig: boolean}[]}
 */
function ledigeLuker(o) {
  var now = o.now;
  var opningstider = o.opningstider || OSTEROYKROA_OPNINGSTIDER;
  var opptekne = o.opptekne || [];
  var framdrift = o.framdrift == null ? 15 : o.framdrift;
  var lukeLengd = o.lukeLengd == null ? 30 : o.lukeLengd;
  var sisteFoerStengt = o.sisteFoerStengt == null ? 30 : o.sisteFoerStengt;

  var dag = opningstider[now.getDay()];
  if (!dag) return [];

  var opnar = dag[0];
  var stengjer = dag[1];
  var naa = now.getHours() * 60 + now.getMinutes();

  // Ei luke er valbar først når ho ligg minst `framdrift` minutt fram i tid.
  // Likskapen er med: kl. 13:15 gjev 13:15 + 15 = 13:30, og 13:30 >= 13:30.
  var tidlegast = naa + framdrift;

  var ut = [];
  for (var m = opnar; m <= stengjer - sisteFoerStengt; m += lukeLengd) {
    if (m < tidlegast) continue; // passert, eller for nær til å rekkjast
    var tid = pad(Math.floor(m / 60)) + ':' + pad(m % 60);
    ut.push({ tid: tid, minutt: m, ledig: opptekne.indexOf(tid) === -1 });
  }
  return ut;
}

/** Første luka ein faktisk kan bestille, eller null om dagen er ute. */
function nesteLedige(o) {
  var luker = ledigeLuker(o);
  for (var i = 0; i < luker.length; i++) {
    if (luker[i].ledig) return luker[i];
  }
  return null;
}

function pad(n) {
  return (n < 10 ? '0' : '') + n;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ledigeLuker: ledigeLuker, nesteLedige: nesteLedige, OSTEROYKROA_OPNINGSTIDER: OSTEROYKROA_OPNINGSTIDER };
}
