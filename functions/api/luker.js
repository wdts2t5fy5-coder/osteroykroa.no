/* GET /api/luker — kva hentetider som finst i dag, og kva som er ledig. */
import { lukerIDag, norskNo } from '../_lib/luker.js';
import { json, feil } from '../_lib/svar.js';

export async function onRequestGet({ env }) {
  try {
    const { dato } = norskNo();

    // Ei luke er oppteken anten fordi nokon har bestilt henne, eller
    // fordi kjøkenet har stengt henne.
    const [bestilte, stengde] = await Promise.all([
      env.DB.prepare(
        "SELECT hentetid FROM ordre WHERE dato = ? AND status != 'avvist'"
      ).bind(dato).all(),
      env.DB.prepare(
        'SELECT hentetid FROM stengd_luke WHERE dato = ?'
      ).bind(dato).all()
    ]);

    const opptekne = [
      ...bestilte.results.map((r) => r.hentetid),
      ...stengde.results.map((r) => r.hentetid)
    ];

    return json({ dato, luker: lukerIDag(opptekne) });
  } catch (e) {
    return feil(500, 'kunne ikkje hente luker', e);
  }
}
