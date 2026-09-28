'use strict';
// world.execute(me); — audio-synced MV renderer. Every frame is a pure function of time.
const W = 1920, H = 1080, FPS = 30;
const A = window.ANALYSIS;
const SPB = 60 / A.bpm, T0 = A.t0;
const tb = b => T0 + b * SPB;       // beat -> seconds
const bt = t => (t - T0) / SPB;     // seconds -> beat
const END_T = tb(448);

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let g = ctx; // current drawing context (swapped for offscreen passes)
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const TMP = mk(W, H), tx = TMP.getContext('2d');
const TMP2 = mk(W, H), tx2 = TMP2.getContext('2d');
const SUB = mk(W, H), sx = SUB.getContext('2d');
const BL1 = mk(480, 270), bl1 = BL1.getContext('2d');
const BL2 = mk(240, 135), bl2 = BL2.getContext('2d');

const MONO = '"DejaVu Sans Mono", monospace';
const COL = { bg: '#05060a', fg: '#e6edf5', cy: '#3de8ff', mg: '#ff2e88', am: '#ffb400', rd: '#ff3344', dim: '#6b7a8c', pk: '#ffc2dc' };

// ---------------------------------------------------------------- math
const PI2 = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeIn = t => Math.pow(clamp(t), 3);
const easeBack = t => { t = clamp(t); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const frac = x => x - Math.floor(x);
function hash(n) { n = Math.imul((n | 0) ^ 0x9E3779B9, 0x85EBCA6B); n ^= n >>> 13; n = Math.imul(n, 0xC2B2AE35); n ^= n >>> 16; return (n >>> 0) / 4294967296; }
const rnd = (i, s = 0) => hash(Math.imul(i | 0, 7919) + Math.imul(s | 0, 104729) + 17);
function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const h = (a, b) => hash(Math.imul(a, 374761393) + Math.imul(b, 668265263));
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

// ---------------------------------------------------------------- audio events
function lastIdx(arr, t) { let lo = 0, hi = arr.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= t) { r = m; lo = m + 1; } else hi = m - 1; } return r; }
function evEnv(times, vals, t, dec, minv) {
  const i = lastIdx(times, t); let e = 0;
  for (let k = 0; k < 5 && i - k >= 0; k++) {
    const d = t - times[i - k]; if (d > dec * 8) break;
    const v = vals ? vals[i - k] : 1; if (v < minv) continue;
    e = Math.max(e, Math.min(1.2, v) * Math.exp(-d / dec));
  }
  return e;
}
function feat(name, i) {
  const a = A.feat[name], index = clamp(i, 0, a.length - 1);
  const left = Math.floor(index), right = Math.min(a.length - 1, left + 1);
  return lerp(a[left], a[right], index - left);
}
function state(i) {
  const t = i / FPS, b = bt(t);
  const S = { i, t, b, bi: Math.floor(b), bf: frac(b) };
  S.kick = evEnv(A.kicks, A.kickv, t, 0.11, 0.5);
  S.snare = evEnv(A.snares, A.snarev, t, 0.09, 0.8);
  S.hat = evEnv(A.hats, null, t, 0.05, 0);
  S.hit = evEnv(A.hits, A.hitv, t, 0.12, 0.85);
  S.beat = b >= 0 ? Math.exp(-S.bf * SPB / 0.12) : 0;
  S.kk = Math.max(S.kick, S.beat * 0.75);
  S.low = feat('low', i); S.mid = feat('mid', i); S.high = feat('high', i);
  S.rms = feat('rms', i); S.on = feat('onset', i);
  const specIndex = clamp(i, 0, A.spec.length - 1);
  const specLeft = Math.floor(specIndex), specRight = Math.min(A.spec.length - 1, specLeft + 1);
  S.spec = A.spec[specLeft].map((value, band) => lerp(value, A.spec[specRight][band], specIndex - specLeft));
  return S;
}
function specAt(S, x) { const f = clamp(x) * 15, i0 = Math.floor(f), r = f - i0; return lerp(S.spec[i0], S.spec[Math.min(15, i0 + 1)], r); }

