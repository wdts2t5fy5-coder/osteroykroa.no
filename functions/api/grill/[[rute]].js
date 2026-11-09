/* Grillskjermen sine endepunkt. Alle krev løyve.
 *
 *   GET  /api/grill/ordrar          dagens ordrar
 *   POST /api/grill/status          { nr, status }
 *   POST /api/grill/steng           { hentetid }
 */
import { lukerIDag, norskNo } from '../../_lib/luker.js';
import { json, feil, harLoyve } from '../../_lib/svar.js';

export async function onRequest(ctx) {
  const { request, env, params } = ctx;
  if (!harLoyve(request, env)) return feil(401, 'manglar løyve');

  const rute = (params.rute || []).join('/');
  const { dato } = norskNo();

  try {
    if (request.method === 'GET' && rute === 'ordrar') {
      const r = await env.DB.prepare(
        `SELECT nr, hentetid, status, telefon, sum, linjer, motteke, godteke
         FROM ordre WHERE dato = ? ORDER BY hentetid`
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
