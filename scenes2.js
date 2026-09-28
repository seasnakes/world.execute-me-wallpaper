'use strict';
// v2: every sung line drives its own visual beat-for-beat. EV[key] = beat index where that line starts.
const EV = window.EV;
const eb = k => EV[k];
let P;
const CX = W / 2, CY = H / 2;
const XC = { egg: '#b36bff', tom: '#ff4a3d', leaf: '#5dff8a', cat: '#ffb347', gold: '#ffd36b', paper: '#0d1220' };

// ------------------------------------------------------------ helpers
const win = (S, b0, b1, fi = 0.2, fo = 0.3) => smooth((S.b - b0) / fi) * (1 - smooth((S.b - b1 + fo) / fo));
const ewin = (S, k0, k1, fi, fo) => win(S, EV[k0], EV[k1], fi, fo);
const pulse = (S, b, dec = 0.35) => { const d = S.b - b; return d < 0 ? 0 : Math.exp(-d / dec); };
const prog = (S, b0, dur) => clamp((S.b - b0) / dur);
function drawPts(pts, p = 1, close = false) {
  const n = pts.length; if (n < 2) return; const m = clamp(p) * (n - 1); const mi = Math.floor(m);
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= mi; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (mi < n - 1) { const f = m - mi, a = pts[mi], b = pts[mi + 1]; g.lineTo(lerp(a[0], b[0], f), lerp(a[1], b[1], f)); }
  else if (close) g.closePath();
}
function sPts(pts, col, lw, al, p = 1, close = false) { if (al <= 0.003) return; drawPts(pts, p, close); g.strokeStyle = col; g.lineWidth = lw; g.globalAlpha = al; g.stroke(); g.globalAlpha = 1; }
function fPts(pts, col, al) { if (al <= 0.003) return; drawPts(pts, 1, true); g.fillStyle = col; g.globalAlpha = al; g.fill(); g.globalAlpha = 1; }
function xf(pts, cx, cy, s, rot = 0, sx = 1, sy = 1) { const c = Math.cos(rot), sn = Math.sin(rot); return pts.map(([x, y]) => { x *= sx; y *= sy; return [cx + (x * c - y * sn) * s, cy + (x * sn + y * c) * s]; }); }
function bez(p0, p1, p2, p3, n = 20) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return o; }
function circPts(r = 1, n = 64, a0 = 0, a1 = PI2, cx = 0, cy = 0, ry) { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * (ry ?? r)]); } return o; }
function heartPts(n = 160) { const o = []; for (let i = 0; i <= n; i++) { const u = i / n * PI2, s = Math.sin(u); o.push([s * s * s, -((13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u)) / 16 + 0.16)]); } return o; }
const HEART = heartPts();
// algebraic heart (x²+y²−1)³ − x²y³ = 0, solved along rays
const AHEART = (() => { const o = []; for (let i = 0; i <= 360; i++) { const th = i / 360 * PI2, c = Math.cos(th), s = Math.sin(th); let lo = 0.0, hi = 1.6;
  const fn = r => Math.pow(r * r - 1, 3) - Math.pow(r * c, 2) * Math.pow(r * s, 3);
  // find outermost root: scan from outside in
  let r0 = hi, found = 0; for (let r = 1.6; r > 0.05; r -= 0.004) { if (fn(r) <= 0) { r0 = r; found = 1; break; } } lo = r0; hi = r0 + 0.004;
  for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (fn(m) <= 0) lo = m; else hi = m; }
  o.push([lo * c, -lo * s]); } return o; })();
function heartFill(cx, cy, s, col, al) { fPts(xf(HEART, cx, cy, s), col, al); }
function dotGrid(S, al, cx = CX, cy = CY) {
  g.fillStyle = COL.cy;
  for (let y = 30; y < H; y += 48) for (let x = 30; x < W; x += 48) { const d = Math.hypot(x - cx, y - cy) / 1100; const a = al * Math.max(0, 1 - d); if (a < 0.012) continue; g.globalAlpha = a; g.fillRect(x - 1, y - 1, 2.5, 2.5); }
  g.globalAlpha = 1;
}
function graphPaper(al, ox = CX, oy = CY, u = 90, axes = true, col = COL.cy) {
  if (al <= 0.01) return;
  g.lineWidth = 1; g.strokeStyle = col;
  const m = (v, s) => ((v % s) + s) % s;
  g.beginPath(); for (let x = m(ox, u / 2); x < W; x += u / 2) { g.moveTo(x, 0); g.lineTo(x, H); } for (let y = m(oy, u / 2); y < H; y += u / 2) { g.moveTo(0, y); g.lineTo(W, y); }
  g.globalAlpha = al * 0.05; g.stroke();
  g.beginPath(); for (let x = m(ox, u); x < W; x += u) { g.moveTo(x, 0); g.lineTo(x, H); } for (let y = m(oy, u); y < H; y += u) { g.moveTo(0, y); g.lineTo(W, y); }
  g.globalAlpha = al * 0.11; g.stroke();
  if (axes) { g.beginPath(); g.moveTo(0, oy); g.lineTo(W, oy); g.moveTo(ox, 0); g.lineTo(ox, H); g.strokeStyle = COL.fg; g.globalAlpha = al * 0.3; g.lineWidth = 1.5; g.stroke(); }
  g.globalAlpha = 1;
}
function ringPulse(x, y, r0, r1, p, col, al, lw = 3) { if (p <= 0 || p >= 1) return; g.strokeStyle = col; g.lineWidth = lw * (1 - p) + 0.5; g.globalAlpha = al * (1 - p); g.beginPath(); g.arc(x, y, lerp(r0, r1, easeOut(p)), 0, PI2); g.stroke(); g.globalAlpha = 1; }
function beatRings(S, beats, x, y, col, r1 = 520) { for (const b of beats) { const p = (S.b - b) / 1.1; ringPulse(x, y, 30, r1, p, col, 0.9, 5); } }
const orb = (S, x, y, r, col, seed, al = 1) => { if (al > 0.01) drawOrb(S, x, y, 1, r, col, seed, S.t, al); };
function drawPower(cx, cy, r, p, col, lw, al) {
  g.lineCap = 'round'; g.strokeStyle = col; g.lineWidth = lw; g.globalAlpha = al;
  const a0 = -Math.PI / 2 + 0.62, a1 = a0 + (PI2 - 1.24) * clamp(p * 1.3);
  g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke();
  const q = clamp(p * 1.3 - 0.3); if (q > 0) { g.beginPath(); g.moveTo(cx, cy - r * 1.18); g.lineTo(cx, cy - r * 1.18 + r * 1.05 * q); g.stroke(); }
  g.lineCap = 'butt'; g.globalAlpha = 1;
}
function hexagon(x, y, r, rot, col, al, fill) {
  g.beginPath(); for (let k = 0; k <= 6; k++) { const a = rot + k * Math.PI / 3; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; k ? g.lineTo(px, py) : g.moveTo(px, py); }
  if (fill) { g.fillStyle = fill; g.globalAlpha = al * 0.25; g.fill(); }
  g.strokeStyle = col; g.lineWidth = 2; g.globalAlpha = al; g.stroke(); g.globalAlpha = 1;
}
function drawLock(cx, cy, s, closed, col, al) {
  if (al <= 0) return; g.globalAlpha = al; g.strokeStyle = col; g.lineWidth = Math.max(2, s * 0.14);
  g.strokeRect(cx - s * 0.6, cy - s * 0.1, s * 1.2, s * 0.95);
  const lift = (1 - closed) * s * 0.35; g.beginPath(); g.arc(cx, cy - s * 0.1 - lift, s * 0.4, Math.PI, 0); g.lineTo(cx + s * 0.4, cy - s * 0.1 - lift + (closed > 0.9 ? 0 : s * 0.05)); g.stroke();
  g.fillStyle = col; g.fillRect(cx - s * 0.07, cy + s * 0.2, s * 0.14, s * 0.3); g.globalAlpha = 1;
}
function drawToggle(cx, cy, w, h, st, colOn, al) {
  if (al <= 0) return; const r = h / 2;
  g.globalAlpha = al; g.beginPath(); g.moveTo(cx - w / 2 + r, cy - r); g.lineTo(cx + w / 2 - r, cy - r); g.arc(cx + w / 2 - r, cy, r, -Math.PI / 2, Math.PI / 2); g.lineTo(cx - w / 2 + r, cy + r); g.arc(cx - w / 2 + r, cy, r, Math.PI / 2, Math.PI * 1.5);
  g.fillStyle = rgba(colOn, 0.12 + 0.35 * st); g.fill(); g.strokeStyle = colOn; g.lineWidth = 3; g.stroke();
  const kx = lerp(cx - w / 2 + r, cx + w / 2 - r, st); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(kx, cy, r * 0.78, 0, PI2); g.fill(); g.globalAlpha = 1;
}
function drawEye(cx, cy, w, open, col, al, look = 0, pupil = 1) {
  if (al <= 0) return; const h = w * 0.3 * open;
  g.save(); g.globalAlpha = al;
  g.beginPath(); g.moveTo(cx - w / 2, cy); g.quadraticCurveTo(cx, cy - h * 2, cx + w / 2, cy); g.quadraticCurveTo(cx, cy + h * 2, cx - w / 2, cy); g.closePath();
  g.fillStyle = '#04050a'; g.fill(); g.strokeStyle = COL.fg; g.lineWidth = 4; g.stroke();
  g.clip();
  const ir = w * 0.17, ix = cx + look * w * 0.12;
  const gr = g.createRadialGradient(ix, cy, ir * 0.2, ix, cy, ir); gr.addColorStop(0, rgba(col, 0.9)); gr.addColorStop(1, rgba(col, 0.25)); g.fillStyle = gr; g.beginPath(); g.arc(ix, cy, ir, 0, PI2); g.fill();
  g.strokeStyle = col; g.lineWidth = 3; g.stroke();
  g.beginPath(); for (let k = 0; k < 24; k++) { const a = k / 24 * PI2; g.moveTo(ix + Math.cos(a) * ir * 0.45, cy + Math.sin(a) * ir * 0.45); g.lineTo(ix + Math.cos(a) * ir * 0.9, cy + Math.sin(a) * ir * 0.9); } g.lineWidth = 1.2; g.globalAlpha = al * 0.6; g.stroke(); g.globalAlpha = al;
  g.fillStyle = '#000'; g.beginPath(); g.arc(ix, cy, ir * 0.38 * pupil, 0, PI2); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(ix - ir * 0.3, cy - ir * 0.3, ir * 0.12, 0, PI2); g.fill();
  g.restore(); g.globalAlpha = 1;
}
function drawCage(cx, cy, s, ry, al, col = COL.fg, sq = 1) {
  if (al <= 0) return; const m = rmat(0.28, ry, 0);
  const pr = (x, y, z) => { const q = ap(m, x * s, y * s * sq, z * s); const k = 1400 / (1400 + q[2]); return [cx + q[0] * k, cy - q[1] * k]; };
  g.beginPath();
  for (const y of [-1, 1]) { const c = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]; c.forEach(([x, z], i) => { const p = pr(x, y, z); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); }
  const bars = 5;
  for (let i = 0; i <= bars; i++) { const u = -1 + 2 * i / bars; for (const [x, z] of [[u, -1], [u, 1], [-1, u], [1, u]]) { const a = pr(x, -1, z), b = pr(x, 1, z); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } }
  g.strokeStyle = col; g.lineWidth = 2.2; g.globalAlpha = al; g.stroke(); g.globalAlpha = 1;
}
function winFrame(x, y, w, h, title, al, col = COL.cy, fill = '#0a0f18') {
  if (al <= 0) return; g.globalAlpha = al * 0.94; g.fillStyle = fill; g.fillRect(x, y, w, h); g.globalAlpha = al; g.fillStyle = '#122033'; g.fillRect(x, y, w, 26);
  g.strokeStyle = col; g.lineWidth = 1.5; g.strokeRect(x, y, w, h); if (title) text(title, x + 10, y + 18, 13, COL.fg, al * 0.9);
  for (let q = 0; q < 3; q++) { g.fillStyle = q === 2 ? COL.mg : COL.dim; g.globalAlpha = al; g.fillRect(x + w - 20 - q * 16, y + 8, 10, 10); } g.globalAlpha = 1;
}
function burst(S, x, y, b0, n, col, spread = 260, dur = 1.4, size = 4, seed = 0) {
  const p = (S.b - b0) / dur; if (p < 0 || p > 1) return;
  g.fillStyle = col; g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { const a = rnd(i, seed + 3) * PI2, v = (0.3 + rnd(i, seed + 4)) * spread; const d = easeOut(p) * v; g.globalAlpha = (1 - p) * 0.9; const s = size * (1 - p * 0.6); g.fillRect(x + Math.cos(a) * d - s / 2, y + Math.sin(a) * d - s / 2 + p * p * 60, s, s); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}
function bigText(str, x, y, size, col, al, weight = 'bold', align = 'center') { text(str, x, y, size, col, al, align, weight); }
function codeRain(S, al, speed = 1, col = COL.fg) {
  g.font = `16px ${MONO}`;
  for (let c = 0; c < 22; c++) { const x = 60 + c * 86; const off = (S.t * 900 * speed * (0.6 + rnd(c, 7) * 0.8) + rnd(c, 8) * 2000) % (H + 800); for (let r = 0; r < 18; r++) { const y = H + 200 - off + r * 26; if (y < -30 || y > H + 30) continue; g.fillStyle = r === 0 ? '#fff' : col; g.globalAlpha = al * (r === 0 ? 1 : 0.25 + 0.4 * rnd(c * 31 + r, 2)); g.fillText(CODE2[(c * 7 + r) % CODE2.length].slice(0, 9), x, y); } }
  g.globalAlpha = 1;
}
const CODE2 = ['run()', 'exec;', 'fork()', 'jmp 0x0', 'mov r1', 'push', 'call', 'ret', '0x7ffe', 'sync()', 'tick()', 'yield', 'new W()', 'emit()', 'while(1)', '&me', '*you', 'free()'];

// ------------------------------------------------------------ line-art assets (unit ≈ 1)
const EGG = (() => {
  const R = [], L = [];
  for (let i = 0; i <= 44; i++) { const u = -1 + 2 * i / 44; const w = 0.44 * Math.sqrt(Math.max(0, 1 - u * u)) * (1.08 - 0.42 * (u + 1) / 2) + 0.03; const bend = 0.26 * u * u; R.push([bend + w, -u]); L.push([bend - w, -u]); }
  const body = R.concat(L.reverse()); const tx_ = 0.26 * 0.9, ty = -0.92;
  const calyx = []; const ends = [[-0.42, 0.3], [-0.22, 0.42], [0.02, 0.46], [0.24, 0.42], [0.44, 0.28]];
  for (const [dx, dy] of ends) calyx.push(bez([tx_, ty], [tx_ + dx * 0.4, ty - 0.02], [tx_ + dx * 0.8, ty + dy * 0.4], [tx_ + dx, ty + dy], 12));
  const stem = bez([tx_, ty], [tx_ - 0.02, ty - 0.18], [tx_ + 0.06, ty - 0.3], [tx_ + 0.18, ty - 0.36], 10);
  const shine = bez([-0.2, 0.62], [-0.32, 0.35], [-0.28, 0.02], [-0.14, -0.26], 14);
  return { body, calyx, stem, shine };
})();
const TOM = (() => { const body = []; for (let i = 0; i <= 90; i++) { const a = i / 90 * PI2; const r = 1 + 0.04 * Math.cos(6 * a); body.push([Math.cos(a) * r, Math.sin(a) * r * 0.86 + 0.05]); }
  const creases = [bez([-0.36, -0.66], [-0.58, -0.2], [-0.56, 0.32], [-0.3, 0.78], 14), bez([0.36, -0.66], [0.58, -0.2], [0.56, 0.32], [0.3, 0.78], 14)];
  const cal = []; for (let k = 0; k < 6; k++) { const a = k / 6 * PI2 + 0.3; cal.push(bez([0, -0.74], [Math.cos(a) * 0.2, -0.74 + Math.sin(a) * 0.07], [Math.cos(a) * 0.36, -0.7 + Math.sin(a) * 0.12], [Math.cos(a) * 0.5, -0.66 + Math.sin(a) * 0.16], 10)); }
  const stem = bez([0, -0.74], [0.02, -0.92], [0.08, -1.02], [0.18, -1.06], 8);
  const shine = bez([-0.62, -0.1], [-0.6, -0.36], [-0.44, -0.52], [-0.28, -0.56], 10);
  return { body, creases, cal, stem, shine }; })();
const CAT = (() => {
  const head = [...bez([-0.44, -0.5], [-0.47, -0.72], [-0.42, -0.84], [-0.36, -0.9], 6), [-0.44, -1.24], [-0.15, -0.99], ...bez([-0.15, -0.99], [-0.05, -1.01], [0.05, -1.01], [0.15, -0.99], 6), [0.44, -1.24], [0.36, -0.9],
    ...bez([0.36, -0.9], [0.42, -0.84], [0.47, -0.72], [0.44, -0.5], 6), ...bez([0.44, -0.5], [0.4, -0.24], [0.16, -0.17], [0, -0.17], 8), ...bez([0, -0.17], [-0.16, -0.17], [-0.4, -0.24], [-0.44, -0.5], 8)];
  const body = [...bez([-0.26, -0.24], [-0.62, 0.08], [-0.72, 0.6], [-0.56, 0.96], 12), ...bez([-0.56, 0.96], [-0.3, 1.03], [0.3, 1.03], [0.56, 0.96], 12), ...bez([0.56, 0.96], [0.72, 0.6], [0.62, 0.08], [0.26, -0.24], 12)];
  const tail = bez([0.5, 0.92], [1.15, 0.95], [1.2, 0.3], [0.86, 0.08], 18);
  const paws = [bez([-0.32, 1.0], [-0.3, 0.74], [-0.18, 0.72], [-0.12, 1.0], 8), bez([0.12, 1.0], [0.18, 0.72], [0.3, 0.74], [0.32, 1.0], 8)];
  const stripes = [[[-0.15, -0.68], [-0.1, -0.84], [0, -0.72], [0.1, -0.84], [0.15, -0.68]],
    bez([-0.44, -0.56], [-0.34, -0.56], [-0.3, -0.5], [-0.28, -0.46], 5), bez([0.44, -0.56], [0.34, -0.56], [0.3, -0.5], [0.28, -0.46], 5),
    bez([-0.62, 0.3], [-0.47, 0.28], [-0.4, 0.35], [-0.37, 0.43], 6), bez([-0.68, 0.56], [-0.52, 0.53], [-0.44, 0.6], [-0.42, 0.69], 6),
    bez([0.62, 0.3], [0.47, 0.28], [0.4, 0.35], [0.37, 0.43], 6), bez([0.68, 0.56], [0.52, 0.53], [0.44, 0.6], [0.42, 0.69], 6),
    bez([1.0, 0.72], [1.05, 0.68], [1.1, 0.7], [1.13, 0.77], 4), bez([1.12, 0.42], [1.07, 0.38], [1.02, 0.4], [0.99, 0.47], 4)];
  const whisk = [[[-0.2, -0.37], [-0.66, -0.44]], [[-0.2, -0.33], [-0.64, -0.28]], [[0.2, -0.37], [0.66, -0.44]], [[0.2, -0.33], [0.64, -0.28]]];
  const nose = [[-0.045, -0.41], [0.045, -0.41], [0, -0.36], [-0.045, -0.41]];
  const mouth = [...bez([-0.1, -0.31], [-0.06, -0.28], [-0.01, -0.3], [0, -0.35], 5), ...bez([0, -0.35], [0.01, -0.3], [0.06, -0.28], [0.1, -0.31], 5)];
  return { head, body, tail, paws, stripes, whisk, nose, mouth };
})();
function drawCat(S, cx, cy, s, p, al, blink = 1, jit = 0) {
  const J = pts => jit ? pts.map(([x, y], i) => [x + (rnd(i, S.i) - 0.5) * jit, y + (rnd(i + 99, S.i) - 0.5) * jit]) : pts;
  const col = XC.cat, sway = Math.sin(S.t * 2.2) * 0.12;
  const tail = CAT.tail.map(([x, y]) => [x + sway * (y - 0.9) * -0.5, y]);
  sPts(J(xf(tail, cx, cy, s)), col, 4, al, p * 1.4);
  fPts(xf(CAT.body, cx, cy, s), COL.bg, al); sPts(J(xf(CAT.body, cx, cy, s)), col, 4, al, p * 1.2);
  fPts(xf(CAT.head, cx, cy, s), COL.bg, al); sPts(J(xf(CAT.head, cx, cy, s)), col, 4, al, p * 1.1, true);
  const q = clamp(p * 1.6 - 0.6);
  for (const st of CAT.stripes) sPts(xf(st, cx, cy, s), col, 3, al * 0.8, q);
  for (const pw of CAT.paws) sPts(xf(pw, cx, cy, s), col, 3, al, q);
  for (const w_ of CAT.whisk) sPts(xf(w_, cx, cy, s), COL.fg, 1.5, al * 0.6, q);
  fPts(xf(CAT.nose, cx, cy, s), '#ff8fb0', al * q); sPts(xf(CAT.mouth, cx, cy, s), col, 2, al * q);
  for (const ex of [-0.18, 0.18]) { const ey = -0.56, ew = 0.12, eh = 0.075 * blink; if (q <= 0) break;
    g.globalAlpha = al * q; g.beginPath(); g.ellipse(cx + ex * s, cy + ey * s, ew * s, Math.max(0.5, eh * s), 0, 0, PI2); g.fillStyle = '#c9ff6b'; g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.ellipse(cx + ex * s, cy + ey * s, 0.02 * s, Math.max(0.3, eh * s * 0.9), 0, 0, PI2); g.fill(); g.globalAlpha = 1; }
}
function drawEgg(cx, cy, s, rot, p, al) {
  fPts(xf(EGG.body, cx, cy, s, rot), XC.egg, al * 0.12 * p);
  sPts(xf(EGG.body, cx, cy, s, rot), XC.egg, 4.5, al, p * 1.2, true);
  const q = clamp(p * 1.6 - 0.6);
  for (const c of EGG.calyx) sPts(xf(c, cx, cy, s, rot), XC.leaf, 3.5, al, q);
  sPts(xf(EGG.stem, cx, cy, s, rot), XC.leaf, 5, al, q); sPts(xf(EGG.shine, cx, cy, s, rot), '#fff', 3, al * 0.5, q);
}
function drawTom(cx, cy, s, rot, p, al) {
  fPts(xf(TOM.body, cx, cy, s, rot), XC.tom, al * 0.12 * p);
  sPts(xf(TOM.body, cx, cy, s, rot), XC.tom, 4.5, al, p * 1.2, true);
  const q = clamp(p * 1.6 - 0.6);
  for (const c of TOM.creases) sPts(xf(c, cx, cy, s, rot), XC.tom, 2, al * 0.5, q);
  for (const c of TOM.cal) sPts(xf(c, cx, cy, s, rot), XC.leaf, 3.5, al, q);
  sPts(xf(TOM.stem, cx, cy, s, rot), XC.leaf, 5, al, q); sPts(xf(TOM.shine, cx, cy, s, rot), '#fff', 3, al * 0.5, q);
}
function drawGenderSym(cx, cy, r, m, al) { // m: 0 = ♀, 1 = ♂
  const col = m < 0.5 ? COL.mg : COL.cy; const e = smooth(m);
  g.strokeStyle = col; g.lineWidth = 12; g.globalAlpha = al; g.lineCap = 'round';
  g.beginPath(); g.arc(cx, cy, r, 0, PI2); g.stroke();
  const ang = lerp(Math.PI / 2, -Math.PI / 4, e); const sx0 = cx + Math.cos(ang) * r, sy0 = cy + Math.sin(ang) * r, L = r * 1.1;
  const ex = sx0 + Math.cos(ang) * L, ey = sy0 + Math.sin(ang) * L;
  g.beginPath(); g.moveTo(sx0, sy0); g.lineTo(ex, ey); g.stroke();
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  if (e < 0.5) { const k = 1 - e * 2, mx = sx0 + Math.cos(ang) * L * 0.55; const my = sy0 + Math.sin(ang) * L * 0.55; g.globalAlpha = al * k; g.beginPath(); g.moveTo(mx - nx * r * 0.45, my - ny * r * 0.45); g.lineTo(mx + nx * r * 0.45, my + ny * r * 0.45); g.stroke(); }
  else { const k = e * 2 - 1; g.globalAlpha = al * k; const hl = r * 0.45; g.beginPath(); g.moveTo(ex - Math.cos(ang) * hl + nx * hl * 0.8, ey - Math.sin(ang) * hl + ny * hl * 0.8); g.lineTo(ex, ey); g.lineTo(ex - Math.cos(ang) * hl - nx * hl * 0.8, ey - Math.sin(ang) * hl - ny * hl * 0.8); g.stroke(); }
  g.lineCap = 'butt'; g.globalAlpha = 1;
}
function drawClock(cx, cy, R, hA, mA, al) {
  g.globalAlpha = al; g.strokeStyle = COL.fg; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, R, 0, PI2); g.stroke();
  g.beginPath(); for (let k = 0; k < 60; k++) { const a = k / 60 * PI2, r1 = R * (k % 5 ? 0.92 : 0.84); g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * R * 0.97, cy + Math.sin(a) * R * 0.97); } g.lineWidth = 2; g.stroke();
  g.lineCap = 'round'; g.lineWidth = 12; g.strokeStyle = COL.cy; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(hA - Math.PI / 2) * R * 0.5, cy + Math.sin(hA - Math.PI / 2) * R * 0.5); g.stroke();
  g.lineWidth = 6; g.strokeStyle = COL.mg; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(mA - Math.PI / 2) * R * 0.8, cy + Math.sin(mA - Math.PI / 2) * R * 0.8); g.stroke(); g.lineCap = 'butt';
  g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, 9, 0, PI2); g.fill(); g.globalAlpha = 1;
}
function drawPuzzleRing(cx, cy, R, n, present, colFn, al, drop = null, S = null) {
  const seg = PI2 / n;
  for (let k = 0; k < n; k++) {
    const pk = present(k); if (pk <= 0) continue;
    let ox = 0, oy = 0, rot = 0, a_ = al * pk;
    if (drop) { const d = drop(k); if (d > 0) { oy = d * d * 900; ox = (rnd(k, 5) - 0.5) * d * 200; rot = (rnd(k, 6) - 0.5) * d * 3; a_ *= 1 - clamp(d * 1.6 - 0.3); } }
    const a0 = -Math.PI / 2 + k * seg + 0.035, a1 = a0 + seg - 0.07, mid = (a0 + a1) / 2;
    const px = cx + Math.cos(mid) * R, py = cy + Math.sin(mid) * R;
    g.save(); g.translate(px + ox, py + oy); g.rotate(rot); g.translate(-px, -py);
    g.beginPath(); g.arc(cx, cy, R, a0, a1); g.strokeStyle = colFn(k); g.lineWidth = 22; g.globalAlpha = a_; g.stroke();
    g.restore();
  }
  g.globalAlpha = 1;
}

