/* =====================================================================
   Site behaviour. Content lives in data.js, so you rarely need to edit this file.
   ===================================================================== */
(function () {
  'use strict';

  var D = window.PORTFOLIO || {};
  var root = document.documentElement;

  /* ---------- small helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function has(v) { return typeof v === 'string' && v.trim() !== ''; }

  // Builds an element. Text is always set as text, never as HTML.
  function h(tag, attrs, kids) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === false || v === null || v === undefined) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
      });
    }
    (kids || []).forEach(function (kid) {
      if (kid === null || kid === undefined || kid === false) return;
      node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    });
    return node;
  }

  /* ---------- icons ---------- */
  function svg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }
  var ICONS = {
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    'chev-left': svg('<path d="M15 5l-7 7 7 7"/>'),
    'chev-right': svg('<path d="M9 5l7 7-7 7"/>'),
    arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    external: svg('<path d="M7 17L17 7M8 7h9v9"/>'),
    copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),
    file: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
    image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 9"/>'),
    folder: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
    phone: svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
    pin: svg('<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
    code: svg('<path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>'),
    facebook: svg('<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>'),
    instagram: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/>'),
    linkedin: svg('<path d="M7 10v10M7 6.5v.01M11 20v-6a3 3 0 0 1 6 0v6M11 10v10"/>')
  };
  function icon(name) {
    var s = document.createElement('span');
    s.className = 'ico';
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[name] || '';
    return s;
  }
  $$('[data-icon]').forEach(function (n) { n.appendChild(icon(n.getAttribute('data-icon'))); });

  /* ---------- theme (opens dark, remembers the choice) ---------- */
  (function () {
    var btn = $('#theme');
    var bar = $('#theme-color');
    function paintBar(mode) { if (bar) bar.setAttribute('content', mode === 'light' ? '#f1f1f1' : '#050505'); }
    try { if (localStorage.getItem('maverick-theme') === 'light') { root.setAttribute('data-theme', 'light'); paintBar('light'); } } catch (e) {}
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      paintBar(next);
      try { localStorage.setItem('maverick-theme', next); } catch (e) {}
    });
  })();

  /* ---------- toast and copy ---------- */
  var toastEl = $('#toast');
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }
  function copyText(text, label) {
    function done() { toast(label + ' copied'); }
    function fallback() {
      var ta = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;top:0;left:0;opacity:0' });
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Press Ctrl+C to copy'); }
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  /* ---------- hero: resume, counts, year ---------- */
  $('#resume').addEventListener('click', function () {
    if (D.resume && has(D.resume.url)) window.open(D.resume.url, '_blank', 'noopener');
    else toast('Resume file coming soon.');
  });
  $('#year').textContent = String(new Date().getFullYear());

  /* ---------- hero: primary contacts (taken from your Socials: first email, GitHub or code link, and phone) ---------- */
  function renderContactStrip() {
    var box = $('#contact-strip');
    var picked = [];
    ['mail', 'code', 'phone'].forEach(function (ic) {
      var hit = (D.socials || []).filter(function (s) { return s.icon === ic && has(s.href) && has(s.value); })[0];
      if (hit) picked.push(hit);
    });
    if (!picked.length) { box.hidden = true; return; }
    picked.forEach(function (s) {
      var external = /^https?:/.test(s.href);
      box.appendChild(h('li', null, [
        h('a', {
          class: 'contact', href: s.href,
          target: external ? '_blank' : null, rel: external ? 'noopener' : null,
          'aria-label': s.label + ': ' + s.value
        }, [
          icon(s.icon),
          h('span', { class: 'c-text' }, [
            h('span', { class: 'c-label', text: s.label }),
            h('span', { class: 'c-value', text: s.value })
          ])
        ])
      ]));
    });
  }

  /* ---------- work experience ---------- */
  function renderExperience() {
    var box = $('#experience-list');
    (D.experience || []).forEach(function (j) {
      box.appendChild(h('article', { class: 'job' }, [
        h('div', { class: 'job-head' }, [
          h('div', null, [
            h('strong', { text: j.role }),
            h('span', { class: 'org', text: j.company }),
            has(j.place) ? h('span', { class: 'meta', text: j.place }) : null
          ]),
          h('span', { class: 'when', text: j.start + ' – ' + j.end })
        ]),
        h('ul', { class: 'bullets' }, (j.bullets || []).map(function (b) { return h('li', { text: b }); }))
      ]));
    });
  }

  /* ---------- image viewer (lightbox) ---------- */
  var lb = $('#lightbox');
  var lbImg = $('#lb-img');
  var lbCap = $('#lb-cap');
  var lbMissing = $('#lb-missing');
  var lbPrev = $('#lb-prev');
  var lbNext = $('#lb-next');
  var lbSet = [];
  var lbIndex = 0;

  function usable(images) {
    return (images || []).filter(function (i) { return i && has(i.src); });
  }
  function showLightboxImage() {
    var it = lbSet[lbIndex];
    lbMissing.hidden = true;
    lbImg.hidden = false;
    lbImg.onerror = function () {
      lbImg.hidden = true;
      lbMissing.hidden = false;
      lbMissing.textContent = 'This image could not be loaded. Check the file path in data.js: ' + it.src;
    };
    lbImg.src = it.src;
    lbImg.alt = it.caption || '';
    lbCap.textContent = (it.caption || '') + (lbSet.length > 1 ? '  (' + (lbIndex + 1) + ' of ' + lbSet.length + ')' : '');
    lbPrev.hidden = lbSet.length < 2;
    lbNext.hidden = lbSet.length < 2;
  }
  function openLightbox(set, index) {
    lbSet = set;
    lbIndex = index || 0;
    showLightboxImage();
    if (!lb.open) lb.showModal();
  }
  function stepLightbox(d) {
    lbIndex = (lbIndex + d + lbSet.length) % lbSet.length;
    showLightboxImage();
  }
  $('#lb-close').addEventListener('click', function () { lb.close(); });
  lbPrev.addEventListener('click', function () { stepLightbox(-1); });
  lbNext.addEventListener('click', function () { stepLightbox(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', function (e) {
    if (lbSet.length < 2) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); stepLightbox(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); stepLightbox(1); }
  });

  /* ---------- certificates and achievements ---------- */
  // Pictures with role 'activity' belong to the detail panel (events, projects, screenshots).
  // Everything else is a picture of the certificate itself.
  function certPics(it) { return usable(it.images).filter(function (i) { return i.role !== 'activity'; }); }
  function activityPics(it) { return usable(it.images).filter(function (i) { return i.role === 'activity'; }); }
  function certById(id) {
    var all = (D.achievements || []).concat(D.training || []);
    for (var i = 0; i < all.length; i++) if (all[i].id === id && !all[i].hidden) return all[i];
    return null;
  }
  function certKind(it) { return (D.achievements || []).indexOf(it) > -1 ? 'achievement' : 'training'; }
  function certHasDetail(it) {
    return certPics(it).length > 0 || activityPics(it).length > 0 || has(it.story) || (has(it.related) && !!projectById(it.related));
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  function renderCerts(selector, items) {
    var box = $(selector);
    var list = (items || []).filter(function (it) { return !it.hidden; });
    if (!list.length) {
      // nothing to show: hide the empty list and its heading
      box.hidden = true;
      if (box.previousElementSibling) box.previousElementSibling.hidden = true;
      return;
    }
    list.forEach(function (it) {
      var shots = certPics(it);
      var acts = activityPics(it);
      var rich = certHasDetail(it);
      var thumb = null;
      var open = function (e) { requestCertOpen(it.id, e && e.currentTarget); };
      if (!it.images || !it.images.length) {
        thumb = null; // no copy of the certificate: show the row without a picture box
      } else if (shots.length || acts.length) {
        var cover = shots[0] || acts[0];
        var extra = shots.length + acts.length - 1;
        thumb = h('button', {
          class: 'thumb', type: 'button',
          'aria-label': 'Open details: ' + it.title,
          onclick: open
        }, [
          h('img', {
            src: cover.src, alt: '', loading: 'lazy',
            onerror: function (e) {
              var btn = e.target.parentNode;
              btn.classList.add('is-broken');
              e.target.remove();
              btn.appendChild(icon('image'));
              btn.appendChild(h('span', { text: 'Not found' }));
            }
          }),
          extra > 0 ? h('span', { class: 'thumb-count', text: '+' + extra }) : null
        ]);
      } else {
        thumb = h('div', { class: 'thumb is-pending', role: 'img', 'aria-label': 'Certificate image coming soon' }, [
          icon('image'), h('span', { text: 'Coming soon' })
        ]);
      }
      var mainKids = [
        h('strong', { text: it.title }),
        h('span', { class: 'meta', text: it.meta })
      ];
      var cta = null;
      if (rich) {
        var bits = [];
        if (acts.length) bits.push(plural(acts.length, 'photo', 'photos'));
        cta = h('span', { class: 'row-cta' }, [ (bits.length ? bits.join(' · ') + ' · ' : '') + 'View details', icon('arrow') ]);
      }
      var main = rich
        ? h('div', { class: 'row-main' }, [
            h('button', { class: 'row-open', type: 'button', 'aria-haspopup': 'dialog', 'aria-label': 'Open details: ' + it.title, onclick: open }, mainKids.concat([ cta ]))
          ])
        : h('div', { class: 'row-main' }, mainKids);
      box.appendChild(h('li', { class: rich ? 'is-link' : null }, [
        main,
        h('div', { class: 'row-side' }, [ h('span', { class: 'when', text: it.year }), thumb ])
      ]));
    });
  }

  /* ---------- skills ---------- */
  function chip(text) { return h('li', { text: text }); }
  function renderSkills() {
    var box = $('#skills-list');
    (D.skills || []).forEach(function (g) {
      box.appendChild(h('div', { class: 'group' }, [
        h('h3', { text: g.group }),
        h('ul', { class: 'chips' }, g.items.map(chip))
      ]));
    });
  }

  /* ---------- projects: categories, cards ---------- */
  var cats = [{ id: 'all', label: 'All' }].concat(D.projectCategories || []);
  var activeCat = 'all';

  function catLabel(id) {
    for (var i = 0; i < cats.length; i++) if (cats[i].id === id) return cats[i].label;
    return id;
  }
  function projectsIn(cat) {
    return (D.projects || []).filter(function (p) { return cat === 'all' || p.category === cat; });
  }
  function projectById(id) {
    var all = D.projects || [];
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  // Shared by the project and gallery tabs. Arrow keys, Home and End move between tabs.
  function buildTabs(container, list, activeId, prefix, panelId, countFor, onPick) {
    container.textContent = '';
    list.forEach(function (c) {
      var selected = c.id === activeId;
      container.appendChild(h('button', {
        class: 'tab', type: 'button', role: 'tab', id: prefix + c.id,
        'aria-selected': selected ? 'true' : 'false',
        'aria-controls': panelId,
        tabindex: selected ? '0' : '-1',
        onclick: function () { onPick(c.id); }
      }, [ c.label, h('span', { class: 'count', text: String(countFor(c.id)) }) ]));
    });
  }
  function tabKeys(container, list, getActive, prefix, onPick) {
    container.addEventListener('keydown', function (e) {
      var keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
      if (keys.indexOf(e.key) === -1) return;
      e.preventDefault();
      var i = 0;
      list.forEach(function (c, idx) { if (c.id === getActive()) i = idx; });
      if (e.key === 'ArrowRight') i = (i + 1) % list.length;
      if (e.key === 'ArrowLeft') i = (i - 1 + list.length) % list.length;
      if (e.key === 'Home') i = 0;
      if (e.key === 'End') i = list.length - 1;
      onPick(list[i].id);
      var t = document.getElementById(prefix + list[i].id);
      if (t) t.focus();
    });
  }

  function renderTabs() {
    buildTabs($('#project-tabs'), cats, activeCat, 'tab-', 'project-panel',
      function (id) { return projectsIn(id).length; }, setCategory);
  }

  function renderGrid() {
    var grid = $('#project-grid');
    grid.textContent = '';
    var list = projectsIn(activeCat);
    if (!list.length) {
      grid.appendChild(h('li', { class: 'empty' }, [
        icon('folder'),
        h('strong', { text: 'No ' + catLabel(activeCat).toLowerCase() + ' projects yet' }),
        h('span', { text: 'New work will be added to this category.' })
      ]));
      return;
    }
    list.forEach(function (p) {
      var more = p.stack.length > 4 ? [chip('+' + (p.stack.length - 4))] : [];
      grid.appendChild(h('li', null, [
        h('article', { class: 'card' }, [
          h('div', { class: 'card-top' }, [
            h('span', { class: 'tag', text: p.tag }),
            h('span', { class: 'when', text: p.year })
          ]),
          h('h3', { class: 'card-title' }, [
            h('button', {
              class: 'card-open', type: 'button', 'aria-haspopup': 'dialog',
              onclick: function (e) { requestOpen(p.id, e.currentTarget); }
            }, [ p.title ])
          ]),
          h('p', { class: 'card-sum', text: p.summary }),
          h('ul', { class: 'chips sm' }, p.stack.slice(0, 4).map(chip).concat(more)),
          h('span', { class: 'card-cta', 'aria-hidden': 'true' }, [ 'View details', icon('arrow') ])
        ])
      ]));
    });
  }

  function setCategory(id) {
    activeCat = id;
    renderTabs();
    renderGrid();
    var n = projectsIn(id).length;
    $('#project-status').textContent = 'Showing ' + n + ' ' + (id === 'all' ? '' : catLabel(id).toLowerCase() + ' ') + (n === 1 ? 'project' : 'projects');
  }

  tabKeys($('#project-tabs'), cats, function () { return activeCat; }, 'tab-', setCategory);

  /* ---------- gallery: graphic design and photography ---------- */
  var G = D.gallery || { categories: [], items: [] };
  var gCats = [{ id: 'all', label: 'All' }].concat(G.categories || []);
  var activeGal = 'all';

  function galItems(cat) {
    return (G.items || []).filter(function (it) { return cat === 'all' || it.category === cat; });
  }
  function galLabel(id) {
    for (var i = 0; i < gCats.length; i++) if (gCats[i].id === id) return gCats[i].label;
    return id;
  }
  function renderGalleryTabs() {
    buildTabs($('#gallery-tabs'), gCats, activeGal, 'gtab-', 'gallery-panel',
      function (id) { return galItems(id).length; }, setGallery);
  }
  // The "All" tab shows only a few pieces per category so the page stays short;
  // each category has a "View more work" button that opens its own tab.
  var GAL_FEATURED = 3;

  // Adds one card per piece to a list. Clicking a card opens the viewer on that piece.
  function galCards(list, ul) {
    var real = list.filter(function (it) { return has(it.src); });
    var set = real.map(function (it) {
      return { src: it.src, caption: it.title + (has(it.caption) ? ' — ' + it.caption : '') };
    });
    list.forEach(function (it) {
      if (has(it.src)) {
        var idx = real.indexOf(it);
        ul.appendChild(h('li', null, [
          h('button', {
            class: 'g-item', type: 'button', 'aria-label': 'View larger: ' + it.title,
            onclick: function () { openLightbox(set, idx); }
          }, [
            h('img', {
              src: it.src, alt: it.title, loading: 'lazy',
              onerror: function (e) {
                var btn = e.target.parentNode;
                btn.classList.add('is-pending');
                e.target.remove();
                btn.appendChild(icon('image'));
                btn.appendChild(h('span', { text: 'Image not found' }));
              }
            }),
            h('span', { class: 'g-cap' }, [
              h('strong', { text: it.title }),
              has(it.caption) ? h('span', { text: it.caption }) : null
            ])
          ])
        ]));
      } else {
        ul.appendChild(h('li', null, [
          h('div', {
            class: 'g-item is-pending', style: 'aspect-ratio:' + (it.ratio || '4 / 3'),
            role: 'img', 'aria-label': it.title + ' coming soon'
          }, [ icon('image'), h('span', { text: it.title + ' · soon' }) ])
        ]));
      }
    });
  }

  // pieces with a picture come first, so "coming soon" cards do not take the featured spots
  function featuredOf(list) {
    var withPic = list.filter(function (it) { return has(it.src); });
    var without = list.filter(function (it) { return !has(it.src); });
    return withPic.concat(without).slice(0, GAL_FEATURED);
  }

  function renderGalleryGrid() {
    var grid = $('#gallery-grid');
    var groups = $('#gallery-groups');
    if (!groups) {
      // index.html is an older copy without the "All" groups box: create it here so nothing breaks
      groups = h('div', { class: 'g-groups', id: 'gallery-groups', hidden: true });
      grid.parentNode.insertBefore(groups, grid);
    }
    grid.textContent = '';
    groups.textContent = '';
    var list = galItems(activeGal);
    var realCats = gCats.slice(1);
    var grouped = activeGal === 'all' && realCats.length > 1;

    groups.hidden = !(grouped && list.length);
    grid.hidden = grouped && list.length > 0;

    if (!list.length) {
      grid.classList.add('is-empty');
      grid.appendChild(h('li', { class: 'empty' }, [
        icon('image'),
        h('strong', { text: 'Nothing in ' + galLabel(activeGal).toLowerCase() + ' yet' }),
        h('span', { text: 'New work will be added here.' })
      ]));
      return;
    }
    grid.classList.remove('is-empty');

    if (!grouped) { galCards(list, grid); return; }

    realCats.forEach(function (c) {
      var items = galItems(c.id);
      if (!items.length) return;
      var ul = h('ul', { class: 'gallery-grid' });
      galCards(featuredOf(items), ul);
      var more = items.length - GAL_FEATURED;
      var openCategory = function () {
        setGallery(c.id);
        var t = document.getElementById('gtab-' + c.id);
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        $('#gallery-tabs').scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
        if (t) t.focus({ preventScroll: true });
      };
      // last slide on phones: leads to the rest of the category
      if (more > 0) {
        ul.appendChild(h('li', { class: 'g-end' }, [
          h('button', { class: 'g-endcard', type: 'button', onclick: openCategory, 'aria-label': 'View more ' + c.label.toLowerCase() + ' work, ' + items.length + ' pieces in total' }, [
            icon('arrow'), h('strong', { text: 'View more work' }), h('span', { text: more + (more === 1 ? ' more piece' : ' more pieces') })
          ])
        ]));
      }
      var prev = h('button', { class: 'g-arrow prev', type: 'button', 'aria-label': 'Previous ' + c.label.toLowerCase() + ' piece' }, [ icon('chev-left') ]);
      var next = h('button', { class: 'g-arrow next', type: 'button', 'aria-label': 'Next ' + c.label.toLowerCase() + ' piece' }, [ icon('chev-right') ]);
      var dots = h('div', { class: 'g-dots', 'aria-hidden': 'true' });
      groups.appendChild(h('section', { class: 'g-group', 'aria-label': c.label }, [
        h('div', { class: 'g-head' }, [
          h('h3', null, [ c.label, h('span', { class: 'count', text: String(items.length) }) ]),
          more > 0 ? h('button', {
            class: 'g-more', type: 'button',
            'aria-label': 'View more ' + c.label.toLowerCase() + ' work, ' + items.length + ' pieces in total',
            onclick: openCategory
          }, [ 'View more work', icon('arrow') ]) : null
        ]),
        h('div', { class: 'g-rail' }, [ ul, prev, next ]),
        dots
      ]));
      wireRail(ul, prev, next, dots);
    });
  }

  // On phones the featured pieces form a swipeable row. Arrows and dots follow the scroll position.
  function wireRail(ul, prev, next, dots) {
    var slides = ul.children;
    for (var i = 0; i < slides.length; i++) dots.appendChild(h('span', { class: 'dot' }));
    function index() {
      var best = 0, bestD = Infinity, mid = ul.scrollLeft + ul.clientWidth / 2;
      for (var i = 0; i < slides.length; i++) {
        var d = Math.abs(slides[i].offsetLeft + slides[i].offsetWidth / 2 - mid);
        if (d < bestD) { bestD = d; best = i; }
      }
      return best;
    }
    function update() {
      var i = index();
      for (var k = 0; k < dots.children.length; k++) dots.children[k].classList.toggle('on', k === i);
      prev.disabled = ul.scrollLeft <= 2;
      next.disabled = ul.scrollLeft + ul.clientWidth >= ul.scrollWidth - 2;
    }
    function go(d) {
      var i = Math.max(0, Math.min(slides.length - 1, index() + d));
      var el = slides[i];
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      ul.scrollTo({ left: el.offsetLeft - (ul.clientWidth - el.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
    }
    prev.addEventListener('click', function () { go(-1); });
    next.addEventListener('click', function () { go(1); });
    ul.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
  function setGallery(id) {
    activeGal = id;
    renderGalleryTabs();
    renderGalleryGrid();
    var n = galItems(id).length;
    $('#gallery-status').textContent = id === 'all' && gCats.length > 2
      ? 'Showing featured work from each category, ' + n + (n === 1 ? ' piece' : ' pieces') + ' in total'
      : 'Showing ' + n + ' ' + (id === 'all' ? '' : galLabel(id).toLowerCase() + ' ') + (n === 1 ? 'piece' : 'pieces');
  }
  tabKeys($('#gallery-tabs'), gCats, function () { return activeGal; }, 'gtab-', setGallery);

  /* ---------- project details dialog ---------- */
  var pd = $('#project-dialog');
  var pdBody = $('#pd-body');
  var pdKicker = $('#pd-kicker');
  var pdPrev = $('#pd-prev');
  var pdNext = $('#pd-next');
  var currentId = null;
  var openedByNav = false;
  var lastOpener = null;

  function section(title, content) {
    return h('section', { class: 'pd-sec' }, [ h('h3', { text: title }), content ]);
  }

  function linksEl(p) {
    var wrap = h('div', { class: 'btn-row' });
    (p.links || []).forEach(function (l) {
      if (has(l.url)) {
        wrap.appendChild(h('a', { class: 'btn solid', href: l.url, target: '_blank', rel: 'noopener' }, [ l.label, icon('external') ]));
      } else {
        wrap.appendChild(h('span', { class: 'btn is-pending', 'aria-disabled': 'true' }, [ l.label, h('em', { text: 'Link coming soon' }) ]));
      }
    });
    if (!wrap.children.length) wrap.appendChild(h('p', { class: 'pd-empty', text: 'No links yet.' }));
    return wrap;
  }

  function galleryEl(p) {
    var real = usable(p.screenshots);
    var wrap = h('div', { class: 'gallery' });
    (p.screenshots || []).forEach(function (s) {
      if (has(s.src)) {
        var idx = real.indexOf(s);
        wrap.appendChild(h('button', {
          class: 'shot', type: 'button', 'aria-label': 'View larger: ' + (s.caption || p.title),
          onclick: function () { openLightbox(real, idx); }
        }, [
          h('img', {
            src: s.src, alt: s.caption || '', loading: 'lazy',
            onerror: function (e) {
              var btn = e.target.parentNode;
              btn.classList.add('is-pending');
              e.target.remove();
              btn.appendChild(icon('image'));
              btn.appendChild(h('span', { text: 'Image not found' }));
            }
          })
        ]));
      } else {
        wrap.appendChild(h('div', { class: 'shot is-pending', role: 'img', 'aria-label': (s.caption || 'Screenshot') + ' coming soon' }, [
          icon('image'), h('span', { text: (s.caption || 'Screenshot') + ' · soon' })
        ]));
      }
    });
    if (!wrap.children.length) wrap.appendChild(h('p', { class: 'pd-empty', text: 'No screenshots yet.' }));
    return wrap;
  }

  function docsEl(p) {
    var list = h('ul', { class: 'docs' });
    (p.docs || []).forEach(function (d) {
      var kids = [ icon('file'), h('span', { class: 'doc-name', text: d.label }), h('span', { class: 'tag ghost', text: d.type || 'File' }) ];
      if (has(d.url)) {
        kids.push(icon('external'));
        list.appendChild(h('li', null, [ h('a', { class: 'doc', href: d.url, target: '_blank', rel: 'noopener' }, kids) ]));
      } else {
        kids.push(h('em', { class: 'soon', text: 'Coming soon' }));
        list.appendChild(h('li', null, [ h('div', { class: 'doc is-pending' }, kids) ]));
      }
    });
    if (!list.children.length) list.appendChild(h('li', { class: 'pd-empty', text: 'No documents yet.' }));
    return list;
  }

  function siblingIds() {
    var visible = projectsIn(activeCat).map(function (p) { return p.id; });
    if (visible.indexOf(currentId) > -1) return visible;
    return (D.projects || []).map(function (p) { return p.id; });
  }
  function stepProject(d) {
    var ids = siblingIds();
    var i = ids.indexOf(currentId);
    location.replace('#project-' + ids[(i + d + ids.length) % ids.length]);
  }
  pdPrev.addEventListener('click', function () { stepProject(-1); });
  pdNext.addEventListener('click', function () { stepProject(1); });

  function showProject(id) {
    var p = projectById(id);
    if (!p) return;
    currentId = id;
    pdKicker.textContent = catLabel(p.category) + ' project';
    pdBody.textContent = '';
    [
      h('h2', { id: 'pd-title', class: 'pd-title', text: p.title }),
      h('div', { class: 'pd-meta' }, [ h('span', { class: 'tag', text: p.tag }), h('span', { class: 'when', text: p.year }) ]),
      h('p', { class: 'pd-sum', text: p.summary }),
      has(p.details) ? h('p', { class: 'pd-sum', text: p.details }) : null,
      section('Tech stack', h('ul', { class: 'chips' }, p.stack.map(chip))),
      section('Links', linksEl(p)),
      section('Screenshots', galleryEl(p)),
      section('Documentation', docsEl(p))
    ].forEach(function (n) { if (n) pdBody.appendChild(n); });
    pdBody.scrollTop = 0;
    var multi = (D.projects || []).length > 1;
    pdPrev.hidden = !multi;
    pdNext.hidden = !multi;
    if (!pd.open) pd.showModal();
  }

  // Opening writes #project-<id> to the address bar, so the browser Back button
  // closes the dialog and a project can be shared as a link.
  function requestOpen(id, opener) {
    lastOpener = opener || null;
    openedByNav = true;
    location.hash = 'project-' + id;
  }
  function closeProject() {
    if (/^#project-/.test(location.hash)) {
      if (openedByNav) { history.back(); return; }
      history.replaceState(null, '', location.pathname + location.search + '#projects');
    }
    if (pd.open) pd.close();
  }
  function syncFromHash() {
    var m = /^#project-([a-z0-9-]+)$/i.exec(location.hash);
    var a = /^#achievement-([a-z0-9-]+)$/i.exec(location.hash);
    if (m && projectById(m[1])) {
      if (cd.open) cd.close();
      if (!pd.open || currentId !== m[1]) showProject(m[1]);
    } else if (a && certById(a[1])) {
      if (!cd.open || certId !== a[1]) showCert(a[1]);
    } else {
      if (lb.open) lb.close();
      if (pd.open) pd.close();
      if (cd.open) cd.close();
    }
  }
  $('#pd-close').addEventListener('click', closeProject);
  pd.addEventListener('cancel', function (e) { e.preventDefault(); closeProject(); });
  pd.addEventListener('click', function (e) { if (e.target === pd) closeProject(); });
  pd.addEventListener('close', function () {
    currentId = null;
    openedByNav = false;
    if (lastOpener && document.body.contains(lastOpener)) lastOpener.focus();
    lastOpener = null;
  });
  window.addEventListener('hashchange', syncFromHash);

  /* ---------- achievement details dialog ---------- */
  if (!$('#cert-dialog')) {
    // index.html is an older copy without the details dialog: build it here
    document.body.appendChild(h('dialog', { id: 'cert-dialog', class: 'sheet', 'aria-labelledby': 'cd-title' }, [
      h('div', { class: 'sheet-bar' }, [
        h('p', { class: 'sheet-kicker', id: 'cd-kicker' }),
        h('div', { class: 'sheet-nav' }, [
          h('button', { type: 'button', class: 'icon-btn', id: 'cd-prev', 'aria-label': 'Previous entry' }, [ icon('chev-left') ]),
          h('button', { type: 'button', class: 'icon-btn', id: 'cd-next', 'aria-label': 'Next entry' }, [ icon('chev-right') ]),
          h('button', { type: 'button', class: 'icon-btn', id: 'cd-close', 'aria-label': 'Close details', autofocus: true }, [ icon('close') ])
        ])
      ]),
      h('div', { class: 'sheet-body', id: 'cd-body' })
    ]));
  }
  var cd = $('#cert-dialog');
  var cdBody = $('#cd-body');
  var cdKicker = $('#cd-kicker');
  var cdPrev = $('#cd-prev');
  var cdNext = $('#cd-next');
  var certId = null;
  var certByNav = false;
  var certOpener = null;

  function photoGrid(set, label, withCaptions) {
    var wrap = h('div', { class: 'gallery moments' });
    set.forEach(function (s, idx) {
      var fig = h('figure', { class: 'moment' }, [
        h('button', {
          class: 'shot', type: 'button', 'aria-label': 'View larger: ' + (s.caption || label),
          onclick: function () { openLightbox(set, idx); }
        }, [
          h('img', {
            src: s.src, alt: s.caption || '', loading: 'lazy',
            onerror: function (e) {
              var btn = e.target.parentNode;
              btn.classList.add('is-pending');
              e.target.remove();
              btn.appendChild(icon('image'));
              btn.appendChild(h('span', { text: 'Image not found' }));
            }
          })
        ]),
        withCaptions && has(s.caption) ? h('figcaption', { text: s.caption }) : null
      ]);
      wrap.appendChild(fig);
    });
    return wrap;
  }

  function certSiblings(it) {
    var pool = certKind(it) === 'achievement' ? (D.achievements || []) : (D.training || []);
    var same = pool.filter(function (x) { return !x.hidden && certHasDetail(x); });
    return same.length ? same : [it];
  }
  function stepCert(d) {
    var it = certById(certId);
    if (!it) return;
    var ids = certSiblings(it).map(function (x) { return x.id; });
    var i = ids.indexOf(certId);
    location.replace('#achievement-' + ids[(i + d + ids.length) % ids.length]);
  }
  cdPrev.addEventListener('click', function () { stepCert(-1); });
  cdNext.addEventListener('click', function () { stepCert(1); });

  function showCert(id) {
    var it = certById(id);
    if (!it) return;
    if (pd.open) pd.close();
    certId = id;
    cdKicker.textContent = certKind(it) === 'achievement' ? 'Achievement' : 'Certification and training';
    cdBody.textContent = '';
    var certs = certPics(it);
    var acts = activityPics(it);
    var rel = has(it.related) ? projectById(it.related) : null;
    [
      h('h2', { id: 'cd-title', class: 'pd-title', text: it.title }),
      h('div', { class: 'pd-meta' }, [
        has(it.meta) ? h('span', { class: 'tag', text: it.meta }) : null,
        has(it.year) ? h('span', { class: 'when', text: it.year }) : null
      ]),
      has(it.story) ? h('p', { class: 'pd-sum story', text: it.story }) : null,
      rel ? h('div', { class: 'btn-row' }, [
        h('button', {
          class: 'btn solid', type: 'button',
          onclick: function () {
            var opener = certOpener;
            cd.close();
            requestOpen(rel.id, opener);
          }
        }, [ 'Related project: ' + rel.title, icon('arrow') ])
      ]) : null,
      acts.length ? section('Activities and highlights', photoGrid(acts, it.title, true)) : null,
      certs.length ? section(certs.length > 1 ? 'Certificates' : 'Certificate', photoGrid(certs, it.title, false)) : null
    ].forEach(function (n) { if (n) cdBody.appendChild(n); });
    cdBody.scrollTop = 0;
    var multi = certSiblings(it).length > 1;
    cdPrev.hidden = !multi;
    cdNext.hidden = !multi;
    if (!cd.open) cd.showModal();
  }

  function requestCertOpen(id, opener) {
    certOpener = opener || null;
    certByNav = true;
    location.hash = 'achievement-' + id;
  }
  function closeCert() {
    if (/^#achievement-/.test(location.hash)) {
      if (certByNav) { history.back(); return; }
      history.replaceState(null, '', location.pathname + location.search + '#achievements');
    }
    if (cd.open) cd.close();
  }
  $('#cd-close').addEventListener('click', closeCert);
  cd.addEventListener('cancel', function (e) { e.preventDefault(); closeCert(); });
  cd.addEventListener('click', function (e) { if (e.target === cd) closeCert(); });
  cd.addEventListener('close', function () {
    certId = null;
    certByNav = false;
    if (certOpener && document.body.contains(certOpener)) certOpener.focus();
    certOpener = null;
  });

  /* ---------- socials ---------- */
  function renderSocials() {
    var box = $('#social-list');
    (D.socials || []).forEach(function (s) {
      var live = s.info || (has(s.href) && has(s.value));
      var head = [
        h('span', { class: 'soc-ico' }, [ icon(s.icon) ]),
        h('div', { class: 'soc-text' }, [
          h('strong', { text: s.label }),
          h('span', { class: 'meta', text: live ? s.value : 'Link coming soon' })
        ])
      ];
      var main;
      if (live && !s.info) {
        var external = /^https?:/.test(s.href);
        main = h('a', {
          class: 'soc-main', href: s.href,
          target: external ? '_blank' : null, rel: external ? 'noopener' : null,
          'aria-label': s.label + ': ' + s.value
        }, head.concat([ icon(external ? 'external' : 'arrow') ]));
      } else {
        main = h('div', { class: 'soc-main' + (live ? '' : ' is-pending') }, head);
      }
      var li = h('li', { class: 'social' + (live ? '' : ' is-pending-card') }, [ main ]);
      if (live && s.copy) {
        li.appendChild(h('button', {
          class: 'copy', type: 'button', 'aria-label': 'Copy ' + s.label.toLowerCase(),
          onclick: function () { copyText(s.value, s.label); }
        }, [ icon('copy'), 'Copy' ]));
      }
      box.appendChild(li);
    });
  }

  /* ---------- highlight the section being read in the nav ---------- */
  function initScrollSpy() {
    if (!('IntersectionObserver' in window)) return;
    var links = {};
    $$('.nav a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    links.hero = links.top;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Object.keys(links).forEach(function (k) { if (links[k]) links[k].removeAttribute('aria-current'); });
        var a = links[en.target.id];
        if (a) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    ['hero', 'about', 'achievements', 'skills', 'projects', 'gallery', 'socials'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  /* ---------- start ---------- */
  renderContactStrip();
  renderExperience();
  renderCerts('#achievement-list', D.achievements);
  renderCerts('#training-list', D.training);
  renderSkills();
  renderTabs();
  renderGrid();
  renderGalleryTabs();
  renderGalleryGrid();
  renderSocials();
  initScrollSpy();
  syncFromHash();
})();