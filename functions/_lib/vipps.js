/* Vipps ePayment.
 *
 * Alt som har med pengar å gjere skjer her, på tenaren. Nettlesaren får
 * aldri sjå nøklane, og han får aldri avgjere om noko er betalt — han
 * får berre ein adresse å gå til, og eit svar når han kjem tilbake.
 *
 * Miljøet blir styrt av VIPPS_BASE. Står han tom, køyrer me mot test.
 * Det er med vilje: å gløyme ein konfigurasjon skal koste ei testkrone,
 * ikkje ei ekte.
 */

const TEST = 'https://apitest.vipps.no';
const PROD = 'https://api.vippsmobilepay.com';

function base(env) {
  return env.VIPPS_BASE === 'produksjon' ? PROD : TEST;
}

/* Vipps ber om at systemet identifiserer seg. Det er ikkje pynt: når
 * noko går gale, er dette det dei ser i loggane sine. */
function systemHovud() {
  return {
    'Vipps-System-Name': 'osteroykroa',
    'Vipps-System-Version': '1.0.0',
    'Vipps-System-Plugin-Name': 'osteroykroa-bestilling',
    'Vipps-System-Plugin-Version': '1.0.0'
  };
}

/* Tokenet varer i om lag ein time. Me held på det mellom kall i same
 * isolat, så me ikkje hentar nytt for kvar einaste bestilling. */
let bufraToken = null;

async function token(env) {
  const no = Date.now();
  if (bufraToken && bufraToken.utloep > no + 60000) return bufraToken.verdi;

  const r = await fetch(`${base(env)}/accesstoken/get`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      client_id: env.VIPPS_CLIENT_ID,
      client_secret: env.VIPPS_CLIENT_SECRET,
      'Ocp-Apim-Subscription-Key': env.VIPPS_SUBSCRIPTION_KEY,
      'Merchant-Serial-Number': env.VIPPS_MSN
    }
  });
  if (!r.ok) throw new Error('vipps token ' + r.status + ' ' + (await r.text()).slice(0, 200));

  const d = await r.json();
  bufraToken = {
    verdi: d.access_token,
    utloep: no + (Number(d.expires_in || 3600) * 1000)
  };
  return bufraToken.verdi;
}

function hovud(env, t, ekstra = {}) {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${t}`,
    'Ocp-Apim-Subscription-Key': env.VIPPS_SUBSCRIPTION_KEY,
    'Merchant-Serial-Number': env.VIPPS_MSN,
    ...systemHovud(),
    ...ekstra
  };
}

/**
 * Startar ein betaling og gjev tilbake adressa kunden skal sendast til.
 * @param {number} kroner  heile kroner — Vipps vil ha øre
 */
export async function startBetaling(env, { referanse, kroner, telefon, tekst, returUrl }) {
  const t = await token(env);

  const r = await fetch(`${base(env)}/epayment/v1/payments`, {
    method: 'POST',
    // Same referanse gjev same betaling. Trykkjer kunden to gonger,
    // eller prøver nettlesaren på nytt, blir det ikkje to betalingar.
    headers: hovud(env, t, { 'Idempotency-Key': referanse }),
    body: JSON.stringify({
      amount: { currency: 'NOK', value: Math.round(kroner * 100) },
      paymentMethod: { type: 'WALLET' },
      customer: telefon ? { phoneNumber: '47' + telefon } : undefined,
      reference: referanse,
      returnUrl: returUrl,
      userFlow: 'WEB_REDIRECT',
      paymentDescription: tekst
    })
  });

  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('vipps betaling ' + r.status + ' ' + JSON.stringify(d).slice(0, 300));
  return d.redirectUrl;
}

/** Kva Vipps meiner om betalinga. Dette er fasiten, ikkje omdirigeringa. */
export async function hentBetaling(env, referanse) {
  const t = await token(env);
  const r = await fetch(`${base(env)}/epayment/v1/payments/${referanse}`, {
    headers: hovud(env, t)
  });
  if (!r.ok) throw new Error('vipps status ' + r.status);
  return r.json();
}

/* Salsenheten er sett opp med «Reserve Capture»: pengane blir reserverte
 * når kunden godkjenner, og først trekte når me kallar capture. Me gjer
 * det med ein gong — maten blir laga straks, så det er ingen grunn til
 * å halde reservasjonen. */
export async function trekk(env, referanse, kroner) {
  const t = await token(env);
  const r = await fetch(`${base(env)}/epayment/v1/payments/${referanse}/capture`, {
    method: 'POST',
    headers: hovud(env, t, { 'Idempotency-Key': 'trekk-' + referanse }),
    body: JSON.stringify({
      modificationAmount: { currency: 'NOK', value: Math.round(kroner * 100) }
    })
  });
  if (!r.ok) throw new Error('vipps capture ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}

/** Er Vipps konfigurert i det heile? */
export function erOppsett(env) {
  return !!(env.VIPPS_CLIENT_ID && env.VIPPS_CLIENT_SECRET &&
            env.VIPPS_SUBSCRIPTION_KEY && env.VIPPS_MSN);
}
