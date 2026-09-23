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