// ================================================================= SECTIONS
// 1. boot the world (0-32)
const PIECES = [[[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]]];
const PIECEPOS = [[0, 3], [4, 2], [7, 2], [9, 3]];
const PCOL = [COL.cy, COL.mg, COL.am, COL.fg];
const PARAMS = [['gravity', 0.62], ['mass', 0.41], ['light', 0.88], ['time', 0.5], ['seed', 0.73], ['entropy', 0.19]];
function secBoot(S) {
  bg(); const b = S.b, t = S.t;
  dotGrid(S, 0.04 + 0.22 * S.kick);
  // power + shield (0-7), shrinks away afterwards
  const mv = smooth((b - 6.6) / 0.6);
  const ps = lerp(1, 0.42, mv), pcx = lerp(CX, 250, mv), pcy = lerp(CY, 190, mv), pal = lerp(1, 0.45, mv) * (1 - smooth((b - 19.5) / 1));
  if (pal > 0.01) {
    const lineP = clamp((t - 0.02) / 0.3);
    g.strokeStyle = COL.cy; g.lineWidth = 2; g.globalAlpha = pal * 0.8; g.beginPath(); g.moveTo(0, pcy); g.lineTo(lerp(0, pcx - 115 * ps, lineP), pcy); g.stroke();
    g.setLineDash([16, 30]); g.lineDashOffset = -t * 360; g.lineWidth = 5; g.strokeStyle = '#fff'; g.globalAlpha = pal * 0.9 * lineP * (b < 1.2 ? 1 : 0.5);
    g.beginPath(); g.moveTo(0, pcy); g.lineTo(pcx - 115 * ps, pcy); g.stroke(); g.setLineDash([]);
    drawPower(pcx, pcy, 95 * ps, clamp((b + 0.66) / 1.5), b > 0.9 ? '#ffffff' : COL.cy, 11 * ps, pal);
    ringPulse(pcx, pcy, 95 * ps, 420 * ps, (b - 0.85) / 1.2, COL.cy, pal);
    for (let k = 0; k < 12; k++) { const bk = 2 + k * 0.4; if (b < bk) break; const a = k / 12 * PI2 - Math.PI / 2, r = 190 * ps; const e = easeBack((b - bk) / 0.3);
      hexagon(pcx + Math.cos(a) * r, pcy + Math.sin(a) * r, 44 * ps * e, a, COL.cy, pal * (0.55 + 0.45 * Math.exp(-(b - bk) * 2)), COL.cy); }
    if (b >= 5.6) drawLock(pcx, pcy + 290 * ps, 44 * ps, smooth((b - 6.3) / 0.25), COL.am, pal * smooth((b - 5.6) / 0.3));
  }
  // pieces fall onto a board (7-10) and compile into objects (10-14.5)
  const bAl = smooth((b - 6.8) / 0.4) * (1 - smooth((b - 19.4) / 1)) * lerp(1, 0.5, smooth((b - 14.3) / 0.6));
  const cell = 52, bx0 = lerp(CX - 312, 250, smooth((b - 14.3) / 0.8)), by0 = 760, bsc = lerp(1, 0.75, smooth((b - 14.3) / 0.8));
  if (bAl > 0.01) {
    g.save(); g.translate(bx0, by0); g.scale(bsc, bsc);
    g.strokeStyle = COL.dim; g.lineWidth = 1; g.globalAlpha = bAl * 0.5; g.beginPath();
    for (let i = 0; i <= 12; i++) { g.moveTo(i * cell, 0); g.lineTo(i * cell, 5 * cell); } for (let j = 0; j <= 5; j++) { g.moveTo(0, j * cell); g.lineTo(12 * cell, j * cell); } g.stroke();
    for (let k = 0; k < 4; k++) {
      const land = 7 + k * 0.75; if (b < land - 0.5) continue;
      const fall = clamp((b - (land - 0.5)) / 0.5), yoff = (1 - easeIn(fall)) * -700 + (fall >= 1 ? -Math.sin(clamp((b - land) / 0.25) * Math.PI) * 10 : 0);
      const [px, py] = PIECEPOS[k];
      for (const [cx_, cy_] of PIECES[k]) { const x = (px + cx_) * cell, y = (py + cy_ - 2) * cell + yoff; g.globalAlpha = bAl * 0.25; g.fillStyle = PCOL[k]; g.fillRect(x + 3, y + 3, cell - 6, cell - 6); g.globalAlpha = bAl; g.strokeStyle = PCOL[k]; g.lineWidth = 2.5; g.strokeRect(x + 3, y + 3, cell - 6, cell - 6); }
      if (fall >= 1) burst(S, (px + 1.5) * cell, (py) * cell, land, 18, PCOL[k], 90, 0.8, 3, k);
      // object creation
      const ob = 10 + k; if (b >= ob) { const e = easeBack((b - ob) / 0.45); const ox = (px + 1.5) * cell, oy = (py - 2) * cell - 150 - 20 * Math.sin(t * 2 + k);
        g.globalAlpha = bAl * 0.35; g.strokeStyle = PCOL[k]; g.setLineDash([3, 6]); g.beginPath(); g.moveTo(ox, (py - 2) * cell); g.lineTo(ox, oy); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
        drawWire2D(SH[VORDER[k]], ox, oy, rmat(t * 0.8 + k, t * 0.6 + k * 2, 0.2), 70 * e * (1 + 0.1 * S.kick), PCOL[k], bAl, 2.2);
        ringPulse(ox, oy, 20, 200, (b - ob) / 0.9, PCOL[k], bAl); }
    }
    g.restore();
  }
  // parameter panel (14.5-20)
  const pAl = smooth((b - 14.5) / 0.4) * (1 - smooth((b - 19.6) / 0.6));
  if (pAl > 0.01) {
    const x0 = 1040, y0 = 250, w_ = 700;
    winFrame(x0, y0, w_, 520, 'world.params', pAl);
    PARAMS.forEach(([name, v], k) => { const bk = 14.5 + k * 0.75; if (b < bk) return; const e = easeOut((b - bk) / 0.5), y = y0 + 90 + k * 72;
      text(name, x0 + 30, y, 22, COL.fg, pAl * 0.9); g.strokeStyle = COL.dim; g.globalAlpha = pAl; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + 220, y - 7); g.lineTo(x0 + 560, y - 7); g.stroke();
      g.strokeStyle = COL.cy; g.lineWidth = 5; g.beginPath(); g.moveTo(x0 + 220, y - 7); g.lineTo(x0 + 220 + 340 * v * e, y - 7); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x0 + 220 + 340 * v * e, y - 7, 10, 0, PI2); g.fill(); g.globalAlpha = 1;
      text((v * e).toFixed(2), x0 + 660, y, 22, COL.cy, pAl, 'right'); });
  }
  // initialization ring (20-22.5)
  const iAl = smooth((b - 19.8) / 0.3) * (1 - smooth((b - 22.3) / 0.4));
  if (iAl > 0.01) { const p = easeIn(clamp((b - 20) / 2.3)); g.lineWidth = 18; g.strokeStyle = COL.dim; g.globalAlpha = iAl * 0.3; g.beginPath(); g.arc(CX, CY, 200, 0, PI2); g.stroke();
    g.strokeStyle = COL.cy; g.globalAlpha = iAl; g.beginPath(); g.arc(CX, CY, 200, -Math.PI / 2, -Math.PI / 2 + PI2 * p); g.stroke(); g.globalAlpha = 1;
    bigText(`${Math.floor(p * 100)}%`, CX, CY + 30, 88, p >= 0.99 ? COL.cy : COL.fg, iAl); }
  // new world globe (22.5-32)
  const gAl = smooth((b - 22.4) / 0.3);
  if (gAl > 0.01) {
    const zoom = Math.pow(1 + easeIn((b - 29.5) / 2.5) * 9, 1.6), R = 250 * zoom * (1 + 0.04 * S.kick);
    const spin = t * 0.5 + (b > 28 ? easeIn((b - 28) / 4) * 8 : 0), m = rmat(0.4, spin, 0.15);
    const nL = clamp((b - 22.5) / 3) * 24;
    g.lineWidth = 2; g.strokeStyle = COL.cy;
    for (let L = 0; L < Math.ceil(nL); L++) { const part = clamp(nL - L); const pts = []; for (let s_ = 0; s_ <= 60 * part; s_++) { const u = s_ / 60 * PI2; let v;
        if (L < 11) { const th = (L + 1) / 12 * Math.PI; v = [Math.sin(th) * Math.cos(u), Math.cos(th), Math.sin(th) * Math.sin(u)]; } else { const ph = (L - 11) / 13 * Math.PI; v = [Math.cos(u) * Math.cos(ph), Math.sin(u), Math.cos(u) * Math.sin(ph)]; }
        const q = ap(m, v[0], v[1], v[2]); pts.push([CX + q[0] * R, CY - q[1] * R, q[2]]); }
      g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.globalAlpha = gAl * 0.75; g.stroke(); }
    g.globalAlpha = 1;
    // play button
    const pb = smooth((b - 26) / 0.3) * (1 - smooth((b - 28.6) / 0.5));
    if (pb > 0) { const press = b >= 28 ? 1 - 0.18 * Math.sin(clamp((b - 28) / 0.4) * Math.PI) : 1; const r = 110 * press;
      g.globalAlpha = pb * 0.85; g.fillStyle = COL.bg; g.beginPath(); g.arc(CX, CY, r, 0, PI2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 5; g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(CX - r * 0.3, CY - r * 0.45); g.lineTo(CX + r * 0.5, CY); g.lineTo(CX - r * 0.3, CY + r * 0.45); g.closePath(); g.fill(); g.globalAlpha = 1; }
    ringPulse(CX, CY, 110, 700, (b - 28) / 1.2, '#fff', 1, 6);
  }
  P.bloom = 0.7; P.scan = 0.35; P.hud = 0; P.fadeIn = clamp(t / 0.3);
  P.rgb = b > 30 ? (b - 30) * 4 : S.snare * 1.5; P.shake = b > 30 ? (b - 30) * 5 : 0;
}

