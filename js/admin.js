/* =====================================================================
   Admin page: sign in, then add, edit, reorder, hide and delete your content:
   an overview with backup, the text at the top of your home page, projects, certificates, gallery (with filters and
   editable categories), experience, skills, social links, resume and your hero photo.
   Uploads go to Supabase Storage.
   Visitors never see this page working: the database only lets the admin
   account write, no matter who opens this file.
   ===================================================================== */
(function () {
  'use strict';

  var CFG = window.PORTFOLIO_CONFIG || {};
  var BUILTIN = window.PORTFOLIO || {};
  var BUCKET = 'portfolio';
  var MAX_BYTES = 20 * 1024 * 1024;

  /* Lists shown in the dropdowns. Categories are edited in the admin page (Manage categories),
     so the two lists below are only the starting values. */
  var DEFAULT_PROJECT_CATS = [['personal', 'Personal'], ['client', 'Client'], ['school', 'School']];
  var DEFAULT_GALLERY_CATS = [['graphic', 'Graphic design'], ['photo', 'Photography']];
  // These two lists are replaced by the categories you save in the admin page (Manage categories).
  var PROJECT_CATS = DEFAULT_PROJECT_CATS.slice();
  var GALLERY_CATS = DEFAULT_GALLERY_CATS.slice();
  var CERT_KINDS = [['achievement', 'Achievement'], ['training', 'Certification or training']];
  var DOC_KINDS = ['PDF', 'DOCX', 'PPTX', 'XLSX', 'ZIP', 'Other'];
  var RATIOS = [['4 / 5', 'Portrait'], ['4 / 3', 'Landscape'], ['1 / 1', 'Square']];
  var IMG_OK = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  var DOC_OK = [
    'application/pdf', 'application/msword', 'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  var SOCIAL_ICONS = [['mail', 'Email'], ['phone', 'Phone'], ['code', 'GitHub or code'], ['linkedin', 'LinkedIn'], ['facebook', 'Facebook'], ['instagram', 'Instagram'], ['pin', 'Location'], ['external', 'Other website']];
  var TABLE = { projects: 'projects', certificates: 'certificates', gallery: 'gallery_items', experience: 'experience', skills: 'skill_groups', socials: 'socials', settings: 'site_settings' };
  var TABS = ['overview', 'siteinfo', 'projects', 'certificates', 'gallery', 'experience', 'skills', 'socials', 'resume', 'photo'];
  var TAB_LABEL = { overview: 'Overview', siteinfo: 'Site info', projects: 'Projects', certificates: 'Certificates', gallery: 'Gallery', experience: 'Experience', skills: 'Skills', socials: 'Social links', resume: 'Resume', photo: 'Photo' };
  var CORE_TABS = ['projects', 'certificates', 'gallery'];

  var app = document.getElementById('app');
  var sb = null;
  var state = { user: null, tab: 'overview', filter: { projects: { cat: 'all', q: '', status: 'all' }, gallery: { cat: 'all', q: '', status: 'all' }, certificates: { cat: 'all', q: '', status: 'all' } }, more: false, seeded: false, data: { projects: [], certificates: [], gallery: [], experience: [], skills: [], socials: [], settings: [] } };
  var panelEl = null;
  var tabsEl = null;
  var uidN = 0;

  /* ---------- helpers ---------- */
  function has(v) { return typeof v === 'string' && v.trim() !== ''; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid(p) { uidN += 1; return p + uidN; }
  function labelOf(list, v) { for (var i = 0; i < list.length; i++) if (list[i][0] === v) return list[i][1]; return v; }
  function slug(s) {
    return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }
  function uniqueId(base, taken) {
    var id = base || 'item', n = 2;
    while (taken.indexOf(id) > -1) { id = base + '-' + n; n += 1; }
    return id;
  }
  function parseList(s) {
    var out = [];
    String(s || '').split(',').forEach(function (x) { x = x.trim(); if (x && out.indexOf(x) === -1) out.push(x); });
    return out;
  }
  function bySort(a, b) { return (a.sort - b.sort) || String(a.created_at || '').localeCompare(String(b.created_at || '')); }
  function nextSort(kind) {
    var m = 0;
    state.data[kind].forEach(function (r) { if (r.sort > m) m = r.sort; });
    return m + 10;
  }

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
  function svg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }
  var ICONS = {
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    up: svg('<path d="M6 15l6-6 6 6"/>'),
    down: svg('<path d="M6 9l6 6 6-6"/>'),
    upload: svg('<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>'),
    image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 9"/>'),
    external: svg('<path d="M7 17L17 7M8 7h9v9"/>'),
    trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>')
  };
  function icon(name) {
    var s = document.createElement('span');
    s.className = 'ico';
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[name] || '';
    return s;
  }
  function btn(label, cls, onclick, iconName) {
    return h('button', { class: 'a-btn ' + (cls || ''), type: 'button', onclick: onclick }, [iconName ? icon(iconName) : null, label]);
  }
  function ibtn(iconName, label, onclick, disabled) {
    return h('button', { class: 'ibtn', type: 'button', 'aria-label': label, title: label, onclick: onclick, disabled: disabled ? true : null }, [icon(iconName)]);
  }

  var toastEl = document.getElementById('toast');
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 3200);
  }

  function friendly(e) {
    var m = (e && (e.message || e.error_description || e.msg)) || String(e);
    if (/Invalid login credentials/i.test(m)) return 'That email or password is not right.';
    if (/row-level security|permission denied|nothing was changed/i.test(m)) return 'Your account is not allowed to change data. Check that you ran 2-make-admin.sql with the same email you signed in with.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Could not reach the database. Check your internet connection and try again.';
    if (/JWT expired|invalid JWT/i.test(m)) return 'Your sign-in expired. Please sign in again.';
    if (/mime type|not supported|not allowed/i.test(m)) return 'That file type is not allowed. Use JPG, PNG, WebP, GIF, PDF, Word, PowerPoint, Excel or ZIP.';
    if (/maximum allowed size|too large|payload/i.test(m)) return 'That file is too big. The limit is 20 MB.';
    if (/(story|related)/i.test(m) && /column|schema cache/i.test(m)) return 'The database needs one small update first. Run sql/4-achievement-details.sql in the Supabase SQL Editor, then try again.';
    if (/duplicate key/i.test(m)) return 'An item with that name already exists. Change the title slightly.';
    return m;
  }
  function isMissing(e) { return /does not exist|schema cache|42P01|PGRST205|Could not find the table/i.test(String(e && (e.message || '')) + ' ' + String(e && e.code || '')); }

  // Runs a write and makes sure at least one row really changed.
  function mutate(query) {
    return query.then(function (r) {
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) throw new Error('Nothing was changed (permission).');
      return r.data;
    });
  }

  /* ---------- confirm dialog ---------- */
  function ask(title, text, okLabel, danger) {
    return new Promise(function (resolve) {
      var dlg = h('dialog', { class: 'confirm', 'aria-labelledby': 'cf-t' });
      var done = false;
      function finish(v) { if (done) return; done = true; dlg.close(); dlg.remove(); resolve(v); }
      dlg.appendChild(h('h2', { id: 'cf-t', text: title }));
      dlg.appendChild(h('p', { text: text }));
      dlg.appendChild(h('div', { class: 'ed-foot' }, [
        btn('Cancel', '', function () { finish(false); }),
        btn(okLabel || 'OK', danger ? 'danger' : 'primary', function () { finish(true); })
      ]));
      dlg.addEventListener('cancel', function (e) { e.preventDefault(); finish(false); });
      document.body.appendChild(dlg);
      dlg.showModal();
    });
  }

  /* ---------- files ---------- */
  function pickFiles(accept, multiple) {
    return new Promise(function (resolve) {
      var i = h('input', { type: 'file', accept: accept, multiple: multiple ? true : null });
      i.style.display = 'none';
      i.addEventListener('change', function () { resolve(Array.prototype.slice.call(i.files || [])); });
      i.click();
    });
  }
  function compressImage(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var s = Math.min(1, 2200 / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * s));
        c.height = Math.max(1, Math.round(img.naturalHeight * s));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { resolve(b && b.type === 'image/webp' && b.size < file.size ? b : null); }, 'image/webp', 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }
  // Uploads one file. Large photos are shrunk first so the site loads fast.
  async function uploadFile(file, folder, ctx, kind) {
    var isImg = IMG_OK.indexOf(file.type) > -1;
    var isDoc = DOC_OK.indexOf(file.type) > -1;
    if (kind === 'image' && !isImg) throw new Error('That file type is not allowed. Choose a JPG, PNG, WebP or GIF picture.');
    if (!isImg && !isDoc) throw new Error('That file type is not allowed. Use JPG, PNG, WebP, GIF, PDF, Word, PowerPoint, Excel or ZIP.');
    if (file.size > MAX_BYTES) throw new Error('That file is too big. The limit is 20 MB.');
    var blob = file, type = file.type;
    var base = slug(file.name.replace(/\.[^.]+$/, '')) || 'file';
    var ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    if (isImg && file.type !== 'image/gif') {
      var small = await compressImage(file);
      if (small) { blob = small; type = 'image/webp'; ext = 'webp'; }
    }
    var path = folder + '/' + Date.now().toString(36) + '-' + base + '.' + ext;
    var res = await sb.storage.from(BUCKET).upload(path, blob, { contentType: type, cacheControl: '31536000', upsert: false });
    if (res.error) throw res.error;
    ctx.session.created.push(path);
    return { src: sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, path: path };
  }
  function removeFiles(paths) {
    paths = paths.filter(has);
    if (!paths.length) return Promise.resolve();
    return sb.storage.from(BUCKET).remove(paths).then(function (r) {
      if (r && r.error && window.console) console.warn('Could not remove files', r.error);
    }, function () {});
  }
  function pathsOf(kind, rec) {
    var out = [];
    if (kind === 'projects') {
      (rec.screenshots || []).forEach(function (s) { if (s.path) out.push(s.path); });
      (rec.docs || []).forEach(function (d) { if (d.path) out.push(d.path); });
    } else if (kind === 'certificates') {
      (rec.images || []).forEach(function (s) { if (s.path) out.push(s.path); });
    } else if (rec.path) out.push(rec.path);
    return out;
  }
  // After saving: delete files that are no longer used, and files uploaded but never kept.
  function cleanupFiles(oldPaths, newPaths, ctx) {
    var gone = oldPaths.concat(ctx.session.created).filter(function (p, i, all) {
      return newPaths.indexOf(p) === -1 && all.indexOf(p) === i;
    });
    return removeFiles(gone);
  }

  /* ---------- form building blocks ---------- */
  function field(label, control, hint, noId, required) {
    var wrap = h('div', { class: 'field' });
    var req = required ? h('span', { class: 'req', text: '(required)' }) : null;
    if (noId) wrap.appendChild(h('span', { class: 'lab' }, [label, req]));
    else { control.id = control.id || uid('f'); wrap.appendChild(h('label', { 'for': control.id }, [label, req])); }
    wrap.appendChild(control);
    var errId = uid('err');
    if (hint) wrap.appendChild(h('p', { class: 'hint', text: hint }));
    var err = h('p', { class: 'error', id: errId, hidden: true, role: 'alert' });
    wrap.appendChild(err);
    wrap.setError = function (msg) {
      err.hidden = !msg;
      err.textContent = msg || '';
      if (control.setAttribute) {
        control.setAttribute('aria-invalid', msg ? 'true' : 'false');
        // a screen reader reads the error together with the field
        if (msg) control.setAttribute('aria-describedby', errId); else control.removeAttribute('aria-describedby');
      }
    };
    return wrap;
  }
  function inp(value, attrs) {
    var a = { class: 'inp', type: 'text', value: value || '' };
    Object.keys(attrs || {}).forEach(function (k) { a[k] = attrs[k]; });
    return h('input', a);
  }
  function area(value, attrs) {
    var a = { class: 'txt' };
    Object.keys(attrs || {}).forEach(function (k) { a[k] = attrs[k]; });
    return h('textarea', a, [value || '']);
  }
  function select(options, value) {
    var s = h('select', { class: 'sel' });
    options.forEach(function (o) {
      var op = h('option', { value: o[0], text: o[1] });
      if (o[0] === value) op.selected = true;
      s.appendChild(op);
    });
    return s;
  }
  function switchBox(label, checked) {
    var c = h('input', { type: 'checkbox' });
    c.checked = !!checked;
    var wrap = h('label', { class: 'switch' }, [c, label]);
    wrap.input = c;
    return wrap;
  }
  function newCtx() { return { session: { created: [] }, busy: 0, dirty: false, saving: false, setBusy: function () {} }; }

  // A list of pictures with captions. Used for screenshots, certificates and the gallery.
  function imageList(ctx, o) {
    var items = (o.items || []).map(function (i) { return { src: i.src || '', path: i.path || '', caption: i.caption || '' }; });
    var box = h('div', { class: 'rep' });
    var capHint = o.captionHint || 'Caption';

    function addFiles(files, at) {
      files.forEach(function (file, n) {
        var it = at === undefined ? { src: '', path: '', caption: '', uploading: true } : items[at];
        if (at === undefined) {
          it.caption = o.noCaption ? '' : (o.defaultCaption ? o.defaultCaption(items.length + 1) : '');
          items.push(it);
        }
        it.uploading = true;
        render();
        ctx.setBusy(1);
        uploadFile(file, o.folder(), ctx, 'image').then(function (u) {
          it.src = u.src; it.path = u.path; it.uploading = false; ctx.dirty = true;
        }).catch(function (e) {
          toast(friendly(e));
          it.uploading = false;
          if (!it.src && at === undefined) items.splice(items.indexOf(it), 1);
        }).then(function () { ctx.setBusy(-1); render(); });
      });
    }
    function move(i, d) { var t = items[i]; items[i] = items[i + d]; items[i + d] = t; ctx.dirty = true; render(); }

    function render() {
      box.textContent = '';
      items.forEach(function (it, i) {
        var thumb = it.src
          ? h('div', { class: 'thumb-edit' }, [h('img', { src: it.src, alt: '' })])
          : h('div', { class: 'thumb-edit empty' }, ['Placeholder']);
        var mid = h('div', { class: 'field' });
        if (!o.noCaption) {
          mid.appendChild(h('input', {
            class: 'inp', type: 'text', value: it.caption, placeholder: capHint, 'aria-label': 'Caption for picture ' + (i + 1),
            oninput: function (e) { it.caption = e.target.value; }
          }));
        }
        if (it.uploading) mid.appendChild(h('div', { class: 'progress' }, [h('span', { class: 'spin' }), 'Uploading…']));
        else if (!it.src) mid.appendChild(h('span', { class: 'file-note', text: 'Shows as "Coming soon" on the site until you upload a picture.' }));
        var mini = h('div', { class: 'mini' }, [
          ibtn('up', 'Move up', function () { move(i, -1); }, i === 0 || items.length < 2),
          ibtn('down', 'Move down', function () { move(i, 1); }, i === items.length - 1),
          ibtn('upload', it.src ? 'Replace picture' : 'Upload picture', function () {
            pickFiles('image/jpeg,image/png,image/webp,image/gif', false).then(function (f) { if (f.length) addFiles(f, i); });
          }),
          ibtn('trash', 'Remove', function () { items.splice(i, 1); ctx.dirty = true; render(); })
        ]);
        box.appendChild(h('div', { class: 'rep-row imgs' }, [thumb, mid, mini]));
      });
      var full = o.max && items.length >= o.max;
      if (!full) {
        var add = h('div', { class: 'add-row' }, [
          btn(o.max === 1 ? 'Upload picture' : 'Upload pictures', '', function () {
            pickFiles('image/jpeg,image/png,image/webp,image/gif', o.max !== 1).then(function (f) { if (f.length) addFiles(f); });
          }, 'upload')
        ]);
        if (o.placeholders) {
          add.appendChild(btn('Add placeholder', '', function () {
            items.push({ src: '', path: '', caption: o.defaultCaption ? o.defaultCaption(items.length + 1) : '' });
            ctx.dirty = true; render();
          }, 'plus'));
        }
        box.appendChild(add);
      }
    }
    render();
    return {
      el: box,
      get: function () {
        return items.filter(function (i) { return !i.uploading; }).map(function (i) {
          var r = { src: i.src, caption: i.caption.trim() };
          if (i.path) r.path = i.path;
          if (o.role) r.role = o.role;
          return r;
        });
      }
    };
  }

  function linkList(ctx, list) {
    var items = (list || []).map(function (l) { return { label: l.label || '', url: l.url || '' }; });
    var box = h('div', { class: 'rep' });
    function render() {
      box.textContent = '';
      items.forEach(function (it, i) {
        box.appendChild(h('div', { class: 'rep-row links' }, [
          h('input', { class: 'inp', type: 'text', value: it.label, placeholder: 'Button name, e.g. Live system', 'aria-label': 'Link name ' + (i + 1), oninput: function (e) { it.label = e.target.value; } }),
          h('input', { class: 'inp', type: 'url', value: it.url, placeholder: 'https://…  (empty = "Link coming soon")', 'aria-label': 'Link address ' + (i + 1), oninput: function (e) { it.url = e.target.value; } }),
          ibtn('trash', 'Remove link', function () { items.splice(i, 1); ctx.dirty = true; render(); })
        ]));
      });
      box.appendChild(h('div', { class: 'add-row' }, [btn('Add link', '', function () { items.push({ label: '', url: '' }); ctx.dirty = true; render(); }, 'plus')]));
    }
    render();
    return { el: box, get: function () { return items.filter(function (i) { return has(i.label); }).map(function (i) { return { label: i.label.trim(), url: i.url.trim() }; }); } };
  }

  // A list of bullet points: one box per point, with add, remove and reorder.
  // Enter starts a new point, Backspace in an empty point removes it, pasting several lines splits them into points.
  function bulletList(ctx, list) {
    var items = (list || []).map(function (t) { return { text: String(t || '') }; });
    if (!items.length) items.push({ text: '' });
    var box = h('div', { class: 'rep' });
    var focusAt = -1;

    function grow(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight + 2, 240) + 'px'; }
    function render() {
      box.textContent = '';
      items.forEach(function (it, i) {
        var ta = h('textarea', {
          class: 'txt bul-in', rows: 1, maxlength: 400, placeholder: i === 0 ? 'e.g. Coached members through workouts based on their goals' : 'Another thing you did',
          'aria-label': 'Bullet point ' + (i + 1),
          oninput: function (e) { it.text = e.target.value; ctx.dirty = true; grow(e.target); },
          onkeydown: function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              items.splice(i + 1, 0, { text: '' }); focusAt = i + 1; ctx.dirty = true; render();
            } else if (e.key === 'Backspace' && !e.target.value && items.length > 1) {
              e.preventDefault();
              items.splice(i, 1); focusAt = Math.max(0, i - 1); ctx.dirty = true; render();
            }
          },
          onpaste: function (e) {
            var t = (e.clipboardData && e.clipboardData.getData('text')) || '';
            var lines = t.split(/\r?\n/).map(function (x) { return x.replace(/^\s*[-*\u2022]\s*/, '').trim(); }).filter(Boolean);
            if (lines.length < 2) return;
            e.preventDefault();
            var args = [i, 1].concat(lines.map(function (x, n) { return { text: n === 0 && has(it.text) ? it.text.trim() + ' ' + x : x }; }));
            items.splice.apply(items, args); focusAt = i + lines.length - 1; ctx.dirty = true; render();
          }
        }, [it.text]);
        function move(d) { var t = items[i]; items[i] = items[i + d]; items[i + d] = t; focusAt = -1; ctx.dirty = true; render(); }
        box.appendChild(h('div', { class: 'rep-row bul' }, [
          h('span', { class: 'bul-dot', 'aria-hidden': 'true', text: '•' }),
          ta,
          h('div', { class: 'mini' }, [
            ibtn('up', 'Move up', function () { move(-1); }, i === 0),
            ibtn('down', 'Move down', function () { move(1); }, i === items.length - 1),
            ibtn('trash', 'Remove this bullet point', function () {
              items.splice(i, 1); if (!items.length) items.push({ text: '' });
              focusAt = -1; ctx.dirty = true; render();
            })
          ])
        ]));
      });
      box.appendChild(h('div', { class: 'add-row' }, [
        btn('Add bullet point', '', function () { items.push({ text: '' }); focusAt = items.length - 1; ctx.dirty = true; render(); }, 'plus')
      ]));
      Array.prototype.forEach.call(box.querySelectorAll('textarea'), grow);
      if (focusAt >= 0 && box.isConnected) {
        var t = box.querySelectorAll('textarea')[focusAt];
        if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
      }
      focusAt = -1;
    }
    render();
    return {
      el: box,
      get: function () { return items.map(function (i) { return i.text.replace(/\s+/g, ' ').trim(); }).filter(Boolean); },
      refit: function () { Array.prototype.forEach.call(box.querySelectorAll('textarea'), grow); }
    };
  }

  function docList(ctx, list, folderFn) {
    var items = (list || []).map(function (d) { return { label: d.label || '', type: d.type || 'PDF', url: d.url || '', path: d.path || '' }; });
    var box = h('div', { class: 'rep' });
    function render() {
      box.textContent = '';
      items.forEach(function (it, i) {
        var url = h('input', {
          class: 'inp', type: 'url', value: it.url, placeholder: 'Upload a file, or paste a link', 'aria-label': 'Document address ' + (i + 1),
          oninput: function (e) { it.url = e.target.value; it.path = ''; }
        });
        var type = select(DOC_KINDS.map(function (k) { return [k, k]; }), it.type);
        type.setAttribute('aria-label', 'Document type ' + (i + 1));
        type.addEventListener('change', function () { it.type = type.value; });
        var note = it.uploading ? h('div', { class: 'progress' }, [h('span', { class: 'spin' }), 'Uploading…'])
          : (it.path ? h('span', { class: 'file-note', text: 'Uploaded: ' + it.path.split('/').pop() }) : null);
        box.appendChild(h('div', { class: 'rep-row docs' }, [
          h('input', { class: 'inp', type: 'text', value: it.label, placeholder: 'Name, e.g. Project documentation', 'aria-label': 'Document name ' + (i + 1), oninput: function (e) { it.label = e.target.value; } }),
          type,
          h('div', { class: 'field' }, [url, note]),
          h('div', { class: 'mini' }, [
            ibtn('upload', 'Upload a file', function () {
              pickFiles('.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,application/pdf', false).then(function (f) {
                if (!f.length) return;
                it.uploading = true; render(); ctx.setBusy(1);
                uploadFile(f[0], folderFn(), ctx, 'doc').then(function (u) {
                  it.url = u.src; it.path = u.path; ctx.dirty = true;
                  var ext = (f[0].name.split('.').pop() || '').toLowerCase();
                  var map = { pdf: 'PDF', doc: 'DOCX', docx: 'DOCX', ppt: 'PPTX', pptx: 'PPTX', xls: 'XLSX', xlsx: 'XLSX', zip: 'ZIP' };
                  it.type = map[ext] || it.type;
                  if (!has(it.label)) it.label = f[0].name.replace(/\.[^.]+$/, '');
                }).catch(function (e) { toast(friendly(e)); })
                  .then(function () { it.uploading = false; ctx.setBusy(-1); render(); });
              });
            }),
            ibtn('trash', 'Remove document', function () { items.splice(i, 1); ctx.dirty = true; render(); })
          ])
        ]));
      });
      box.appendChild(h('div', { class: 'add-row' }, [btn('Add document', '', function () { items.push({ label: '', type: 'PDF', url: '', path: '' }); ctx.dirty = true; render(); }, 'plus')]));
    }
    render();
    return {
      el: box,
      get: function () {
        return items.filter(function (i) { return has(i.label); }).map(function (i) {
          var r = { label: i.label.trim(), type: i.type, url: i.url.trim() };
          if (i.path) r.path = i.path;
          return r;
        });
      }
    };
  }

  /* ---------- editor window ---------- */
  function openEditor(ctx, cfg) {
    var dlg = h('dialog', { class: 'ed', 'aria-labelledby': 'ed-title' });
    var form = h('form', { novalidate: true });
    var msg = h('span', { class: 'msg', role: 'status' });
    var saveBtn = h('button', { class: 'a-btn primary', type: 'submit', text: 'Save' });
    ctx.setBusy = function (n) {
      ctx.busy += n;
      saveBtn.disabled = ctx.busy > 0 || ctx.saving;
      msg.textContent = ctx.busy > 0 ? 'Uploading, please wait…' : '';
    };
    function close() { dlg.close(); dlg.remove(); }
    async function cancel() {
      if (ctx.saving) return;
      if (ctx.dirty || ctx.session.created.length) {
        var ok = await ask('Discard your changes?', 'Anything you typed or uploaded in this window will be lost.', 'Discard', true);
        if (!ok) return;
      }
      await removeFiles(ctx.session.created);
      close();
    }
    form.addEventListener('input', function () { ctx.dirty = true; });
    form.addEventListener('change', function () { ctx.dirty = true; });
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (ctx.saving || ctx.busy) return;
      if (!cfg.validate()) {
        var bad = form.querySelector('[aria-invalid="true"]');
        if (bad) bad.focus();
        msg.textContent = 'Please fix the highlighted fields.';
        return;
      }
      ctx.saving = true;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      msg.textContent = '';
      try {
        await cfg.save();
        close();
        toast(cfg.done || 'Saved');
        await refresh();
      } catch (err) {
        ctx.saving = false;
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
        msg.textContent = friendly(err);
      }
    });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); cancel(); });

    form.appendChild(h('div', { class: 'ed-head' }, [h('h2', { id: 'ed-title', text: cfg.title }), ibtn('close', 'Close without saving', cancel)]));
    form.appendChild(h('div', { class: 'ed-body' }, cfg.body));
    form.appendChild(h('div', { class: 'ed-foot' }, [msg, btn('Cancel', '', cancel), saveBtn]));
    dlg.appendChild(form);
    document.body.appendChild(dlg);
    dlg.showModal();
    if (cfg.opened) cfg.opened();
  }

  function requireText(fieldEl, input, message) {
    var bad = !has(input.value);
    fieldEl.setError(bad ? message : '');
    return !bad;
  }

  /* ---------- project editor ---------- */
  function editProject(existing) {
    var isNew = !existing;
    var r = existing ? clone(existing) : {
      id: '', title: '', category: defaultCat(PROJECT_CATS, state.filter.projects.cat, 'school'), tag: '', year: String(new Date().getFullYear()), summary: '', details: '', stack: [],
      links: [{ label: 'Live system', url: '' }, { label: 'Source code', url: '' }],
      screenshots: [], docs: [{ label: 'Project documentation', type: 'PDF', url: '' }], published: true
    };
    var ctx = newCtx();
    var title = inp(r.title, { placeholder: 'e.g. PSU SportsTrack', maxlength: 140 });
    var idBox = inp(r.id, { readonly: true, 'aria-readonly': 'true' });
    var cat = select(PROJECT_CATS, r.category);
    var tag = inp(r.tag, { placeholder: 'Capstone, IoT, Web App…', maxlength: 30 });
    var year = inp(r.year, { maxlength: 12 });
    var summary = area(r.summary, { rows: 4 });
    var details = area(r.details, { rows: 4 });
    var stack = inp(r.stack.join(', '), { placeholder: 'Next.js, React, Supabase' });
    function currentId() { return isNew ? slug(title.value) : r.id; }
    title.addEventListener('input', function () { if (isNew) idBox.value = slug(title.value); });
    var links = linkList(ctx, r.links);
    var shots = imageList(ctx, { items: r.screenshots, folder: function () { return 'projects/' + (currentId() || 'new'); }, placeholders: true, defaultCaption: function (n) { return 'Screenshot ' + n; } });
    var docs = docList(ctx, r.docs, function () { return 'projects/' + (currentId() || 'new'); });
    var pub = switchBox('Show on the website', r.published);
    var fTitle = field('Title', title, '', false, true), fCat = field('Category', cat), fTag = field('Label', tag, 'A short word shown on the card.', false, true),
      fYear = field('Year', year, '', false, true), fSum = field('Summary', summary, 'Shown on the card (first 3 lines) and at the top of the details window.', false, true),
      fDet = field('More details (optional)', details), fStack = field('Tech stack', stack, 'Separate with commas. The first four show on the card, all show in the details window.');

    openEditor(ctx, {
      title: isNew ? 'Add a project' : 'Edit project',
      done: isNew ? 'Project added' : 'Project saved',
      body: [
        fTitle,
        field('Web address name', idBox, 'Used in the link to this project, for example index.html#project-' + (r.id || 'your-title') + '. Cannot change after saving.'),
        h('div', { class: 'row3' }, [fCat, fTag, fYear]),
        fSum, fDet, fStack,
        field('Links', links.el, 'Leave a link address empty to show "Link coming soon".', true),
        field('Screenshots', shots.el, 'Pictures are shrunk automatically to load fast. Add as many as you like.', true),
        field('Documentation files', docs.el, 'PDF, Word, PowerPoint, Excel or ZIP up to 20 MB, or paste a link.', true),
        pub
      ],
      validate: function () {
        var ok = true;
        ok = requireText(fTitle, title, 'Enter a title.') && ok;
        if (has(title.value) && !slug(title.value)) { fTitle.setError('Use at least one letter or number in the title.'); ok = false; }
        ok = requireText(fTag, tag, 'Enter a short label.') && ok;
        ok = requireText(fYear, year, 'Enter a year.') && ok;
        ok = requireText(fSum, summary, 'Enter a summary.') && ok;
        return ok;
      },
      save: async function () {
        var rec = {
          title: title.value.trim(), category: cat.value, tag: tag.value.trim(), year: year.value.trim(),
          summary: summary.value.trim(), details: details.value.trim(), stack: parseList(stack.value),
          links: links.get(), screenshots: shots.get(), docs: docs.get(), published: pub.input.checked
        };
        if (isNew) {
          rec.id = uniqueId(slug(title.value), state.data.projects.map(function (p) { return p.id; }));
          rec.sort = nextSort('projects');
          await mutate(sb.from('projects').insert(rec).select('id'));
        } else {
          await mutate(sb.from('projects').update(rec).eq('id', r.id).select('id'));
        }
        await cleanupFiles(existing ? pathsOf('projects', existing) : [], pathsOf('projects', rec), ctx);
      }
    });
  }

  /* ---------- certificate editor ---------- */
  function editCertificate(existing, defaultKind) {
    var isNew = !existing;
    var r = existing ? clone(existing) : { id: '', kind: defaultKind || 'training', title: '', meta: '', year: String(new Date().getFullYear()), images: [{ src: '', caption: '' }], story: '', related: '', published: true };
    var ctx = newCtx();
    var certImgs = r.images.filter(function (i) { return i.role !== 'activity'; });
    var actImgs = r.images.filter(function (i) { return i.role === 'activity' && has(i.src); });
    var hasExtras = !state.data.certificates.length || ('story' in state.data.certificates[0]);
    var mode0 = !certImgs.length ? 'none' : (certImgs.some(function (i) { return has(i.src); }) ? 'have' : 'soon');
    var kind = select(CERT_KINDS, r.kind);
    var title = inp(r.title, { placeholder: 'e.g. Sui Builders Program, Palawan', maxlength: 160 });
    var meta = inp(r.meta, { placeholder: 'Organizer or place, e.g. DICT MIMAROPA', maxlength: 160 });
    var year = inp(r.year, { maxlength: 12 });
    var mode = select([['have', 'I have a picture or e-certificate'], ['soon', 'I will add it later (show "Coming soon")'], ['none', 'I do not have a copy (show the entry only)']], mode0);
    var pics = imageList(ctx, { items: certImgs.filter(function (i) { return has(i.src); }), folder: function () { return 'certificates/' + (slug(title.value) || 'new'); }, defaultCaption: function () { return title.value.trim() ? 'Certificate, ' + title.value.trim() : ''; } });
    var picsField = field('Certificate pictures', pics.el, 'Add more than one for front and back or several pages.', true);
    var acts = imageList(ctx, { role: 'activity', items: actImgs, captionHint: 'What is in this photo? e.g. Our team at the demo day', folder: function () { return 'certificates/' + (slug(title.value) || 'new') + '/activity'; }, defaultCaption: function () { return ''; } });
    var fActs = field('Photos and screenshots of the activity', acts.el, 'Events, the project you built, team photos, screenshots. They open when a visitor selects this entry on the site.', true);
    var story = area(r.story || '', { placeholder: 'A few sentences about what happened, what you did and what you learned. Optional.', maxlength: 1500, rows: 5 });
    var fStory = field('Story', story, 'Optional. Shown at the top of the details panel.');
    var relOpts = [['', 'None']].concat(state.data.projects.map(function (p) { return [p.id, p.title]; }));
    var related = select(relOpts, r.related || '');
    var fRel = field('Related project', related, 'Optional. Adds a button that opens that project.');
    var pub = switchBox('Show on the website', r.published);
    var fTitle = field('Title', title, '', false, true), fYear = field('Year', year, '', false, true), fMeta = field('Details line', meta), fMode = field('Certificate copy', mode, 'Switching away from "I have a picture" deletes the uploaded pictures when you save.');
    function sync() { picsField.hidden = mode.value !== 'have'; }
    mode.addEventListener('change', sync);
    sync();

    openEditor(ctx, {
      title: isNew ? 'Add a certificate or achievement' : 'Edit entry',
      done: isNew ? 'Entry added' : 'Entry saved',
      body: [field('Type', kind), fTitle, fMeta, fYear, fMode, picsField, fActs]
        .concat(hasExtras ? [fStory, fRel] : [h('p', { class: 'hint-line', text: 'To add a story and a related project, run sql/4-achievement-details.sql once in the Supabase SQL Editor. Photos work without it.' })])
        .concat([pub]),
      validate: function () {
        var ok = requireText(fTitle, title, 'Enter a title.');
        ok = requireText(fYear, year, 'Enter a year.') && ok;
        if (mode.value === 'have' && !pics.get().some(function (i) { return has(i.src); })) {
          picsField.setError('Upload at least one picture, or choose another option above.');
          ok = false;
        } else picsField.setError('');
        return ok;
      },
      save: async function () {
        var images = [];
        if (mode.value === 'have') images = pics.get().filter(function (i) { return has(i.src); });
        else if (mode.value === 'soon') images = [{ src: '', caption: title.value.trim() ? 'Certificate, ' + title.value.trim() : '' }];
        images = images.concat(acts.get().filter(function (i) { return has(i.src); }));
        var rec = { kind: kind.value, title: title.value.trim(), meta: meta.value.trim(), year: year.value.trim(), images: images, published: pub.input.checked };
        if (hasExtras) { rec.story = story.value.trim(); rec.related = related.value; }
        if (isNew) {
          rec.id = uniqueId(slug(title.value) || 'certificate', state.data.certificates.map(function (c) { return c.id; }));
          rec.sort = nextSort('certificates');
          await mutate(sb.from('certificates').insert(rec).select('id'));
        } else {
          await mutate(sb.from('certificates').update(rec).eq('id', r.id).select('id'));
        }
        await cleanupFiles(existing ? pathsOf('certificates', existing) : [], pathsOf('certificates', rec), ctx);
      }
    });
  }

  /* ---------- gallery editor ---------- */
  function editGallery(existing) {
    var isNew = !existing;
    var r = existing ? clone(existing) : { id: '', category: defaultCat(GALLERY_CATS, state.filter.gallery.cat, 'graphic'), title: '', caption: '', src: '', path: '', ratio: '4 / 3', published: true };
    var ctx = newCtx();
    var cat = select(GALLERY_CATS, r.category);
    var title = inp(r.title, { placeholder: 'e.g. Brand poster for a cafe', maxlength: 120 });
    var caption = inp(r.caption, { placeholder: 'Tool, client or camera, e.g. Made in Canva', maxlength: 200 });
    var ratio = select(RATIOS, r.ratio);
    var pic = imageList(ctx, { items: r.src ? [{ src: r.src, path: r.path, caption: '' }] : [], folder: function () { return 'gallery'; }, max: 1, noCaption: true });
    var pub = switchBox('Show on the website', r.published);
    var fCat = field('Category', cat), fTitle = field('Title', title, '', false, true), fCap = field('Caption (optional)', caption);
    var fRatio = field('Shape of the placeholder', ratio, 'Only used while there is no picture, so the empty box has a realistic shape.');

    openEditor(ctx, {
      title: isNew ? 'Add to the gallery' : 'Edit gallery item',
      done: isNew ? 'Added to the gallery' : 'Gallery item saved',
      body: [fCat, fTitle, fCap, field('Picture', pic.el, 'Large photos are shrunk automatically. Leave empty to show a "Coming soon" box.', true), fRatio, pub],
      validate: function () { return requireText(fTitle, title, 'Enter a title.'); },
      save: async function () {
        var got = pic.get()[0];
        var rec = { category: cat.value, title: title.value.trim(), caption: caption.value.trim(), src: got ? got.src : '', path: got && got.path ? got.path : '', ratio: ratio.value, published: pub.input.checked };
        if (isNew) {
          rec.id = uniqueId(slug(title.value) || 'item', state.data.gallery.map(function (g) { return g.id; }));
          rec.sort = nextSort('gallery');
          await mutate(sb.from('gallery_items').insert(rec).select('id'));
        } else {
          await mutate(sb.from('gallery_items').update(rec).eq('id', r.id).select('id'));
        }
        await cleanupFiles(existing ? pathsOf('gallery', existing) : [], pathsOf('gallery', rec), ctx);
      }
    });
  }

  /* ---------- experience editor ---------- */
  function editExperience(existing) {
    var isNew = !existing;
    var r = existing ? clone(existing) : { id: '', role: '', company: '', place: '', period_start: String(new Date().getFullYear()), period_end: 'Present', bullets: [], published: true };
    var ctx = newCtx();
    var role = inp(r.role, { placeholder: 'e.g. Gym Attendant / Fitness Coach', maxlength: 140 });
    var bulletsEd = bulletList(ctx, r.bullets);
    var company = inp(r.company, { placeholder: 'e.g. Island Punch Fitness', maxlength: 140 });
    var place = inp(r.place, { placeholder: 'Town or address (optional)', maxlength: 200 });
    var start = inp(r.period_start, { placeholder: '2024', maxlength: 20 });
    var end = inp(r.period_end, { placeholder: 'Present', maxlength: 20 });
    var pub = switchBox('Show on the website', r.published);
    var fRole = field('Role / position', role, 'Your job title. It is the main heading of this job on the site.', false, true), fCompany = field('Company', company, '', false, true), fPlace = field('Place', place),
      fStart = field('Started', start, '', false, true), fEnd = field('Ended', end, 'Type "Present" if you still work there.', false, true),
      fBul = field('What you did', bulletsEd.el, 'One bullet point per thing you did. Press Enter for a new point. Pasting a list splits it into points.', true);
    openEditor(ctx, {
      title: isNew ? 'Add work experience' : 'Edit work experience',
      done: isNew ? 'Experience added' : 'Experience saved',
      body: [fRole, fCompany, fPlace, h('div', { class: 'row2' }, [fStart, fEnd]), fBul, pub],
      opened: function () { bulletsEd.refit(); },
      validate: function () {
        var ok = requireText(fRole, role, 'Enter your role or position.');
        ok = requireText(fCompany, company, 'Enter the company.') && ok;
        ok = requireText(fStart, start, 'Enter when you started.') && ok;
        ok = requireText(fEnd, end, 'Enter when it ended, or "Present".') && ok;
        return ok;
      },
      save: async function () {
        var rec = {
          role: role.value.trim(), company: company.value.trim(), place: place.value.trim(),
          period_start: start.value.trim(), period_end: end.value.trim(),
          bullets: bulletsEd.get(),
          published: pub.input.checked
        };
        if (isNew) {
          rec.id = uniqueId(slug(rec.company + ' ' + rec.role) || 'job', state.data.experience.map(function (x) { return x.id; }));
          rec.sort = nextSort('experience');
          await mutate(sb.from('experience').insert(rec).select('id'));
        } else {
          await mutate(sb.from('experience').update(rec).eq('id', r.id).select('id'));
        }
      }
    });
  }

  /* ---------- skills editor ---------- */
  function editSkillGroup(existing) {
    var isNew = !existing;
    var r = existing ? clone(existing) : { id: '', name: '', items: [], published: true };
    var ctx = newCtx();
    var name = inp(r.name, { placeholder: 'e.g. Design and productivity', maxlength: 80 });
    var items = inp((r.items || []).join(', '), { placeholder: 'Figma, Canva, Excel' });
    var pub = switchBox('Show on the website', r.published);
    var fName = field('Group name', name, '', false, true), fItems = field('Skills', items, 'Separate with commas.', false, true);
    openEditor(ctx, {
      title: isNew ? 'Add a skill group' : 'Edit skill group',
      done: isNew ? 'Skill group added' : 'Skill group saved',
      body: [fName, fItems, pub],
      validate: function () {
        var ok = requireText(fName, name, 'Enter a group name.');
        if (!parseList(items.value).length) { fItems.setError('Add at least one skill.'); ok = false; } else fItems.setError('');
        return ok;
      },
      save: async function () {
        var rec = { name: name.value.trim(), items: parseList(items.value), published: pub.input.checked };
        if (isNew) {
          rec.id = uniqueId(slug(rec.name) || 'skills', state.data.skills.map(function (x) { return x.id; }));
          rec.sort = nextSort('skills');
          await mutate(sb.from('skill_groups').insert(rec).select('id'));
        } else {
          await mutate(sb.from('skill_groups').update(rec).eq('id', r.id).select('id'));
        }
      }
    });
  }

  /* ---------- social link editor ---------- */
  function editSocial(existing) {
    var isNew = !existing;
    var r = existing ? clone(existing) : { id: '', label: '', icon: 'external', value: '', href: '', copy: false, info: false, published: true };
    var ctx = newCtx();
    var label = inp(r.label, { placeholder: 'e.g. LinkedIn', maxlength: 40 });
    var icn = select(SOCIAL_ICONS, r.icon);
    var kind = select([['link', 'A link people can click'], ['info', 'Plain text only (for example your location)']], r.info ? 'info' : 'link');
    var value = inp(r.value, { placeholder: 'What visitors see, e.g. linkedin.com/in/yourname', maxlength: 120 });
    var href = inp(r.href, { type: 'text', placeholder: 'https://…   or   mailto:you@example.com   or   tel:0912…', maxlength: 300 });
    var copy = switchBox('Show a "Copy" button (good for email and phone)', r.copy);
    var pub = switchBox('Show on the website', r.published);
    var fLabel = field('Name', label, '', false, true), fIcon = field('Icon', icn), fKind = field('Type', kind),
      fValue = field('Text shown', value, 'Leave the text and address empty to show "Link coming soon".'),
      fHref = field('Link address', href, 'Email and phone fill this in for you if you leave it empty.');
    function sync() { fHref.hidden = kind.value === 'info'; copy.hidden = kind.value === 'info'; }
    kind.addEventListener('change', sync); sync();
    openEditor(ctx, {
      title: isNew ? 'Add a social link' : 'Edit social link',
      done: isNew ? 'Link added' : 'Link saved',
      body: [fLabel, h('div', { class: 'row2' }, [fIcon, fKind]), fValue, fHref, copy, pub],
      validate: function () {
        var ok = requireText(fLabel, label, 'Enter a name.');
        if (kind.value === 'info') ok = requireText(fValue, value, 'Enter the text to show.') && ok; else fValue.setError('');
        var a = href.value.trim();
        if (kind.value === 'link' && a && !/^(https?:\/\/|mailto:|tel:)/i.test(a)) { fHref.setError('The address must start with https://, mailto: or tel:'); ok = false; } else fHref.setError('');
        return ok;
      },
      save: async function () {
        var info = kind.value === 'info';
        var v = value.value.trim(), a = info ? '' : href.value.trim();
        if (!info && !a && v) {
          if (icn.value === 'mail' && /@/.test(v)) a = 'mailto:' + v;
          else if (icn.value === 'phone') a = 'tel:' + v.replace(/[^0-9+]/g, '');
          else if (icn.value !== 'pin') a = /^https?:/i.test(v) ? v : 'https://' + v;
        }
        var rec = { label: label.value.trim(), icon: icn.value, value: v, href: a, copy: info ? false : copy.input.checked, info: info, published: pub.input.checked };
        if (isNew) {
          rec.id = uniqueId(slug(rec.label) || 'link', state.data.socials.map(function (x) { return x.id; }));
          rec.sort = nextSort('socials');
          await mutate(sb.from('socials').insert(rec).select('id'));
        } else {
          await mutate(sb.from('socials').update(rec).eq('id', r.id).select('id'));
        }
      }
    });
  }

  /* ---------- data ---------- */
  function loadTable(k) {
    return sb.from(TABLE[k]).select('*').order('sort', { ascending: true }).order('created_at', { ascending: true }).then(function (r) {
      if (r.error) throw r.error;
      state.data[k] = (r.data || []).sort(bySort);
    });
  }
  function loadAll() {
    var core = CORE_TABS.map(loadTable);
    // These tables come from 3-more-content.sql. If it has not been run yet, carry on without them.
    var more = ['experience', 'skills', 'socials', 'settings'].map(function (k) {
      return loadTable(k).then(function () { return true; }, function (e) { if (isMissing(e)) return false; throw e; });
    });
    return Promise.all(core.concat(more)).then(function (res) {
      state.more = res.slice(3).every(Boolean);
      state.seeded = state.more && state.data.settings.some(function (x) { return x.id === 'seeded2'; });
      applyCats();
    });
  }
  async function refresh() {
    try { await loadAll(); renderTabs(); renderPanel(); }
    catch (e) { toast(friendly(e)); }
  }
  async function move(kind, row, dir) {
    var all = state.data[kind].slice().sort(bySort);
    var group = kind === 'certificates' ? all.filter(function (x) { return x.kind === row.kind; }) : all;
    var i = group.indexOf(group.filter(function (x) { return x.id === row.id; })[0]);
    var j = i + dir;
    if (i < 0 || j < 0 || j >= group.length) return;
    var a = all.indexOf(group[i]), b = all.indexOf(group[j]);
    var t = all[a]; all[a] = all[b]; all[b] = t;
    var updates = [];
    all.forEach(function (r, idx) { var s = (idx + 1) * 10; if (r.sort !== s) { updates.push([r.id, s]); r.sort = s; } });
    state.data[kind] = all;
    renderPanel();
    try {
      await Promise.all(updates.map(function (u) { return mutate(sb.from(TABLE[kind]).update({ sort: u[1] }).eq('id', u[0]).select('id')); }));
    } catch (e) { toast(friendly(e)); refresh(); }
  }
  async function togglePublished(kind, row) {
    try {
      await mutate(sb.from(TABLE[kind]).update({ published: !row.published }).eq('id', row.id).select('id'));
      toast(row.published ? 'Hidden from the website' : 'Now showing on the website');
      await refresh();
    } catch (e) { toast(friendly(e)); }
  }
  async function removeRecord(kind, row, name) {
    var ok = await ask('Delete “' + (name || row.title) + '”?', 'This removes it from the website and deletes its uploaded files. This cannot be undone. To keep it but stop showing it, choose Hide instead.', 'Delete', true);
    if (!ok) return;
    try {
      await mutate(sb.from(TABLE[kind]).delete().eq('id', row.id).select('id'));
      await removeFiles(pathsOf(kind, row));
      toast('Deleted');
      await refresh();
    } catch (e) { toast(friendly(e)); }
  }
  async function importStarter() {
    var ok = await ask('Import your starter content?', 'This copies the projects, certificates and gallery placeholders from data.js into the database. You can edit or delete any of them afterwards.', 'Import');
    if (!ok) return;
    var B = BUILTIN;
    var cleanImgs = function (l) { return (l || []).map(function (i) { return { src: i.src || '', caption: i.caption || '' }; }); };
    var projects = (B.projects || []).map(function (p, i) {
      return { id: p.id, title: p.title, category: p.category, tag: p.tag || '', year: p.year || '', summary: p.summary || '', details: p.details || '', stack: p.stack || [], links: p.links || [], screenshots: cleanImgs(p.screenshots), docs: p.docs || [], published: true, sort: (i + 1) * 10 };
    });
    var certs = [];
    (B.achievements || []).forEach(function (c) { certs.push({ kind: 'achievement', c: c }); });
    (B.training || []).forEach(function (c) { certs.push({ kind: 'training', c: c }); });
    certs = certs.map(function (x, i) {
      return { id: x.c.id, kind: x.kind, title: x.c.title, meta: x.c.meta || '', year: x.c.year || '', images: cleanImgs(x.c.images), published: !x.c.hidden, sort: (i + 1) * 10 };
    });
    var gallery = ((B.gallery && B.gallery.items) || []).map(function (g, i) {
      return { id: g.id, category: g.category, title: g.title, caption: g.caption || '', src: g.src || '', path: '', ratio: g.ratio || '4 / 3', published: true, sort: (i + 1) * 10 };
    });
    try {
      if (projects.length) await mutate(sb.from('projects').insert(projects).select('id'));
      if (certs.length) await mutate(sb.from('certificates').insert(certs).select('id'));
      if (gallery.length) await mutate(sb.from('gallery_items').insert(gallery).select('id'));
      toast('Starter content imported');
      await refresh();
    } catch (e) { toast(friendly(e)); }
  }

  async function importMore(blank) {
    var ok = await ask(blank ? 'Start with empty lists?' : 'Import your current content?',
      blank ? 'Your experience, skills and social links will start empty and you add everything here. The site stops using the versions in data.js.'
            : 'This copies the experience, skills, social links and resume setting from data.js into the database. You can edit or delete any of them afterwards.',
      blank ? 'Start empty' : 'Import');
    if (!ok) return;
    var B = BUILTIN;
    try {
      if (!blank) {
        var takenJobs = [];
        var jobs = (B.experience || []).map(function (j, i) {
          var id = uniqueId(slug(j.company + ' ' + j.role) || 'job', takenJobs); takenJobs.push(id);
          return { id: id, role: j.role, company: j.company, place: j.place || '', period_start: j.start || '', period_end: j.end || '', bullets: j.bullets || [], published: true, sort: (i + 1) * 10 };
        });
        var takenSk = [];
        var groups = (B.skills || []).map(function (g, i) {
          var id = uniqueId(slug(g.group) || 'skills', takenSk); takenSk.push(id);
          return { id: id, name: g.group, items: g.items || [], published: true, sort: (i + 1) * 10 };
        });
        var takenSo = [];
        var socials = (B.socials || []).map(function (x, i) {
          var id = uniqueId(slug(x.id || x.label) || 'link', takenSo); takenSo.push(id);
          return { id: id, label: x.label, icon: x.icon || 'external', value: x.value || '', href: x.href || '', copy: !!x.copy, info: !!x.info, published: true, sort: (i + 1) * 10 };
        });
        if (jobs.length) await mutate(sb.from('experience').insert(jobs).select('id'));
        if (groups.length) await mutate(sb.from('skill_groups').insert(groups).select('id'));
        if (socials.length) await mutate(sb.from('socials').insert(socials).select('id'));
        if (B.resume && has(B.resume.url)) await mutate(sb.from('site_settings').insert({ id: 'resume', value: { url: B.resume.url, path: '' }, sort: 0 }).select('id'));
      }
      await mutate(sb.from('site_settings').insert({ id: 'seeded2', value: {}, sort: 0 }).select('id'));
      toast(blank ? 'Ready. Add your content.' : 'Content imported');
      await refresh();
    } catch (e) { toast(friendly(e)); }
  }

  function resumeRow() { return state.data.settings.filter(function (x) { return x.id === 'resume'; })[0]; }
  async function saveResume(url, path) {
    var row = resumeRow();
    var old = row && row.value ? row.value.path : '';
    var value = { url: url, path: path || '' };
    if (row) await mutate(sb.from('site_settings').update({ value: value }).eq('id', 'resume').select('id'));
    else await mutate(sb.from('site_settings').insert({ id: 'resume', value: value, sort: 0 }).select('id'));
    if (old && old !== path) await removeFiles([old]);
  }
  async function removeResume() {
    var row = resumeRow();
    if (!row) return;
    var ok = await ask('Remove your resume?', 'The Resume button will show "Resume file coming soon" until you upload a new one.', 'Remove', true);
    if (!ok) return;
    try {
      await mutate(sb.from('site_settings').delete().eq('id', 'resume').select('id'));
      await removeFiles([row.value && row.value.path]);
      toast('Resume removed');
      await refresh();
    } catch (e) { toast(friendly(e)); }
  }

  /* ---------- categories (editable) ---------- */
  function catsRow() { return state.data.settings.filter(function (x) { return x.id === 'categories'; })[0]; }
  function toPairs(list, fallback) {
    var out = (Array.isArray(list) ? list : []).filter(function (c) { return c && has(c.id) && has(c.label); }).map(function (c) { return [c.id, c.label]; });
    return out.length ? out : fallback.slice();
  }
  function toObjs(pairs) { return pairs.map(function (p) { return { id: p[0], label: p[1] }; }); }
  function applyCats() {
    var v = (catsRow() || {}).value || {};
    PROJECT_CATS = toPairs(v.projects, DEFAULT_PROJECT_CATS);
    GALLERY_CATS = toPairs(v.gallery, DEFAULT_GALLERY_CATS);
    // a filter that points at a category that no longer exists goes back to "All"
    [['projects', PROJECT_CATS], ['gallery', GALLERY_CATS]].forEach(function (x) {
      var f = state.filter[x[0]];
      if (f.cat !== 'all' && !x[1].some(function (c) { return c[0] === f.cat; })) f.cat = 'all';
    });
  }
  function defaultCat(cats, filterCat, fallback) {
    var ids = cats.map(function (c) { return c[0]; });
    if (ids.indexOf(filterCat) > -1) return filterCat;
    if (ids.indexOf(fallback) > -1) return fallback;
    return ids[0];
  }
  async function saveCats(key, list) {
    var row = catsRow();
    var cur = (row && row.value) || {};
    var value = { projects: cur.projects || toObjs(PROJECT_CATS), gallery: cur.gallery || toObjs(GALLERY_CATS) };
    value[key] = list;
    if (row) await mutate(sb.from('site_settings').update({ value: value }).eq('id', 'categories').select('id'));
    else await mutate(sb.from('site_settings').insert({ id: 'categories', value: value, sort: 0 }).select('id'));
  }

  // The window where you add, rename, reorder and remove categories.
  function openCatManager(kind, addNew) {
    if (!state.more) { toast('Run 3-more-content.sql in Supabase first, then refresh this page.'); return; }
    var cf = kind === 'projects'
      ? { table: 'projects', cats: PROJECT_CATS, noun: 'project', title: 'Project categories' }
      : { table: 'gallery_items', cats: GALLERY_CATS, noun: 'picture', title: 'Gallery categories' };
    var ctx = newCtx();
    var counts = {};
    state.data[kind].forEach(function (x) { counts[x.category] = (counts[x.category] || 0) + 1; });
    var rows = cf.cats.map(function (c) { return { id: c[0], label: c[1], isNew: false, removed: false, moveTo: null }; });
    var box = h('div', { class: 'rep' });
    var errEl = h('p', { class: 'error', role: 'alert', hidden: true });
    var focusLast = !!addNew;
    if (addNew) rows.push({ id: '', label: '', isNew: true, removed: false, moveTo: null });

    function live() { return rows.filter(function (r) { return !r.removed; }); }
    function swap(i, d) { var t = rows[i]; rows[i] = rows[i + d]; rows[i + d] = t; ctx.dirty = true; render(); }
    function neighbour(i, d) {
      var j = i + d;
      while (j >= 0 && j < rows.length && rows[j].removed) j += d;
      return j >= 0 && j < rows.length ? j : -1;
    }
    function render() {
      box.textContent = '';
      var alive = live();
      rows.forEach(function (r, i) {
        var n = r.isNew ? 0 : (counts[r.id] || 0);
        if (r.removed) {
          var kids = [h('span', { class: 'file-note', text: '“' + (r.label || 'Untitled') + '” will be removed.' })];
          if (n > 0) {
            var targets = alive.filter(function (x) { return x !== r; });
            if (!r.moveTo || targets.indexOf(r.moveTo) === -1) r.moveTo = targets[0] || null;
            var sel = h('select', { class: 'sel', 'aria-label': 'Move its ' + n + ' ' + cf.noun + (n === 1 ? '' : 's') + ' to' }, targets.map(function (t, ti) {
              return h('option', { value: String(ti), text: 'Move its ' + n + ' ' + cf.noun + (n === 1 ? '' : 's') + ' to: ' + (t.label || 'New category') });
            }));
            sel.addEventListener('change', function () { r.moveTo = targets[Number(sel.value)]; });
            if (r.moveTo) sel.value = String(targets.indexOf(r.moveTo));
            kids.push(sel);
          }
          box.appendChild(h('div', { class: 'rep-row cats removed' }, [
            h('div', { class: 'field' }, kids),
            h('div', { class: 'mini' }, [btn('Undo', 'sm', function () { r.removed = false; render(); })])
          ]));
          return;
        }
        var input = h('input', {
          class: 'inp', type: 'text', value: r.label, maxlength: 40, placeholder: 'Category name', 'aria-label': 'Category name ' + (i + 1),
          oninput: function (e) { r.label = e.target.value; ctx.dirty = true; }
        });
        var note = r.isNew ? 'New. Shows as its own tab on your site.' : (n + ' ' + cf.noun + (n === 1 ? '' : 's'));
        box.appendChild(h('div', { class: 'rep-row cats' }, [
          h('div', { class: 'field' }, [input, h('span', { class: 'file-note', text: note })]),
          h('div', { class: 'mini' }, [
            ibtn('up', 'Move up', function () { swap(i, neighbour(i, -1) - i); }, neighbour(i, -1) < 0),
            ibtn('down', 'Move down', function () { swap(i, neighbour(i, 1) - i); }, neighbour(i, 1) < 0),
            ibtn('trash', 'Remove category', function () {
              if (alive.length < 2) { toast('Keep at least one category.'); return; }
              if (r.isNew) rows.splice(i, 1); else r.removed = true;
              ctx.dirty = true; render();
            })
          ])
        ]));
      });
      if (focusLast && box.isConnected) {
        focusLast = false;
        var ins = box.querySelectorAll('input.inp');
        if (ins.length) ins[ins.length - 1].focus();
      }
    }
    render();

    openEditor(ctx, {
      title: cf.title,
      done: 'Categories saved',
      body: [
        h('p', { class: 'hint-line', text: 'Each category becomes a tab on your website. Renaming one keeps its ' + cf.noun + 's. Removing one asks where to move its ' + cf.noun + 's.' }),
        box,
        h('div', { class: 'add-row' }, [btn('Add category', '', function () {
          rows.push({ id: '', label: '', isNew: true, removed: false, moveTo: null });
          ctx.dirty = true; focusLast = true; render();
        }, 'plus')]),
        errEl
      ],
      validate: function () {
        var alive = live(), seen = [], msg = '';
        if (!alive.length) msg = 'Keep at least one category.';
        alive.forEach(function (r) {
          var l = r.label.trim().toLowerCase();
          if (!l) msg = msg || 'Give every category a name, or remove the empty one.';
          else if (seen.indexOf(l) > -1) msg = msg || 'Two categories have the same name: ' + r.label.trim() + '.';
          seen.push(l);
        });
        rows.forEach(function (r) {
          if (r.removed && !r.isNew && (counts[r.id] || 0) > 0 && (!r.moveTo || r.moveTo.removed)) msg = msg || 'Choose where to move the items of “' + r.label + '”.';
        });
        errEl.hidden = !msg;
        errEl.textContent = msg;
        return !msg;
      },
      save: async function () {
        var alive = live();
        var taken = rows.filter(function (r) { return !r.isNew; }).map(function (r) { return r.id; });
        alive.forEach(function (r) {
          if (r.isNew) { r.id = uniqueId(slug(r.label) || 'category', taken); taken.push(r.id); }
        });
        // move the items first, so a failure never leaves items without a category
        for (var i = 0; i < rows.length; i++) {
          var r = rows[i];
          if (r.removed && !r.isNew && (counts[r.id] || 0) > 0) {
            await mutate(sb.from(cf.table).update({ category: r.moveTo.id }).eq('category', r.id).select('id'));
          }
        }
        await saveCats(kind, alive.map(function (r) { return { id: r.id, label: r.label.trim() }; }));
      }
    });
    if (focusLast) { focusLast = false; var first = box.querySelectorAll('input.inp'); if (first.length) first[first.length - 1].focus(); }
  }

  /* ---------- filters and search ---------- */
  function isFiltered(kind) { var f = state.filter[kind]; return f.cat !== 'all' || has(f.q.trim()) || f.status !== 'all'; }
  function filtered(kind, rows, textFn) {
    var f = state.filter[kind];
    var q = f.q.trim().toLowerCase();
    return rows.filter(function (r) {
      if (f.cat !== 'all' && r.category !== f.cat) return false;
      if (f.status === 'live' && !r.published) return false;
      if (f.status === 'hidden' && r.published) return false;
      return !q || textFn(r).toLowerCase().indexOf(q) > -1;
    });
  }
  // Category chips (with counts), a search box and a Showing/Hidden picker. onChange redraws only the list.
  function filterBar(kind, cats, onChange) {
    var f = state.filter[kind];
    var wrap = h('div', { class: 'a-filter' });
    if (cats) {
      var chips = h('div', { class: 'fchips', role: 'group', 'aria-label': 'Filter by category' });
      var paint = function () {
        chips.textContent = '';
        [['all', 'All']].concat(cats).forEach(function (c) {
          var n = c[0] === 'all' ? state.data[kind].length : state.data[kind].filter(function (r) { return r.category === c[0]; }).length;
          var on = f.cat === c[0];
          chips.appendChild(h('button', {
            class: 'fchip' + (on ? ' on' : ''), type: 'button', 'aria-pressed': on ? 'true' : 'false',
            onclick: function () { f.cat = c[0]; paint(); onChange(); }
          }, [c[1], h('span', { class: 'n', text: String(n) })]));
        });
      };
      paint();
      wrap.appendChild(chips);
    }
    var search = h('input', { class: 'inp', type: 'search', value: f.q, placeholder: 'Search…', 'aria-label': 'Search this list' });
    search.addEventListener('input', function () { f.q = search.value; onChange(); });
    var status = select([['all', 'Any status'], ['live', 'Showing'], ['hidden', 'Hidden']], f.status);
    status.setAttribute('aria-label', 'Filter by status');
    status.addEventListener('change', function () { f.status = status.value; onChange(); });
    wrap.appendChild(h('div', { class: 'frow' }, [search, status]));
    return wrap;
  }
  function lockNote() { return h('p', { class: 'hint-line', text: 'Moving items up or down is turned off while a filter is on. Clear the filters to reorder.' }); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  /* ---------- backup and restore ---------- */
  function exportBackup() {
    var out = { app: 'maverick-portfolio', version: 1, exportedAt: new Date().toISOString(), tables: {} };
    Object.keys(TABLE).forEach(function (k) { out.tables[TABLE[k]] = state.data[k] || []; });
    var blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'portfolio-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    toast('Backup downloaded');
  }
  async function restoreBackup() {
    var f = await pickFiles('.json,application/json', false);
    if (!f.length) return;
    var data;
    try { data = JSON.parse(await f[0].text()); } catch (e) { toast('That file is not a valid backup.'); return; }
    if (!data || data.app !== 'maverick-portfolio' || !data.tables || typeof data.tables !== 'object') { toast('That does not look like a backup from this admin page.'); return; }
    var order = ['projects', 'certificates', 'gallery_items', 'experience', 'skill_groups', 'socials', 'site_settings'];
    var plan = [], total = 0;
    for (var i = 0; i < order.length; i++) {
      var rows = data.tables[order[i]];
      if (!Array.isArray(rows) || !rows.length) continue;
      if (!rows.every(function (r) { return r && typeof r === 'object' && typeof r.id === 'string'; })) { toast('The backup file is damaged.'); return; }
      plan.push([order[i], rows]);
      total += rows.length;
    }
    if (!total) { toast('That backup is empty.'); return; }
    var ok = await ask('Restore this backup?', 'This adds or overwrites ' + plural(total, 'item', 'items') + ' from the file. Anything you added after the backup was made is kept. Pictures and files are not inside a backup, only the links to them.', 'Restore');
    if (!ok) return;
    try {
      for (var j = 0; j < plan.length; j++) await mutate(sb.from(plan[j][0]).upsert(plan[j][1], { onConflict: 'id' }).select('id'));
      toast('Backup restored');
      await refresh();
    } catch (e) { toast(friendly(e)); }
  }

  /* ---------- overview ---------- */
  function gotoTab(k) { state.tab = k; renderTabs(); renderPanel(); }
  function renderOverview() {
    panelEl.appendChild(h('div', { class: 'a-bar' }, [h('div', null, [h('h2', { text: 'Overview' }), h('p', { text: 'What is on your site right now, and what still needs attention.' })])]));
    var cards = [['projects', 'Projects'], ['certificates', 'Certificates'], ['gallery', 'Gallery items']];
    if (state.seeded) cards = cards.concat([['experience', 'Jobs'], ['skills', 'Skill groups'], ['socials', 'Social links']]);
    panelEl.appendChild(h('div', { class: 'stat-grid' }, cards.map(function (c) {
      var rows = state.data[c[0]], liveN = rows.filter(function (r) { return r.published; }).length, hid = rows.length - liveN;
      return h('button', { class: 'stat', type: 'button', onclick: function () { gotoTab(c[0]); } }, [
        h('span', { class: 'num', text: String(liveN) }),
        h('span', { class: 'lab2', text: c[1] + ' showing' }),
        h('span', { class: 'sub2', text: hid ? hid + ' hidden' : 'none hidden' })
      ]);
    })));

    var todo = [];
    var d = state.data;
    var soon = d.certificates.filter(function (c) { return c.published && c.images.length && !c.images.some(function (i) { return has(i.src); }); }).length;
    if (soon) todo.push([plural(soon, 'certificate still says', 'certificates still say') + ' “Coming soon”.', 'certificates']);
    var noShots = d.projects.filter(function (p) { return p.published && !(p.screenshots || []).some(function (i) { return has(i.src); }); }).length;
    if (noShots) todo.push([plural(noShots, 'project has', 'projects have') + ' no screenshots yet.', 'projects']);
    var empty = d.gallery.filter(function (g) { return g.published && !has(g.src); }).length;
    if (empty) todo.push([plural(empty, 'gallery item is', 'gallery items are') + ' still an empty placeholder.', 'gallery']);
    if (state.more && !photoHas()) todo.push(['No photo in the big circle yet.', 'photo']);
    if (state.more && !resumeHas()) todo.push(['No resume uploaded yet, so the Resume button says “coming soon”.', 'resume']);
    if (state.seeded) {
      var nolink = d.socials.filter(function (x) { return x.published && !x.info && !has(x.href); }).length;
      if (nolink) todo.push([plural(nolink, 'social link shows', 'social links show') + ' “Link coming soon”.', 'socials']);
    }
    panelEl.appendChild(h('div', { class: 'group-h', text: 'Needs attention' }));
    if (!todo.length) panelEl.appendChild(h('div', { class: 'notice' }, [h('strong', { text: 'All good. ' }), 'Nothing looks unfinished.']));
    else panelEl.appendChild(h('ul', { class: 'list' }, todo.map(function (t) {
      return h('li', { class: 'todo' }, [h('span', { text: t[0] }), btn('Open', 'sm', function () { gotoTab(t[1]); })]);
    })));

    panelEl.appendChild(h('div', { class: 'group-h', text: 'Backup' }));
    panelEl.appendChild(h('div', { class: 'card-box', style: 'margin:0;max-width:640px' }, [
      h('p', { text: 'The free Supabase plan keeps no backups of your content. Download one now and then, and after big changes. It holds all your text, links and settings. Pictures and files stay where they are; the backup only remembers their links.' }),
      h('div', { class: 'add-row' }, [btn('Download backup', 'primary', exportBackup, 'upload'), btn('Restore from a file', '', restoreBackup)])
    ]));
  }

  /* ---------- screens ---------- */
  function setScreen(nodes) { app.textContent = ''; nodes.forEach(function (n) { app.appendChild(n); }); }

  function renderSetupNeeded() {
    setScreen([h('div', { class: 'card-box' }, [
      h('h1', { text: 'Connect your database' }),
      h('p', { text: 'The admin page needs your Supabase details before it can sign you in.' }),
      h('div', { class: 'notice' }, [
        h('strong', { text: 'What to do: ' }),
        'open ', h('code', { text: 'js/config.js' }), ', paste your project URL and your publishable (anon) key, save, then refresh this page.'
      ])
    ])]);
  }
  function renderFatal(text) {
    setScreen([h('div', { class: 'card-box' }, [h('h1', { text: 'Something went wrong' }), h('div', { class: 'notice err', text: text }), btn('Try again', 'primary', function () { location.reload(); })])]);
  }

  function renderLogin(message) {
    var email = inp('', { type: 'email', autocomplete: 'username', required: true });
    var pass = inp('', { type: 'password', autocomplete: 'current-password', required: true, 'aria-label': 'Password' });
    var err = h('div', { class: 'notice err', role: 'alert', hidden: true });
    var show = h('button', { type: 'button', text: 'Show', 'aria-label': 'Show password', onclick: function () {
      var on = pass.type === 'password';
      pass.type = on ? 'text' : 'password';
      show.textContent = on ? 'Hide' : 'Show';
      show.setAttribute('aria-label', on ? 'Hide password' : 'Show password');
    } });
    var go = h('button', { class: 'a-btn primary', type: 'submit', text: 'Sign in' });
    var form = h('form', { class: 'card-box', novalidate: true }, [
      h('div', { class: 'a-brand' }, [h('div', { class: 'logo', text: 'M' }), h('div', null, [h('h1', { text: 'Portfolio admin' }), h('p', { text: 'Sign in to edit your site.' })])]),
      err,
      field('Email', email),
      field('Password', h('div', { class: 'pw' }, [pass, show]), '', true),
      go,
      h('p', { text: 'Visitors can view your portfolio but cannot sign in or change anything.' })
    ]);
    if (message) { err.hidden = false; err.textContent = message; }
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!has(email.value) || !has(pass.value)) { err.hidden = false; err.textContent = 'Enter your email and password.'; return; }
      go.disabled = true; go.textContent = 'Signing in…'; err.hidden = true;
      var r = await sb.auth.signInWithPassword({ email: email.value.trim(), password: pass.value });
      if (r.error) { err.hidden = false; err.textContent = friendly(r.error); go.disabled = false; go.textContent = 'Sign in'; pass.focus(); return; }
      await onSession(r.data.session);
    });
    setScreen([form]);
    email.focus();
  }

  function headerEl() {
    return h('header', { class: 'a-head' }, [
      h('div', { class: 'a-brand' }, [h('div', { class: 'logo', text: 'M' }), h('div', null, [h('h1', { text: 'Portfolio admin' }), h('p', { text: 'Signed in as ' + (state.user ? state.user.email : '') })])]),
      h('div', { class: 'a-actions' }, [
        h('a', { class: 'a-btn', href: 'index.html', target: '_blank', rel: 'noopener' }, ['View site', icon('external')]),
        btn('Sign out', '', signOut)
      ])
    ]);
  }
  async function signOut() { state.user = null; await sb.auth.signOut(); renderLogin(); }

  function renderNotAdmin() {
    setScreen([h('div', { class: 'card-box' }, [
      h('h1', { text: 'This account is not an admin' }),
      h('div', { class: 'notice err', text: 'You are signed in as ' + state.user.email + ', but that account is not on the admin list yet.' }),
      h('p', null, ['Run ', h('code', { text: '2-make-admin.sql' }), ' in Supabase with this exact email, then sign in again.']),
      btn('Sign out', 'primary', signOut)
    ])]);
  }

  function renderDash() {
    tabsEl = h('div', { class: 'a-tabs', role: 'tablist', 'aria-label': 'What to edit' });
    panelEl = h('div', { id: 'panel', role: 'tabpanel' });
    tabsEl.addEventListener('keydown', function (e) {
      var i = TABS.indexOf(state.tab);
      if (e.key === 'ArrowRight') i = (i + 1) % TABS.length; else if (e.key === 'ArrowLeft') i = (i + TABS.length - 1) % TABS.length; else return;
      e.preventDefault();
      state.tab = TABS[i];
      renderTabs(); renderPanel();
      var t = tabsEl.querySelector('[aria-selected="true"]');
      if (t) t.focus();
    });
    setScreen([headerEl(), tabsEl, panelEl]);
    renderTabs();
    renderPanel();
  }
  function renderTabs() {
    tabsEl.textContent = '';
    TABS.forEach(function (k) {
      var sel = state.tab === k;
      tabsEl.appendChild(h('button', {
        class: 'tab', type: 'button', role: 'tab', 'aria-selected': sel ? 'true' : 'false', tabindex: sel ? '0' : '-1',
        onclick: function () { state.tab = k; renderTabs(); renderPanel(); }
      }, [TAB_LABEL[k], k === 'overview' ? null : h('span', { class: 'count', text: k === 'resume' ? (resumeHas() ? 'Set' : 'None') : k === 'photo' ? (photoHas() ? 'Set' : 'None') : k === 'siteinfo' ? (infoRow() ? 'Edited' : 'Default') : String(state.data[k].length) })]));
    });
  }

  function itemEl(o) {
    var pic = h('div', { class: 'pic' }, [o.pic ? h('img', { src: o.pic, alt: '' }) : icon('image')]);
    var sub = h('div', { class: 'sub' }, [h('span', { class: 'badge' + (o.published ? ' live' : ''), text: o.published ? 'Showing' : 'Hidden' })].concat(
      o.bits.filter(has).map(function (b) { return h('span', { text: b }); })));
    var ctl = h('div', { class: 'ctl' }, [
      ibtn('up', 'Move up', o.up, !o.canUp),
      ibtn('down', 'Move down', o.down, !o.canDown),
      btn(o.published ? 'Hide' : 'Show', 'sm', o.toggle),
      btn('Edit', 'sm', o.edit),
      btn('Delete', 'sm danger', o.remove)
    ]);
    if (o.published && o.href) ctl.insertBefore(h('a', { class: 'a-btn sm', href: o.href, target: '_blank', rel: 'noopener' }, ['View', icon('external')]), ctl.children[2]);
    return h('li', { class: 'item' + (o.published ? '' : ' is-draft') }, [pic, h('div', null, [h('div', { class: 'name', text: o.name }), sub]), ctl]);
  }
  function resumeHas() { var r = resumeRow(); return !!(r && r.value && r.value.url); }
  function firstPic(list) { var f = (list || []).filter(function (i) { return has(i.src); })[0]; return f ? f.src : ''; }

  function barEl(title, desc, addLabel, onAdd, extras) {
    var right = h('div', { class: 'add-row' }, (extras || []).concat([btn(addLabel, 'primary', onAdd, 'plus')]));
    return h('div', { class: 'a-bar' }, [h('div', null, [h('h2', { text: title }), h('p', { text: desc })]), right]);
  }
  function emptyEl(text, title) {
    return h('div', { class: 'empty-box' }, [icon('image'), h('strong', { text: title || 'Nothing here yet' }), h('p', { text: text })]);
  }
  function catButtons(kind) {
    return [btn('Manage categories', '', function () { openCatManager(kind, false); }), btn('New category', '', function () { openCatManager(kind, true); }, 'plus')];
  }

  function renderPanel() {
    panelEl.textContent = '';
    var k = state.tab;
    if (k === 'overview') { renderOverview(); return; }
    if (CORE_TABS.indexOf(k) === -1) { renderMorePanel(k); return; }
    var total = state.data.projects.length + state.data.certificates.length + state.data.gallery.length;
    if (!total) {
      panelEl.appendChild(h('div', { class: 'empty-box' }, [
        icon('upload'), h('strong', { text: 'Your database is empty' }),
        h('p', { text: 'Import the content that is already in data.js (your projects, certificates and gallery placeholders) so you can start editing it here. You only need to do this once.' }),
        btn('Import my starter content', 'primary', importStarter)
      ]));
    }
    var host = h('div');
    var draw;
    if (k === 'projects') {
      panelEl.appendChild(barEl('Projects', 'Cards in the Projects section. Selecting one on the site opens its links, screenshots and documents.', 'Add project', function () { editProject(null); }, catButtons('projects')));
      draw = function () {
        host.textContent = '';
        var all = state.data.projects;
        if (!all.length) { host.appendChild(emptyEl('Add your first project.')); return; }
        var rows = filtered('projects', all, function (p) { return [p.title, p.tag, p.year, p.summary, (p.stack || []).join(' '), labelOf(PROJECT_CATS, p.category)].join(' '); });
        if (!rows.length) { host.appendChild(emptyEl('Nothing matches these filters. Clear the search, or choose All.', 'No matches')); return; }
        var locked = isFiltered('projects');
        if (locked) host.appendChild(lockNote());
        host.appendChild(h('ul', { class: 'list' }, rows.map(function (p, i) {
          return itemEl({
            name: p.title, pic: firstPic(p.screenshots), published: p.published, href: 'index.html#project-' + p.id,
            bits: [labelOf(PROJECT_CATS, p.category), p.tag, p.year],
            canUp: !locked && i > 0, canDown: !locked && i < rows.length - 1,
            up: function () { move('projects', p, -1); }, down: function () { move('projects', p, 1); },
            toggle: function () { togglePublished('projects', p); }, edit: function () { editProject(p); }, remove: function () { removeRecord('projects', p); }
          });
        })));
      };
      panelEl.appendChild(filterBar('projects', PROJECT_CATS, draw));
    } else if (k === 'certificates') {
      panelEl.appendChild(barEl('Certificates and achievements', 'Shown in the Achievements section. A picture is optional for each entry.', 'Add entry', function () { editCertificate(null); }));
      draw = function () {
        host.textContent = '';
        var rows = filtered('certificates', state.data.certificates, function (c) { return [c.title, c.meta, c.year].join(' '); });
        var locked = isFiltered('certificates');
        if (locked) host.appendChild(lockNote());
        CERT_KINDS.forEach(function (ck) {
          var group = rows.filter(function (c) { return c.kind === ck[0]; });
          host.appendChild(h('div', { class: 'group-h', text: ck[1] + 's' }));
          if (!group.length) { host.appendChild(h('div', { class: 'notice', text: locked ? 'Nothing matches the filters in this group.' : 'No entries in this group.' })); return; }
          host.appendChild(h('ul', { class: 'list' }, group.map(function (c, i) {
            var st = !c.images.length ? 'No copy' : (c.images.some(function (x) { return has(x.src); }) ? 'Picture added' : 'Coming soon');
            return itemEl({
              name: c.title, pic: firstPic(c.images), published: c.published, href: 'index.html#achievements',
              bits: [c.year, st, c.meta],
              canUp: !locked && i > 0, canDown: !locked && i < group.length - 1,
              up: function () { move('certificates', c, -1); }, down: function () { move('certificates', c, 1); },
              toggle: function () { togglePublished('certificates', c); }, edit: function () { editCertificate(c); }, remove: function () { removeRecord('certificates', c); }
            });
          })));
        });
      };
      panelEl.appendChild(filterBar('certificates', null, draw));
    } else {
      panelEl.appendChild(barEl('Gallery', 'Graphic design and photography. Pictures keep their own shape on the site.', 'Add to gallery', function () { editGallery(null); }, catButtons('gallery')));
      draw = function () {
        host.textContent = '';
        var all = state.data.gallery;
        if (!all.length) { host.appendChild(emptyEl('Add your first graphic design or photo.')); return; }
        var rows = filtered('gallery', all, function (x) { return [x.title, x.caption, labelOf(GALLERY_CATS, x.category)].join(' '); });
        if (!rows.length) { host.appendChild(emptyEl('Nothing matches these filters. Clear the search, or choose All.', 'No matches')); return; }
        var locked = isFiltered('gallery');
        if (locked) host.appendChild(lockNote());
        host.appendChild(h('ul', { class: 'list' }, rows.map(function (x, i) {
          return itemEl({
            name: x.title, pic: x.src, published: x.published, href: 'index.html#gallery',
            bits: [labelOf(GALLERY_CATS, x.category), x.src ? 'Picture added' : 'Coming soon', x.caption],
            canUp: !locked && i > 0, canDown: !locked && i < rows.length - 1,
            up: function () { move('gallery', x, -1); }, down: function () { move('gallery', x, 1); },
            toggle: function () { togglePublished('gallery', x); }, edit: function () { editGallery(x); }, remove: function () { removeRecord('gallery', x); }
          });
        })));
      };
      panelEl.appendChild(filterBar('gallery', GALLERY_CATS, draw));
    }
    panelEl.appendChild(host);
    draw();
  }

  function gateEl() {
    if (!state.more) {
      return h('div', { class: 'notice err' }, [h('strong', { text: 'One more database step is needed. ' }), 'Run ', h('code', { text: '3-more-content.sql' }), ' in the Supabase SQL Editor, then refresh this page.']);
    }
    if (!state.seeded) {
      return h('div', { class: 'empty-box' }, [
        icon('upload'), h('strong', { text: 'Move this content into the database' }),
        h('p', { text: 'Your experience, skills, social links and resume are still stored in data.js. Import them once so you can edit them here, or start with empty lists.' }),
        h('div', { class: 'add-row' }, [btn('Import my current content', 'primary', function () { importMore(false); }), btn('Start empty', '', function () { importMore(true); })])
      ]);
    }
    return null;
  }

  function renderMorePanel(k) {
    if (k === 'photo') { renderPhotoPanel(); return; }
    if (k === 'siteinfo') { renderInfoPanel(); return; }
    var gate = gateEl();
    if (gate) { panelEl.appendChild(gate); return; }
    if (k === 'experience') {
      panelEl.appendChild(barEl('Work experience', 'Shown in the About section, newest first if you order them that way.', 'Add experience', function () { editExperience(null); }));
      var ex = state.data.experience;
      if (!ex.length) { panelEl.appendChild(emptyEl('Add your first job.')); return; }
      panelEl.appendChild(h('ul', { class: 'list' }, ex.map(function (x, i) {
        return itemEl({
          name: x.role, pic: '', published: x.published, href: 'index.html#about',
          bits: [x.company, x.period_start + ' – ' + x.period_end],
          canUp: i > 0, canDown: i < ex.length - 1,
          up: function () { move('experience', x, -1); }, down: function () { move('experience', x, 1); },
          toggle: function () { togglePublished('experience', x); }, edit: function () { editExperience(x); }, remove: function () { removeRecord('experience', x, x.role); }
        });
      })));
    } else if (k === 'skills') {
      panelEl.appendChild(barEl('Skills', 'Groups of skills shown as chips in the Skills section.', 'Add skill group', function () { editSkillGroup(null); }));
      var sk = state.data.skills;
      if (!sk.length) { panelEl.appendChild(emptyEl('Add your first skill group.')); return; }
      panelEl.appendChild(h('ul', { class: 'list' }, sk.map(function (x, i) {
        return itemEl({
          name: x.name, pic: '', published: x.published, href: 'index.html#skills',
          bits: [(x.items || []).join(', ')],
          canUp: i > 0, canDown: i < sk.length - 1,
          up: function () { move('skills', x, -1); }, down: function () { move('skills', x, 1); },
          toggle: function () { togglePublished('skills', x); }, edit: function () { editSkillGroup(x); }, remove: function () { removeRecord('skills', x, x.name); }
        });
      })));
    } else if (k === 'socials') {
      panelEl.appendChild(barEl('Social links', 'Contact cards in the Socials section. A card with no address shows "Link coming soon".', 'Add link', function () { editSocial(null); }));
      var so = state.data.socials;
      if (!so.length) { panelEl.appendChild(emptyEl('Add your first link.')); return; }
      panelEl.appendChild(h('ul', { class: 'list' }, so.map(function (x, i) {
        return itemEl({
          name: x.label, pic: '', published: x.published, href: 'index.html#socials',
          bits: [x.value || 'Link coming soon', x.info ? 'Text only' : ''],
          canUp: i > 0, canDown: i < so.length - 1,
          up: function () { move('socials', x, -1); }, down: function () { move('socials', x, 1); },
          toggle: function () { togglePublished('socials', x); }, edit: function () { editSocial(x); }, remove: function () { removeRecord('socials', x, x.label); }
        });
      })));
    } else {
      renderResumePanel();
    }
  }

  function renderResumePanel() {
    var row = resumeRow();
    var cur = (row && row.value) || {};
    var status = h('div', { class: 'notice' });
    if (cur.url) {
      status.appendChild(h('strong', { text: 'Your resume is live. ' }));
      status.appendChild(document.createTextNode(cur.path ? 'File: ' + cur.path.split('/').pop() : 'It points to a link you pasted.'));
    } else {
      status.appendChild(h('strong', { text: 'No resume yet. ' }));
      status.appendChild(document.createTextNode('The Resume button on your site says "Resume file coming soon".'));
    }
    var busy = h('div', { class: 'progress', hidden: true }, [h('span', { class: 'spin' }), 'Uploading…']);
    var upBtn = btn(cur.url ? 'Replace PDF' : 'Upload PDF', 'primary', function () {
      pickFiles('.pdf,application/pdf', false).then(async function (f) {
        if (!f.length) return;
        if (f[0].type !== 'application/pdf') { toast('Please choose a PDF file.'); return; }
        var ctx = newCtx();
        upBtn.disabled = true; busy.hidden = false;
        try {
          var u = await uploadFile(f[0], 'resume', ctx, 'doc');
          try { await saveResume(u.src, u.path); }
          catch (e) { await removeFiles(ctx.session.created); throw e; }
          toast('Resume saved');
          await refresh();
        } catch (e) { toast(friendly(e)); upBtn.disabled = false; busy.hidden = true; }
      });
    }, 'upload');
    var actions = h('div', { class: 'add-row' }, [upBtn]);
    if (cur.url) {
      actions.appendChild(h('a', { class: 'a-btn', href: cur.url, target: '_blank', rel: 'noopener' }, ['Open', icon('external')]));
      actions.appendChild(btn('Remove', 'danger', removeResume));
    }
    var linkIn = inp(cur.path ? '' : (cur.url || ''), { type: 'url', placeholder: 'https://…', 'aria-label': 'Resume link' });
    var linkField = field('Or use a link instead', linkIn, 'For example a Google Drive share link. Saving a link replaces an uploaded file.');
    var saveLink = btn('Save link', '', async function () {
      var v = linkIn.value.trim();
      if (!/^https?:\/\//i.test(v)) { linkField.setError('Enter a full address starting with https://'); linkIn.focus(); return; }
      linkField.setError('');
      try { await saveResume(v, ''); toast('Resume link saved'); await refresh(); } catch (e) { toast(friendly(e)); }
    });
    panelEl.appendChild(h('div', { class: 'a-bar' }, [h('div', null, [h('h2', { text: 'Resume' }), h('p', { text: 'The Resume button at the top of your site opens this file. A PDF up to 20 MB works best.' })])]));
    panelEl.appendChild(h('div', { class: 'card-box', style: 'margin:0;max-width:640px' }, [status, actions, busy, linkField, h('div', { class: 'add-row' }, [saveLink])]));
  }

  /* ---------- hero photo (shown inside the big circle on the home page) ---------- */
  function photoRow() { return state.data.settings.filter(function (x) { return x.id === 'portrait'; })[0]; }
  function photoHas() { var r = photoRow(); return !!(r && r.value && r.value.url); }
  async function savePhoto(url, path, pos) {
    var row = photoRow();
    var old = row && row.value ? row.value.path : '';
    var value = { url: url, path: path || '', pos: pos };
    if (row) await mutate(sb.from('site_settings').update({ value: value }).eq('id', 'portrait').select('id'));
    else await mutate(sb.from('site_settings').insert({ id: 'portrait', value: value, sort: 0 }).select('id'));
    if (old && old !== path) await removeFiles([old]);
  }
  async function removePhoto() {
    var row = photoRow();
    if (!row) return;
    var ok = await ask('Remove your photo?', 'The big circle on your home page goes back to the glowing orb.', 'Remove', true);
    if (!ok) return;
    try {
      await mutate(sb.from('site_settings').delete().eq('id', 'portrait').select('id'));
      await removeFiles([row.value && row.value.path]);
      toast('Photo removed');
      await refresh();
    } catch (e) { toast(friendly(e)); }
  }

  function renderPhotoPanel() {
    panelEl.appendChild(h('div', { class: 'a-bar' }, [h('div', null, [h('h2', { text: 'Photo' }), h('p', { text: 'Your picture inside the big circle at the top of your home page. You can change it whenever you like.' })])]));
    if (!state.more) {
      panelEl.appendChild(h('div', { class: 'notice err' }, [h('strong', { text: 'One more database step is needed. ' }), 'Run ', h('code', { text: '3-more-content.sql' }), ' in the Supabase SQL Editor, then refresh this page.']));
      return;
    }
    var row = photoRow();
    var cur = (row && row.value) || {};
    var pos = typeof cur.pos === 'number' ? cur.pos : 30;

    var frame = h('div', { style: 'width:200px;height:200px;border-radius:50%;overflow:hidden;flex:none;display:grid;place-items:center;box-shadow:inset 0 0 0 1px var(--line);background:var(--glass)' });
    var img = null;
    if (cur.url) {
      img = h('img', { src: cur.url, alt: 'Your current photo', style: 'width:100%;height:100%;object-fit:cover;object-position:50% ' + pos + '%' });
      frame.appendChild(img);
    } else {
      frame.appendChild(icon('image'));
    }

    var status = h('div', { class: 'notice' });
    if (cur.url) {
      status.appendChild(h('strong', { text: 'Your photo is live. ' }));
      status.appendChild(document.createTextNode('This is how it is cropped in the circle.'));
    } else {
      status.appendChild(h('strong', { text: 'No photo yet. ' }));
      status.appendChild(document.createTextNode('The circle shows the glowing orb until you upload one. A clear, front-facing picture with your head near the top works best.'));
    }

    var busy = h('div', { class: 'progress', hidden: true }, [h('span', { class: 'spin' }), 'Uploading…']);
    var upBtn = btn(cur.url ? 'Replace photo' : 'Upload photo', 'primary', function () {
      pickFiles('image/jpeg,image/png,image/webp', false).then(async function (f) {
        if (!f.length) return;
        var ctx = newCtx();
        upBtn.disabled = true; busy.hidden = false;
        try {
          var u = await uploadFile(f[0], 'portrait', ctx, 'image');
          try { await savePhoto(u.src, u.path, pos); }
          catch (e) { await removeFiles(ctx.session.created); throw e; }
          toast('Photo saved');
          await refresh();
        } catch (e) { toast(friendly(e)); upBtn.disabled = false; busy.hidden = true; }
      });
    }, 'upload');
    var actions = h('div', { class: 'add-row' }, [upBtn]);
    if (cur.url) actions.appendChild(btn('Remove', 'danger', removePhoto));

    var box = h('div', { class: 'card-box', style: 'margin:0;max-width:640px' }, [
      h('div', { style: 'display:flex;gap:24px;align-items:center;flex-wrap:wrap' }, [frame, h('div', { style: 'flex:1;min-width:220px;display:flex;flex-direction:column;gap:14px' }, [status, actions, busy])])
    ]);

    if (cur.url) {
      var out = h('output', { style: 'font-size:13.5px;color:var(--muted)', text: pos + '%' });
      var range = h('input', { type: 'range', min: '0', max: '100', step: '1', value: String(pos), style: 'width:100%' });
      range.addEventListener('input', function () {
        pos = Number(range.value);
        out.textContent = pos + '%';
        if (img) img.style.objectPosition = '50% ' + pos + '%';
      });
      var posField = field('Move the picture up or down', range, 'If your head is cut off, drag toward the left to show more of the top. The preview above updates as you drag.');
      var saveBtn = btn('Save position', '', async function () {
        try { await savePhoto(cur.url, cur.path, pos); toast('Position saved'); await refresh(); } catch (e) { toast(friendly(e)); }
      });
      box.appendChild(posField);
      box.appendChild(h('div', { class: 'add-row' }, [saveBtn, out]));
    }
    panelEl.appendChild(box);
  }

  /* ---------- site info (the text at the top of the home page) ---------- */
  var DEFAULT_INFO = {
    first: 'Maverick',
    rest: 'Miguel A. Torres',
    eyebrow: 'Portfolio · Puerto Princesa, Palawan',
    creds: ['Bachelor of Science in Information Technology', 'Google UX Design Professional'],
    intro: 'I build practical technology solutions using Python, across web development, IoT systems and research.',
    about: 'Fourth-year BSIT student who builds practical technology solutions using Python, with a background spanning full-stack web development, IoT systems, and academic research. Looking for a web development or systems design internship where I can contribute to meaningful projects, sharpen my technical skills, and gain hands-on industry experience that bridges the classroom and the real world.',
    title: 'Maverick Portfolio',
    description: 'Portfolio of Maverick Miguel A. Torres, BSIT student at Palawan State University: web, IoT and GIS projects, certificates and experience.'
  };
  function infoRow() { return state.data.settings.filter(function (x) { return x.id === 'siteinfo'; })[0]; }
  async function saveInfo(value) {
    if (infoRow()) await mutate(sb.from('site_settings').update({ value: value }).eq('id', 'siteinfo').select('id'));
    else await mutate(sb.from('site_settings').insert({ id: 'siteinfo', value: value, sort: 0 }).select('id'));
  }
  async function resetInfo() {
    if (!infoRow()) { toast('Already showing the built-in text.'); return; }
    var ok = await ask('Go back to the built-in text?', 'Your saved text is removed and the site shows the original wording again.', 'Go back', true);
    if (!ok) return;
    try {
      await mutate(sb.from('site_settings').delete().eq('id', 'siteinfo').select('id'));
      toast('Back to the built-in text');
      await refresh();
    } catch (e) { toast(friendly(e)); }
  }

  function renderInfoPanel() {
    panelEl.appendChild(h('div', { class: 'a-bar' }, [h('div', null, [h('h2', { text: 'Site info' }), h('p', { text: 'The words at the top of your home page and in your About section. Change them here, and the site updates when you save.' })]),
      h('a', { class: 'a-btn', href: 'index.html', target: '_blank', rel: 'noopener' }, ['View site', icon('external')])]));
    if (!state.more) {
      panelEl.appendChild(h('div', { class: 'notice err' }, [h('strong', { text: 'One more database step is needed. ' }), 'Run ', h('code', { text: '3-more-content.sql' }), ' in the Supabase SQL Editor, then refresh this page.']));
      return;
    }
    var saved = (infoRow() && infoRow().value) || {};
    var cur = {};
    Object.keys(DEFAULT_INFO).forEach(function (k) { cur[k] = saved[k] !== undefined && saved[k] !== null && saved[k] !== '' ? saved[k] : DEFAULT_INFO[k]; });
    if (!Array.isArray(cur.creds)) cur.creds = DEFAULT_INFO.creds;

    var first = inp(cur.first, { maxlength: 40, placeholder: 'Maverick' });
    var rest = inp(cur.rest, { maxlength: 80, placeholder: 'Miguel A. Torres' });
    var eyebrow = inp(cur.eyebrow, { maxlength: 90, placeholder: 'Portfolio · City, Province' });
    var creds = area(cur.creds.join('\n'), { rows: 3, placeholder: 'One line each, for example your degree' });
    var intro = area(cur.intro, { rows: 3, maxlength: 300 });
    var about = area(cur.about, { rows: 8, maxlength: 1500 });
    var title = inp(cur.title, { maxlength: 70 });
    var desc = area(cur.description, { rows: 3, maxlength: 200 });

    var fFirst = field('First name (the big word)', first, 'Shown very large. Also used in the menu at the top.', false, true);
    var fRest = field('Rest of your name', rest, 'Shown smaller, under the first name.');
    var fEyebrow = field('Small label above your name', eyebrow);
    var fCreds = field('Credentials', creds, 'Write each line on its own row. They show in grey under your name.');
    var fIntro = field('Intro sentence', intro, 'One or two sentences, shown above the Resume button.');
    var fAbout = field('About paragraph', about, 'The paragraph at the top of the About section.');
    var fTitle = field('Browser tab title', title, 'The text on the browser tab and in search results.');
    var fDesc = field('Search description', desc, 'A short summary that search engines and link previews can show.');

    var msg = h('span', { class: 'file-note', role: 'status' });
    var saveBtn = btn('Save changes', 'primary', async function () {
      if (!has(first.value)) { fFirst.setError('Enter your first name.'); first.focus(); return; }
      fFirst.setError('');
      var value = {
        first: first.value.trim(), rest: rest.value.trim(), eyebrow: eyebrow.value.trim(),
        creds: creds.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean),
        intro: intro.value.trim(), about: about.value.trim(), title: title.value.trim(), description: desc.value.trim()
      };
      saveBtn.disabled = true; msg.textContent = 'Saving…';
      try { await saveInfo(value); toast('Site info saved'); await refresh(); }
      catch (e) { toast(friendly(e)); saveBtn.disabled = false; msg.textContent = ''; }
    });
    var actions = h('div', { class: 'add-row' }, [saveBtn, btn('Back to the built-in text', '', resetInfo), msg]);

    panelEl.appendChild(h('div', { class: 'card-box', style: 'margin:0;max-width:760px' }, [
      h('div', { class: 'group-h', style: 'margin:0', text: 'Your name' }),
      h('div', { class: 'row2' }, [fFirst, fRest]),
      h('div', { class: 'group-h', style: 'margin:6px 0 0', text: 'Under your name' }),
      fEyebrow, fCreds, fIntro,
      h('div', { class: 'group-h', style: 'margin:6px 0 0', text: 'About section' }),
      fAbout,
      h('div', { class: 'group-h', style: 'margin:6px 0 0', text: 'Browser tab and search' }),
      fTitle, fDesc,
      actions
    ]));
  }

  /* ---------- start ---------- */
  async function onSession(session) {
    if (!session) { renderLogin(); return; }
    state.user = session.user;
    setScreen([h('p', { class: 'boot', text: 'Checking your account…' })]);
    try {
      var a = await sb.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
      if (a.error) throw a.error;
      if (!a.data) { renderNotAdmin(); return; }
      await loadAll();
      renderDash();
    } catch (e) {
      var m = friendly(e);
      if (/relation .* does not exist|schema cache|Could not find the table/i.test(m)) m = 'The database tables are missing. Run 1-schema.sql in Supabase first.';
      renderFatal(m);
    }
  }

  function init() {
    if (!CFG.supabaseUrl || !CFG.supabaseAnonKey) { renderSetupNeeded(); return; }
    if (!window.supabase || !window.supabase.createClient) { renderFatal('The sign-in library could not load. Check your internet connection and refresh.'); return; }
    sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
    sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT' && state.user) { state.user = null; renderLogin('You were signed out. Please sign in again.'); } });
    sb.auth.getSession().then(function (r) { return onSession(r.data.session); }, function (e) { renderFatal(friendly(e)); });
  }
  init();
})();