document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
  }

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