// ---------------------------------------------------------------- 3D
function camera(x, y, z, yaw, pitch, roll, f, ox = W / 2, oy = H / 2) {
  return { x, y, z, f, ox, oy, cy: Math.cos(yaw), sy: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch), cr: Math.cos(roll), sr: Math.sin(roll) };
}
function pj(c, x, y, z) {
  const dx = x - c.x, dy = y - c.y, dz = z - c.z;
  const x1 = dx * c.cy - dz * c.sy, z1 = dx * c.sy + dz * c.cy;
  const y2 = dy * c.cp - z1 * c.sp, z2 = dy * c.sp + z1 * c.cp;
  if (z2 < 5) return null;
  const x3 = x1 * c.cr - y2 * c.sr, y3 = x1 * c.sr + y2 * c.cr;
  const s = c.f / z2; return [c.ox + x3 * s, c.oy - y3 * s, z2, s];
}
function lookCam(px, py, pz, tx_, ty, tz, roll, f) {
  const dx = tx_ - px, dy = ty - py, dz = tz - pz;
  const yaw = Math.atan2(dx, dz);
  const pitch = Math.atan2(dy, Math.hypot(dx, dz));
  return camera(px, py, pz, yaw, pitch, roll, f);
}
function rmat(ax, ay, az) {
  const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay), cc = Math.cos(az), sc = Math.sin(az);
  return [cc * cb, cc * sb * sa - sc * ca, cc * sb * ca + sc * sa,
          sc * cb, sc * sb * sa + cc * ca, sc * sb * ca - cc * sa,
          -sb, cb * sa, cb * ca];
}
const ap = (m, x, y, z) => [m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z];

// ---------------------------------------------------------------- shapes
const PHI = (1 + Math.sqrt(5)) / 2;
function normShape(v) { const r = Math.max(...v.map(p => Math.hypot(p[0], p[1], p[2]))); return v.map(p => [p[0] / r, p[1] / r, p[2] / r]); }
function minEdges(v) {
  let md = 1e9; const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) md = Math.min(md, d(v[i], v[j]));
  const e = []; for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (d(v[i], v[j]) < md * 1.02) e.push([i, j]);
  return e;
}
function solid(v) { v = normShape(v); return { v, e: minEdges(v) }; }
const SH = {};
SH.cube = solid([[-1,-1,-1],[-1,-1,1],[-1,1,-1],[-1,1,1],[1,-1,-1],[1,-1,1],[1,1,-1],[1,1,1]]);
SH.tetra = solid([[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]]);
SH.octa = solid([[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]);
(() => { const v = []; for (const a of [-1, 1]) for (const b of [-1, 1]) { v.push([0, a, b * PHI]); v.push([a, b * PHI, 0]); v.push([b * PHI, 0, a]); } SH.icosa = solid(v); })();
(() => { const v = []; for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) v.push([a, b, c]);
  const ip = 1 / PHI; for (const a of [-1, 1]) for (const b of [-1, 1]) { v.push([0, a * ip, b * PHI]); v.push([a * ip, b * PHI, 0]); v.push([b * PHI, 0, a * ip]); } SH.dodeca = solid(v); })();
(() => { const v = [], e = [], nu = 20, nv = 8, R = 0.68, r = 0.32;
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const u = i / nu * PI2, w = j / nv * PI2; v.push([(R + r * Math.cos(w)) * Math.cos(u), r * Math.sin(w), (R + r * Math.cos(w)) * Math.sin(u)]);
    e.push([i * nv + j, ((i + 1) % nu) * nv + j]); e.push([i * nv + j, i * nv + (j + 1) % nv]); }
  SH.torus = { v, e }; })();
(() => { const v = [], e = [], n = 160; for (let i = 0; i < n; i++) { const p = i / n * PI2; const r = 0.62 + 0.3 * Math.cos(3 * p); v.push([r * Math.cos(2 * p), 0.32 * Math.sin(3 * p), r * Math.sin(2 * p)]); e.push([i, (i + 1) % n]); } SH.knot = { v, e }; })();
(() => { const v = [], e = [], nl = 7, ns = 18; for (let a = 1; a <= nl; a++) { const th = a / (nl + 1) * Math.PI; for (let s = 0; s < ns; s++) { const ph = s / ns * PI2; v.push([Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]); } }
  for (let a = 0; a < nl; a++) for (let s = 0; s < ns; s++) { e.push([a * ns + s, a * ns + (s + 1) % ns]); if (a < nl - 1) e.push([a * ns + s, (a + 1) * ns + s]); }
  SH.sphere = { v, e }; })();
const VORDER = ['cube', 'tetra', 'octa', 'icosa', 'dodeca', 'torus', 'knot', 'sphere'];
const VNAME = ['Cube', 'Tetrahedron', 'Octahedron', 'Icosahedron', 'Dodecahedron', 'Torus', 'TorusKnot', 'Sphere'];

function drawWire(cam, sh, px, py, pz, m, sc, col, al, lw) {
  const P = sh.v.map(v => { const r = ap(m, v[0] * sc, v[1] * sc, v[2] * sc); return pj(cam, px + r[0], py + r[1], pz + r[2]); });
  g.beginPath();
  for (const [a, b] of sh.e) { const p = P[a], q = P[b]; if (!p || !q) continue; g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); }
  g.strokeStyle = col; g.globalAlpha = al; g.lineWidth = lw; g.stroke(); g.globalAlpha = 1;
  return P;
}
// flat (orthographic) wire for UI widgets
function drawWire2D(sh, cx, cy, m, sc, col, al, lw) {
  g.beginPath();
  const P = sh.v.map(v => { const r = ap(m, v[0], v[1], v[2]); const k = 1 / (1 + r[2] * 0.25); return [cx + r[0] * sc * k, cy - r[1] * sc * k]; });
  for (const [a, b] of sh.e) { g.moveTo(P[a][0], P[a][1]); g.lineTo(P[b][0], P[b][1]); }
  g.strokeStyle = col; g.globalAlpha = al; g.lineWidth = lw; g.stroke(); g.globalAlpha = 1;
}

