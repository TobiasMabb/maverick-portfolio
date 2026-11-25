/* =====================================================================
   Puts your photo inside the big circle in the hero.
   The photo comes from the admin page (Photo tab). If you do not use the
   database, set  portrait: 'images/portrait.jpg'  in config.js instead.
   With no photo, the glowing orb stays exactly as it is.
   ===================================================================== */
(function () {
  'use strict';

  var P = window.PORTFOLIO || {};
  var cfg = window.PORTFOLIO_CONFIG || {};
  var p = P.portrait && P.portrait.url ? P.portrait : (cfg.portrait ? { url: cfg.portrait, pos: 30 } : null);
  var orb = document.querySelector('.orb');
  if (!p || !orb) return;

  var style = document.createElement('style');
  style.textContent =
    '.orb .portrait-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;' +
    'box-shadow:0 0 0 1px var(--line),0 30px 80px rgba(0,0,0,.28);opacity:0;transition:opacity .8s ease}' +
    '.orb.has-photo .portrait-img{opacity:1}';
  document.head.appendChild(style);

  var img = new Image();
  img.className = 'portrait-img';
  img.alt = 'Portrait of Maverick Miguel A. Torres';
  img.decoding = 'async';
  img.style.objectPosition = '50% ' + (typeof p.pos === 'number' ? p.pos : 30) + '%';
  img.onload = function () {
    orb.appendChild(img);
    orb.removeAttribute('aria-hidden');
    // next frame, so the fade-in plays
    requestAnimationFrame(function () { orb.classList.add('has-photo'); });
  };
  img.src = p.url;
})();