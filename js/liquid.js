/* =====================================================================
   Flowing black-and-white liquid background (WebGL).
   - Draws at reduced resolution and the browser scales it up, so it stays smooth and light.
   - Kept dark enough (dark mode) or light enough (light mode) that text stays readable.
   - Follows the light/dark toggle, reacts gently to the mouse, pauses when the tab is hidden.
   - If the visitor prefers reduced motion, it paints one still frame instead of animating.
   - If WebGL is not available, it does nothing and the normal glow background stays.
   To turn it off completely, delete the <script src="js/liquid.js"> line in index.html.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var canvas = document.createElement('canvas');
  canvas.id = 'liquid';
  canvas.setAttribute('aria-hidden', 'true');

  var gl = null;
  try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'low-power' }); } catch (e) {}
  if (!gl) return;

  var VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 u_res; uniform float u_t; uniform float u_dark; uniform vec2 u_mouse;',
    'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float noise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);',
    '}',
    'float fbm(vec2 p){',
    '  float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);',
    '  for (int i = 0; i < 4; i++) { v += a * noise(p); p = m * p; a *= 0.5; }',
    '  return v;',
    '}',
    'float field(vec2 p, float t){',
    '  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.6)), fbm(p + vec2(5.2, 1.3) - vec2(t * 0.5, 0.0)));',
    '  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.35), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t * 0.3));',
    '  return fbm(p + 3.0 * r);',
    '}',
    'void main(){',
    '  float s = min(u_res.x, u_res.y);',
    '  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / s * 1.7;',
    '  vec2 m = (u_mouse * u_res - 0.5 * u_res) / s * 1.7;',
    '  float d = length(p - m);',
    '  p += (p - m) * 0.22 * exp(-d * d * 2.2);',
    '  float t = u_t * 0.12;',
    '  float e = 0.015;',
    '  float f = field(p, t);',
    '  float fx = field(p + vec2(e, 0.0), t);',
    '  float fy = field(p + vec2(0.0, e), t);',
    '  vec3 n = normalize(vec3((f - fx) / e * 0.30, (f - fy) / e * 0.30, 1.0));',
    '  vec3 L = normalize(vec3(-0.45, 0.6, 0.65));',
    '  float diff = dot(n, L) * 0.5 + 0.5;',
    '  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 22.0);',
    '  float body = smoothstep(0.15, 0.85, f);',
    '  float liquid = mix(diff, body, 0.55);',
    '  float lightCol = 0.985 - liquid * 0.13 + spec * 0.02;',
    '  float darkCol = liquid * liquid * 0.2 + spec * 0.07;',
    '  float c = mix(lightCol, darkCol, u_dark);',
    '  c += (hash(gl_FragCoord.xy) - 0.5) / 255.0 * 1.5;',
    '  gl_FragColor = vec4(vec3(c), 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { if (window.console) console.warn(gl.getShaderInfoLog(sh)); return null; }
    return sh;
  }
  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, 'u_res');
  var uT = gl.getUniformLocation(prog, 'u_t');
  var uDark = gl.getUniformLocation(prog, 'u_dark');
  var uMouse = gl.getUniformLocation(prog, 'u_mouse');

  var style = document.createElement('style');
  style.textContent =
    'html.liquid body::before{display:none}' +
    '#liquid{position:fixed;inset:0;width:100%;height:100%;z-index:-2;pointer-events:none;opacity:0;transition:opacity 1.4s ease}' +
    '#liquid.on{opacity:1}';
  document.head.appendChild(style);
  document.body.insertBefore(canvas, document.body.firstChild);

  var scale = window.innerWidth < 700 ? 0.4 : 0.55;
  var dark = isDark() ? 1 : 0;
  var darkTarget = dark;
  var mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5;
  var t0 = performance.now();
  var last = 0, slow = 0, shown = false, raf = 0;

  function isDark() { return root.getAttribute('data-theme') !== 'light'; }

  function resize() {
    var w = Math.max(2, Math.floor(window.innerWidth * scale));
    var h = Math.max(2, Math.floor(window.innerHeight * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
  }

  function draw(now) {
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uT, reduce ? 18.0 : (now - t0) / 1000);
    gl.uniform1f(uDark, dark);
    gl.uniform2f(uMouse, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!shown) { shown = true; root.classList.add('liquid'); canvas.classList.add('on'); }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    var dt = now - last;
    if (dt < 32) return; // about 30 frames a second is plenty for slow liquid
    last = now;
    // if the device struggles, quietly lower the resolution
    slow = dt > 70 ? slow + 1 : Math.max(0, slow - 1);
    if (slow > 20 && scale > 0.25) { scale = Math.max(0.25, scale * 0.8); slow = 0; resize(); }
    dark += (darkTarget - dark) * 0.1;
    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;
    draw(now);
  }

  new MutationObserver(function () {
    darkTarget = isDark() ? 1 : 0;
    if (reduce) { dark = darkTarget; draw(performance.now()); }
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  window.addEventListener('resize', function () { resize(); if (reduce) draw(performance.now()); });
  window.addEventListener('pointermove', function (e) {
    tmx = e.clientX / window.innerWidth;
    tmy = 1 - e.clientY / window.innerHeight;
  }, { passive: true });

  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    cancelAnimationFrame(raf);
    root.classList.remove('liquid');
    canvas.remove();
  });

  resize();
  if (reduce) draw(performance.now());
  else raf = requestAnimationFrame(frame);
})();