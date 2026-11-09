/* Lukelogikken — no på tenarsida.
 *
 * Dette er den einaste sanninga om kva tider som finst. Nettlesaren
 * spør, han reknar ikkje sjølv. Grunnen er enkel: alt ein nettlesar
 * reknar ut, kan ein endre. Hadde klienten bestemt kva som var ledig,
 * kunne kven som helst bestilt henting klokka tre om natta.
 *
 * Reglane er dei same som før: to luker per time, éi ordre fyller luka,
 * og minst 15 minutt frå bestilling til henting.
 */

const OPNINGSTIDER = {
  0: [13 * 60, 21 * 60], // sundag
  1: [11 * 60, 21 * 60],
  2: [11 * 60, 21 * 60],
  3: [11 * 60, 21 * 60],
  4: [11 * 60, 21 * 60],
  5: [11 * 60, 22 * 60], // fredag
  6: [13 * 60, 22 * 60]  // laurdag
};

export const FRAMDRIFT_MINUTT = 15;   // minste tid frå bestilling til henting
const LUKE_MINUTT = 30;
const SISTE_FOER_STENGT = 30;

/* Tenaren køyrer i UTC. Opningstidene er norske, så me må rekne om.
 * Noreg er UTC+1, og UTC+2 frå siste sundag i mars til siste sundag i
 * oktober. Me reknar det ut i staden for å hardkode, så det ikkje
 * sprekk ved neste tidsomstilling. */
function sisteSundag(aar, maanad) {
  const d = new Date(Date.UTC(aar, maanad + 1, 0));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}

function norskOffsetTimar(no) {
  const aar = no.getUTCFullYear();
  const start = sisteSundag(aar, 2);  // mars
  start.setUTCHours(1, 0, 0, 0);
  const slutt = sisteSundag(aar, 9);  // oktober
  slutt.setUTCHours(1, 0, 0, 0);
  return (no >= start && no < slutt) ? 2 : 1;
}

/** Noverande tid i Noreg, som { dato: 'YYYY-MM-DD', minutt, vekedag }. */
export function norskNo(no = new Date()) {
  const lokal = new Date(no.getTime() + norskOffsetTimar(no) * 3600000);
  const p = (n) => String(n).padStart(2, '0');
  return {
    dato: `${lokal.getUTCFullYear()}-${p(lokal.getUTCMonth() + 1)}-${p(lokal.getUTCDate())}`,
    minutt: lokal.getUTCHours() * 60 + lokal.getUTCMinutes(),
    vekedag: lokal.getUTCDay()
  };
}

function somTid(minutt) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(minutt / 60))}:${p(minutt % 60)}`;
}

/**
 * Alle luker som er att i dag, med om dei er ledige.
 * @param {string[]} opptekne  tider som alt er bestilte eller stengde
 */
export function lukerIDag(opptekne = [], no = new Date()) {
  const n = norskNo(no);
  const dag = OPNINGSTIDER[n.vekedag];
  if (!dag) return [];

  const tidlegast = n.minutt + FRAMDRIFT_MINUTT;
  const ut = [];
  for (let m = dag[0]; m <= dag[1] - SISTE_FOER_STENGT; m += LUKE_MINUTT) {
    if (m < tidlegast) continue;
    const tid = somTid(m);
    ut.push({ tid, ledig: !opptekne.includes(tid) });
  }
  return ut;
}

/** Kan denne tida framleis bestillast akkurat no? */
export function erGyldigTid(tid, no = new Date()) {
  return lukerIDag([], no).some((l) => l.tid === tid);
}
