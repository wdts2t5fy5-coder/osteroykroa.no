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
