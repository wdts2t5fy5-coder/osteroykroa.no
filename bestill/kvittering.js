/* Kvitteringssida.
 *
 * Kunden kjem hit frå Vipps. At han er her, seier ingenting om at han
 * har betalt — omdirigeringa skjer uansett korleis det gjekk. Difor
 * spør me tenaren, som spør Vipps.
 *
 * «CREATED» tyder at kunden ikkje har gjort seg ferdig. Det kan vere at
 * han framleis står i appen, eller at han snudde. Me prøver nokre
 * gonger før me gjev opp, i staden for å seie noko feil med ein gong.
 */
(function () {
  'use strict';

  var MAKS_FORSOEK = 10;
  var PAUSE_MS = 2000;

  var rot = document.getElementById('kvitt');
  var ref = new URLSearchParams(location.search).get('ref');
  var forsoek = 0;

  function el(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst != null) e.textContent = tekst;
    return e;
  }

  function vis(barn) {
    rot.innerHTML = '';
    barn.forEach(function (b) { rot.appendChild(b); });
  }

  function melding(tittel, tekst, klasse) {
    vis([
      el('h1', 'kvitt-tittel' + (klasse ? ' ' + klasse : ''), tittel),
      el('p', null, tekst)
    ]);
  }

  function visKvittering(d) {
    var ut = [
      el('h1', 'kvitt-tittel kvitt-ok', 'Takk — bestillinga er betalt'),
      el('p', 'kvitt-tid', 'Hent kl. ' + d.hentetid)
    ];

    var liste = el('div', 'sum-liste');
    (d.linjer || []).forEach(function (l, i) {
      var rad = el('div', 'sum-rad');
      var venstre = el('div');
      venstre.appendChild(el('strong', null, l.namn || ('Meny ' + (i + 1))));
      venstre.appendChild(el('span', 'sum-detalj', l.produkt || ''));
      rad.appendChild(venstre);
      rad.appendChild(el('span', 'sum-pris', l.pris + ',-'));
      liste.appendChild(rad);
    });
    ut.push(liste);

    var botn = el('div', 'sum-botn');
    botn.appendChild(el('span', 'sum-tid', 'Bestilling nr. ' + d.nr));
    botn.appendChild(el('span', 'sum-total', d.sum + ',-'));
    ut.push(botn);

    ut.push(el('p', 'steg-hjelp',
      'Du hentar hjå oss på kroa. Me ringjer deg om noko skulle skje med ' +
      'bestillinga. Ta vare på bestillingsnummeret.'));
    vis(ut);
  }

  function sjekk() {
    fetch('/api/betaling?ref=' + encodeURIComponent(ref), { cache: 'no-store' })
      .then(function (r) {
        return r.json().then(function (d) { return { ok: r.ok, d: d }; });
      })
      .then(function (svar) {
        if (!svar.ok) {
          // Tenaren fekk ikkje svar frå Vipps. Prøv igjen — å seie
          // «ikkje betalt» når me berre ikkje veit, er verre enn å vente.
          return prøvIgjen('Me fekk ikkje stadfesta betalinga enno.');
        }

        if (svar.d.status === 'betalt') return visKvittering(svar.d);

        if (svar.d.status === 'avbroten') {
          return melding('Betalinga blei ikkje fullført',
            'Ingen pengar er trekte, og hentetida er ledig att. ' +
            'Du kan bestille på nytt når du vil.', 'kvitt-avbroten');
        }

        prøvIgjen('Ventar på at Vipps skal gjere seg ferdig …');
      })
      .catch(function () { prøvIgjen('Fekk ikkje kontakt.'); });
  }

  function prøvIgjen(tekst) {
    forsoek++;
    if (forsoek >= MAKS_FORSOEK) {
      return melding('Me veit ikkje heilt enno',
        'Bestillinga kan vere betalt utan at me har fått stadfesta det. ' +
        'Ring oss på 56 19 34 34, så sjekkar me — du skal ikkje måtte ' +
        'betale to gonger.', 'kvitt-avbroten');
    }
    melding('Eit lite augeblikk', tekst);
    setTimeout(sjekk, PAUSE_MS);
  }

  if (!ref) {
    melding('Manglar referanse',
      'Me finn ikkje bestillinga. Ring oss på 56 19 34 34 om du har betalt.');
  } else {
    sjekk();
  }
})();
