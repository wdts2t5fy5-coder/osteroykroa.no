/* Testmerke.
 *
 * Alt som ikkje køyrer på det ekte domenet får ei synleg stripe øvst.
 * Poenget er at ingen skal forveksle 2.0-kopien med den live sida og
 * tru at ei bestilling der er ekte.
 *
 * Regelen ser på vertsnamnet i nettlesaren, ikkje på kva gren koden kom
 * frå. Difor er han trygg å flette inn i produksjon: der slår han aldri
 * ut, og han treng ikkje hugsast fjerna.
 */
(function () {
  var PRODUKSJON = [
    'xn--osterykroa-4cb.no',
    'www.xn--osterykroa-4cb.no',
    'osterøykroa.no',
    'www.osterøykroa.no'
  ];
  if (PRODUKSJON.indexOf(location.hostname) !== -1) return;

  document.addEventListener('DOMContentLoaded', function () {
    var bar = document.createElement('div');
    bar.setAttribute('role', 'status');
    bar.setAttribute('data-testband', '');
    bar.textContent = 'TESTVERSJON — ikkje den ekte sida. Bestillingar her er ikkje reelle.';
    bar.style.cssText = [
      'position:sticky', 'top:0', 'z-index:9999',
      'background:#1d4ed8', 'color:#fff',
      'font:700 0.78rem/1.35 system-ui,sans-serif',
      'letter-spacing:0.02em', 'text-align:center',
      'padding:7px 14px'
    ].join(';');
    document.body.insertBefore(bar, document.body.firstChild);
  });
})();

/* Høgda på det som ligg fast øvst: headeren, og testbandet når det finst.
 *
 * Sticky-element lenger nede på sida — som oppsummeringa i bestillinga —
 * må feste seg under dette, ikkje mot toppen av vindauget, elles glir dei
 * inn bak headeren.
 *
 * Verdien blir målt og ikkje skriven inn fast, fordi headeren er lågare
 * på mobil enn på skjerm, og fordi testbandet berre finst utanfor
 * produksjon. Eit fast tal ville vore rett i nøyaktig eitt tilfelle.
 */
(function () {
  function oppdaterFastTopp() {
    var h = 0;

    // Det som tel er kor langt ned det nedste faste elementet rekk —
    // ikkje summen av dei. Testbandet og headeren festar seg begge på
    // 0 og ligg difor oppå kvarandre; å leggje dei saman gav 132 px
    // der sperra i røynda sluttar på 101.
    ['[data-testband]', '.site-header'].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) return;
      var cs = getComputedStyle(el);
      if (cs.position !== 'sticky' && cs.position !== 'fixed') return;
      var topp = parseFloat(cs.top) || 0;
      h = Math.max(h, topp + el.getBoundingClientRect().height);
    });

    document.documentElement.style.setProperty('--fast-topp', Math.round(h) + 'px');
  }

  document.addEventListener('DOMContentLoaded', oppdaterFastTopp);
  window.addEventListener('load', oppdaterFastTopp); // bilete kan endre høgda

  var vent;
  window.addEventListener('resize', function () {
    clearTimeout(vent);
    vent = setTimeout(oppdaterFastTopp, 120);
  });
})();

document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
  }

  // Kartet frå Google blir først lasta når brukaren aktivt samtykker
  Array.prototype.forEach.call(
    document.querySelectorAll('[data-load-map]'),
    function (btn) {
      btn.addEventListener('click', function () {
        var wrap = btn.closest('.map-embed');
        if (!wrap || !wrap.dataset.mapSrc) return;

        var frame = document.createElement('iframe');
        frame.src = wrap.dataset.mapSrc;
        frame.title = wrap.dataset.mapTitle || 'Kart';
        frame.loading = 'lazy';
        frame.referrerPolicy = 'no-referrer-when-downgrade';

        wrap.innerHTML = '';
        wrap.appendChild(frame);
      });
    }
  );

  var callBar = document.querySelector('.call-bar');
  var slot = document.querySelector('.call-bar-slot');

  if (callBar && slot && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          callBar.classList.toggle('call-bar--docked', entry.intersectionRatio >= 0.99);
        });
      },
      { threshold: [0, 0.99, 1] }
    );
    observer.observe(slot);
  }
});