// ---------------------------------------------------------------- particle sets
const HN = 1500;
const HX = new Float32Array(HN), HY = new Float32Array(HN), HZ = new Float32Array(HN), HS = new Float32Array(HN), HE = new Uint8Array(HN);
const HVX = new Float32Array(HN), HVY = new Float32Array(HN), HVZ = new Float32Array(HN);
for (let j = 0; j < HN; j++) {
  const u = rnd(j, 11) * PI2, edge = rnd(j, 12) < 0.42;
  const r = edge ? 1 + (rnd(j, 13) - 0.5) * 0.05 : Math.sqrt(rnd(j, 13)) * 0.95;
  const s = Math.sin(u);
  const hx = s * s * s, hy = (13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u)) / 16;
  HX[j] = hx * r; HY[j] = (hy + 0.16) * r;
  HZ[j] = edge ? (rnd(j, 14) - 0.5) * 0.12 : (rnd(j, 14) - 0.5) * 0.8 * Math.sqrt(Math.max(0, 1 - r * r * 0.9));
  HS[j] = edge ? 2.6 + rnd(j, 15) * 1.4 : 1.6 + rnd(j, 15) * 1.6; HE[j] = edge ? 1 : 0;
  const a = rnd(j, 16) * PI2, bz = rnd(j, 17) * 2 - 1, rr = Math.sqrt(1 - bz * bz), sp = 0.5 + rnd(j, 18);
  HVX[j] = Math.cos(a) * rr * sp; HVY[j] = Math.sin(a) * rr * sp; HVZ[j] = bz * sp;
}
const FN = 230, FBX = new Float32Array(FN), FBY = new Float32Array(FN), FBZ = new Float32Array(FN);
for (let i = 0; i < FN; i++) { const y = 1 - 2 * (i + 0.5) / FN, r = Math.sqrt(1 - y * y), th = i * 2.399963; FBX[i] = Math.cos(th) * r; FBY[i] = y; FBZ[i] = Math.sin(th) * r; }
const STN = 520, STX = new Float32Array(STN), STY = new Float32Array(STN), STZ = new Float32Array(STN);
for (let i = 0; i < STN; i++) { const z = rnd(i, 21) * 2 - 1, a = rnd(i, 22) * PI2, r = Math.sqrt(1 - z * z); STX[i] = Math.cos(a) * r; STY[i] = z; STZ[i] = Math.sin(a) * r; }

