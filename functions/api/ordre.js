/* POST /api/ordre — tek imot ei bestilling.
 *
 * Alt som kjem frå nettlesaren blir rekna som forslag, ikkje fakta.
 * Prisen blir rekna på nytt her, og hentetida blir prøvd mot
 * opningstidene. Ein kunde som endrar JavaScript i nettlesaren sin,
 * skal ikkje kunne kjøpe ein Osterøymeny 360 for ei krone.
 */
import { erGyldigTid, norskNo } from '../_lib/luker.js';
import { json, feil } from '../_lib/svar.js';
import { startBetaling, erOppsett } from '../_lib/vipps.js';

/* Prisane bur her, på tenaren. Bestillingssida har sine eigne for å
 * kunne vise summen medan ein vel — men det er desse som gjeld. */
const GRUNNPRIS = 239;
const OPPGRADERING = 60;
const STORLEIK = { enkel: 0, dobbel: 1, trippel: 2 };

/* Det formelle namnet. Det same ordet skal stå på grillskjermen, på
   kvitteringa og i Vipps — difor blir det lagra her, ikkje utleidd kvar
   gong. «Buldring» seier ingenting til ein kokk eller ein rekneskap. */
const PRODUKTNAMN = {
  enkel: 'Osterøymeny 120',
  dobbel: 'Osterøymeny 240',
  trippel: 'Osterøymeny 360'
};
const TOPPING_PRIS = 20;
const ENERGI_PRIS = 10;
const MAKS_MENYAR = 10;
const MAKS_TOPPING = 5;

function prisFor(linje) {
  const steg = STORLEIK[linje.storleik];
  if (steg === undefined) throw new Error('ukjend storleik');
  let sum = GRUNNPRIS + steg * OPPGRADERING;
  sum += Math.min(linje.ost || 0, MAKS_TOPPING) * TOPPING_PRIS;
  sum += Math.min(linje.bacon || 0, MAKS_TOPPING) * TOPPING_PRIS;
  if (linje.drikke === 'Energidrikk') sum += ENERGI_PRIS;
  return sum;
}

function reinTelefon(v) {
  return String(v || '').replace(/[^\d+]/g, '').replace(/^(\+47|0047)/, '');
}

export async function onRequestPost({ request, env }) {
  let inn;
  try {
    inn = await request.json();
  } catch {
    return feil(400, 'ugyldig førespurnad');
  }

  // ── Kontroll ────────────────────────────────────────────────────
  if (!Array.isArray(inn.linjer) || inn.linjer.length === 0) {
    return feil(400, 'bestillinga er tom');
  }
  if (inn.linjer.length > MAKS_MENYAR) {
    return feil(400, `maks ${MAKS_MENYAR} menyar per bestilling`);
  }
  if (!/^\d{8}$/.test(reinTelefon(inn.telefon))) {
    return feil(400, 'telefonnummeret ser ikkje rett ut');
  }
  if (typeof inn.hentetid !== 'string' || !erGyldigTid(inn.hentetid)) {
    // Dekkjer både tull og det heilt vanlege: kunden sat på sida til
    // tida gjekk ut.
    return feil(409, 'den hentetida kan ikkje veljast no');
  }

  let linjer, sum;
  try {
    linjer = inn.linjer.map((l) => ({
      namn: String(l.namn || '').slice(0, 24),
      storleik: l.storleik,
      produkt: PRODUKTNAMN[l.storleik] || null,
      ost: Math.max(0, Math.min(MAKS_TOPPING, Number(l.ost) || 0)),
      bacon: Math.max(0, Math.min(MAKS_TOPPING, Number(l.bacon) || 0)),
      saus: l.saus === 'Kebabsaus' || l.saus === 'Bearnaise' ? l.saus : null,
      gronsaker: {
        salat: l.gronsaker?.salat !== false,
        mais: l.gronsaker?.mais !== false,
        dressing: l.gronsaker?.dressing !== false,
        lok: l.gronsaker?.lok !== false,
        sylteagurk: l.gronsaker?.sylteagurk !== false
      },
      drikke: l.drikke === 'Energidrikk' ? 'Energidrikk' : 'Mineralvatn',
      aldersgrense: l.drikke === 'Energidrikk',
      pris: 0
    }));
    linjer.forEach((l) => { l.pris = prisFor(l); });
    sum = linjer.reduce((s, l) => s + l.pris, 0);
  } catch {
    return feil(400, 'bestillinga kunne ikkje lesast');
  }

  // ── Lagring ─────────────────────────────────────────────────────
  //
  // Ordren blir lagra som «venter» FØR betalinga startar. Det er med
  // vilje: raden held luka medan kunden står i Vipps, så ingen andre kan
  // ta tida imens. Ho blir synleg for grillen først når pengane er
  // reserverte — og blir rydda bort att om kunden aldri fullfører.
  const { dato } = norskNo();
  const referanse = `osteroykroa-${dato}-${inn.hentetid.replace(':', '')}-${crypto.randomUUID().slice(0, 8)}`;

  try {
    const res = await env.DB.prepare(
      `INSERT INTO ordre (dato, hentetid, status, telefon, sum, linjer, motteke, vipps_ref)
       VALUES (?, ?, 'venter', ?, ?, ?, ?, ?)`
    ).bind(
      dato, inn.hentetid, reinTelefon(inn.telefon),
      sum, JSON.stringify(linjer), Date.now(), referanse
    ).run();

    const nr = res.meta.last_row_id;

    // Utan Vipps-nøklar hoppar me over betalinga og slepp ordren rett
    // inn. Det held bestillingssida brukbar medan nøklane manglar, og
    // seier tydeleg frå i svaret at ingenting er betalt.
    if (!erOppsett(env)) {
      await env.DB.prepare("UPDATE ordre SET status = 'ny' WHERE nr = ?").bind(nr).run();
      return json({ ok: true, nr, hentetid: inn.hentetid, sum, betaling: 'av' }, 201);
    }

    try {
      const url = new URL(request.url);
      const redirectUrl = await startBetaling(env, {
        referanse,
        kroner: sum,
        telefon: reinTelefon(inn.telefon),
        tekst: `Osterøyburger, henting kl. ${inn.hentetid}`,
        returUrl: `${url.origin}/bestill/kvittering?ref=${referanse}`
      });
      return json({ ok: true, nr, hentetid: inn.hentetid, sum, redirectUrl }, 201);
    } catch (e) {
      // Fekk me ikkje starta betalinga, skal luka bli ledig att med
      // ein gong. Elles ville ein feil hjå Vipps blokkert ei hentetid
      // resten av dagen.
      await env.DB.prepare("UPDATE ordre SET status = 'avbroten' WHERE nr = ?").bind(nr).run();
      return feil(502, 'fekk ikkje starta betalinga', e);
    }
  } catch (e) {
    // Den unike indeksen i databasen slo til: nokon kom hit først.
    // Dette er ikkje ein feil — det er låsen som gjer jobben sin.
    if (String(e).includes('UNIQUE')) {
      return feil(409, 'den hentetida blei nett teken');
    }
    return feil(500, 'kunne ikkje lagre bestillinga', e);
  }
}
