/* Grillskjermen sine endepunkt. Alle krev løyve.
 *
 *   GET  /api/grill/ordrar          dagens ordrar
 *   POST /api/grill/status          { nr, status }
 *   POST /api/grill/steng           { hentetid }
 */
import { lukerIDag, norskNo } from '../../_lib/luker.js';
import { json, feil, harLoyve } from '../../_lib/svar.js';
import { hentBetaling, trekk, erOppsett, prøvToken } from '../../_lib/vipps.js';

const VENTETID_MS = 90000;

/* Spør Vipps om dei ordrane som står og ventar på betaling.
 * Feilar eit kall, lèt me ordren stå — neste runde prøver igjen. */
async function stemAv(env, dato) {
  if (!erOppsett(env)) return;

  const ventande = await env.DB.prepare(
    `SELECT nr, sum, vipps_ref FROM ordre
     WHERE dato = ? AND status = 'venter' AND motteke < ?`
  ).bind(dato, Date.now() - VENTETID_MS).all();

  for (const o of ventande.results) {
    try {
      const b = await hentBetaling(env, o.vipps_ref);

      if (b.state === 'AUTHORIZED') {
        try { await trekk(env, o.vipps_ref, o.sum); }
        catch (e) { console.error('capture feila for ' + o.vipps_ref, e); }
        await env.DB.prepare(
          "UPDATE ordre SET status = 'ny' WHERE nr = ? AND status = 'venter'"
        ).bind(o.nr).run();
      } else if (['ABORTED', 'EXPIRED', 'TERMINATED'].includes(b.state)) {
        // Luka blir ledig att med ein gong — ho skal ikkje stå reservert
        // for nokon som ombestemte seg.
        await env.DB.prepare(
          "UPDATE ordre SET status = 'avbroten' WHERE nr = ? AND status = 'venter'"
        ).bind(o.nr).run();
      }
    } catch (e) {
      console.error('avstemming feila for ' + o.vipps_ref, e);
    }
  }
}

export async function onRequest(ctx) {
  const { request, env, params } = ctx;
  if (!harLoyve(request, env)) return feil(401, 'manglar løyve');

  const rute = (params.rute || []).join('/');
  const { dato } = norskNo();

  try {
    if (request.method === 'GET' && rute === 'ordrar') {
      // Avstemming.
      //
      // Det farlege tilfellet: kunden betaler, og lukkar nettlesaren før
      // han kjem tilbake til kvitteringssida. Då får ingen vite at det
      // er betalt — og kunden kjem og hentar mat ingen har laga.
      //
      // Grillskjermen spør kvart femte sekund uansett, så me nyttar den
      // trafikken til å spørje Vipps om dei ordrane som står og ventar.
      // Me ventar 90 sekund først, så me ikkje maser medan kunden
      // framleis står i appen.
      await stemAv(env, dato);

      const r = await env.DB.prepare(
        `SELECT nr, hentetid, status, telefon, sum, linjer, motteke, godteke
         FROM ordre WHERE dato = ? AND status != 'venter' AND status != 'avbroten'
         ORDER BY hentetid`
      ).bind(dato).all();

      const stengde = await env.DB.prepare(
        'SELECT hentetid FROM stengd_luke WHERE dato = ?'
      ).bind(dato).all();

      // Ordrenummeret kundane og kjøkenet ser, tel frå 1 kvar dag.
      // Rad-nummeret i databasen veks for alltid, og «A1247» seier
      // ingenting i ei grill.
      const sortert = [...r.results].sort((a, b) => a.motteke - b.motteke);
      const dagleg = new Map(sortert.map((o, i) => [o.nr, 'A' + (i + 1)]));

      return json({
        dato,
        stengde: stengde.results.map((s) => s.hentetid),
        ordrar: r.results.map((o) => ({
          id: dagleg.get(o.nr),
          nr: o.nr,
          hentetid: o.hentetid,
          status: o.status,
          kunde: { telefon: o.telefon },
          sum: o.sum,
          linjer: JSON.parse(o.linjer),
          motteke: o.motteke,
          godteke: o.godteke
        }))
      });
    }

    /* Oppsettssjekk. Finst fordi alternativet er å oppdage ein feil
       nøkkel først når ein kunde står midt i ei betaling. */
    if (request.method === 'GET' && rute === 'vipps') {
      if (!erOppsett(env)) {
        const manglar = ['VIPPS_CLIENT_ID', 'VIPPS_CLIENT_SECRET',
                         'VIPPS_SUBSCRIPTION_KEY', 'VIPPS_MSN']
          .filter((n) => !env[n]);
        return json({ ok: false, grunn: 'manglar nøklar', manglar });
      }
      try {
        await prøvToken(env);
        return json({
          ok: true,
          miljo: env.VIPPS_BASE === 'produksjon' ? 'PRODUKSJON' : 'test',
          msn: env.VIPPS_MSN
        });
      } catch (e) {
        return json({ ok: false, grunn: String(e.message || e).slice(0, 300) });
      }
    }

    if (request.method === 'POST' && rute === 'status') {
      const { nr, status } = await request.json();
      const lovlege = ['ny', 'godteken', 'klar', 'henta', 'avvist'];
      if (!lovlege.includes(status)) return feil(400, 'ukjend status');

      await env.DB.prepare(
        `UPDATE ordre SET status = ?,
           godteke = CASE WHEN ? = 'godteken' AND godteke IS NULL
                          THEN ? ELSE godteke END
         WHERE nr = ? AND dato = ?`
      ).bind(status, status, Date.now(), nr, dato).run();

      return json({ ok: true });
    }

    if (request.method === 'POST' && rute === 'steng') {
      const { hentetid } = await request.json();

      // Tenaren avgjer kva «neste ledige» er. Gjorde skjermen det,
      // kunne to nettbrett stengt kvar si luke i same augeblink og
      // begge trudd dei stengde den same.
      const bestilte = await env.DB.prepare(
        "SELECT hentetid FROM ordre WHERE dato = ? AND status != 'avvist'"
      ).bind(dato).all();
      const stengde = await env.DB.prepare(
        'SELECT hentetid FROM stengd_luke WHERE dato = ?'
      ).bind(dato).all();

      const opptekne = [
        ...bestilte.results.map((r) => r.hentetid),
        ...stengde.results.map((r) => r.hentetid)
      ];
      const ledige = lukerIDag(opptekne).filter((l) => l.ledig);
      if (!ledige.length) return feil(409, 'ingen ledige luker igjen i dag');

      const maal = hentetid || ledige[0].tid;
      if (!ledige.some((l) => l.tid === maal)) {
        return feil(409, 'den luka er ikkje ledig');
      }

      await env.DB.prepare(
        'INSERT OR IGNORE INTO stengd_luke (dato, hentetid, stengd) VALUES (?, ?, ?)'
      ).bind(dato, maal, Date.now()).run();

      return json({ ok: true, stengd: maal });
    }

    return feil(404, 'ukjend endepunkt');
  } catch (e) {
    return feil(500, 'noko gjekk gale', e);
  }
}