// 2. the simulation runs: flyover + title (32-60.5)
function secFlight(S) {
  const b = S.b, lb = b - 32; bg();
  const hor = 560;
  g.save(); g.translate(CX, CY); g.rotate(Math.sin(S.t * 0.4) * 0.03 * (lb > 16 ? 1.8 : 1)); g.scale(1.06, 1.06); g.translate(-CX, -CY);
  stars2D(S, 180, hor - 20, 0.8);
  drawSun(CX, hor - 170, 230 * (1 + 0.04 * S.kk), COL.am, COL.mg, S, 1);
  const hg = g.createLinearGradient(0, hor - 60, 0, hor + 30); hg.addColorStop(0, rgba(COL.mg, 0)); hg.addColorStop(0.7, rgba(COL.mg, 0.25)); hg.addColorStop(1, rgba(COL.mg, 0)); g.fillStyle = hg; g.fillRect(0, hor - 60, W, 90);
  drawTerrain(S, { hor, camH: 240, speed: 520 + 120 * S.kk, amp: 260 + 60 * S.low, rip: lb > 16 ? 1 : 0.5, fill: '#060912', line: COL.cy, alpha: 1, cols: lb >= 16 });
  g.restore();
  // the two processes appear in the sky
  const oa = smooth((lb - 12) / 2);
  if (oa > 0) { const ph = S.t * 1.1; const d = 250; orb(S, CX + Math.cos(ph) * d, 250 + Math.sin(ph) * 60, 34, COL.cy, 1, oa); orb(S, CX - Math.cos(ph) * d, 250 - Math.sin(ph) * 60, 34, COL.mg, 2, oa); }
  if (lb < 9) {
    const t0 = tb(32), a = 1 - smooth((lb - 6.5) / 2.5), yy = 800 + smooth((lb - 6.5) / 2.5) * 40;
    const band = g.createLinearGradient(0, yy - 150, 0, yy + 130); band.addColorStop(0, 'rgba(5,6,10,0)'); band.addColorStop(0.35, 'rgba(5,6,10,0.82)'); band.addColorStop(0.75, 'rgba(5,6,10,0.82)'); band.addColorStop(1, 'rgba(5,6,10,0)');
    g.globalAlpha = a; g.fillStyle = band; g.fillRect(0, yy - 150, W, 280); g.globalAlpha = 1;
    const s = scramble('world.execute(me);', t0 + 0.05, S.t, 3, 0.045);
    g.font = `bold 118px ${MONO}`; g.textAlign = 'center'; g.globalCompositeOperation = 'lighter';
    g.fillStyle = COL.cy; g.globalAlpha = a * 0.6; g.fillText(s, CX - 5 - 6 * S.snare, yy); g.fillStyle = COL.mg; g.fillText(s, CX + 5 + 6 * S.snare, yy);
    g.globalCompositeOperation = 'source-over'; g.fillStyle = COL.fg; g.globalAlpha = a; g.fillText(s, CX, yy);
    const sa = a * smooth((S.t - t0 - 0.9) / 0.6); g.font = `30px ${MONO}`; g.globalAlpha = sa; g.fillText('M  I  L  I', CX, yy + 74);
    g.fillRect(CX - 330, yy + 64, 200 * sa, 1.5); g.fillRect(CX + 330 - 200 * sa, yy + 64, 200 * sa, 1.5); g.textAlign = 'left'; g.globalAlpha = 1;
  }
  const out = smooth((b - 59.2) / 1.3); if (out > 0) { g.fillStyle = COL.bg; g.globalAlpha = out; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  P.bloom = 0.9; P.hud = lb > 6 ? smooth((lb - 6) / 2) * 0.55 * (1 - out) : 0; P.rgb = S.snare * (lb > 16 ? 5 : 3); P.shake = S.kk * 3;
}

// 3. mathematics of affection (60.5-94.5)
const OX = CX, OY = CY + 60, U = 90;
function secMath(S) {
  const b = S.b, t = S.t; bg();
  graphPaper(smooth((b - 60.5) / 1.5) * (1 - smooth((b - 93.8) / 0.7) * 0.6), OX, OY, U);
  // --- points → dimension
  const R = 1.6 * U, baseX = OX - 6.2 * U;
  if (b < EV.circle + 0.3) {
    const a = win(S, EV.points - 0.1, EV.circle + 0.3, 0.1, 0.4);
    const toLine = smooth((b - 64.6) / 1.2);
    const N = 48; g.fillStyle = COL.cy;
    const lineP = smooth((b - EV.dimension) / 0.8), sweep = smooth((b - 67) / 1.3), extr = smooth((b - 68.5) / 1.2), coll = smooth((b - 70) / 0.5);
    if (lineP < 1) for (let k = 0; k < N; k++) { const bk = EV.points + k * (2 / N); if (b < bk) break; const e = easeBack((b - bk) / 0.25);
      const rx = (rnd(k, 1) - 0.5) * 16, ry = (rnd(k, 2) - 0.5) * 7.5; const lx = -6 + 12 * k / (N - 1);
      const x = OX + lerp(rx, lx, toLine) * U, y = OY - lerp(ry, 0, toLine) * U; const s = 7 * e * (1 - lineP);
      g.globalAlpha = a; g.fillRect(x - s / 2, y - s / 2, s, s); ringPulse(x, y, 4, 30, (b - bk) / 0.6, COL.cy, a * 0.8, 2); }
    g.globalAlpha = 1;
    if (b >= EV.dimension) {
      const m = rmat(-0.45 * extr, 0.6 * extr + (b > 69 ? (b - 69) * 0.4 : 0), 0);
      const sc = (1 - coll), hw = 6 * U * lerp(1, 0.4, sweep) * sc, hh = 4 * U * sweep * 0.9 * sc / 2 * (1 / 0.9) * 0.9, dep = 2.4 * U * extr * sc;
      const cx0 = lerp(OX, baseX, coll), cy0 = lerp(OY - hh, OY - R, coll);
      const pr = (x, y, z) => { const q = ap(m, x, y, z - dep / 2); const k = 1600 / (1600 + q[2]); return [cx0 + q[0] * k, cy0 - q[1] * k]; };
      const V = []; for (const z of [0, dep]) for (const [x, y] of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]) V.push(pr(x, y, z));
      g.strokeStyle = COL.cy; g.lineWidth = 3; g.globalAlpha = a;
      if (sweep < 0.02) { g.beginPath(); const p0 = pr(-hw, 0, 0), p1 = pr(-hw + 2 * hw * lineP, 0, 0); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
      else { g.beginPath(); for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0]]) { g.moveTo(V[i][0], V[i][1]); g.lineTo(V[j][0], V[j][1]); } g.stroke();
        g.fillStyle = COL.cy; g.globalAlpha = a * 0.08; g.beginPath(); [0, 1, 2, 3].forEach((i, n) => n ? g.lineTo(V[i][0], V[i][1]) : g.moveTo(V[i][0], V[i][1])); g.fill(); g.globalAlpha = a;
        if (extr > 0.01) { g.beginPath(); for (const [i, j] of [[4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) { g.moveTo(V[i][0], V[i][1]); g.lineTo(V[j][0], V[j][1]); } g.globalAlpha = a * extr; g.stroke(); } }
      g.globalAlpha = 1;
      const lbl = extr > 0.5 ? '3D' : sweep > 0.5 ? '2D' : '1D', lb0 = extr > 0.5 ? 68.5 : sweep > 0.5 ? 67 : 66;
      bigText(lbl, OX + 6.4 * U, OY - 4.2 * U, 64, COL.am, a * (1 - coll) * (0.5 + 0.5 * pulse(S, lb0, 0.6)));
    }
  }
  // --- circle drawn by a compass, then rolled out into its circumference
  if (b >= EV.circle && b < EV.sine + 0.4) {
    const a = win(S, EV.circle, EV.sine + 0.4, 0.15, 0.4);
    const roll = easeOut(clamp((b - EV.circumf) / 3)), dist = roll * PI2 * R;
    const ccx = baseX + dist, ccy = OY - R, rot = dist / R;
    const draw = clamp((b - EV.circle) / 1.5);
    // compass
    if (roll <= 0) { const ang = -Math.PI / 2 + draw * PI2; g.strokeStyle = COL.am; g.lineWidth = 3; g.globalAlpha = a; g.beginPath(); g.moveTo(ccx, ccy); g.lineTo(ccx + Math.cos(ang) * R, ccy + Math.sin(ang) * R); g.stroke(); text('r', ccx + Math.cos(ang - 0.3) * R * 0.5, ccy + Math.sin(ang - 0.3) * R * 0.5, 30, COL.am, a); }
    sPts(circPts(R, 120, -Math.PI / 2, -Math.PI / 2 + PI2 * draw, ccx, ccy), COL.cy, 5, a);
    if (roll > 0) {
      // laid-out circumference + cycloid trace of the marked point
      g.strokeStyle = COL.mg; g.lineWidth = 8; g.globalAlpha = a; g.beginPath(); g.moveTo(baseX, OY); g.lineTo(baseX + dist, OY); g.stroke();
      const cyc = []; for (let i = 0; i <= 80; i++) { const th = rot * i / 80; cyc.push([baseX + R * th - R * Math.sin(th), OY - R + R * Math.cos(th)]); }
      sPts(cyc, COL.am, 2, a * 0.6);
      const mx = ccx - R * Math.sin(rot), my = ccy + R * Math.cos(rot); g.fillStyle = COL.am; g.globalAlpha = a; g.beginPath(); g.arc(mx, my, 9, 0, PI2); g.fill();
      g.strokeStyle = COL.cy; g.lineWidth = 2; g.beginPath(); g.moveTo(ccx, ccy); g.lineTo(ccx + Math.cos(rot + Math.PI / 2) * R, ccy + Math.sin(rot + Math.PI / 2) * R); g.stroke(); g.globalAlpha = 1;
      for (const [f, lbl] of [[0.5, 'πr'], [1, '2πr']]) { const x = baseX + PI2 * R * f; if (dist >= PI2 * R * f - 1) { g.strokeStyle = COL.fg; g.lineWidth = 2; g.globalAlpha = a; g.beginPath(); g.moveTo(x, OY - 14); g.lineTo(x, OY + 14); g.stroke(); text(lbl, x, OY + 48, 24, COL.fg, a, 'center'); } }
      const la = smooth((b - (EV.circumf + 2.6)) / 0.5); bigText('C = 2πr', baseX + PI2 * R / 2, OY + 150, 76, COL.mg, a * la);
    }
    ringPulse(ccx, ccy, R, R + 200, (b - EV.circle - 1.5) / 1, COL.cy, a);
  }
  // --- sine born from a rotating unit circle, then its tangents
  const scx = 330, scy = OY - 1.8 * U + 40, SR = 150, x0 = 560, kx = 150;
  if (b >= EV.sine - 0.2 && b < EV.infinity + 1.6) {
    const a = win(S, EV.sine - 0.2, EV.infinity + 1.6, 0.3, 1.0);
    const zoomOut = easeIn(clamp((b - EV.infinity) / 1.4));
    const th = (Math.min(b, EV.tangent) - EV.sine) * Math.PI;
    g.globalAlpha = a; g.strokeStyle = COL.fg; g.lineWidth = 2; g.beginPath(); g.arc(scx, scy, SR, 0, PI2); g.stroke();
    const px = scx + Math.cos(th) * SR, py = scy - Math.sin(th) * SR;
    g.strokeStyle = COL.am; g.lineWidth = 3; g.beginPath(); g.moveTo(scx, scy); g.lineTo(px, py); g.stroke();
    g.setLineDash([6, 8]); g.beginPath(); g.moveTo(px, py); g.lineTo(x0, py); g.stroke(); g.setLineDash([]);
    g.fillStyle = COL.am; g.beginPath(); g.arc(px, py, 8, 0, PI2); g.fill(); g.globalAlpha = 1;
    const kxz = kx * lerp(1, 0.18, zoomOut); const wave = [];
    for (let x = x0; x <= W + 20; x += 6) { const ph = th - (x - x0) / kxz; if (ph < 0 && b < EV.tangent) break; wave.push([x, scy - Math.sin(b < EV.tangent ? ph : (EV.tangent - EV.sine) * Math.PI - (x - x0) / kxz) * SR]); }
    sPts(wave, COL.cy, 5, a * (1 - zoomOut * 0.7));
    text('sin θ', x0 + 20, scy - SR - 30, 28, COL.fg, a * 0.8);
    if (b >= EV.tangent) {
      const ta = smooth((b - EV.tangent) / 0.3) * a * (1 - zoomOut); const th1 = (EV.tangent - EV.sine) * Math.PI;
      const yAt = x => scy - Math.sin(th1 - (x - x0) / kx) * SR, slope = x => Math.cos(th1 - (x - x0) / kx) * SR / kx;
      for (let k = 0; k < 9; k++) { const bk = EV.tangent + k * 0.5; if (b < bk) break; const x = x0 + 70 + k * 140, y = yAt(x), sl = slope(x), L = 110; const n = Math.hypot(1, sl);
        g.strokeStyle = COL.mg; g.lineWidth = 2; g.globalAlpha = ta * 0.55; g.beginPath(); g.moveTo(x - L / n, y - sl * L / n); g.lineTo(x + L / n, y + sl * L / n); g.stroke(); g.globalAlpha = 1; }
      const xm = x0 + 40 + easeOut(clamp((b - EV.tangent) / 4.2)) * 1200, ym = yAt(xm), sm = slope(xm), n = Math.hypot(1, sm), L = 240;
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.globalAlpha = ta; g.beginPath(); g.moveTo(xm - L / n, ym - sm * L / n); g.lineTo(xm + L / n, ym + sm * L / n); g.stroke(); g.globalAlpha = 1;
      const nx = sm / n, ny = -1 / n; orb(S, xm + nx * 30, ym + ny * 30, 26, COL.mg, 2, ta);
      text('dy/dx', xm + 30, ym + 70, 22, COL.fg, ta * 0.8);
    }
  }
  // --- ∞
  if (b >= EV.infinity && b < EV.limit + 0.6) {
    const a = win(S, EV.infinity, EV.limit + 0.6, 0.3, 0.6), A_ = 420;
    const lem = []; for (let i = 0; i <= 200; i++) { const u = i / 200 * PI2; const d = 1 + Math.sin(u) ** 2; lem.push([CX + A_ * Math.cos(u) / d, CY - 10 + A_ * Math.sin(u) * Math.cos(u) / d]); }
    const dp = clamp((b - EV.infinity - 0.4) / 1.4);
    sPts(lem, COL.cy, 9, a, dp); sPts(lem, '#fff', 2.5, a * 0.8, dp);
    const u = S.t * 3.2; const d = 1 + Math.sin(u) ** 2; const px = CX + A_ * Math.cos(u) / d, py = CY - 10 + A_ * Math.sin(u) * Math.cos(u) / d;
    if (dp >= 1) orb(S, px, py, 22, COL.mg, 2, a);
    text('x → ∞', CX, CY + 300, 44, COL.fg, a * smooth((b - EV.infinity - 1) / 0.5), 'center');
  }
  // --- limit: approaching an asymptote that never gets touched
  if (b >= EV.limit) {
    const a = smooth((b - EV.limit) / 0.3), Ly = OY - 3.2 * U, x0l = 150, sx_ = 1750;
    const f = x => OY - 3.2 * U * (1 - Math.exp(-(x - x0l) / 260));
    const pr = clamp((b - EV.limit) / 2);
    g.setLineDash([18, 12]); g.strokeStyle = COL.mg; g.lineWidth = 4 + 6 * smooth((b - 93.5) / 1); g.globalAlpha = a; g.beginPath(); g.moveTo(0, Ly); g.lineTo(W, Ly); g.stroke(); g.setLineDash([]);
    const xr = lerp(x0l, sx_, easeOut(clamp((b - EV.limit) / 4.2)));
    const pts = []; for (let x = x0l; x <= xr; x += 5) pts.push([x, f(x)]); pts.push([xr, f(xr)]);
    sPts(pts, COL.cy, 5, a); orb(S, xr, f(xr), 20, COL.cy, 1, a);
    orb(S, 1790, Ly, 30, COL.mg, 2, a);
    text('lim f(x) = L', 200, Ly - 40, 40, COL.mg, a * smooth((b - EV.limit - 1) / 0.4));
    text('x→∞', 250, Ly - 5, 20, COL.mg, a * smooth((b - EV.limit - 1) / 0.4));
  }
  P.bloom = 0.8; P.hud = 0.5; P.rgb = S.snare * 2; P.shake = S.kick * 1.5;
}

