/* =====================================================================
   Loads your content from the database for visitors, then starts the site (main.js).

   Order of preference:
     1. the database (when config.js is filled in and the database answers)
     2. the last copy this browser saved from the database
     3. data.js, the content built into the site

   So the site never shows a blank page, even if the database is paused or offline.
   Visitors only ever READ. Saving changes happens in admin.html.
   ===================================================================== */
(function () {
  'use strict';

  var cfg = window.PORTFOLIO_CONFIG || {};
  var P = window.PORTFOLIO = window.PORTFOLIO || {};
  var CACHE_KEY = 'maverick-portfolio-cache-v1';
  var started = false;

  function start() {
    if (started) return;
    started = true;
    var s = document.createElement('script');
    s.src = 'js/main.js';
    document.body.appendChild(s);
    // puts your photo in the big circle (does nothing if there is no photo)
    var ph = document.createElement('script');
    ph.src = 'js/portrait.js';
    document.body.appendChild(ph);
  }

  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) { start(); return; }

  var base = String(cfg.supabaseUrl).replace(/\/+$/, '') + '/rest/v1/';
  var headers = { apikey: cfg.supabaseAnonKey, Accept: 'application/json' };
  // Older "anon" keys are JWTs and may also be sent as a bearer token.
  // New "publishable" keys must only be sent in the apikey header.
  if (/^eyJ/.test(cfg.supabaseAnonKey)) headers.Authorization = 'Bearer ' + cfg.supabaseAnonKey;

  function get(table) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    return fetch(base + table + '?select=*&order=sort.asc,created_at.asc', { headers: headers, signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error(table + ' ' + r.status);
        return r.json();
      }, function (e) { clearTimeout(timer); throw e; });
  }

  function imgs(list) {
    return (Array.isArray(list) ? list : []).map(function (i) {
      var o = { src: i.src || '', caption: i.caption || '' };
      if (i.role) o.role = i.role;
      return o;
    });
  }
  function toSite(rows) {
    return {
      projects: rows.projects.map(function (r) {
        return {
          id: r.id, title: r.title, category: r.category, tag: r.tag || '', year: r.year || '',
          summary: r.summary || '', details: r.details || '', stack: r.stack || [],
          links: Array.isArray(r.links) ? r.links : [],
          screenshots: imgs(r.screenshots),
          docs: Array.isArray(r.docs) ? r.docs : []
        };
      }),
      certificates: rows.certificates.map(function (r) {
        return { id: r.id, kind: r.kind, title: r.title, meta: r.meta || '', year: r.year || '', images: imgs(r.images), story: r.story || '', related: r.related || '' };
      }),
      gallery: rows.gallery.map(function (r) {
        return { id: r.id, category: r.category, title: r.title, caption: r.caption || '', src: r.src || '', ratio: r.ratio || '4 / 3' };
      }),
      more: toMore(rows),
      portrait: toPortrait(rows.settings),
      categories: toCategories(rows.settings),
      siteinfo: toSiteInfo(rows.settings)
    };
  }
  function toPortrait(settings) {
    var hit = (settings || []).filter(function (r) { return r.id === 'portrait' && r.value && r.value.url; })[0];
    return hit ? { url: hit.value.url, pos: typeof hit.value.pos === 'number' ? hit.value.pos : 30 } : null;
  }
  // The text at the top of the home page, edited in the admin page (Site info tab).
  function toSiteInfo(settings) {
    var hit = (settings || []).filter(function (r) { return r.id === 'siteinfo' && r.value && typeof r.value === 'object'; })[0];
    if (!hit) return null;
    var v = hit.value, out = {};
    ['first', 'rest', 'eyebrow', 'intro', 'about', 'title', 'description'].forEach(function (k) {
      if (typeof v[k] === 'string' && v[k].trim()) out[k] = v[k].trim();
    });
    if (Array.isArray(v.creds)) {
      var list = v.creds.filter(function (x) { return typeof x === 'string' && x.trim(); }).map(function (x) { return x.trim(); });
      if (list.length) out.creds = list;
    }
    return Object.keys(out).length ? out : null;
  }
  // Puts that text into the page. Everything is set as plain text, never as HTML.
  function applySiteInfo(s) {
    if (!s) return;
    function set(sel, text) { var el = document.querySelector(sel); if (el && text) el.textContent = text; }
    set('.id h1 .first', s.first);
    set('.id h1 .rest', s.rest);
    set('.eyebrow', s.eyebrow);
    set('.id .intro', s.intro);
    set('#about .lead', s.about);
    set('.nav a[href="#top"]', s.first);
    if (s.creds) {
      var ul = document.querySelector('.id .creds');
      if (ul) {
        ul.textContent = '';
        s.creds.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      }
    }
    var name = [s.first, s.rest].filter(Boolean).join(' ');
    var fp = document.querySelector('.foot p');
    if (fp && name && fp.lastChild && fp.lastChild.nodeType === 3) fp.lastChild.nodeValue = ' ' + name;
    if (s.title) document.title = s.title;
    var meta = document.querySelector('meta[name="description"]');
    if (meta && s.description) meta.setAttribute('content', s.description);
  }
  // Category lists you manage in the admin page (they become the tabs on the site).
  function toCategories(settings) {
    var hit = (settings || []).filter(function (r) { return r.id === 'categories' && r.value; })[0];
    if (!hit) return null;
    function clean(list) {
      return (Array.isArray(list) ? list : []).filter(function (c) { return c && c.id && c.label; }).map(function (c) { return { id: String(c.id), label: String(c.label) }; });
    }
    return { projects: clean(hit.value.projects), gallery: clean(hit.value.gallery) };
  }
  // Experience, skills, socials and resume. Only used once you have imported them in the admin page,
  // and only if their tables exist (they come from 3-more-content.sql). Otherwise data.js is kept.
  function toMore(rows) {
    if (!rows.experience || !rows.skills || !rows.socials || !rows.settings) return null;
    var seeded = false, resume = '';
    rows.settings.forEach(function (r) {
      if (r.id === 'seeded2') seeded = true;
      if (r.id === 'resume' && r.value && r.value.url) resume = r.value.url;
    });
    if (!seeded) return null;
    return {
      resume: resume,
      experience: rows.experience.map(function (r) {
        return { role: r.role, company: r.company, place: r.place || '', start: r.period_start || '', end: r.period_end || '', bullets: r.bullets || [] };
      }),
      skills: rows.skills.map(function (r) { return { group: r.name, items: r.items || [] }; }),
      socials: rows.socials.map(function (r) {
        return { id: r.id, label: r.label, icon: r.icon || 'external', value: r.value || '', href: r.href || '', copy: !!r.copy, info: !!r.info };
      })
    };
  }
  function apply(c) {
    if (c.portrait) P.portrait = c.portrait;
    if (c.categories) {
      if (c.categories.projects.length) P.projectCategories = c.categories.projects;
      if (c.categories.gallery.length) { P.gallery = P.gallery || { categories: [], items: [] }; P.gallery.categories = c.categories.gallery; }
    }
    // If every table is empty the database has not been filled yet, so keep data.js.
    if (!c.projects.length && !c.certificates.length && !c.gallery.length) return;
    P.projects = c.projects;
    P.achievements = c.certificates.filter(function (x) { return x.kind === 'achievement'; });
    P.training = c.certificates.filter(function (x) { return x.kind === 'training'; });
    P.gallery = { categories: (P.gallery && P.gallery.categories) || [], items: c.gallery };
    if (c.more) {
      P.resume = { url: c.more.resume };
      P.experience = c.more.experience;
      P.skills = c.more.skills;
      P.socials = c.more.socials;
    }
  }

  // Show the last saved top-of-page text straight away, so it does not flash the old text on repeat visits.
  var appliedFromCache = false;
  try {
    var early = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (early && early.siteinfo) { applySiteInfo(early.siteinfo); appliedFromCache = true; }
  } catch (e) {}

  // The new tables may not exist yet, so a failure there must not break the rest.
  function soft(table) { return get(table).then(function (r) { return r; }, function () { return null; }); }

  Promise.all([get('projects'), get('certificates'), get('gallery_items'), soft('experience'), soft('skill_groups'), soft('socials'), soft('site_settings')])
    .then(function (res) {
      var c = toSite({ projects: res[0], certificates: res[1], gallery: res[2], experience: res[3], skills: res[4], socials: res[5], settings: res[6] });
      apply(c);
      applySiteInfo(c.siteinfo);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) {}
      // the saved text was removed in the admin page: reload once to show the built-in text again
      if (appliedFromCache && !c.siteinfo) location.reload();
    })
    .catch(function () {
      try {
        var saved = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (saved && saved.projects) apply(saved);
      } catch (e) {}
    })
    .then(start, start);
})();