// ---------------------------------------------------------------- primitives
function bg(col = COL.bg) { g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = col; g.fillRect(0, 0, W, H); }
function typed(str, t0, t, cps = 48) { if (t < t0) return ''; return str.slice(0, Math.floor((t - t0) * cps)); }
function text(str, x, y, size, col, al = 1, align = 'left', weight = '') {
  g.font = `${weight} ${size}px ${MONO}`; g.textAlign = align; g.fillStyle = col; g.globalAlpha = al; g.fillText(str, x, y); g.globalAlpha = 1; g.textAlign = 'left';
}
const SCR = '01<>/{}[]#$%&*+=;:?!_|~^';
function scramble(str, revealT, t, seed, per = 0.05) {
  let o = ''; for (let k = 0; k < str.length; k++) { const rt = revealT + k * per; if (t >= rt || str[k] === ' ') o += str[k]; else if (t >= revealT - 0.3) o += SCR[Math.floor(rnd(k + seed, Math.floor(t * 24)) * SCR.length)]; else o += ' '; }
  return o;
}
function stars2D(S, n, ymax, al) {
  g.fillStyle = COL.fg;
  for (let i = 0; i < n; i++) { const x = rnd(i, 31) * W, y = rnd(i, 32) * ymax; const tw = 0.3 + 0.7 * rnd(i, Math.floor(S.t * 6)) * (0.4 + S.hat); g.globalAlpha = al * tw * (0.3 + rnd(i, 33) * 0.7); const s = rnd(i, 34) < 0.1 ? 2.5 : 1.5; g.fillRect(x, y, s, s); }
  g.globalAlpha = 1;
}
function stars3D(cam, S, al) {
  g.fillStyle = COL.fg;
  for (let i = 0; i < STN; i++) { const p = pj(cam, cam.x + STX[i] * 5000, cam.y + STY[i] * 5000, cam.z + STZ[i] * 5000); if (!p) continue;
    g.globalAlpha = al * (0.25 + 0.75 * rnd(i, 35)) * (0.6 + 0.4 * rnd(i, Math.floor(S.t * 5))); const s = rnd(i, 36) < 0.08 ? 2.6 : 1.6; g.fillRect(p[0], p[1], s, s); }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- terrain + sun
function drawSun(cx, cy, R, top, bot, S, al = 1) {
  g.globalAlpha = al * 0.45;
  const halo = g.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 2.3); halo.addColorStop(0, rgba(bot, 0.55)); halo.addColorStop(1, rgba(bot, 0));
  g.fillStyle = halo; g.fillRect(cx - R * 2.4, cy - R * 2.4, R * 4.8, R * 4.8);
  g.globalAlpha = al;
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, PI2); g.clip();
  const gr = g.createLinearGradient(0, cy - R, 0, cy + R); gr.addColorStop(0, top); gr.addColorStop(1, bot);
  g.fillStyle = gr; g.fillRect(cx - R, cy - R, R * 2, R * 2);
  g.fillStyle = COL.bg; const sc = frac(S.t * 0.35);
  for (let k = 0; k < 9; k++) { const y0 = cy + R * (0.02 + (k + sc) * 0.12); const hh = R * 0.012 * (k + sc) * 1.4; g.fillRect(cx - R, y0, R * 2, hh); }
  g.restore(); g.globalAlpha = 1;
}
function drawTerrain(S, o) {
  const f = 760, hor = o.hor, camH = o.camH, t = S.t;
  const travel = t * o.speed, dz = 70, rows = 52, near = 85, nx = 60, X0 = -2800, dxw = 5600 / nx;
  const zoff = travel % dz, zbase = Math.floor(travel / dz);
  const pts = [];
  for (let r = 0; r < rows; r++) {
    const z = near + r * dz - zoff, wz = zbase + r, row = new Float32Array((nx + 1) * 2);
    for (let c = 0; c <= nx; c++) {
      const X = X0 + c * dxw, ax = Math.abs(X);
      const valley = smooth((ax - 160) / 1000);
      const n1 = noise2(X * 0.0012 + 11.3, wz * dz * 0.0012), n2 = noise2(X * 0.004 + 3.1, wz * dz * 0.004);
      let h = o.amp * valley * (n1 * n1 * 1.5 + n2 * 0.35);
      h += o.rip * S.kk * valley * Math.sin(wz * 0.45 - t * 7) * 40;
      if (o.fall) { const d = o.fall * (0.4 + rnd(c * 97 + wz, 3)); h -= d * d * 900; }
      row[c * 2] = W / 2 + X * f / z; row[c * 2 + 1] = hor + (camH - h) * f / z;
    }
    pts.push(row);
  }
  g.lineWidth = o.lw || 1.4;
  for (let r = rows - 2; r >= 0; r--) {
    const Fa = pts[r + 1], Nb = pts[r];
    const depthA = 1 - (r + 1) / rows; const a = Math.pow(depthA, 1.1) * o.alpha * (r + 1 > rows - 6 ? (rows - r - 1) / 6 : 1);
    if (!o.dots) {
      g.beginPath(); g.moveTo(Fa[0], Fa[1]); for (let c = 1; c <= nx; c++) g.lineTo(Fa[c * 2], Fa[c * 2 + 1]);
      for (let c = nx; c >= 0; c--) g.lineTo(Nb[c * 2], Nb[c * 2 + 1]); g.closePath();
      g.globalAlpha = 1; g.fillStyle = o.fill; g.fill();
      g.beginPath(); g.moveTo(Fa[0], Fa[1]); for (let c = 1; c <= nx; c++) g.lineTo(Fa[c * 2], Fa[c * 2 + 1]);
      if (o.cols) for (let c = 0; c <= nx; c += 2) { g.moveTo(Fa[c * 2], Fa[c * 2 + 1]); g.lineTo(Nb[c * 2], Nb[c * 2 + 1]); }
      g.globalAlpha = a; g.strokeStyle = o.line; g.stroke();
    } else {
      g.fillStyle = o.line; g.globalAlpha = a;
      for (let c = 0; c <= nx; c++) g.fillRect(Fa[c * 2] - 1.2, Fa[c * 2 + 1] - 1.2, 2.4, 2.4);
    }
  }
  g.globalAlpha = 1;
  return pts;
}

