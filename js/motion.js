/* =====================================================================
   Motion layer for the portfolio (pairs with css/motion.css).
   - Hero: the wordmark types itself in letter by letter; the letters lift as the mouse passes.
   - Sections: the top line draws, the heading wipes in, lists arrive one after another.
   - Photo circle: drifts a little with the mouse. Hero buttons pull gently toward the pointer.
   - Cards: a soft light follows the pointer. Light/dark switch spreads out from the toggle.
   - A thin progress line across the top of the screen.
   Visitors who prefer reduced motion get none of the movement, and touch screens skip the pointer effects.
   To turn it all off, delete the two lines that load motion.css and motion.js in index.html.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var fine = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* ---------- reading progress (shown for everyone: it is a position marker, not movement) ---------- */
  (function () {
    var bar = document.createElement('div');
    bar.className = 'mo-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var queued = false;
    function paint() {
      queued = false;
      var max = root.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, Math.max(0, window.pageYOffset / max)) : 0) + ')';
    }
    function ask() { if (!queued) { queued = true; requestAnimationFrame(paint); } }
    window.addEventListener('scroll', ask, { passive: true });
    window.addEventListener('resize', ask);
    paint();
  })();

  if (reduce) return;

  /* ---------- scroll reveals ---------- */
  if ('IntersectionObserver' in window) {
    root.classList.add('mo');
    var STAG = '.rows, .project-grid, .jobs, .skills, .socials, .facts';
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('mo-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
    function mark(el, cls) {
      if (seen) { if (seen.has(el)) return; seen.add(el); }
      else { if (el.__mo) return; el.__mo = 1; }
      el.classList.add(cls);
      io.observe(el);
    }
    function tagBody(body) {
      if (body.matches(STAG)) { mark(body, 'mo-s'); return; }
      Array.prototype.slice.call(body.children).forEach(function (c) {
        if (c.tagName === 'SCRIPT') return;
        if (c.matches(STAG)) mark(c, 'mo-s');
        else {
          var inner = c.querySelector(STAG);
          if (inner) mark(inner, 'mo-s'); else mark(c, 'mo-r');
        }
      });
    }

    $$('main section').forEach(function (s) { mark(s, 'mo-sec'); });
    $$('main section .sec-body').forEach(function (b) {
      tagBody(b);
      // cards are drawn a moment later (database), and some blocks are created by main.js
      if ('MutationObserver' in window && !b.matches(STAG)) {
        new MutationObserver(function () { tagBody(b); }).observe(b, { childList: true });
      }
    });
    var facts = $('#contact-strip');
    if (facts) mark(facts, 'mo-s');
  }

  /* ---------- hero wordmark: letters in, then a caret blinks and goes ---------- */
  var first = $('.id h1 .first');
  var letters = [];
  var splitAt = (window.performance && performance.now) ? performance.now() : 0;
  function split() {
    if (!first || first.querySelector('.chs')) return;
    var text = first.textContent;
    if (!text) return;
    var late = ((window.performance && performance.now) ? performance.now() : 0) - splitAt > 600;
    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    var vis = document.createElement('span');
    vis.className = 'chs';
    vis.setAttribute('aria-hidden', 'true');
    var n = 0;
    letters = [];
    text.split('').forEach(function (c) {
      if (c === ' ') { vis.appendChild(document.createTextNode(' ')); return; }
      var s = document.createElement('span');
      s.className = 'ch';
      s.style.setProperty('--i', n++);
      s.textContent = c;
      letters.push(s);
      vis.appendChild(s);
    });
    vis.style.setProperty('--n', n);
    var caret = document.createElement('span');
    caret.className = 'caret';
    vis.appendChild(caret);
    first.textContent = '';
    first.appendChild(sr);
    first.appendChild(vis);
    // the text was swapped by the database after the intro: do not play it a second time
    if (late) first.classList.add('mo-skip');
  }
  if (first) {
    split();
    if ('MutationObserver' in window) {
      new MutationObserver(function () { if (!first.querySelector('.chs')) split(); }).observe(first, { childList: true });
    }
  }

  /* ---------- theme switch: the new theme spreads out from the toggle ---------- */
  var tbtn = $('#theme');
  if (tbtn && typeof document.startViewTransition === 'function') {
    var replay = false;
    tbtn.addEventListener('click', function (e) {
      if (replay) return;
      e.stopImmediatePropagation();
      var r = tbtn.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      root.classList.add('mo-vt');
      var t;
      try {
        t = document.startViewTransition(function () { replay = true; try { tbtn.click(); } finally { replay = false; } });
      } catch (err) { replay = true; tbtn.click(); replay = false; root.classList.remove('mo-vt'); return; }
      t.ready.then(function () {
        root.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 650, easing: 'cubic-bezier(.23, 1, .32, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      }, function () {});
      var done = function () { root.classList.remove('mo-vt'); };
      t.finished.then(done, done);
    }, true);
  }

  if (!fine) return;

  /* ---------- pointer effects: wordmark wave and photo circle drift (one shared frame loop) ---------- */
  var hero = $('#hero');
  var orb = $('.orb');
  var S = { tx: 0, ty: 0, px: 0, py: 0, mx: null, lift: [], run: false };
  var last = 0;
  function loop(now) {
    var busy = false;
    // eased by elapsed time, so it feels the same on a slow or a fast screen
    var dt = last ? Math.min(64, now - last) : 16;
    last = now;
    var kOrb = 1 - Math.exp(-dt / 190), kLet = 1 - Math.exp(-dt / 70);
    // photo circle and rings
    S.px += (S.tx - S.px) * kOrb;
    S.py += (S.ty - S.py) * kOrb;
    if (Math.abs(S.tx - S.px) > 0.002 || Math.abs(S.ty - S.py) > 0.002) busy = true; else { S.px = S.tx; S.py = S.ty; }
    if (orb) {
      orb.style.setProperty('--ox', (S.px * 12).toFixed(2) + 'px');
      orb.style.setProperty('--oy', (S.py * 12).toFixed(2) + 'px');
      orb.style.setProperty('--rx', (S.px * -9).toFixed(2) + 'px');
      orb.style.setProperty('--ry', (S.py * -9).toFixed(2) + 'px');
    }
    // wordmark letters lift near the pointer
    if (letters.length && first) {
      var rects = letters.map(function (l) { return l.getBoundingClientRect(); });
      var size = parseFloat(window.getComputedStyle(first).fontSize) || 80;
      var amp = Math.min(18, size * 0.12);
      var reach = (rects[0].width || 40) * 1.7;
      letters.forEach(function (l, i) {
        var target = 0;
        if (S.mx !== null) {
          var d = (rects[i].left + rects[i].width / 2 - S.mx) / reach;
          target = -amp * Math.exp(-d * d);
        }
        var cur = S.lift[i] || 0;
        cur += (target - cur) * kLet;
        if (Math.abs(target - cur) > 0.04) busy = true; else cur = target;
        S.lift[i] = cur;
        l.style.translate = cur ? '0 ' + cur.toFixed(2) + 'px' : '';
      });
    }
    if (busy) requestAnimationFrame(loop); else { S.run = false; last = 0; }
  }
  function kick() { if (!S.run) { S.run = true; requestAnimationFrame(loop); } }

  if (hero) {
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      S.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      S.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      S.mx = null;
      if (first) {
        var fr = first.getBoundingClientRect();
        if (e.clientY > fr.top - fr.height * 0.6 && e.clientY < fr.bottom + fr.height * 0.6) S.mx = e.clientX;
      }
      kick();
    });
    hero.addEventListener('pointerleave', function () { S.tx = 0; S.ty = 0; S.mx = null; kick(); });
  }

  /* ---------- hero buttons pull a little toward the pointer ---------- */
  $$('.actions > *').forEach(function (b) {
    b.addEventListener('pointermove', function (e) {
      var r = b.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      b.style.translate = (dx * 6).toFixed(1) + 'px ' + (dy * 4).toFixed(1) + 'px';
    });
    b.addEventListener('pointerleave', function () { b.style.translate = ''; });
  });

  /* ---------- a soft light follows the pointer across cards ---------- */
  var SPOT = '.card, .social, .contact';
  document.addEventListener('pointermove', function (e) {
    var t = e.target && e.target.closest ? e.target.closest(SPOT) : null;
    if (!t) return;
    var r = t.getBoundingClientRect();
    t.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
    t.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
  }, { passive: true });
})();