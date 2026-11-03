// Baut das Logo-Paket „Kompakt“ (brand/logo/) mit in Pfade umgewandelter Schrift
// und legt die Website-Marke nach public/logo-mark.svg.
//
// opentype.js ist bewusst KEINE Dependency des Projekts (Regel 8). Ausführen mit:
//   npm i --no-save --prefix /tmp/pk-logo opentype.js@1.3.4
//   NODE_PATH=/tmp/pk-logo/node_modules node brand/logo/build.cjs
// Danach Raster neu erzeugen (rsvg-convert, ImageMagick) – siehe README.md.
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');

const REPO = path.resolve(__dirname, '../..');
const OUT = path.join(REPO, 'brand/logo');
fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });

const FS = path.join(REPO, 'node_modules/@fontsource');
const load = f => { const b = fs.readFileSync(f); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const inter900 = load(`${FS}/inter/files/inter-latin-900-normal.woff`);
const mono500 = load(`${FS}/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff`);

const C = { ink: '#1c1917', paper: '#fafaf9', accent: '#ea580c', subLight: '#78716c', subDark: '#a8a29e', night: '#0c0a09' };

/* Text → Pfad, mit Kerning + Laufweite (em). Liefert d + Bounding-Box. */
function textPath(font, text, size, x, y, lsEm = 0) {
  const glyphs = font.stringToGlyphs(text), scale = size / font.unitsPerEm;
  let cx = x, d = '';
  const bb = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  glyphs.forEach((g, i) => {
    const p = g.getPath(cx, y, size);
    d += p.toPathData(2);
    const b = p.getBoundingBox();
    if (b.x1 !== b.x2) { bb.x1 = Math.min(bb.x1, b.x1); bb.y1 = Math.min(bb.y1, b.y1); bb.x2 = Math.max(bb.x2, b.x2); bb.y2 = Math.max(bb.y2, b.y2); }
    cx += g.advanceWidth * scale + lsEm * size;
    if (i < glyphs.length - 1) cx += font.getKerningValue(g, glyphs[i + 1]) * scale;
  });
  return { d, bb };
}
/* Text so setzen, dass seine Box bei (cx, cy) zentriert ist */
function centered(font, text, size, cx, cy, lsEm) {
  const probe = textPath(font, text, size, 0, 0, lsEm).bb;
  return textPath(font, text, size, cx - (probe.x1 + probe.x2) / 2, cy - (probe.y1 + probe.y2) / 2, lsEm);
}

/* ── Marke: 64er-Raster, Ecken als gefüllte Flächen (Strich 5.5, eckige Enden) ── */
const corners = (() => {
  const t = 5.5, o = 6 - t / 2, L = 19 + t / 2; // o=3.25, L=21.75
  const tl = [[o, o], [L, o], [L, o + t], [o + t, o + t], [o + t, L], [o, L]];
  const tf = (pts, fx, fy) => pts.map(([x, y]) => [fx ? 64 - x : x, fy ? 64 - y : y]);
  return [tl, tf(tl, 1, 0), tf(tl, 1, 1), tf(tl, 0, 1)]
    .map(p => 'M' + p.map(([x, y]) => `${+x.toFixed(2)} ${+y.toFixed(2)}`).join('L') + 'Z').join('');
})();
const pk = centered(inter900, 'PK', 27, 32, 32, -1.4 / 27);

const markInner = (letters, frame) => `<path fill="${frame}" d="${corners}"/><path fill="${letters}" d="${pk.d}"/>`;
const svg = (w, h, inner, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"${extra}>${inner}</svg>\n`;

const files = {};
files['pkrason-mark.svg'] = svg(64, 64, markInner(C.ink, C.accent));
files['pkrason-mark-dark.svg'] = svg(64, 64, markInner(C.paper, C.accent));
files['pkrason-mark-mono-black.svg'] = svg(64, 64, markInner('#000', '#000'));
files['pkrason-mark-mono-white.svg'] = svg(64, 64, markInner('#fff', '#fff'));

/* Favicon: transparent, folgt hell/dunkel des Systems */
files['favicon.svg'] = svg(64, 64,
  `<style>.l{fill:${C.ink}}@media (prefers-color-scheme:dark){.l{fill:${C.paper}}}</style><path fill="${C.accent}" d="${corners}"/><path class="l" d="${pk.d}"/>`);

/* App-Icon: deckende Fläche, Marke mit Innenabstand (für apple-touch, Manifest, ICO) */
const appIcon = (bg, letters) => svg(64, 64, `<rect width="64" height="64" fill="${bg}"/><g transform="translate(32 32) scale(.74) translate(-32 -32)">${markInner(letters, C.accent)}</g>`);
files['app-icon.svg'] = appIcon(C.paper, C.ink);
files['app-icon-dark.svg'] = appIcon(C.night, C.paper);

/* ── Lockups ── */
const NAME = 'Pascal Krason', SUB = 'Softwareentwicklung & Architektur';
// Horizontal: Marke links (oder rechts bei reversed), Name + Zusatz daneben
function lockH(nameFill, subFill, { sub = SUB, frame = C.accent, reversed = false, letters = nameFill } = {}) {
  const gap = 18;
  const n0 = textPath(inter900, NAME, 28, 0, 31.5, -0.035), s0 = textPath(mono500, sub, 11.6, 0, 49.5, 0.02);
  const tw = Math.max(n0.bb.x2, s0.bb.x2 + 0.6);
  if (!reversed) {
    const x0 = 64 + gap;
    const n = textPath(inter900, NAME, 28, x0, 31.5, -0.035), s = textPath(mono500, sub, 11.6, x0 + 0.6, 49.5, 0.02);
    return svg(Math.ceil(x0 + tw + 2), 64, `${markInner(letters, frame)}<path fill="${nameFill}" d="${n.d}"/><path fill="${subFill}" d="${s.d}"/>`);
  }
  // Text rechtsbündig vor der Marke
  const W = Math.ceil(tw + gap + 64 + 2), right = W - 64 - gap;
  const n = textPath(inter900, NAME, 28, right - n0.bb.x2, 31.5, -0.035), s = textPath(mono500, sub, 11.6, right - s0.bb.x2, 49.5, 0.02);
  return svg(W, 64, `<g transform="translate(${W - 64} 0)">${markInner(letters, frame)}</g><path fill="${nameFill}" d="${n.d}"/><path fill="${subFill}" d="${s.d}"/>`);
}
function lockV(nameFill, subFill, { sub = SUB, frame = C.accent, letters = nameFill } = {}) {
  const W = 260, m = 96, mx = (W - m) / 2;
  const n = centered(inter900, NAME, 30, W / 2, m + 34, -0.035);
  const s = centered(mono500, sub, 12, W / 2, m + 60, 0.02);
  return svg(W, Math.ceil(s.bb.y2 + 4), `<g transform="translate(${mx} 0) scale(${m / 64})">${markInner(letters, frame)}</g><path fill="${nameFill}" d="${n.d}"/><path fill="${subFill}" d="${s.d}"/>`);
}
function wordmark(fill) {
  const bb = textPath(inter900, NAME, 28, 0, 0, -0.035).bb;
  const t = textPath(inter900, NAME, 28, -bb.x1 + 1, -bb.y1 + 1, -0.035);
  return svg(Math.ceil(bb.x2 - bb.x1 + 2), Math.ceil(bb.y2 - bb.y1 + 2), `<path fill="${fill}" d="${t.d}"/>`);
}
files['pkrason-lockup.svg'] = lockH(C.ink, C.subLight);
files['pkrason-lockup-dark.svg'] = lockH(C.paper, C.subDark);
files['pkrason-lockup-stacked.svg'] = lockV(C.ink, C.subLight);
files['pkrason-lockup-stacked-dark.svg'] = lockV(C.paper, C.subDark);
files['pkrason-wordmark.svg'] = wordmark(C.ink);
files['pkrason-wordmark-dark.svg'] = wordmark(C.paper);

/* ── Druck / Rechnung ── */
const GRAY = { frame: '#8a8580', text: '#000000', sub: '#4a4a4a' };
const druck = {
  'pkrason-briefkopf': lockH(C.ink, C.subLight),
  'pkrason-briefkopf-domain': lockH(C.ink, C.subLight, { sub: 'pkrason.de' }),
  'pkrason-briefkopf-rechts': lockH(C.ink, C.subLight, { reversed: true }),
  'pkrason-briefkopf-graustufen': lockH(GRAY.text, GRAY.sub, { frame: GRAY.frame }),
  'pkrason-briefkopf-schwarz': lockH('#000', '#000', { frame: '#000' }),
  'pkrason-briefkopf-weiss': lockH('#fff', '#fff', { frame: '#fff' }),
  'pkrason-gestapelt': lockV(C.ink, C.subLight),
  'pkrason-gestapelt-schwarz': lockV('#000', '#000', { frame: '#000' }),
  'pkrason-marke': svg(64, 64, markInner(C.ink, C.accent)),
  'pkrason-marke-graustufen': svg(64, 64, markInner(GRAY.text, GRAY.frame)),
  'pkrason-marke-schwarz': svg(64, 64, markInner('#000', '#000')),
};
fs.mkdirSync(path.join(OUT, 'druck'), { recursive: true });
for (const [f, c] of Object.entries(druck)) fs.writeFileSync(path.join(OUT, 'druck', f + '.svg'), c);

/* ── Website-Marke ── */
fs.copyFileSync(path.join(OUT, 'svg', 'pkrason-mark.svg'), path.join(REPO, 'public/logo-mark.svg'));