// ---------------------------------------------------------------- heart, ring, tunnel
function drawHeart(S, cx, cy, sc, o = {}) {
  const th = S.t * (o.spin ?? 0.9) + (o.rot || 0), c = Math.cos(th), s = Math.sin(th);
  const pulse = 1 + 0.13 * (o.pulse ?? S.kk), jit = (o.jit ?? S.snare) * 0.05, ex = o.explode || 0, al = o.alpha ?? 1;
  g.globalCompositeOperation = 'lighter';
  for (let pass = 0; pass < 2; pass++) {
    g.fillStyle = pass ? (o.edge || COL.pk) : (o.core || COL.mg); g.globalAlpha = al * (pass ? 0.95 : 0.55);
    for (let j = 0; j < HN; j++) {
      if (HE[j] !== pass) continue;
      let x = HX[j], y = HY[j], z = HZ[j];
      if (ex) { const e = ex * (0.4 + rnd(j, 19)); x += HVX[j] * e; y += HVY[j] * e + ex * ex * 0.5 * rnd(j, 20); z += HVZ[j] * e; }
      if (jit) { x += (rnd(j, S.i) - 0.5) * jit; y += (rnd(j, S.i + 7) - 0.5) * jit; }
      const X = x * c + z * s, Z = -x * s + z * c, k = 1 / (1 + Z * 0.35);
      const px = cx + X * sc * pulse * k, py = cy - y * sc * pulse * k, sz = HS[j] * k * (o.psize || 1);
      g.fillRect(px - sz / 2, py - sz / 2, sz, sz);
    }
  }
  // binary glyphs on the outline
  if (!o.noGlyph) {
    g.font = `15px ${MONO}`; g.fillStyle = '#ff9cc6'; g.globalAlpha = al * 0.75; g.textAlign = 'center';
    for (let q = 0; q < 70; q++) {
      const u = q / 70 * PI2, sn = Math.sin(u); let x = sn * sn * sn * 1.13, y = ((13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u)) / 16 + 0.16) * 1.13, z = 0;
      if (ex) { x += HVX[q] * ex * 1.3; y += HVY[q] * ex * 1.3 + ex * ex * 0.4; }
      const X = x * c + z * s, Z = -x * s + z * c, k = 1 / (1 + Z * 0.35);
      g.fillText(rnd(q, Math.floor(S.t * 8)) > 0.5 ? '1' : '0', cx + X * sc * pulse * k, cy - y * sc * pulse * k);
    }
    g.textAlign = 'left';
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}
function drawRing(S, cx, cy, R, o = {}) {
  const n = o.n || 120, len = o.len || 150;
  g.beginPath();
  for (let k = 0; k < n; k++) {
    const a = k / n * PI2 - Math.PI / 2 + (o.rot || 0), m = k <= n / 2 ? k / (n / 2) : (n - k) / (n / 2);
    const v = specAt(S, m * 0.95), L = 6 + v * v * len * (0.55 + 0.45 * S.kk);
    g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineTo(cx + Math.cos(a) * (R + L), cy + Math.sin(a) * (R + L));
  }
  g.lineWidth = o.lw || 4; g.strokeStyle = o.col || COL.cy; g.globalAlpha = o.alpha ?? 0.85; g.stroke();
  g.beginPath(); g.arc(cx, cy, R - 8, 0, PI2); g.lineWidth = 1.5; g.globalAlpha = (o.alpha ?? 0.85) * 0.6; g.stroke();
  g.globalAlpha = 1;
}
function drawTunnel(S, o = {}) {
  const rate = o.rate || 1, life = o.life || 6, step = 1 / rate, cx = o.cx ?? W / 2, cy = o.cy ?? H / 2;
  const kNow = Math.floor(S.b / step);
  for (let k = kNow - Math.ceil(life / step) - 1; k <= kNow; k++) {
    const age = S.b - k * step; if (age < 0 || age > life) continue;
    const z = lerp(4200, 70, Math.pow(age / life, o.pow || 1.8)), s = 700 / z;
    const hh = 520 * s, ww = hh * 1.78, rot = k * 0.13 * (o.twist ?? 1) + S.t * 0.15 * (o.twist ?? 1);
    const a = (o.alpha ?? 0.8) * clamp(age / 0.6) * clamp((z - 70) / 400);
    g.save(); g.translate(cx, cy); g.rotate(rot);
    g.strokeStyle = (o.cols || [COL.cy, COL.mg])[((k % 2) + 2) % 2]; g.globalAlpha = a; g.lineWidth = Math.max(1, 5 * s);
    g.strokeRect(-ww, -hh, ww * 2, hh * 2);
    if (o.corners) { g.fillStyle = COL.fg; const q = 8 * s + 2; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.fillRect(dx * ww - q / 2, dy * hh - q / 2, q, q); }
    g.restore();
  }
  g.globalAlpha = 1;
}
function drawStreaks(S, n, speed, al, col = COL.fg) {
  g.strokeStyle = col; g.lineWidth = 2; g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rnd(i, 41) * PI2, p = frac(S.t * speed * (0.6 + rnd(i, 42) * 0.8) + rnd(i, 43)), r = 60 + p * p * 1400, L = 20 + p * p * 260;
    g.moveTo(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r); g.lineTo(W / 2 + Math.cos(a) * (r + L), H / 2 + Math.sin(a) * (r + L));
  }
  g.globalAlpha = al; g.stroke(); g.globalAlpha = 1;
}
const KW = ['execute()', 'while (true)', 'render()', 'new World()', 'sync()', 'yield', 'return', '&me'];
function drawKeyword(S, base, al = 0.2, col = COL.cy) {
  const lb = S.b - base; if (lb < 0) return; const bar = Math.floor(lb / 4), age = lb - bar * 4;
  const w = KW[(bar + Math.floor(base / 4)) % KW.length];
  g.save(); g.translate(W / 2, H / 2 + 80); const s = 1 + age * 0.04; g.scale(s, s);
  g.font = `bold 230px ${MONO}`; g.textAlign = 'center'; g.lineWidth = 2; g.strokeStyle = col; g.globalAlpha = al * Math.exp(-age * 0.7);
  g.strokeText(w, 0, 0); g.restore(); g.globalAlpha = 1; g.textAlign = 'left';
}

