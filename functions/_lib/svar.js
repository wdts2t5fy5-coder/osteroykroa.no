/* Felles svar-hjelparar. */

const HOVUD = {
  'content-type': 'application/json; charset=utf-8',
  // Bestillingar skal aldri mellomlagrast. Ei mellomlagra lukeliste
  // ville vist tider som alt er tekne.
  'cache-control': 'no-store'
};

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: HOVUD });
}

/* Kunden får ei nøktern melding; detaljane går i loggen.
 * Ein feilmelding frå databasen fortel meir om oppsettet vårt enn
 * nokon utanfor treng å vite. */
export function feil(status, melding, e) {
  if (e) console.error(melding, e);
  return json({ feil: melding }, status);
}

/* Grillskjermen ser telefonnummer og bestillingar. Utan dette kunne
 * kven som helst lese dagens kundeliste.
 *
 * Eitt delt løyveord er nok her: skjermen heng på veggen i eit låst
 * lokale, og personalet er dei same få. Treng me ein dag å vite KVEN
 * som godtok ein ordre, må dette bytast med ekte innlogging. */
export function harLoyve(request, env) {
  const h = request.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  return !!env.GRILL_TOKEN && token === env.GRILL_TOKEN;
}
