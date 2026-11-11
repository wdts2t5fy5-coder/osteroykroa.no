/* GET /api/betaling?ref=… — kva blei det til med betalinga?
 *
 * Kunden kjem hit etter Vipps. Me stolar IKKJE på at han kom tilbake:
 * omdirigeringa seier berre at nettlesaren er her igjen, ikkje at nokon
 * har betalt. Det spør me Vipps om.
 */
import { json, feil } from '../_lib/svar.js';
import { hentBetaling, trekk, erOppsett } from '../_lib/vipps.js';

export async function onRequestGet({ request, env }) {
  const ref = new URL(request.url).searchParams.get('ref');
  if (!ref) return feil(400, 'manglar referanse');

  const rad = await env.DB.prepare(
    'SELECT nr, hentetid, status, sum, linjer FROM ordre WHERE vipps_ref = ?'
  ).bind(ref).first();
  if (!rad) return feil(404, 'fann ikkje bestillinga');

  const svar = (status) => json({
    status,
    nr: rad.nr,
    hentetid: rad.hentetid,
    sum: rad.sum,
    linjer: JSON.parse(rad.linjer)
  });

  // Alt avgjort frå før. Kunden kan ha lasta sida på nytt, eller delt
  // lenkja med seg sjølv på ein annan eining.
  if (rad.status !== 'venter') {
    return svar(rad.status === 'avbroten' ? 'avbroten' : 'betalt');
  }

  if (!erOppsett(env)) return feil(503, 'betaling er ikkje sett opp');

  let b;
  try {
    b = await hentBetaling(env, ref);
  } catch (e) {
    // Me veit ikkje enno. Lat ordren stå som «venter» — avstemminga
    // frå grillskjermen prøver igjen. Å gjette feil her er å kaste
    // bort anten maten eller pengane.
    return feil(503, 'fekk ikkje svar frå Vipps', e);
  }

  const state = b.state;

  if (state === 'AUTHORIZED') {
    try {
      await trekk(env, ref, rad.sum);
    } catch (e) {
      // Pengane er reserverte, men ikkje trekte. Ordren skal likevel
      // fram til grillen — maten er viktigare enn tidspunktet for
      // trekket, og capture kan gjerast om att seinare.
      console.error('capture feila for ' + ref, e);
    }
    await env.DB.prepare(
      "UPDATE ordre SET status = 'ny' WHERE nr = ? AND status = 'venter'"
    ).bind(rad.nr).run();
    return svar('betalt');
  }

  if (state === 'ABORTED' || state === 'EXPIRED' || state === 'TERMINATED') {
    await env.DB.prepare(
      "UPDATE ordre SET status = 'avbroten' WHERE nr = ? AND status = 'venter'"
    ).bind(rad.nr).run();
    return svar('avbroten');
  }

  // CREATED: kunden har ikkje gjort seg ferdig. Luka står framleis av.
  return svar('ventar');
}