// 4. current, blindness, time travel, union (94.5-126)
function secTravel(S) {
  const b = S.b, t = S.t; bg();
  // ---- circuit + switch
  if (b < EV.blind + 0.3) {
    const a = win(S, EV.current - 0.2, EV.blind + 0.3, 0.2, 0.4);
    const wy = CY - (b >= EV.acdc ? 330 : 0) * smooth((b - EV.acdc) / 0.5);
    const flip = smooth((b - (EV.current + 1.0)) / 0.25), tl = CX - 130, tr = CX + 130;
    g.strokeStyle = COL.mg; g.lineWidth = 6; g.globalAlpha = a; g.beginPath(); g.moveTo(0, wy); g.lineTo(tl, wy); g.moveTo(tr, wy); g.lineTo(W, wy); g.stroke();
    const ang = lerp(-0.7, 0, flip); g.strokeStyle = '#fff'; g.lineWidth = 9; g.beginPath(); g.moveTo(tl, wy); g.lineTo(tl + Math.cos(ang) * 260, wy + Math.sin(ang) * 260); g.stroke();
    for (const x of [tl, tr]) { g.fillStyle = COL.bg; g.beginPath(); g.arc(x, wy, 16, 0, PI2); g.fill(); g.strokeStyle = COL.fg; g.lineWidth = 4; g.stroke(); }
    if (flip > 0.5) { g.setLineDash([10, 22]); g.lineDashOffset = -t * 700; g.strokeStyle = '#fff'; g.lineWidth = 4; g.globalAlpha = a * 0.9; g.beginPath(); g.moveTo(0, wy); g.lineTo(W, wy); g.stroke(); g.setLineDash([]); }
    burst(S, tr, wy, EV.current + 1.2, 40, '#fff', 220, 0.8, 4, 3);
    g.globalAlpha = 1;
    // oscilloscope AC ⇄ DC
    if (b >= EV.acdc - 0.2) {
      const oa = a * smooth((b - EV.acdc + 0.2) / 0.4), ox = CX - 480, oy = CY - 120, ow = 960, oh = 440;
      winFrame(ox, oy, ow, oh, 'scope', oa, COL.cy, '#050a10');
      g.strokeStyle = COL.cy; g.globalAlpha = oa * 0.12; g.lineWidth = 1; g.beginPath(); for (let i = 1; i < 10; i++) { g.moveTo(ox + i * ow / 10, oy + 26); g.lineTo(ox + i * ow / 10, oy + oh); } for (let j = 1; j < 6; j++) { g.moveTo(ox, oy + 26 + j * (oh - 26) / 6); g.lineTo(ox + ow, oy + 26 + j * (oh - 26) / 6); } g.stroke();
      const mode = Math.floor(b - EV.acdc) % 2 === 0 ? 'AC' : 'DC', mt = frac(b - EV.acdc); const midY = oy + 26 + (oh - 26) / 2;
      const pts = []; for (let x = 0; x <= ow; x += 6) { const ac = Math.sin(x / ow * PI2 * 3 - t * 12) * 140, dc = -110; const m = mode === 'AC' ? smooth(mt / 0.15) : 1 - smooth(mt / 0.15); pts.push([ox + x, midY + lerp(dc, ac, mode === 'AC' ? m : m)]); }
      sPts(pts, '#b8ff5c', 4, oa);
      for (const [lbl, x] of [['AC', CX - 110], ['DC', CX + 110]]) { const on = lbl === mode; g.globalAlpha = oa; g.strokeStyle = on ? COL.am : COL.dim; g.lineWidth = 3; g.strokeRect(x - 70, oy + oh + 30, 140, 70); if (on) { g.fillStyle = rgba(COL.am, 0.3); g.fillRect(x - 70, oy + oh + 30, 140, 70); } bigText(lbl, x, oy + oh + 82, 44, on ? COL.am : COL.dim, oa); }
    }
  }
  // ---- the eye that gets blinded
  if (b >= EV.blind - 0.2 && b < EV.dizzy + 0.3) {
    const a = win(S, EV.blind - 0.2, EV.dizzy + 0.3, 0.25, 0.4), open = smooth((b - EV.blind) / 0.5) * (1 - smooth((b - (EV.blind + 2.4)) / 1.0) * 0.95);
    drawEye(CX, CY, 900, open, COL.cy, a, Math.sin(t * 2) * 0.3, 1 - 0.7 * smooth((b - EV.blind - 1) / 0.3));
    const fl = b >= EV.blind + 1 ? Math.exp(-(b - EV.blind - 1) / 1.1) : 0; if (fl > 0.01) { g.fillStyle = '#fff'; g.globalAlpha = fl; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  }
  // ---- dizzy spiral
  if (b >= EV.dizzy - 0.2 && b < EV.travel + 0.3) {
    const a = win(S, EV.dizzy - 0.2, EV.travel + 0.3, 0.3, 0.4), sp = 3 + 6 * (pulse(S, EV.dizzy, 0.8) + pulse(S, EV.dizzy + 2, 0.8));
    g.save(); g.translate(CX, CY); g.rotate(t * sp * 0.3 + Math.sin(t * 5) * 0.2);
    for (let arm = 0; arm < 2; arm++) { const pts = []; for (let i = 0; i < 500; i++) { const u = i / 500 * 9 * Math.PI; const r = 8 + u * 42; pts.push([Math.cos(u + arm * Math.PI) * r, Math.sin(u + arm * Math.PI) * r]); } sPts(pts, arm ? COL.mg : COL.cy, 14, a * 0.9); }
    g.restore();
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.35; g.drawImage(cv, 22 * Math.sin(t * 7), 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  // ---- time travel: clock tunnel, then AD ⇄ BC year counter
  if (b >= EV.travel - 0.2 && b < EV.unite + 0.3) {
    const a = win(S, EV.travel - 0.2, EV.unite + 0.3, 0.3, 0.5);
    const kNow = Math.floor(b * 2);
    for (let k = kNow - 12; k <= kNow; k++) { const age = b - k / 2; if (age < 0 || age > 6) continue; const z = lerp(4000, 80, Math.pow(age / 6, 1.8)), s = 700 / z, R = 420 * s;
      g.globalAlpha = a * clamp(age / 0.5) * clamp((z - 80) / 300); g.strokeStyle = k % 2 ? COL.cy : COL.am; g.lineWidth = Math.max(1, 6 * s); g.beginPath(); g.arc(CX, CY, R, 0, PI2); g.stroke();
      g.beginPath(); for (let q = 0; q < 12; q++) { const an = q / 12 * PI2 + k; g.moveTo(CX + Math.cos(an) * R * 0.86, CY + Math.sin(an) * R * 0.86); g.lineTo(CX + Math.cos(an) * R, CY + Math.sin(an) * R); } g.stroke(); }
    g.globalAlpha = 1;
    const ca = a * (1 - smooth((b - EV.adbc) / 0.4) * 0.8);
    drawClock(CX, CY, 170, t * 9, t * 60, ca);
    if (b >= EV.adbc - 0.2) {
      const ya = smooth((b - EV.adbc + 0.2) / 0.3) * a, u = b - EV.adbc; const back = u < 1.75 ? easeIn(u / 1.75) : 1 - easeOut((u - 1.75) / 1.6);
      const year = Math.round(2026 - back * 5026); const era = year > 0 ? 'AD' : 'BC', yv = year > 0 ? year : 1 - year;
      g.fillStyle = COL.bg; g.globalAlpha = ya * 0.75; g.fillRect(CX - 520, CY - 130, 1040, 260); g.globalAlpha = 1;
      bigText(String(yv), CX - 60, CY + 50, 150, COL.fg, ya, 'bold', 'right'); bigText(era, CX + 40, CY + 50, 150, era === 'AD' ? COL.cy : COL.am, ya, 'bold', 'left');
      const off = year * 0.9; g.strokeStyle = COL.fg; g.lineWidth = 2; g.globalAlpha = ya * 0.6; g.beginPath();
      for (let k = -30; k <= 30; k++) { const yr = Math.round(year / 100) * 100 + k * 100; const x = CX + (yr - year) * 0.9 * 1; g.moveTo(x, CY + 200); g.lineTo(x, CY + 200 + (yr % 1000 === 0 ? 40 : 18)); } g.moveTo(0, CY + 200); g.lineTo(W, CY + 200); g.stroke(); g.globalAlpha = 1;
      const zx = CX - off; if (zx > 0 && zx < W) { g.strokeStyle = COL.mg; g.lineWidth = 4; g.globalAlpha = ya; g.beginPath(); g.moveTo(zx, CY + 180); g.lineTo(zx, CY + 270); g.stroke(); text('0', zx, CY + 300, 26, COL.mg, ya, 'center'); }
    }
  }
  // ---- two orbs unite, then dive deep into the union
  if (b >= EV.unite - 0.3) {
    const a = smooth((b - EV.unite + 0.3) / 0.4), u = clamp((b - EV.unite) / 2.5), d = lerp(640, 0, easeIn(u)), ang = u * 7;
    if (u < 1) { orb(S, CX + Math.cos(ang) * d, CY + Math.sin(ang) * d * 0.45, 70, COL.cy, 1, a); orb(S, CX - Math.cos(ang) * d, CY - Math.sin(ang) * d * 0.45, 70, COL.mg, 2, a); }
    else { const dz = clamp((b - EV.deeply) / 4); const R = 110 * (1 + 0.1 * S.kick) * (1 + easeIn(dz) * 14);
      for (let k = 0; k < 14; k++) { const r = ((b * 0.9 + k / 14) % 1) * 1300; g.strokeStyle = k % 2 ? COL.cy : COL.mg; g.globalAlpha = (1 - r / 1300) * 0.7 * smooth((b - EV.deeply) / 0.6); g.lineWidth = 4; g.beginPath(); g.arc(CX, CY, r, 0, PI2); g.stroke(); }
      g.globalAlpha = 1; orb(S, CX, CY, R, '#ffffff', 3, 1 - smooth((dz - 0.8) / 0.2)); }
    burst(S, CX, CY, EV.unite + 2.5, 120, '#ffffff', 700, 1.6, 5, 7);
  }
  P.bloom = 0.95; P.hud = 0.5; P.rgb = S.snare * 3 + (b > EV.dizzy && b < EV.travel ? 10 : 0); P.shake = S.kick * 2 + (b > EV.dizzy && b < EV.travel ? 6 : 0);
}

// 5. chorus: every simulation, one satisfaction, happiness, run, trapped, strange (126-158.5)
const MINI = 36;
function miniSlot(k) { const c = k % 6, r = Math.floor(k / 6); return [70 + c * 300, 70 + r * 160, 280, 145]; }
function drawMiniSim(S, k, x, y, w, h, al) {
  winFrame(x, y, w, h, null, al, k % 3 === 0 ? COL.mg : COL.cy, '#070b12');
  g.save(); g.beginPath(); g.rect(x, y + 26, w, h - 26); g.clip(); const cx = x + w / 2, cy = y + 26 + (h - 26) / 2, t = S.t, type = k % 6;
  if (type === 0) { for (let r = 0; r < 7; r++) { const yy = cy - 10 + r * 12; g.beginPath(); for (let i = 0; i <= 30; i++) { const xx = x + i * w / 30; g.lineTo(xx, yy - noise2(i * 0.4 + t * 2, r + k) * 22 * (r / 7)); } g.strokeStyle = COL.cy; g.globalAlpha = al * 0.7; g.lineWidth = 1.2; g.stroke(); } }
  else if (type === 1) { for (const [c_, s_] of [[COL.cy, 0], [COL.mg, Math.PI]]) { g.fillStyle = c_; g.globalAlpha = al; g.beginPath(); g.arc(cx + Math.cos(t * 3 + s_ + k) * 50, cy + Math.sin(t * 3 + s_ + k) * 20, 7, 0, PI2); g.fill(); } }
  else if (type === 2) { g.beginPath(); for (let i = 0; i <= 60; i++) g.lineTo(x + i * w / 60, cy + Math.sin(i * 0.3 - t * 6 + k) * 30 * (0.4 + S.low)); g.strokeStyle = '#b8ff5c'; g.globalAlpha = al; g.lineWidth = 2; g.stroke(); }
  else if (type === 3) { drawWire2D(SH[VORDER[k % 8]], cx, cy, rmat(t + k, t * 0.7, 0), 38, COL.fg, al, 1.5); }
  else if (type === 4) { heartFill(cx, cy, 40 * (1 + 0.15 * S.kk), COL.mg, al * 0.8); }
  else { g.fillStyle = COL.am; g.globalAlpha = al; for (let q = 0; q < 12; q++) { const v = S.spec[q]; g.fillRect(x + 20 + q * 20, y + h - 10 - v * v * 90, 14, v * v * 90); } }
  g.restore(); g.globalAlpha = 1;
}
function secChorus(S) {
  const b = S.b, t = S.t; bg();
  drawStreaks(S, 60, 0.5, 0.25 + 0.2 * S.high);
  beatRings(S, [EV.ch_ifican, EV.ch_ifican + 1, EV.ch_thencan, EV.ch_thencan + 1], CX, CY, COL.cy);
  // simulations multiply, then converge into one
  if (b >= 128 && b < EV.ch_happy + 0.2) {
    const conv = easeIn(clamp((b - (EV.ch_thencan + 1)) / 3.2)), mergeA = 1 - smooth((b - EV.ch_only) / 0.3);
    for (let k = 0; k < MINI; k++) { const sb = k < 4 ? 128 + k * 0.5 : EV.ch_give + (k - 4) * (3.5 / 32); if (b < sb) break;
      let [x, y, w, h] = miniSlot(k); if (k < 4) { const big = 1 - smooth((b - EV.ch_give) / 0.6); const bx = [[360, 250], [980, 250], [360, 600], [980, 600]][k]; x = lerp(x, bx[0], big); y = lerp(y, bx[1], big); w = lerp(w, 560, big); h = lerp(h, 300, big); }
      const e = easeBack((b - sb) / 0.3); const cxk = lerp(x + w / 2, CX, conv), cyk = lerp(y + h / 2, CY, conv), sc = e * lerp(1, 0.25, conv);
      drawMiniSim(S, k, cxk - w * sc / 2, cyk - h * sc / 2, w * sc, h * sc, mergeA); }
    // the one window
    if (b >= EV.ch_only - 0.2) { const a = smooth((b - EV.ch_only + 0.2) / 0.3) * (1 - smooth((b - EV.ch_happy + 0.2) / 0.4)); const e = easeBack(clamp((b - EV.ch_only) / 0.4));
      const w = 900 * e, h = 460 * e; winFrame(CX - w / 2, CY - h / 2, w, h, 'world.execute', a, COL.cy);
      const p = easeOut(clamp((b - EV.ch_only - 0.3) / 1.8)); g.globalAlpha = a; g.strokeStyle = COL.fg; g.lineWidth = 2; g.strokeRect(CX - 340, CY + 60, 680, 44); g.fillStyle = p >= 1 ? '#7dff9a' : COL.cy; g.fillRect(CX - 336, CY + 64, 672 * p, 36); g.globalAlpha = 1;
      bigText(`${Math.round(p * 100)}%`, CX, CY + 170, 44, COL.fg, a);
      const ck = clamp((b - EV.ch_only - 2.2) / 0.5); sPts([[CX - 70, CY - 60], [CX - 15, CY - 5], [CX + 90, CY - 130]], '#7dff9a', 22, a, ck); }
  }
  // happiness: the two processes become eyes above a y = x² smile
  if (b >= EV.ch_happy - 0.2 && b < EV.ch_run + 0.3) {
    const a = win(S, EV.ch_happy - 0.2, EV.ch_run + 0.3, 0.3, 0.4), bo = Math.sin(clamp(S.bf / 0.5) * Math.PI) * 14;
    orb(S, CX - 180, CY - 120 - bo, 60, COL.cy, 1, a); orb(S, CX + 180, CY - 120 - bo, 60, COL.mg, 2, a);
    const sm = []; for (let x = -300; x <= 300; x += 6) sm.push([CX + x, CY + 60 - bo + (x * x) / 900 * -1 + 100]);
    const smile = []; for (let x = -300; x <= 300; x += 6) smile.push([CX + x, CY + 60 - bo + (1 - (x * x) / 90000) * 130]);
    sPts(smile, COL.am, 16, a, smooth((b - EV.ch_happy) / 1));
    text('y = x²', CX + 330, CY + 230, 34, COL.am, a * smooth((b - EV.ch_happy - 1) / 0.5));
  }
  // run
  if (b >= EV.ch_run - 0.2 && b < EV.ch_trapped + 0.3) {
    const a = win(S, EV.ch_run - 0.2, EV.ch_trapped + 0.3, 0.2, 0.4), press = b > EV.ch_run + 1 ? 1 - 0.15 * Math.sin(clamp((b - EV.ch_run - 1) / 0.3) * Math.PI) : 1;
    codeRain(S, a * smooth((b - EV.ch_run - 1.2) / 0.3), 2.4, COL.cy);
    const bw = 520 * press, bh = 170 * press; g.globalAlpha = a; g.fillStyle = b > EV.ch_run + 1.1 ? '#1a7f3a' : '#0d1a12'; g.fillRect(CX - bw / 2, CY - bh / 2, bw, bh); g.strokeStyle = '#7dff9a'; g.lineWidth = 5; g.strokeRect(CX - bw / 2, CY - bh / 2, bw, bh); g.globalAlpha = 1;
    bigText('RUN ▶', CX, CY + 36 * press, 96 * press, '#e9ffe9', a);
  }
  // trapped in a cage, then the simulation warps
  if (b >= EV.ch_trapped - 0.2) {
    const a = smooth((b - EV.ch_trapped + 0.2) / 0.3) * (1 - smooth((b - 158) / 0.5));
    const warp = pulse(S, EV.ch_strange + 0.5, 0.9) + pulse(S, EV.ch_strange + 2, 0.9) + (b > EV.ch_strange ? 0.25 : 0);
    if (b >= EV.ch_strange - 0.2) { g.strokeStyle = COL.mg; g.lineWidth = 1.5; g.globalAlpha = a * 0.5; g.beginPath();
      for (let gx = 0; gx <= W; gx += 80) { for (let y = 0; y <= H; y += 20) { const x = gx + Math.sin(y * 0.012 + t * 3) * 60 * warp; y ? g.lineTo(x, y) : g.moveTo(x, y); } }
      for (let gy = 0; gy <= H; gy += 80) { for (let x = 0; x <= W; x += 20) { const y = gy + Math.sin(x * 0.01 - t * 2) * 60 * warp; x ? g.lineTo(x, y) : g.moveTo(x, y); } } g.stroke(); g.globalAlpha = 1; }
    orb(S, CX - 100, CY + 40, 55, COL.cy, 1, a); orb(S, CX + 100, CY + 40, 55, COL.mg, 2, a);
    const drop = easeIn(clamp((b - EV.ch_trapped) / 0.45)), bounce = b > EV.ch_trapped + 0.45 ? Math.sin(clamp((b - EV.ch_trapped - 0.45) / 0.3) * Math.PI) * 18 : 0;
    drawCage(CX, CY + 40 - (1 - drop) * 900 - bounce, 250, t * 0.4, a, COL.fg, 1 + warp * 0.2 * Math.sin(t * 9));
    if (b >= EV.ch_trapped + 0.45) burst(S, CX, CY + 290, EV.ch_trapped + 0.45, 40, COL.fg, 400, 0.8, 4, 11);
    P.strobe = b >= EV.ch_strange && (frac((b - EV.ch_strange) / 1.5) < 0.06) ? 1 : 0;
    P.glitch = warp * 0.5;
  }
  P.bloom = 1.0; P.hud = 0.5; P.rgb = S.snare * 6; P.shake = S.kk * 4;
}

// 6. specimens: eggplant, tomato, tabby cat, then god & proof (158.5-190.5)
function specimenPanel(S, lines, al, title) { if (al <= 0) return; const x = 1300, y = 250; winFrame(x, y, 520, 60 + lines.length * 46, title, al, COL.dim, '#070b12'); lines.forEach((l, i) => text(l, x + 24, y + 70 + i * 46, 22, i === 0 ? COL.fg : COL.dim, al)); }
function secFood(S) {
  const b = S.b, t = S.t; bg();
  const godA = smooth((b - EV.god + 0.3) / 0.6);
  graphPaper(0.6 * (1 - godA), CX, CY, 60, false);
  // turntable
  if (godA < 1) { g.strokeStyle = COL.cy; g.lineWidth = 2; g.globalAlpha = 0.35 * (1 - godA); g.beginPath(); g.ellipse(760, 860, 360, 60, 0, 0, PI2); g.stroke(); g.globalAlpha = 0.12 * (1 - godA); g.beginPath(); g.ellipse(760, 860, 420, 76, 0, 0, PI2); g.stroke(); g.globalAlpha = 1; }
  const sway = Math.sin(t * 1.7) * 0.05, bob = -Math.sin(clamp(S.bf / 0.4) * Math.PI) * 10 * S.kk;
  // eggplant + nutrients
  if (b < EV.tomato + 0.5) {
    const out = smooth((b - EV.tomato) / 0.5), a = 1 - out, ex = 760 - out * 700;
    drawEgg(ex, 540 + bob, 290, -0.5 + sway, clamp((b - EV.eggplant) / 1.1), a);
    specimenPanel(S, ['Solanum melongena', 'kcal/100g   25', 'H₂O          92 %'], smooth((b - EV.eggplant - 0.8) / 0.3) * (1 - smooth((b - EV.nutrients + 0.2) / 0.3)), 'specimen 01');
    if (b >= EV.nutrients - 0.2) {
      const na = a * smooth((b - EV.nutrients + 0.2) / 0.3), tx_ = 1500, ty = 540;
      orb(S, tx_, ty, 60 * (1 + 0.25 * clamp((b - EV.nutrients) / 4)), COL.cy, 1, na);
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 90; i++) { const st = EV.nutrients + rnd(i, 3) * 3.6; const p = (b - st) / 1.0; if (p < 0 || p > 1) continue; const e = easeIn(p);
        const x = lerp(ex + 60, tx_, e), y = lerp(540 + (rnd(i, 4) - 0.5) * 300, ty, e) - Math.sin(e * Math.PI) * 180 * (rnd(i, 5) - 0.3);
        const c = [XC.leaf, COL.am, XC.egg, COL.cy][i % 4]; hexagon(x, y, 7, t * 3 + i, c, na * (1 - p * 0.5)); }
      g.globalCompositeOperation = 'source-over';
      const bars = [['fiber', 0.8], ['K', 0.65], ['Mn', 0.5], ['B₆', 0.4], ['folate', 0.3]];
      winFrame(1300, 700, 520, 300, 'intake', na, COL.dim, '#070b12');
      bars.forEach(([n, v], i) => { const p = easeOut(clamp((b - EV.nutrients - 0.3 - i * 0.4) / 0.8)); text(n, 1324, 760 + i * 46, 20, COL.fg, na); g.fillStyle = [XC.leaf, COL.am, XC.egg, COL.cy, COL.mg][i]; g.globalAlpha = na; g.fillRect(1440, 744 + i * 46, 340 * v * p, 18); g.globalAlpha = 1; });
    }
  }
  // tomato + antioxidants
  if (b >= EV.tomato - 0.2 && b < EV.cat + 0.5) {
    const inn = smooth((b - EV.tomato + 0.2) / 0.5), out = smooth((b - EV.cat) / 0.5), a = inn * (1 - out), x = 760 + (1 - inn) * 700 - out * 800;
    drawTom(x, 560 + bob, 250, sway, clamp((b - EV.tomato) / 1.1), a);
    specimenPanel(S, ['Solanum lycopersicum', 'kcal/100g   18', 'lycopene   C₄₀H₅₆'], a * smooth((b - EV.tomato - 0.8) / 0.3), 'specimen 02');
    if (b >= EV.antiox - 0.2) {
      const aa = a * smooth((b - EV.antiox + 0.2) / 0.3);
      for (let k = 0; k < 7; k++) { const an = t * 0.6 + k / 7 * PI2, r = 390 + Math.sin(t + k) * 30; const hx = x + Math.cos(an) * r, hy = 560 + Math.sin(an) * r * 0.7;
        hexagon(hx, hy, 34, t + k, XC.leaf, aa); g.strokeStyle = XC.leaf; g.globalAlpha = aa * 0.8; g.lineWidth = 2; g.beginPath(); g.arc(hx, hy, 18, 0, PI2); g.stroke(); g.globalAlpha = 1; }
      const chain = []; for (let i = 0; i <= 22; i++) chain.push([x - 520 + i * 48, 190 + (i % 2) * 26]); sPts(chain, COL.am, 4, aa, clamp((b - EV.antiox) / 1.5));
      for (let k = 0; k < 9; k++) { const kb = EV.antiox + 0.5 + k * 0.5, ang = rnd(k, 8) * PI2; const pp = clamp((b - (kb - 1.2)) / 1.2); if (b > kb + 1.2 || pp <= 0) continue;
        const rx = x + Math.cos(ang) * lerp(900, 290, pp), ry = 560 + Math.sin(ang) * lerp(700, 250, pp);
        if (b < kb) { g.strokeStyle = COL.rd; g.lineWidth = 3; g.globalAlpha = aa; g.beginPath(); for (let q = 0; q <= 8; q++) { const a2 = q / 8 * PI2 + t * 4, rr = q % 2 ? 8 : 22; q ? g.lineTo(rx + Math.cos(a2) * rr, ry + Math.sin(a2) * rr) : g.moveTo(rx + Math.cos(a2) * rr, ry + Math.sin(a2) * rr); } g.closePath(); g.stroke(); g.globalAlpha = 1; }
        else burst(S, rx, ry, kb, 20, XC.leaf, 110, 0.8, 4, k); }
    }
  }
  // tabby cat + purr
  if (b >= EV.cat - 0.2 && b < EV.god + 1) {
    const a = smooth((b - EV.cat + 0.2) / 0.4) * (1 - godA * 0.85);
    const blink = (b > EV.cat + 1.6 && b < EV.cat + 1.9) || (b > EV.purr + 2.2 && b < EV.purr + 2.45) ? 0.1 : 1;
    const purr = b >= EV.purr ? 1 : 0, jit = purr * (0.012 + 0.012 * S.hat) * 260;
    drawCat(S, 760, 560, 250, clamp((b - EV.cat) / 1.3), a, blink, jit);
    specimenPanel(S, ['Felis catus', 'pattern     tabby', purr ? 'purr     ≈ 25 Hz' : 'status    idle'], a * smooth((b - EV.cat - 1) / 0.3), 'specimen 03');
    if (purr) { const pa = a * smooth((b - EV.purr) / 0.3);
      for (let k = 0; k < 6; k++) { const r = ((S.b * 1.5 + k / 6) % 1); g.strokeStyle = XC.cat; g.lineWidth = 3; g.globalAlpha = pa * (1 - r) * 0.8; g.beginPath(); g.arc(760, 640, 180 + r * 380, -Math.PI * 0.85, -Math.PI * 0.15); g.stroke(); g.beginPath(); g.arc(760, 640, 180 + r * 380, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
      g.globalAlpha = 1;
      for (let k = 0; k < 10; k++) { const st = EV.purr + k * 0.45, p = (b - st) / 2.2; if (p < 0 || p > 1) continue; heartFill(640 + rnd(k, 9) * 260 + Math.sin(p * 6 + k) * 20, 300 - p * 260, 22 * (1 - p * 0.3), COL.mg, pa * (1 - p)); }
      const wv = []; for (let i = 0; i <= 120; i++) wv.push([1324 + i * 4, 520 + Math.sin(i * 0.9 + t * 40) * 20 * (0.5 + S.low)]); sPts(wv, XC.cat, 2, pa); }
  }
  // god: a giant eye opens above everything; then the proof
  if (godA > 0) {
    for (let k = 0; k < 9; k++) { const an = Math.PI / 2 + (k - 4) * 0.12 + Math.sin(t * 0.5 + k) * 0.02; g.globalAlpha = godA * 0.08; g.fillStyle = COL.cy; g.beginPath(); g.moveTo(CX, 250); g.lineTo(CX + Math.cos(an - 0.04) * 1400, 250 + Math.sin(an - 0.04) * 1400); g.lineTo(CX + Math.cos(an + 0.04) * 1400, 250 + Math.sin(an + 0.04) * 1400); g.closePath(); g.fill(); }
    g.globalAlpha = 1;
    drawEye(CX, 280, 820, smooth((b - EV.god) / 0.8), COL.cy, godA, b >= EV.proof ? 0 : Math.sin(t) * 0.4, 1 + 0.2 * S.kick);
    ringPulse(CX, 280, 150, 900, (b - EV.god - 0.8) / 1.5, COL.cy, godA, 6);
    if (b >= EV.proof - 0.2) {
      const pa = smooth((b - EV.proof + 0.2) / 0.4); orb(S, CX, 800, 60, COL.mg, 2, pa);
      g.setLineDash([4, 10]); g.strokeStyle = COL.fg; g.globalAlpha = pa * 0.5; g.lineWidth = 2; g.beginPath(); g.moveTo(CX, 420); g.lineTo(CX, 730); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
      for (const [sym, x, d] of [['∃', CX - 380, 0.5], ['∴', CX + 330, 1.5], ['∎', CX + 470, 2.5]]) { const q = easeBack(clamp((b - EV.proof - d) / 0.35)); if (q > 0) bigText(sym, x, 850, 170 * q, sym === '∃' ? COL.mg : COL.fg, pa); }
    }
  }
  P.bloom = 0.85; P.hud = 0.5; P.rgb = S.snare * 2; P.shake = S.kick * 1.5;
}

// 7. switches: toggle, ♀⇄♂, whatever, AM⇄PM, swap roles, toggles, the door, the trance (190.5-222)
function secSwitch(S) {
  const b = S.b, t = S.t;
  // sky day/night during AM/PM
  const dn = b >= EV.ampm - 0.3 && b < EV.role + 0.3 ? win(S, EV.ampm - 0.3, EV.role + 0.3, 0.3, 0.4) : 0;
  const day = 0.5 + 0.5 * Math.cos((b - EV.ampm) * Math.PI);
  bg(dn > 0 ? `rgb(${Math.round(lerp(5, lerp(8, 60, day), dn))},${Math.round(lerp(6, lerp(10, 40, day), dn))},${Math.round(lerp(10, lerp(40, 70, day), dn))})` : COL.bg);
  dotGrid(S, 0.05 + 0.15 * S.kick);
  if (b < EV.fm + 0.3) { const a = win(S, EV.gender - 0.2, EV.fm + 0.3, 0.3, 0.4); const st = smooth((b - EV.gender - 1) / 0.25) - smooth((b - EV.gender - 2.5) / 0.25) * 0;
    drawToggle(CX, CY, 420, 180, st, st > 0.5 ? COL.cy : COL.mg, a); burst(S, CX, CY, EV.gender + 1.1, 40, '#fff', 300, 0.8, 4, 21); }
  if (b >= EV.fm - 0.2 && b < EV.whatever + 0.3) { const a = win(S, EV.fm - 0.2, EV.whatever + 0.3, 0.3, 0.4); const k = Math.floor(b - EV.fm), f = frac(b - EV.fm); const m = k % 2 === 0 ? smooth((f - 0.4) / 0.3) * 0 + (k % 2) : 1;
    const mm = smooth((b - (EV.fm + 0.9)) / 0.3); drawGenderSym(CX - 40, CY + 40, 150, mm, a); ringPulse(CX - 40, CY + 40, 150, 500, (b - EV.fm - 1.05) / 1, COL.cy, a); }
  if (b >= EV.whatever - 0.2 && b < EV.ampm + 0.3) { const a = win(S, EV.whatever - 0.2, EV.ampm + 0.3, 0.3, 0.4);
    for (let i = 0; i < 34; i++) { const vx = 0.2 + rnd(i, 1) * 0.5, vy = 0.25 + rnd(i, 2) * 0.5; const tri = v => 1 - Math.abs(((v % 2) + 2) % 2 - 1);
      const x = 80 + tri(S.t * vx + rnd(i, 3) * 2) * (W - 160), y = 80 + tri(S.t * vy + rnd(i, 4) * 2) * (H - 160); const col = [COL.cy, COL.mg, COL.am, '#b8ff5c', COL.fg][i % 5]; const r = 26 + rnd(i, 5) * 30, rot = S.t * (rnd(i, 6) * 4 - 2);
      g.save(); g.translate(x, y); g.rotate(rot); g.strokeStyle = col; g.lineWidth = 4; g.globalAlpha = a; const typ = i % 5;
      if (typ === 0) { g.beginPath(); g.arc(0, 0, r, 0, PI2); g.stroke(); } else if (typ === 1) g.strokeRect(-r, -r, 2 * r, 2 * r); else if (typ === 2) { g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.9, r * 0.6); g.lineTo(-r * 0.9, r * 0.6); g.closePath(); g.stroke(); }
      else if (typ === 3) { g.beginPath(); for (let q = 0; q <= 10; q++) { const an = q / 10 * PI2 - Math.PI / 2, rr = q % 2 ? r * 0.45 : r; q ? g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : g.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); } g.stroke(); } else { heartFill(0, 0, r, col, a * 0.8); }
      g.restore(); }
    g.globalAlpha = 1; const ph = t * 4; orb(S, CX + Math.cos(ph) * 160, CY + Math.sin(ph * 2) * 80, 50, COL.cy, 1, a); orb(S, CX - Math.cos(ph) * 160, CY - Math.sin(ph * 2) * 80, 50, COL.mg, 2, a); }
  if (dn > 0) { const u = b - EV.ampm; drawClock(CX, CY + 30, 260, u * Math.PI, u * Math.PI * 12, dn);
    const sa = u * Math.PI; const sxp = CX + Math.cos(Math.PI + sa) * 760, syp = 900 + Math.sin(Math.PI + sa) * 700; g.fillStyle = day > 0.5 ? COL.am : '#dfe8ff'; g.globalAlpha = dn; g.beginPath(); g.arc(sxp, syp, 60, 0, PI2); g.fill(); g.globalAlpha = 1;
    const lab = Math.floor(u) % 2 === 0 ? 'AM' : 'PM'; bigText(lab, CX, CY - 290, 110, lab === 'AM' ? COL.am : COL.cy, dn); }
  if (b >= EV.role - 0.2 && b < EV.sm + 0.3) { const a = win(S, EV.role - 0.2, EV.sm + 0.3, 0.3, 0.4); const u = b - EV.role; const sw = u < 2 ? easeOut(u / 2) : 1 + easeOut(clamp((u - 2) / 2)); const ang = sw * Math.PI;
    const col = k => { const m = frac(sw / 2 + k * 0.5) < 0.5; return m ? COL.cy : COL.mg; };
    for (let k = 1; k <= 12; k++) { const aa = ang - k * 0.06; g.fillStyle = COL.fg; g.globalAlpha = a * (1 - k / 12) * 0.3; g.fillRect(CX + Math.cos(aa) * 300 - 4, CY + Math.sin(aa) * 120 - 4, 8, 8); g.fillRect(CX - Math.cos(aa) * 300 - 4, CY - Math.sin(aa) * 120 - 4, 8, 8); } g.globalAlpha = 1;
    const c1 = sw % 2 < 1 ? (frac(sw) < 0.5 ? COL.cy : COL.mg) : (frac(sw) < 0.5 ? COL.mg : COL.cy);
    orb(S, CX + Math.cos(ang) * 300, CY + Math.sin(ang) * 120, 70, c1, 1, a); orb(S, CX - Math.cos(ang) * 300, CY - Math.sin(ang) * 120, 70, c1 === COL.cy ? COL.mg : COL.cy, 2, a); }
  if (b >= EV.sm - 0.2 && b < EV.enter + 0.3) { const a = win(S, EV.sm - 0.2, EV.enter + 0.3, 0.3, 0.4);
    for (let k = 0; k < 8; k++) { const on = smooth((b - EV.sm - k * 0.22) / 0.15) - smooth((b - EV.sm - 1.9 - k * 0.18) / 0.15); drawToggle(210 + k * 214, CY, 170, 76, on, on > 0.5 ? COL.mg : COL.cy, a); } }
  if (b >= EV.enter - 0.2 && b < EV.trance + 0.6) { const a = win(S, EV.enter - 0.2, EV.trance + 0.6, 0.3, 0.6), zoom = 1 + easeIn(clamp((b - EV.enter - 3.3) / 1.2)) * 8;
    g.save(); g.translate(CX, CY); g.scale(zoom, zoom); g.translate(-CX, -CY);
    const op = easeOut(clamp((b - EV.enter) / 1.4)), dw = 320, dh = 600, dx = CX - dw / 2, dy = CY - dh / 2 - 20;
    const lg = g.createLinearGradient(0, dy, 0, dy + dh); lg.addColorStop(0, '#fff'); lg.addColorStop(1, '#bfe9ff'); g.globalAlpha = a * op; g.fillStyle = lg; g.fillRect(dx, dy, dw, dh);
    for (let k = 0; k < 10; k++) { g.globalAlpha = a * op * 0.08; g.fillStyle = '#dff6ff'; g.beginPath(); g.moveTo(dx + dw * 0.2, dy + dh); g.lineTo(dx + dw * 0.8, dy + dh); g.lineTo(CX + (k - 4.5) * 190, H + 20); g.lineTo(CX + (k - 5.5) * 190, H + 20); g.fill(); }
    g.globalAlpha = a; g.strokeStyle = COL.fg; g.lineWidth = 6; g.strokeRect(dx - 6, dy - 6, dw + 12, dh + 12);
    g.fillStyle = '#10151f'; g.fillRect(dx, dy, dw / 2 * (1 - op), dh); g.fillRect(dx + dw / 2 + dw / 2 * op, dy, dw / 2 * (1 - op), dh); g.globalAlpha = 1;
    const fly = easeIn(clamp((b - EV.enter - 1.8) / 1.6)); orb(S, lerp(CX - 420, CX - 30, fly), lerp(CY + 260, CY, fly), 50 * (1 - fly * 0.7), COL.cy, 1, a * (1 - fly * 0.8)); orb(S, lerp(CX + 420, CX + 30, fly), lerp(CY + 260, CY, fly), 50 * (1 - fly * 0.7), COL.mg, 2, a * (1 - fly * 0.8));
    g.restore(); }
  if (b >= EV.trance - 0.2) { const a = smooth((b - EV.trance + 0.2) / 0.8) * (1 - smooth((b - 221.6) / 0.4));
    g.save(); g.translate(CX, CY); g.rotate(t * 0.15);
    for (let k = 0; k < 18; k++) { const r = 40 + k * 60 + Math.sin(t * 1.5 - k * 0.5) * 20; g.strokeStyle = k % 2 ? COL.cy : XC.egg; g.lineWidth = 3; g.globalAlpha = a * (0.25 + 0.4 * Math.sin(t * 2 - k * 0.4) ** 2); g.beginPath(); g.arc(0, 0, r, 0, PI2); g.stroke(); }
    for (let p = 0; p < 3; p++) { const pts = []; for (let i = 0; i <= 300; i++) { const u = i / 300 * PI2; const r = 380 * Math.cos((5 + p) * u + t * (0.4 + p * 0.1)); pts.push([Math.cos(u) * r, Math.sin(u) * r]); } sPts(pts, [COL.mg, COL.cy, COL.fg][p], 2, a * 0.6); }
    g.restore(); }
  P.bloom = 0.95; P.hud = 0.5; P.rgb = S.snare * 3; P.shake = S.kk * 2;
}

// 8. vibrations, completion, departure, isolation (222-254.5)
function secLeave(S) {
  const b = S.b, t = S.t; bg();
  const iso = smooth((b - EV.isolation) / 3.5), zs = lerp(1, 0.32, iso);
  g.save(); g.translate(CX, CY); g.scale(zs, zs); g.translate(-CX, -CY);
  const ax = CX - 320, ay = CY;
  // magenta orb path when leaving: jumps further each repetition
  const LK = ['left0', 'left1', 'left2', 'left3', 'left4', 'isolation'];
  const leavePos = k => [CX + 320 + k * 112, CY - k * 72, 1 - k * 0.14];
  let li = -1; for (let k = 0; k < LK.length; k++) if (b >= EV[LK[k]] + 0.5) li = k;
  const cur = (() => { if (li < 0) { const u = b >= EV.left0 ? easeOut(clamp((b - EV.left0 - 0.5) / 1)) : 0; const [x1, y1] = leavePos(0); return [lerp(CX + 320, x1, 0), CY, 1]; }
    const k = li, nxt = Math.min(LK.length - 1, k + 1), u = easeOut(clamp((b - EV[LK[k]] - 0.5) / 0.6)); const [x0, y0, s0] = leavePos(k), [x1, y1, s1] = leavePos(k + 1); return [lerp(x0, x1, u), lerp(y0, y1, u), lerp(s0, s1, u)]; })();
  const gone = smooth((b - EV.isolation - 0.5) / 1.5);
  // the string between them
  const snapB = EV.left0 + 0.5;
  if (b < snapB) {
    const n = b < EV.vibration ? 1 : 1 + Math.floor(b - EV.vibration) % 4, amp = (b < EV.vibration ? 12 * (pulse(S, EV.v_ifican, 0.5) + pulse(S, EV.v_ifican + 1.5, 0.5)) : 55 * (0.5 + S.rms)) * (b >= EV.completion ? 0.4 : 1);
    const pts = []; for (let i = 0; i <= 100; i++) { const u = i / 100; pts.push([lerp(ax, cur[0], u), lerp(ay, cur[1], u) + Math.sin(n * Math.PI * u) * Math.cos(t * 26) * amp]); }
    sPts(pts, '#fff', 3, 0.85);
  } else { const p = clamp((b - snapB) / 0.8); for (const side of [0, 1]) { const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; const x0 = side ? cur[0] : ax, dir = side ? -1 : 1; pts.push([x0 + dir * u * 320 * (1 - p), ay + Math.sin(u * 9 + t * 20) * 20 * (1 - p) + u * u * p * 200]); } sPts(pts, '#fff', 3, 0.85 * (1 - p)); } }
  if (b >= EV.vibration) { for (const [x, y] of [[ax, ay], [cur[0], cur[1]]]) for (let k = 0; k < 4; k++) { const r = frac(S.b * 1.2 + k / 4); ringPulse(x, y, 60, 360, r, COL.fg, 0.35 * (1 - smooth((b - snapB) / 0.5)), 2); } }
  // completion ring
  const n = 8, have = k => b >= EV.v_thencan ? smooth((b - (EV.v_thencan + k * 0.55)) / 0.25) * (k === 7 ? smooth((b - (EV.completion + 0.5)) / 0.2) : 1) : 0;
  const dropK = k => { const drops = [EV.left0 + 0.5, EV.left1, EV.left2, EV.left3, EV.left4, EV.isolation, EV.isolation + 0.5, EV.isolation + 1]; return clamp((b - drops[k]) / 1.4); };
  drawPuzzleRing(CX, CY, 440, n, have, k => b >= EV.completion + 0.5 && b < EV.left0 ? '#7dff9a' : (k % 2 ? COL.cy : COL.mg), 1, dropK);
  if (b >= EV.completion + 0.5 && b < EV.left0 + 0.5) { bigText('100%', CX, CY + 24, 70, '#7dff9a', smooth((b - EV.completion - 0.5) / 0.3)); ringPulse(CX, CY, 440, 900, (b - EV.completion - 0.5) / 1.2, '#7dff9a', 1, 8); }
  // ghosts left behind at each departure point
  for (let k = 0; k <= li; k++) { const [x, y, s] = leavePos(k); const age = b - (EV[LK[k]] + 0.5); g.globalAlpha = Math.max(0, 0.45 - age * 0.12); g.strokeStyle = COL.mg; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 60 * s, 0, PI2); g.stroke(); g.globalAlpha = 1; }
  orb(S, cur[0], cur[1], 70 * cur[2], COL.mg, 2, (1 - gone) * (li >= 0 ? lerp(1, 0.5, li / 5) : 1));
  orb(S, ax + (CX - ax) * smooth((b - EV.isolation) / 1.2), ay, 70, COL.cy, 1, 1);
  // isolation cell
  if (b >= EV.isolation) { const p = clamp((b - EV.isolation - 1) / 1.5), bx = CX - 170, by = CY - 170; const sq = [[bx, by], [bx + 340, by], [bx + 340, by + 340], [bx, by + 340], [bx, by]]; sPts(sq, COL.fg, 3 / zs, 0.8, p); }
  g.restore();
  if (b >= EV.isolation + 2) text('connections: 0', CX, CY + 170, 22, COL.dim, smooth((b - EV.isolation - 2) / 0.5), 'center');
  P.bloom = 0.9; P.hud = 0.5; P.rgb = S.snare * 2 + pulse(S, snapB, 0.4) * 10; P.shake = S.kick * 1.5 + pulse(S, snapB, 0.4) * 10;
}