// ---------------------------------------------------------------- entities (two processes)
function orbPos(t, R) { const ph = t * 0.85; return [[Math.cos(ph) * R, Math.sin(ph * 0.5) * 70, Math.sin(ph) * R * 0.45], [-Math.cos(ph) * R, -Math.sin(ph * 0.5) * 70, -Math.sin(ph) * R * 0.45]]; }
const pr2 = (cx, cy, p) => { const k = 900 / (900 + p[2]); return [cx + p[0] * k, cy - p[1] * k, k]; };
function drawOrb(S, x, y, k, rad, col, seed, t, al = 1) {
  g.globalCompositeOperation = 'lighter';
  const R = rad * k * (1 + 0.18 * S.kick);
  const gr = g.createRadialGradient(x, y, 0, x, y, R * 2.4); gr.addColorStop(0, rgba(col, 0.5 * al)); gr.addColorStop(0.35, rgba(col, 0.12 * al)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.fillRect(x - R * 2.4, y - R * 2.4, R * 4.8, R * 4.8);
  const m = rmat(t * 0.5 + seed, t * 0.7 + seed * 2, 0.3); g.fillStyle = col;
  for (let i = 0; i < FN; i++) {
    const q = ap(m, FBX[i], FBY[i], FBZ[i]); const d = 1 + 0.2 * Math.sin(i * 1.7 + t * 5 + seed) * S.mid + 0.3 * S.hit * rnd(i, S.i);
    const kk = 1 / (1 + q[2] * 0.3); const sz = 2.6 * kk;
    g.globalAlpha = al * (0.3 + 0.7 * (1 - (q[2] + 1) / 2));
    g.fillRect(x + q[0] * R * d * kk - sz / 2, y - q[1] * R * d * kk - sz / 2, sz, sz);
  }
  g.fillStyle = '#ffffff'; g.globalAlpha = al * 0.9; g.beginPath(); g.arc(x, y, 5 * k, 0, PI2); g.fill();
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}
function drawEntities(S, o) {
  const t = o.tf ?? S.t, cx = o.cx ?? W / 2, cy = o.cy ?? H / 2, R = o.R, al = o.alpha ?? 1;
  const [pa, pb] = orbPos(t, R);
  // trails
  g.globalCompositeOperation = 'lighter';
  for (let k = 1; k <= 22; k++) {
    const [qa, qb] = orbPos(t - k * 0.045, R), f = 1 - k / 22;
    for (const [q, col] of [[qa, COL.cy], [qb, COL.mg]]) { const s = pr2(cx, cy, q); g.fillStyle = col; g.globalAlpha = al * f * 0.35; const z = 7 * f * s[2]; g.fillRect(s[0] - z / 2, s[1] - z / 2, z, z); }
  }
  g.globalCompositeOperation = 'source-over';
  const sa = pr2(cx, cy, pa), sb = pr2(cx, cy, pb);
  // thread
  const mx = (sa[0] + sb[0]) / 2, my = (sa[1] + sb[1]) / 2, dx = sb[0] - sa[0], dy = sb[1] - sa[1], dl = Math.hypot(dx, dy) + 1e-6;
  const bend = Math.sin(t * 1.3) * 110 * (o.bend ?? 1), qx = mx - dy / dl * bend, qy = my + dx / dl * bend;
  if (o.thread !== false) {
    const broken = S.hit > 0.7 && rnd(S.i >> 1, 5) < 0.6;
    g.beginPath(); g.moveTo(sa[0], sa[1]); g.quadraticCurveTo(qx, qy, sb[0], sb[1]);
    g.strokeStyle = COL.fg; g.lineWidth = 1.5 + (o.thick || 0); g.globalAlpha = al * (broken ? 0.1 : 0.22 + 0.4 * S.mid);
    if (broken) g.setLineDash([6, 18]); g.stroke(); g.setLineDash([]);
    // packets from onsets
    const i0 = lastIdx(A.hits, S.t);
    g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 10 && i0 - k >= 0; k++) {
      const e = A.hits[i0 - k], p = (S.t - e) / 0.9; if (p > 1) break;
      const dir = rnd(i0 - k, 9) < 0.5, u = dir ? p : 1 - p, iu = 1 - u;
      const x = iu * iu * sa[0] + 2 * iu * u * qx + u * u * sb[0], y = iu * iu * sa[1] + 2 * iu * u * qy + u * u * sb[1];
      const col = dir ? COL.cy : COL.mg; g.fillStyle = col; g.globalAlpha = al * 0.3; g.fillRect(x - 9, y - 9, 18, 18); g.globalAlpha = al; g.fillRect(x - 3.5, y - 3.5, 7, 7);
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }
  const order = pa[2] > pb[2] ? [[sa, COL.cy, 1], [sb, COL.mg, 2]] : [[sb, COL.mg, 2], [sa, COL.cy, 1]];
  for (const [s, col, sd] of order) drawOrb(S, s[0], s[1], s[2], o.rad || 80, col, sd, t, al);
  if (o.labels) {
    for (const [s, name, col, sd] of [[sa, 'proc 0x01', COL.cy, 1], [sb, 'proc 0x02', COL.mg, 2]]) {
      const lx = s[0] + 110 * s[2], ly = s[1] - 90 * s[2];
      g.strokeStyle = col; g.globalAlpha = 0.5 * al; g.lineWidth = 1; g.beginPath(); g.moveTo(s[0] + 30 * s[2], s[1] - 25 * s[2]); g.lineTo(lx - 6, ly + 6); g.lineTo(lx + 150, ly + 6); g.stroke();
      text(name, lx, ly, 18, col, 0.9 * al);
      text(`cpu ${(38 + 50 * S.rms + 6 * rnd(sd, S.i >> 2)).toFixed(1)}%  lat ${(2 + 9 * rnd(sd + 4, S.i >> 3)).toFixed(1)}ms`, lx, ly + 28, 14, COL.dim, 0.9 * al);
    }
  }
  return [sa, sb];
}
function drawHex(S, al, hot = 0) {
  g.font = `19px ${MONO}`; const lh = 29, rows = Math.ceil(H / lh) + 1, scroll = S.b * 1.0, r0 = Math.floor(scroll), off = (scroll - r0) * lh;
  const hotRow = Math.floor(rnd(S.bi, 51) * rows);
  for (let r = 0; r < rows; r++) {
    const row = r0 + r, y = r * lh - off + 22;
    let s = '0x' + (0x7ffe0000 + row * 16).toString(16).toUpperCase() + '  ';
    let asc = '';
    for (let c = 0; c < 16; c++) { const flip = hot > 0.3 && rnd(row * 16 + c, S.i >> 1) < hot * 0.3; const v = Math.floor(rnd(row * 16 + c, flip ? S.i : 77) * 256); s += v.toString(16).padStart(2, '0') + (c === 7 ? '  ' : ' '); asc += v > 32 && v < 127 ? String.fromCharCode(v) : '.'; }
    g.fillStyle = r === hotRow ? COL.cy : COL.dim; g.globalAlpha = al * (r === hotRow ? 2.5 : 1);
    g.fillText(s + ' ' + asc, 60, y);
  }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- HUD
function memPct(t) { if (t < tb(416)) return 8 + 91 * Math.pow(clamp(t / tb(416)), 1.4); return 99 * (1 - smooth((t - tb(416)) / 4)); }
function drawHUD(S, al) {
  if (al <= 0) return;
  const m = 44; g.strokeStyle = COL.fg; g.lineWidth = 2; g.globalAlpha = al * 0.6; g.beginPath();
  for (const [x, y, sx_, sy_] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) { g.moveTo(x, y + sy_ * 28); g.lineTo(x, y); g.lineTo(x + sx_ * 28, y); }
  g.stroke(); g.globalAlpha = 1;
  text('world.execute(me);', m + 16, m + 34, 18, COL.fg, al * 0.85);
  text(`pid 0x0001  thr 2  ${S.t < tb(160) ? 'RUNNING' : S.t < tb(416) ? 'RUNNING*' : 'HALTED'}`, m + 16, m + 58, 14, COL.dim, al);
  const mm = Math.floor(S.t / 60), ss = S.t - mm * 60;
  text(`T+ ${String(mm).padStart(2, '0')}:${ss.toFixed(2).padStart(5, '0')}`, W - m - 16, m + 34, 18, COL.fg, al * 0.85, 'right');
  text(`BAR ${String(Math.max(0, Math.floor(S.b / 4) + 1)).padStart(3, '0')} · ${Math.max(0, S.bi) % 4 + 1}/4  ${A.bpm} BPM`, W - m - 16, m + 58, 14, COL.dim, al, 'right');
  // mini spectrum
  g.fillStyle = COL.cy; g.globalAlpha = al * 0.8;
  for (let k = 0; k < 16; k++) { const v = S.spec[k], h = 4 + v * v * 44; g.fillRect(m + 16 + k * 9, H - m - 18 - h, 6, h); }
  g.globalAlpha = 1;
  const mp = memPct(S.t); const cells = 20, on = Math.round(mp / 100 * cells);
  const bar = '|'.repeat(on) + '.'.repeat(cells - on);
  text(`MEM [${bar}] ${mp.toFixed(0).padStart(2, ' ')}%`, W - m - 16, H - m - 22, 16, mp > 85 ? COL.am : COL.fg, al * 0.85, 'right');
}

// ---------------------------------------------------------------- post
function snapshot(c2) { c2.globalCompositeOperation = 'copy'; c2.globalAlpha = 1; c2.drawImage(g.canvas, 0, 0); c2.globalCompositeOperation = 'source-over'; }
function bloom(str) {
  if (str <= 0.01) return;
  bl1.globalCompositeOperation = 'copy'; bl1.filter = 'brightness(0.95) contrast(1.9) blur(3px)'; bl1.drawImage(cv, 0, 0, 480, 270); bl1.filter = 'none';
  bl2.globalCompositeOperation = 'copy'; bl2.filter = 'blur(4px)'; bl2.drawImage(BL1, 0, 0, 240, 135); bl2.filter = 'none';
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = str * 0.7; ctx.drawImage(BL1, 0, 0, W, H); ctx.globalAlpha = str * 0.9; ctx.drawImage(BL2, 0, 0, W, H);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function glitch(amount, seed) {
  if (amount < 0.03) return;
  snapshot(tx);
  const n = Math.floor(3 + amount * 16);
  for (let k = 0; k < n; k++) {
    const y = Math.floor(rnd(seed, k * 3) * H), h = Math.floor(4 + rnd(seed, k * 3 + 1) * 110 * amount), dx = (rnd(seed, k * 3 + 2) - 0.5) * 320 * amount;
    ctx.drawImage(TMP, 0, y, W, h, dx, y, W, h);
  }
  if (amount > 0.4) { // a couple of solid blocks
    for (let k = 0; k < 3; k++) { if (rnd(seed, 90 + k) > amount * 0.6) continue; ctx.fillStyle = [COL.cy, COL.mg, COL.fg][k]; ctx.globalAlpha = 0.5 + 0.5 * rnd(seed, 95 + k);
      ctx.fillRect(rnd(seed, 100 + k) * W, rnd(seed, 110 + k) * H, 40 + rnd(seed, 120 + k) * 300, 4 + rnd(seed, 130 + k) * 30); }
    ctx.globalAlpha = 1;
  }
}
function rgbSplit(px) {
  if (px < 0.7) return;
  snapshot(tx); tx.globalCompositeOperation = 'multiply'; tx.fillStyle = '#ff0000'; tx.fillRect(0, 0, W, H); tx.globalCompositeOperation = 'source-over';
  snapshot(tx2); tx2.globalCompositeOperation = 'multiply'; tx2.fillStyle = '#00ffff'; tx2.fillRect(0, 0, W, H); tx2.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(TMP, -px, 0); ctx.drawImage(TMP2, px, 0); ctx.globalCompositeOperation = 'source-over';
}
function shake(px, seed) {
  if (px < 0.5) return;
  snapshot(tx); const dx = (rnd(seed, 1) - 0.5) * 2 * px, dy = (rnd(seed, 2) - 0.5) * 2 * px, s = 1 + px / 600;
  ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(TMP, W / 2 - W * s / 2 + dx, H / 2 - H * s / 2 + dy, W * s, H * s);
}
const VIG = mk(W, H); (() => { const v = VIG.getContext('2d'); const gr = v.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.62)'); v.fillStyle = gr; v.fillRect(0, 0, W, H); })();
const SCAN = mk(W, H); (() => { const v = SCAN.getContext('2d'); v.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = 0; y < H; y += 4) v.fillRect(0, y, W, 2); })();
const FLASHES = [[32, 0.9], [64, 0.35], [128, 0.95], [160, 0.6], [224, 0.9], [256, 0.4], [288, 0.5], [320, 0.4], [352, 1.0], [384, 0.8], [416, 0.55]];
function flashAmt(S) { let f = 0; for (const [b, s] of FLASHES) { const d = S.t - tb(b); if (d >= 0 && d < 1.2) f = Math.max(f, s * Math.exp(-d / 0.22)); } return f; }