// 9. erasing fragments, a cracked heart, challenging god, illegal arguments (254.5-288)
const FRAG = ['0x0', 'nil', '//', '{', '?', '...', '#', '404', '~', ';', '[]', 'NaN'];
function secErase(S) {
  const b = S.b, t = S.t; bg();
  const ox = CX, oy = CY + (b >= EV.challenge ? 250 * smooth((b - EV.challenge) / 1) : 0), orbR = 60 * (b >= EV.challenge ? lerp(1, 0.6, smooth((b - EV.challenge) / 1)) : 1);
  beatRings(S, [EV.e_ifican, EV.e_ifican + 1, EV.maybe, EV.maybe + 1], ox, oy, COL.cy, 400);
  // fragments + eraser sweeps
  if (b < EV.maybe + 1) {
    const s1 = clamp((b - EV.erase) / 1.5), s2 = clamp((b - EV.erase - 2.2) / 1.6);
    const sx1 = lerp(-60, W + 60, s1), sx2 = lerp(W + 60, -60, s2);
    for (let i = 0; i < 60; i++) { const fx = 80 + rnd(i, 1) * (W - 160) + Math.sin(t * 0.7 + i) * 20, fy = 90 + rnd(i, 2) * (H - 180) + Math.cos(t * 0.6 + i) * 20;
      if (Math.hypot(fx - ox, fy - oy) < 150) continue; const keep = rnd(i, 3) < 0.12;
      const hit1 = b >= EV.erase && fx < sx1 ? (b - (EV.erase + 1.5 * (fx + 60) / (W + 120))) : -1; const hit2 = b >= EV.erase + 2.2 && fx > sx2 ? (b - (EV.erase + 2.2 + 1.6 * (W + 60 - fx) / (W + 120))) : -1;
      const hit = keep ? -1 : Math.max(hit1, hit2);
      if (hit > 0) { burst(S, fx, fy, b - hit, 10, COL.dim, 60, 0.6, 3, i); continue; }
      const a = smooth((b - EV.e_ifican - rnd(i, 4) * 1.5) / 0.3) * (keep ? 1 - smooth((b - EV.maybe) / 0.5) : 1);
      if (i % 3) text(FRAG[i % FRAG.length], fx, fy, 20 + rnd(i, 5) * 16, COL.dim, a * 0.8); else { g.save(); g.translate(fx, fy); g.rotate(t * 0.5 + i); g.strokeStyle = COL.dim; g.lineWidth = 2; g.globalAlpha = a * 0.8; g.beginPath(); g.moveTo(-14, 10); g.lineTo(0, -16); g.lineTo(18, 6); g.closePath(); g.stroke(); g.restore(); g.globalAlpha = 1; } }
    for (const [sx_, on] of [[sx1, s1 > 0 && s1 < 1], [sx2, s2 > 0 && s2 < 1]]) if (on) { const lg = g.createLinearGradient(sx_ - 80, 0, sx_ + 80, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(200,245,255,0.55)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.fillRect(sx_ - 80, 0, 160, H); g.fillStyle = '#fff'; g.fillRect(sx_ - 2, 0, 4, H); }
  }
  // small heart forms, then cracks
  if (b >= EV.maybe - 0.2 && b < EV.challenge + 0.6) {
    const a = win(S, EV.maybe - 0.2, EV.challenge + 0.6, 0.3, 0.6), form = easeOut(clamp((b - EV.maybe) / 1.5));
    const crack = clamp((b - EV.dishearten) / 0.5), sep = smooth((b - EV.dishearten - 0.5) / 1) * 34 * (1 - smooth((b - EV.dishearten - 2.8) / 1.2) * 0.7);
    const hx = CX, hy = CY - 20, hs = 200, dim = lerp(1, 0.45, smooth((b - EV.dishearten - 0.5) / 1));
    const zig = [[0, -0.47], [-0.07, -0.25], [0.06, -0.02], [-0.06, 0.22], [0.05, 0.45], [-0.03, 0.68], [0, 0.92]];
    const Z = zig.map(([x, y]) => [hx + x * hs, hy + y * hs]);
    for (const side of [-1, 1]) {
      g.save(); g.beginPath(); g.moveTo(hx + side * 2 * hs, hy - 2 * hs); g.lineTo(Z[0][0], hy - 2 * hs); Z.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(Z[Z.length - 1][0], hy + 2 * hs); g.lineTo(hx + side * 2 * hs, hy + 2 * hs); g.closePath(); g.clip();
      g.translate(hx + side * sep * crack, hy + sep * crack * 0.3); g.rotate(side * sep * 0.004); g.translate(-hx, -hy);
      heartFill(hx, hy, hs * form, COL.mg, a * 0.25 * dim); sPts(xf(HEART, hx, hy, hs * form), crack > 0 ? `rgb(${Math.round(255 * dim)},${Math.round(46 * dim + 60 * (1 - dim))},${Math.round(136 * dim + 60 * (1 - dim))})` : COL.mg, 7, a, clamp(form * 1.2), true);
      g.restore(); }
    if (crack > 0) sPts(Z, '#fff', 3, a * (1 - smooth((b - EV.dishearten - 0.5) / 0.6)), crack);
  }
  // god looms; the tiny process pushes back
  if (b >= EV.challenge - 0.3) {
    const a = smooth((b - EV.challenge + 0.3) / 0.8) * (1 - smooth((b - 287.4) / 0.6));
    const flinch = [EV.challenge + 1.5, EV.challenge + 3.5, EV.challenge + 5.5].reduce((m, bb) => m + pulse(S, bb, 0.3), 0);
    drawEye(CX + (rnd(S.i, 3) - 0.5) * flinch * 20, 280, 980 * (1 - flinch * 0.03), smooth((b - EV.challenge) / 1), COL.mg, a, Math.sin(t * 0.8) * 0.2, 0.8 + flinch * 0.3);
    for (const bb of [EV.challenge + 1.5, EV.challenge + 3.5, EV.challenge + 5.5]) { const p = (b - bb) / 0.5; if (p < 0 || p > 1) continue; g.strokeStyle = COL.cy; g.lineWidth = 14 * (1 - p) + 2; g.globalAlpha = a * (1 - p); g.beginPath(); g.moveTo(ox, oy - 40); g.lineTo(CX + (rnd(bb * 10, 1) - 0.5) * 120, 330); g.stroke(); g.globalAlpha = 1; }
  }
  orb(S, ox, oy, orbR, COL.cy, 1, 1 - smooth((b - 287.4) / 0.6));
  // warnings, then the exception
  if (b >= EV.madesome - 0.2) {
    const a = 1 - smooth((b - 287.4) / 0.6);
    for (let k = 0; k < 10; k++) { const kb = EV.madesome + k * 0.5; if (b < kb) break; const x = 120 + rnd(k, 1) * (W - 640), y = 120 + rnd(k, 2) * (H - 420), e = easeBack((b - kb) / 0.25);
      g.save(); g.translate(x + 200, y + 90); g.scale(e, e); g.translate(-200, -90); winFrame(0, 0, 400, 180, 'warning', a, COL.am, '#150f05');
      g.strokeStyle = COL.am; g.lineWidth = 5; g.globalAlpha = a; g.beginPath(); g.moveTo(70, 150); g.lineTo(110, 70); g.lineTo(150, 150); g.closePath(); g.stroke(); bigText('!', 110, 142, 44, COL.am, a); g.fillStyle = COL.am; g.globalAlpha = a * 0.5; g.fillRect(180, 90, 170, 10); g.fillRect(180, 115, 120, 10); g.restore(); g.globalAlpha = 1; }
    if (b >= EV.illegal - 0.1) { const e = easeBack(clamp((b - EV.illegal) / 0.3)), sh = (pulse(S, EV.illegal, 0.3) + pulse(S, EV.illegal + 1.5, 0.3)) * 12;
      g.save(); g.translate(CX + (rnd(S.i, 7) - 0.5) * sh, CY + (rnd(S.i, 8) - 0.5) * sh); g.scale(e, e);
      winFrame(-620, -220, 1240, 440, 'Error', a, COL.rd, '#16060a');
      bigText('IllegalArgumentException', 0, -60, 64, COL.rd, a);
      ['    at world.execute (world.js:1:1)', '    at you (heart.js:0:0)', '    at me (heart.js:0:0)'].forEach((l, i) => text(l, -520, 20 + i * 44, 24, COL.fg, a * smooth((b - EV.illegal - 0.8 - i * 0.4) / 0.3)));
      g.restore(); }
  }
  P.bloom = 0.85; P.hud = 0.5; P.rgb = S.snare * 3 + (b > EV.illegal ? 5 * S.beat : 0); P.shake = S.kick * 2;
  P.glitch = b > EV.illegal ? 0.2 + 0.4 * pulse(S, EV.illegal, 0.5) + smooth((b - 286) / 2) * 0.4 : 0;
}

// 10. instrumental: kaleidoscope of memories (288-318)
function secKaleido(S) {
  const lb = S.b - 288;
  const prev = g; g = sx; bg();
  const ox = CX + 420, oy = CY;
  drawEntities(S, { cx: ox, cy: oy, R: 190, rad: 60, bend: 1.4 });
  for (let k = 0; k < 3; k++) { const m = rmat(S.t * 0.8 + k, S.t * 0.6 + k * 2, 0); const d = 300 + k * 90; const a = S.t * 0.5 + k * 2.1; drawWire2D(SH[VORDER[(k * 3 + Math.floor(lb / 8)) % 8]], ox + Math.cos(a) * d * 0.8, oy + Math.sin(a) * d * 0.5, m, 60 * (1 + 0.2 * S.kk), [COL.cy, COL.fg, COL.mg][k], 0.9, 1.8); }
  heartFill(ox + 120, oy - 260, 50 * (1 + 0.2 * S.kk), COL.mg, 0.5);
  drawRing(S, ox, oy, 250, { n: 90, len: 110, alpha: 0.6, lw: 3 });
  g = prev; bg();
  const n = lb < 16 ? 6 : 8, seg = PI2 / n, rot = S.t * (lb < 16 ? 0.12 : 0.22), zoom = 1 + 0.06 * S.kk;
  for (let i = 0; i < n; i++) { g.save(); g.translate(CX, CY); g.rotate(i * seg + rot); if (i % 2) g.scale(1, -1); g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 1300, -seg / 2 - 0.004, seg / 2 + 0.004); g.closePath(); g.clip(); g.scale(zoom, zoom); g.drawImage(SUB, -W / 2, -H / 2); g.restore(); }
  g.fillStyle = COL.fg; g.globalAlpha = 0.9; g.beginPath(); g.arc(CX, CY, 6 + 10 * S.kk, 0, PI2); g.fill(); g.globalAlpha = 1;
  const red = smooth((S.b - 315.5) / 2.5); if (red > 0) { g.fillStyle = '#12020a'; g.globalAlpha = red; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  P.bloom = 0.9; P.hud = 0.5; P.rgb = S.snare * 5; P.shake = S.kk * 2;
}

// 11. twelve executions, the count to six (318-350.5)
function secExec(S) {
  const b = S.b, t = S.t; bg('#07030a');
  drawTunnel(S, { rate: 1, life: 5, alpha: 0.35 + 0.2 * clamp((b - 318) / 30), twist: 1.3, cols: [COL.rd, COL.am], pow: 2 });
  drawStreaks(S, 90, 0.7 + (b - 318) * 0.03, 0.2, COL.rd);
  const execs = []; for (let k = 0; k < 12; k++) execs.push(EV['exec' + k]);
  const R = 360;
  for (let k = 0; k < 12; k++) { const kb = execs[k], an = -Math.PI / 2 + k / 12 * PI2, x = CX + Math.cos(an) * R, y = CY + Math.sin(an) * R * 0.82;
    if (b < kb) { drawWire2D(SH.cube, x, y, rmat(t + k, t * 0.8 + k, 0), 34 * (1 + 0.15 * S.kick), COL.fg, 0.85 * smooth((b - 318) / 0.5), 1.6); text(`p${String(k + 1).padStart(2, '0')}`, x, y + 62, 15, COL.dim, 1, 'center'); }
    else { const p = (b - kb) / 0.6; if (p < 1) { g.strokeStyle = '#fff'; g.lineWidth = 16 * (1 - p) + 2; g.globalAlpha = 1 - p; g.beginPath(); g.moveTo(x + (rnd(k, 1) - 0.5) * 80, 0); g.lineTo(x + (rnd(k, 2) - 0.5) * 40, y * 0.5); g.lineTo(x, y); g.stroke(); g.globalAlpha = 1; }
      burst(S, x, y, kb, 50, COL.rd, 240, 1.3, 5, k * 7); burst(S, x, y, kb, 20, '#fff', 140, 0.8, 3, k * 7 + 3); } }
  // counter
  let done = 0; for (const kb of execs) if (b >= kb) done++;
  if (b < EV.count12 - 0.2 && done > 0) { const lastB = execs[done - 1], pop = 1 + 0.3 * pulse(S, lastB, 0.25); g.save(); g.translate(CX, CY); g.scale(pop, pop);
    text('execute', 0, -60, 30, COL.dim, 1, 'center'); bigText(`${String(done).padStart(2, '0')}/12`, 0, 45, 120, COL.rd, 1); g.restore(); }
  // the count to six
  if (b >= EV.count12 - 0.2) {
    const a = 1 - smooth((b - EV.exec_final_count) / 0.4);
    for (let k = 0; k < 6; k++) { const kb = EV.count12 + k; if (b < kb) break; const u = b - kb, hit = easeBack(clamp(u / 0.2)), mvp = easeOut(clamp((u - 0.35) / 0.4));
      const x = lerp(CX, CX + (k - 2.5) * 230, mvp), y = lerp(CY + 60, 250, mvp), s = lerp(420, 150, mvp) * hit;
      bigText(String(k + 1), x, y + s * 0.35, s, [COL.cy, COL.mg, COL.am, '#b8ff5c', COL.fg, COL.rd][k], a);
      text((k + 1).toString(2).padStart(3, '0'), x, y + s * 0.35 + 50, 22, COL.dim, a * mvp, 'center'); }
  }
  if (b >= EV.exec_final_count - 0.1) { const e = easeBack(clamp((b - EV.exec_final_count) / 0.3)), a = 1 - smooth((b - 350.2) / 0.3); bigText('execute()', CX, CY + 60, 150 * e, '#fff', a); }
  let hot = 0; for (const kb of execs) hot = Math.max(hot, pulse(S, kb, 0.3));
  P.bloom = 1.0; P.hud = 0.5; P.rgb = S.snare * 4 + hot * 10; P.shake = hot * 14 + S.kick * 2; P.glitch = hot * 0.35;
}

// 12. final chorus: execute them all, lock on, have you back, run, trapped (350.5-382.5)
function secFinal(S) {
  const b = S.b, t = S.t; bg();
  const hor = 610, sy = hor - 200, R = 250 * (1 + 0.05 * S.kk);
  const surge = b >= EV.f_run ? 1 + pulse(S, EV.f_run + 1, 1.2) : 1;
  g.save(); g.translate(CX, CY); g.rotate(Math.sin(t * 0.5) * 0.04); g.scale(1.08, 1.08); g.translate(-CX, -CY);
  stars2D(S, 200, hor - 20, 0.9);
  // "them": grey processes filling the sky, wiped by two beams
  const beam1 = clamp((b - EV.f_givethem) / 2), beam2 = clamp((b - EV.f_givethem - 2.5) / 1.8);
  const by1 = lerp(-20, hor, easeIn(beam1)), by2 = lerp(hor, -20, easeIn(beam2));
  for (let i = 0; i < 220; i++) { const x = rnd(i, 1) * W, y = 40 + rnd(i, 2) * (hor - 80); if (Math.hypot(x - CX, y - sy) < R + 60) continue;
    const appear = EV.f_ifican + rnd(i, 3) * 2.5; if (b < appear) continue; const kill = rnd(i, 4) < 0.6 ? EV.f_givethem + 2 * Math.sqrt(clamp((y + 20) / (hor + 20))) : EV.f_givethem + 2.5 + 1.8 * Math.sqrt(clamp((hor - y) / (hor + 20)));
    if (b >= kill) { burst(S, x, y, kill, 8, '#ccc', 50, 0.5, 3, i); continue; }
    g.fillStyle = '#8a95a8'; g.globalAlpha = smooth((b - appear) / 0.3) * 0.85; g.fillRect(x - 3, y - 3, 6, 6); }
  g.globalAlpha = 1;
  for (const [yy, on] of [[by1, beam1 > 0 && beam1 < 1], [by2, beam2 > 0 && beam2 < 1]]) if (on) { const lg = g.createLinearGradient(0, yy - 60, 0, yy + 60); lg.addColorStop(0, 'rgba(255,60,90,0)'); lg.addColorStop(0.5, 'rgba(255,120,150,0.6)'); lg.addColorStop(1, 'rgba(255,60,90,0)'); g.fillStyle = lg; g.fillRect(0, yy - 60, W, 120); g.fillStyle = '#fff'; g.fillRect(0, yy - 2, W, 4); }
  drawSun(CX, sy, R, '#ffd36b', COL.mg, S);
  g.fillStyle = '#07040b'; g.beginPath(); g.arc(CX, sy, R * 0.82, 0, PI2); g.fill(); g.strokeStyle = COL.pk; g.lineWidth = 2 + 3 * S.kk; g.globalAlpha = 0.8; g.stroke(); g.globalAlpha = 1;
  drawRing(S, CX, sy, R + 40, { col: COL.am, len: 150, alpha: 0.75, rot: -t * 0.1 });
  drawTerrain(S, { hor, camH: 250, speed: (760 + 200 * S.kk) * surge, amp: 330 + 80 * S.low, rip: 1.4, fill: '#0b0612', line: COL.mg, alpha: 1, cols: true, lw: 1.6 });
  g.restore();
  const hx = CX, hy = sy * 1.08 - 30;
  drawHeart(S, hx, hy + 12, 135, { edge: '#fff2d6', core: COL.mg, spin: 1.2, pulse: S.kk + 0.8 * pulse(S, EV.f_haveback + 2, 0.6) });
  beatRings(S, [EV.f_ifican, EV.f_ifican + 1, EV.f_thencan, EV.f_thencan + 1], hx, hy, COL.pk, 600);
  // lock-on reticle
  if (b >= EV.f_thencan - 0.2 && b < EV.f_haveback + 0.5) { const a = win(S, EV.f_thencan - 0.2, EV.f_haveback + 0.5, 0.3, 0.5), lock = easeOut(clamp((b - EV.f_onlyexec) / 0.6)), r = lerp(380, 250, lock), rot = t * (1 - lock) * 2;
    g.save(); g.translate(hx, hy); g.rotate(rot); g.strokeStyle = lock > 0.9 ? COL.rd : '#fff'; g.lineWidth = 5; g.globalAlpha = a;
    for (let q = 0; q < 4; q++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(r, -60); g.lineTo(r, -r * 0 + -r + r); g.moveTo(r - 60, -r + 0); g.stroke(); g.beginPath(); g.moveTo(r * 0.72, -r * 0.72 + 70); g.lineTo(r * 0.72, -r * 0.72); g.lineTo(r * 0.72 - 70, -r * 0.72); g.stroke(); }
    g.restore(); g.globalAlpha = 1; if (lock > 0.9) text('LOCKED', hx, hy + r + 60, 26, COL.rd, a, 'center'); }
  // have you back: magenta returns from the horizon
  const cyX = hx - 70, mgT = [hx + 70, hy];
  orb(S, cyX, hy, 34, COL.cy, 1, smooth((b - EV.f_ifican) / 0.5));
  if (b >= EV.f_haveback - 0.2) { const u = easeOut(clamp((b - EV.f_haveback) / 2)); const x = lerp(CX + 20, mgT[0], u), y = lerp(hor + 10, mgT[1], u) - Math.sin(u * Math.PI) * 260; orb(S, x, y, lerp(6, 34, u), COL.mg, 2, smooth((b - EV.f_haveback + 0.2) / 0.3));
    burst(S, mgT[0], mgT[1], EV.f_haveback + 2, 90, COL.pk, 420, 1.4, 5, 31); }
  if (b >= EV.f_run - 0.2 && b < EV.f_trapped + 0.3) { const a = win(S, EV.f_run - 0.2, EV.f_trapped + 0.3, 0.2, 0.4); g.globalAlpha = a; g.fillStyle = '#0d1a12'; g.fillRect(CX - 170, 900, 340, 90); g.strokeStyle = '#7dff9a'; g.lineWidth = 4; g.strokeRect(CX - 170, 900, 340, 90); g.globalAlpha = 1; bigText('RUN ▶', CX, 962, 54, '#e9ffe9', a); }
  if (b >= EV.f_trapped - 0.1) { const drop = easeIn(clamp((b - EV.f_trapped) / 0.45)), sq = 1 - smooth((b - EV.f_trapped2) / 4) * 0.35, spin = t * (0.4 + smooth((b - EV.f_trapped2) / 3) * 2.5);
    drawCage(hx, hy + 20 - (1 - drop) * 900, 230 * sq, spin, 1, '#fff'); if (b >= EV.f_trapped + 0.45) burst(S, hx, hy + 250, EV.f_trapped + 0.45, 50, '#fff', 420, 0.9, 4, 41);
    const ah = smooth((b - EV.f_trapped2 - 1) / 3.5); if (ah > 0) { const gr = g.createRadialGradient(hx, hy, 0, hx, hy, 900); gr.addColorStop(0, `rgba(255,220,235,${0.5 * ah})`); gr.addColorStop(1, 'rgba(255,220,235,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); } }
  P.bloom = 1.0; P.hud = 0.5; P.rgb = S.snare * 7 + S.hit * 2; P.shake = S.kk * 5; P.glitch = S.hit > 0.95 ? 0.25 : 0;
}

// 13. studied, the algebra of love, free / trapped (382.5-416)
const NOTES = ['∫ f(x) dx', 'Σ a_n x^n', '∂ψ/∂t', 'e^{iπ} + 1 = 0', '∇ · E = ρ/ε', 'lim h→0', 'f′(x) > 0', 'P(A|B)'];
function secLove(S) {
  const b = S.b, t = S.t; bg();
  graphPaper(0.8, CX, CY + 40, 70, b >= EV.algebra);
  // notebook
  if (b < EV.algebra + 0.6) {
    const a = smooth((b - 382.5) / 0.4) * (1 - smooth((b - EV.algebra) / 0.6)); const flip = b >= 384.5 ? Math.abs(Math.cos(clamp((b - 384.5) / 0.5) * Math.PI)) : 1; const page2 = b >= 384.75;
    g.save(); g.translate(CX - 60, CY + 20); g.rotate(-0.035); g.scale(flip, 1);
    const pw = 1000, ph = 660; g.globalAlpha = a; g.fillStyle = XC.paper; g.fillRect(-pw / 2, -ph / 2, pw, ph); g.strokeStyle = COL.fg; g.lineWidth = 2; g.strokeRect(-pw / 2, -ph / 2, pw, ph);
    g.strokeStyle = COL.cy; g.globalAlpha = a * 0.2; g.beginPath(); for (let y = -ph / 2 + 70; y < ph / 2; y += 52) { g.moveTo(-pw / 2 + 10, y); g.lineTo(pw / 2 - 10, y); } g.stroke();
    g.strokeStyle = COL.mg; g.globalAlpha = a * 0.5; g.beginPath(); g.moveTo(-pw / 2 + 90, -ph / 2); g.lineTo(-pw / 2 + 90, ph / 2); g.stroke(); g.globalAlpha = 1;
    if (!page2) { for (let k = 0; k < 8; k++) { const kb = 382.5 + k * 0.25; if (b < kb) break; text(typed(NOTES[k], tb(kb), S.t, 40), -pw / 2 + 120, -ph / 2 + 60 + k * 52 + 52, 30, COL.fg, a * 0.9); } }
    else {
      const d = clamp((b - EV.properly) / 1.4); sPts(xf(HEART, 0, 0, 200), COL.mg, 6, a, d, true);
      const q = clamp((b - EV.properly - 1.4) / 1);
      if (q > 0) { g.strokeStyle = COL.am; g.lineWidth = 2; g.globalAlpha = a * q; g.beginPath(); g.moveTo(-200, 250); g.lineTo(200, 250); g.moveTo(-200, 238); g.lineTo(-200, 262); g.moveTo(200, 238); g.lineTo(200, 262); g.moveTo(290, -170); g.lineTo(290, 200); g.moveTo(278, -170); g.lineTo(302, -170); g.moveTo(278, 200); g.lineTo(302, 200); g.stroke(); g.globalAlpha = 1;
        text('w', 0, 290, 28, COL.am, a * q, 'center'); text('h', 320, 20, 28, COL.am, a * q); g.strokeStyle = COL.am; g.globalAlpha = a * q; g.beginPath(); g.arc(0, 200, 60, -Math.PI * 0.75, -Math.PI * 0.25); g.stroke(); g.globalAlpha = 1; text('θ', 0, 120, 26, COL.am, a * q, 'center'); }
      // question marks around, turning into hearts
      for (let k = 0; k < 12; k++) { const qb = EV.question + k * 0.33, abx = EV.answer + k * 0.33; if (b < qb) break; const an = k / 12 * PI2 + 0.2, rx = Math.cos(an) * 560, ry = Math.sin(an) * 320;
        const e = easeBack((b - qb) / 0.25), fl = clamp((b - abx) / 0.25), sc = Math.abs(Math.cos(fl * Math.PI));
        g.save(); g.translate(rx, ry); g.scale(sc * e, e); if (fl < 0.5) bigText('?', 0, 30, 90, COL.am, a); else heartFill(0, 0, 44, COL.mg, a); g.restore(); }
    }
    g.restore();
  }
  // the algebraic expression
  if (b >= EV.algebra - 0.2) {
    const a = smooth((b - EV.algebra + 0.2) / 0.5), hx = CX, hy = CY + 80, hs = 330;
    const eq = '(x² + y² − 1)³ − x²y³ = 0'; text(typed(eq, tb(EV.algebra), S.t, 26), CX, 150, 64, '#fff', a, 'center', 'bold');
    const d = clamp((b - EV.algebra - 1) / 3), pts = xf(AHEART, hx, hy, hs);
    const cage = smooth((b - EV.iam) / 0.8), glow = 0.3 + 0.2 * S.kk + 0.4 * pulse(S, Math.floor(b), 0.5) * (b > EV.algebra + 4 ? 1 : 0);
    fPts(pts, COL.mg, a * d * d * glow * 0.5);
    sPts(pts, COL.mg, 8 + cage * 4, a, d, true); sPts(pts, '#fff', 2.5, a * 0.9, d, true);
    if (d < 1) { const i = Math.floor(d * (pts.length - 1)); orb(S, pts[i][0], pts[i][1], 16, '#fff', 3, a); }
    if (cage > 0) { g.save(); drawPts(pts, 1, true); g.clip(); g.strokeStyle = '#fff'; g.lineWidth = 5; g.globalAlpha = a * cage; g.beginPath(); for (let k = -7; k <= 7; k++) { const x = hx + k * 44; g.moveTo(x, hy - hs * 1.3 + (1 - cage) * 600); g.lineTo(x, hy + hs * 1.3); } g.stroke(); g.restore(); g.globalAlpha = 1; }
    const inA = smooth((b - EV.algebra - 4.3) / 0.6);
    orb(S, hx - 70, hy + 20, 44, COL.cy, 1, inA);
    if (inA > 0) { const fu = easeIn(clamp((b - EV.free) / 2.2)); orb(S, hx + 70 + fu * 500, hy + 20 - fu * 1100, 44, COL.mg, 2, inA * (1 - smooth((fu - 0.8) / 0.2)));
      if (fu > 0) for (let k = 0; k < 30; k++) { const p = fu - k * 0.02; if (p < 0) break; g.fillStyle = COL.pk; g.globalAlpha = (1 - k / 30) * 0.6 * inA; g.fillRect(hx + 70 + p * 500 + (rnd(k, 1) - 0.5) * 20, hy + 20 - p * 1100 + (rnd(k, 2) - 0.5) * 20, 4, 4); } g.globalAlpha = 1; }
    if (b >= EV.trappedlove) drawLock(hx, hy + hs * 1.18, 46, smooth((b - EV.trappedlove - 0.5) / 0.3), '#fff', smooth((b - EV.trappedlove) / 0.3));
  }
  P.bloom = 0.95; P.hud = 0.4; P.rgb = S.snare * 2; P.shake = S.kick * 1.5;
}

// 14. outro: alone in the heart cage while the world falls apart (416-448)
const KLOG2 = [[0, 'kernel: world.execute: returned'], [3, 'kernel: subject 0x02: disconnected'], [6, 'kernel: releasing 65536 MB'], [10, 'kernel: observer 0x01: still running'], [15, 'kernel: heartbeat ... ok'], [20, 'kernel: waiting for reconnect'], [26, 'kernel: 1 process remaining']];
function secOutro(S) {
  const b = S.b, lb = b - 416, tt = S.t - tb(416); bg();
  const fade = 1 - smooth(lb / 26);
  if (fade > 0) drawTerrain(S, { hor: 620, camH: 250, speed: 300 * fade + 60, amp: 300, rip: 0, fill: '#060810', line: '#8a95a8', alpha: fade * 0.7, dots: true, fall: tt / 9 });
  const hx = CX, hy = CY + 40, hs = 330 * lerp(1, 0.75, smooth(lb / 20));
  const shatter = b >= EV.last_exec ? clamp((b - EV.last_exec) / 1.5) : 0;
  const pts = xf(AHEART, hx, hy, hs);
  if (shatter <= 0) { sPts(pts, COL.mg, 7, 0.9 * lerp(1, 0.6, smooth(lb / 16)), 1, true);
    g.save(); drawPts(pts, 1, true); g.clip(); g.strokeStyle = '#fff'; g.lineWidth = 4; g.globalAlpha = 0.6; g.beginPath(); for (let k = -7; k <= 7; k++) { const x = hx + k * 44 * hs / 330; g.moveTo(x, hy - hs * 1.3); g.lineTo(x, hy + hs * 1.3); } g.stroke(); g.restore(); g.globalAlpha = 1; }
  else { for (let i = 0; i < pts.length; i += 3) { const [x, y] = pts[i], a = rnd(i, 1) * PI2, v = 200 + rnd(i, 2) * 600; g.fillStyle = COL.mg; g.globalAlpha = 1 - shatter; g.fillRect(x + Math.cos(a) * v * shatter, y + Math.sin(a) * v * shatter + shatter * shatter * 300, 5, 5); } g.globalAlpha = 1; }
  orb(S, hx, hy + 20, 40 * (1 + 0.2 * S.kick), COL.cy, 1, 1 - shatter * 0.3);
  if (b >= EV.last_exec) { const p = (b - EV.last_exec) / 0.6; if (p < 1) { g.strokeStyle = '#fff'; g.lineWidth = 30 * (1 - p) + 2; g.globalAlpha = 1 - p; g.beginPath(); g.moveTo(hx, 0); g.lineTo(hx, hy); g.stroke(); g.globalAlpha = 1; } }
  const y0 = H - 100 - KLOG2.length * 30;
  for (let k = 0; k < KLOG2.length; k++) { const [bb, s] = KLOG2[k]; const ts = tb(416 + bb); if (S.t < ts) break; text(`[${ts.toFixed(2).padStart(7, ' ')}] ` + typed(s, ts, S.t, 50), 90, y0 + k * 30, 17, k === 3 ? COL.cy : COL.dim, 0.9); }
  P.bloom = 0.85; P.hud = 0.5 * (1 - smooth((lb - 24) / 4)); P.scan = 0.4; P.rgb = S.kick * 2; P.glitch = lb < 1 ? (1 - lb) * 0.4 : 0;
  const t1 = tb(446.5), t2 = END_T; if (S.t > t1) P.crt = clamp((S.t - t1) / (t2 - t1));
}
function secEnd(S) {
  bg('#000'); const t = S.t, e = END_T;
  const dot = 1 - clamp((t - e) / 0.35); if (dot > 0) { g.fillStyle = '#fff'; g.globalAlpha = dot; g.beginPath(); g.arc(CX, CY, 3 + 10 * dot, 0, PI2); g.fill(); g.globalAlpha = 1; }
  const s1 = typed('// end of execution', e + 0.6, t, 20); text(s1, CX - 190, CY, 32, COL.fg, 0.9);
  if (t > e + 0.6 && t < e + 2.0 && frac(t * 2) < 0.5) { g.fillStyle = COL.fg; g.fillRect(CX - 190 + s1.length * 19.3 + 4, CY - 26, 17, 32); }
  const ca = smooth((t - e - 2.0) / 0.8);
  text('music   Mili — world.execute(me);', CX - 190, CY + 60, 18, COL.dim, ca); text('visual  fan-made lyric-synced MV', CX - 190, CY + 88, 18, COL.dim, ca);
  P.scan = 0.5; P.fadeOut = clamp((A.duration - t) / 0.5);
}

// ================================================================= frame
const FLASH2 = [[32, 0.9, 0.22], [EV.unite + 2.5, 0.7, 0.3], [128, 0.9, 0.22], [EV.ch_run + 1.1, 0.6, 0.25], [EV.completion + 0.5, 0.5, 0.25], [EV.illegal, 0.5, 0.2],
  ...Array.from({ length: 12 }, (_, k) => [EV['exec' + k], 0.35, 0.15]), [EV.exec_final_count, 0.8, 0.3], [352, 1.0, 0.25], [EV.f_haveback + 2, 0.6, 0.3], [EV.f_run + 1, 0.5, 0.25], [EV.f_trapped + 0.45, 0.5, 0.2], [382.5, 0.8, 0.3], [EV.last_exec, 0.9, 0.3]];
function flash2(S) { let f = 0; for (const [b, s, d] of FLASH2) { const dt = S.t - tb(b); if (dt >= 0 && dt < 1.5) f = Math.max(f, s * Math.exp(-dt / d)); } return f; }
function drawFrame(i) {
  const S = state(i);
  P = { bloom: 0, glitch: 0, rgb: 0, shake: 0, hud: 0, scan: 0, strobe: 0, zoomBlur: 0, crt: 0, fadeIn: 1, fadeOut: 1 };
  g = ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.textAlign = 'left';
  const b = S.b;
  if (S.t >= END_T) secEnd(S);
  else if (b < 32) secBoot(S);
  else if (b < 60.5) secFlight(S);
  else if (b < 94.5) secMath(S);
  else if (b < 126) secTravel(S);
  else if (b < 158.5) secChorus(S);
  else if (b < 190.5) secFood(S);
  else if (b < 222) secSwitch(S);
  else if (b < 254.5) secLeave(S);
  else if (b < 288) secErase(S);
  else if (b < 318) secKaleido(S);
  else if (b < 350.5) secExec(S);
  else if (b < 382.5) secFinal(S);
  else if (b < 416) secLove(S);
  else secOutro(S);
  g = ctx;
  bloom(P.bloom);
  drawHUD(S, P.hud);
  glitch(P.glitch, S.i >> 1);
  rgbSplit(Math.min(14, P.rgb));
  shake(P.shake, S.i);
  if (P.strobe) { ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
  const fl = flash2(S); if (fl > 0.01) { ctx.fillStyle = '#fff'; ctx.globalAlpha = Math.min(1, fl); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (P.crt > 0) {
    snapshot(tx); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const p = P.crt, sy = Math.max(0.003, 1 - easeIn(Math.min(1, p / 0.7)) * 0.997), sxx = p > 0.7 ? Math.max(0.004, 1 - easeOut((p - 0.7) / 0.3)) : 1;
    ctx.drawImage(TMP, W / 2 - W * sxx / 2, H / 2 - H * sy / 2, W * sxx, H * sy);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ffffff'; ctx.globalAlpha = clamp(p * 2.5); const lh_ = Math.max(2, Math.min(6, H * sy * 0.04)); ctx.fillRect(W / 2 - W * sxx / 2, H / 2 - lh_ / 2, W * sxx, lh_); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  if (P.scan > 0) { ctx.globalAlpha = P.scan; ctx.drawImage(SCAN, 0, 0); ctx.globalAlpha = 1; }
  ctx.drawImage(VIG, 0, 0);
  const fo = Math.min(P.fadeIn, P.fadeOut); if (fo < 1) { ctx.fillStyle = '#000'; ctx.globalAlpha = 1 - fo; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
window.renderFrame = i => { drawFrame(i); return cv.toDataURL('image/jpeg', 0.93); };
window.NFRAMES = A.nframes;
window.READY = true;
