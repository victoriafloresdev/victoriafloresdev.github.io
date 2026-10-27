// The world of the Arcane Archive: a night-time valley painted procedurally in
// pixel art. Layers scroll at different speeds (parallax); props are the places
// a visitor can open (projects, research, experience, about, contact).
import { ICONS, type IconData, type IconName } from './icons';
import { PB, bayer, hex, noise1, rng, type RGB } from './pixel';

export const H = 360; // logical pixel height of the game view
export const WORLD_W = 2400; // logical width of the walkable world
export const PATH_TOP = 302; // where the dirt path starts
export const FEET_Y = 322; // baseline the characters stand on
const VIEW_MAX = 960; // widest logical view we support

export type PanelId = 'projects' | 'research' | 'experience' | 'about' | 'contact';

export interface Hotspot {
  id: PanelId | 'classic';
  label: string;
  flavor: string;
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  standX: number;
  icon: IconName;
  markerY: number;
  ring: HTMLCanvasElement; // gold highlight drawn on hover
  ringX: number;
  ringY: number;
}

export interface Light {
  x: number;
  y: number;
  r: number;
  kind: 'warm' | 'fire' | 'jade' | 'window';
}

export interface Layer {
  canvas: HTMLCanvasElement;
  parallax: number;
}

export const C = {
  outline: hex('#120c10'),
  stone: hex('#6a685f'),
  stoneL: hex('#8a877c'),
  stoneD: hex('#4e4c46'),
  wood: hex('#5a3b26'),
  woodL: hex('#7a5233'),
  woodD: hex('#3e2819'),
  plaster: hex('#d3c19b'),
  plasterD: hex('#b5a27c'),
  red: hex('#b84a3a'),
  redL: hex('#d9644f'),
  redD: hex('#7a2b22'),
  gold: hex('#c6a15b'),
  goldD: hex('#8a6a3a'),
  glow: hex('#f0c060'),
  glowL: hex('#f8dc94'),
  cream: hex('#ede3cc'),
  paper: hex('#e8dcc0'),
  paperD: hex('#c4b28f'),
  ink: hex('#7d6c52'),
  roof: hex('#2b3a45'),
  roofL: hex('#3a4d5a'),
  roofD: hex('#1d2830'),
  jade: hex('#2f6f68'),
  moss: hex('#2f5a3e'),
  mossL: hex('#4a7d4c'),
  leaf: hex('#3f7a46'),
};

// ─── sky ─────────────────────────────────────────────────────────────────────
export function buildSky(): HTMLCanvasElement {
  const w = VIEW_MAX;
  const pb = new PB(w, H);
  pb.vgrad(0, 0, w, 300, ['#04070e', '#070e1b', '#0b1628', '#102034', '#162b3f', '#1d3748', '#274552'].map(hex));
  pb.rect(0, 300, w, H - 300, hex('#274552'));
  const r = rng(3);
  for (let i = 0; i < 3200; i++) {
    // a faint diagonal band of the milky way
    const t = r();
    const x = t * w;
    const y = 20 + t * 110 + (r() - 0.5) * 70;
    if (r() < 0.45) pb.set(x, y, hex('#1c2a40'));
  }
  for (let i = 0; i < 170; i++) {
    const b = r();
    pb.set(r() * w, r() * 240, b > 0.88 ? hex('#efe6cf') : b > 0.55 ? hex('#9aa7b5') : hex('#4d5b6e'));
  }
  return pb.canvas();
}

export function buildMoon(): HTMLCanvasElement {
  const pb = new PB(32, 32);
  pb.disc(16, 16, 11, hex('#efe4c8'));
  // carve the crescent
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const dx = x - 21;
      const dy = y - 12;
      if (dx * dx + dy * dy <= 100) pb.data[(y * 32 + x) * 4 + 3] = 0;
    }
  pb.set(10, 18, hex('#d8cbb0'));
  pb.set(12, 22, hex('#d8cbb0'));
  pb.set(9, 14, hex('#d8cbb0'));
  return pb.canvas();
}

/** Stepped radial glow (pixel-art style light pool). */
export function glowSprite(r: number, color: string, alphas: number[]): HTMLCanvasElement {
  const pb = new PB(r * 2, r * 2);
  const c = hex(color);
  for (let y = 0; y < r * 2; y++)
    for (let x = 0; x < r * 2; x++) {
      const d = Math.hypot(x - r + 0.5, y - r + 0.5) / r;
      if (d >= 1) continue;
      const band = d * alphas.length;
      const k = Math.floor(band);
      // dither the edge between bands
      const a = band - k > bayer(x, y) && k + 1 < alphas.length ? alphas[k + 1] : alphas[k];
      if (a > 0) pb.set(x, y, c, a);
    }
  return pb.canvas();
}

// ─── karst mountains (shanshui) ──────────────────────────────────────────────
function buildKarst(o: {
  parallax: number;
  seed: number;
  baseline: number;
  towers: number;
  hMin: number;
  hMax: number;
  wMin: number;
  wMax: number;
  body: string[];
  rim: string;
  crev: string;
  mist: string;
  mistTop: number;
  mistBottom: number;
}): Layer {
  const w = Math.ceil(VIEW_MAX + WORLD_W * o.parallax);
  const pb = new PB(w, H);
  const r = rng(o.seed);
  const n = noise1(o.seed + 7);
  const hts = new Float32Array(w);
  for (let x = 0; x < w; x++) hts[x] = 12 + 12 * n(x / 40) + 6 * n(x / 11 + 50);
  for (let k = 0; k < o.towers; k++) {
    const cx = r() * w;
    const ww = o.wMin + r() * (o.wMax - o.wMin);
    const hh = o.hMin + r() * (o.hMax - o.hMin);
    const p = 2 + r() * 1.8;
    for (let x = Math.floor(cx - ww); x <= cx + ww; x++) {
      if (x < 0 || x >= w) continue;
      const d = Math.abs(x - cx) / ww;
      const v = hh * (1 - Math.pow(d, p)) + 3 * n(x / 5 + k * 13);
      if (v > hts[x]) hts[x] = v;
    }
  }
  const body = o.body.map(hex);
  const rim = hex(o.rim);
  const crev = hex(o.crev);
  const mist = hex(o.mist);
  for (let x = 0; x < w; x++) {
    const top = Math.round(o.baseline - hts[x]);
    const slope = hts[Math.min(w - 1, x + 1)] - hts[Math.max(0, x - 1)];
    const lit = slope < -0.35; // faces the moon (upper right)
    const crevice = n(x / 3 + 200) > 0.74;
    for (let y = Math.max(0, top); y < H; y++) {
      const depth = y - top;
      const t = (depth / Math.max(1, H - top)) * (body.length - 1);
      const k = Math.min(body.length - 2, Math.floor(t));
      let c: RGB = t - k > bayer(x, y) ? body[k + 1] : body[k];
      if (depth < 2 && lit) c = rim;
      if (crevice && depth > 3 && depth < 46 && bayer(x, y) < 0.5) c = crev;
      if (y > o.mistTop) {
        const m = (y - o.mistTop) / (o.mistBottom - o.mistTop);
        if (bayer(x, y) < m * 0.92) c = mist;
      }
      pb.set(x, y, c);
    }
  }
  return { canvas: pb.canvas(), parallax: o.parallax };
}

// ─── forests ────────────────────────────────────────────────────────────────
/** A canopy clump with a moonlit crescent on its upper-left edge. */
export function clump(pb: PB, cx: number, cy: number, r: number, base: RGB, light: RGB, tip?: RGB) {
  pb.disc(Math.round(cx), Math.round(cy), Math.round(r), base);
  pb.disc(Math.round(cx - 1), Math.round(cy - 1), Math.round(r - 1), light);
  pb.disc(Math.round(cx + 1), Math.round(cy + 2), Math.round(r - 2), base);
  if (tip && r > 9) pb.disc(Math.round(cx - r * 0.45), Math.round(cy - r * 0.55), 2, tip);
}

function buildForestBack(): Layer {
  const parallax = 0.5;
  const w = Math.ceil(VIEW_MAX + WORLD_W * parallax);
  const pb = new PB(w, H);
  const r = rng(21);
  const base = hex('#0b1b21');
  const light = hex('#122a31');
  for (let x = -10; x < w + 20; x += 11 + r() * 14) {
    const ty = 214 + r() * 24;
    const rad = 9 + r() * 9;
    for (let k = 0; k < 3; k++) clump(pb, x + (r() - 0.5) * rad, ty + rad * 0.4 + r() * rad * 0.6, rad * (0.6 + r() * 0.5), base, light);
  }
  pb.rect(0, 246, w, H - 246, base);
  // low mist hugging the tree line
  const mist = hex('#1a3239');
  for (let y = 248; y < 296; y++)
    for (let x = 0; x < w; x++) if (bayer(x, y) < ((y - 248) / 48) * 0.85) pb.set(x, y, mist);
  return { canvas: pb.canvas(), parallax };
}

function buildForestFront(): Layer {
  const parallax = 0.75;
  const w = Math.ceil(VIEW_MAX + WORLD_W * parallax);
  const pb = new PB(w, H);
  const r = rng(42);
  const n = noise1(9);
  const bark = [hex('#1d1916'), hex('#28211d'), hex('#352c25')];
  const cBase = hex('#0d2826');
  const cLight = hex('#174539');
  const cTip = hex('#2a644e');
  const vine = hex('#153a31');
  for (let tx = 70; tx < w; tx += 210 + r() * 160) {
    const tw = 10 + Math.round(r() * 6);
    // trunk with a gentle sway and flared roots
    for (let y = -4; y < 298; y++) {
      const sway = Math.round(Math.sin(y / 55 + tx) * 3);
      const flare = y > 282 ? Math.round((y - 282) * 0.6) : 0;
      for (let i = -flare; i < tw + flare; i++) {
        const shade = i < 2 ? 2 : i > tw - 3 ? 0 : n(y / 6 + i * 3 + tx) > 0.62 ? 0 : 1;
        pb.set(tx + i + sway, y, bark[shade]);
      }
    }
    // canopy overhanging the top of the scene
    for (let k = 0; k < 12; k++) {
      const cx = tx + (r() - 0.5) * 170;
      const cy = 6 + r() * 86 - Math.abs(cx - tx) * 0.12;
      clump(pb, cx, cy, 15 + r() * 20, cBase, cLight, cTip);
    }
    // hanging vines
    for (let k = 0; k < 5; k++) {
      const vx = tx + (r() - 0.5) * 140;
      const len = 20 + r() * 50;
      for (let y = 70; y < 70 + len; y++) {
        pb.set(vx + Math.round(Math.sin(y / 9) * 1.5), y, vine);
        if (y % 5 === 0) pb.set(vx + 1 + Math.round(Math.sin(y / 9) * 1.5), y, cLight);
      }
    }
  }
  // shrubs at the forest floor
  for (let x = 0; x < w; x += 30 + r() * 60) clump(pb, x, 292 - r() * 6, 8 + r() * 8, hex('#0e2722'), hex('#163a31'));
  return { canvas: pb.canvas(), parallax };
}

// ─── props ──────────────────────────────────────────────────────────────────
export interface Prop {
  pb: PB;
  x: number; // world x of the buffer's left edge
  y: number; // world y of the buffer's top edge
}

export function prop(w: number, h: number, x: number, base: number, paint: (pb: PB, b: number) => void): Prop {
  const inner = new PB(w, h);
  paint(inner, h); // `b` = local y of the ground line
  const pb = new PB(w + 2, h + 2); // 1px margin for the outline
  pb.draw(inner, 1, 1);
  pb.outline(C.outline);
  return { pb, x: x - 1, y: base - h - 1 };
}

/** Gold ring around a prop's silhouette, shown on hover. */
export function ringOf(p: Prop): HTMLCanvasElement {
  const ring = new PB(p.pb.w + 2, p.pb.h + 2);
  for (let y = -1; y <= p.pb.h; y++)
    for (let x = -1; x <= p.pb.w; x++) {
      if (p.pb.alpha(x, y)) continue;
      if (p.pb.alpha(x - 1, y) || p.pb.alpha(x + 1, y) || p.pb.alpha(x, y - 1) || p.pb.alpha(x, y + 1))
        ring.set(x + 1, y + 1, C.gold);
    }
  return ring.canvas();
}

function roofRows(pb: PB, cx: number, yTop: number, rows: number, hw0: number, hw1: number) {
  for (let i = 0; i < rows; i++) {
    const t = i / (rows - 1);
    const hw = Math.round(hw0 + (hw1 - hw0) * Math.pow(t, 1.5));
    for (let x = cx - hw; x <= cx + hw; x++) {
      const stripe = (x - cx + 200) % 4 === 0;
      pb.set(x, yTop + i, i === 0 ? C.roofL : stripe ? C.roofD : i % 3 === 0 ? C.roofL : C.roof);
    }
  }
  const yb = yTop + rows;
  const hw = hw1 + 2;
  pb.rect(cx - hw, yb, hw * 2 + 1, 2, C.roofL);
  pb.rect(cx - hw, yb + 2, hw * 2 + 1, 1, C.gold);
  // upturned eaves
  for (let k = 0; k < 6; k++) {
    const lift = Math.floor((k * k) / 5);
    pb.set(cx - hw - k, yb + 1 - lift, C.roofL);
    pb.set(cx - hw - k, yb + 2 - lift, C.gold);
    pb.set(cx + hw + k, yb + 1 - lift, C.roofL);
    pb.set(cx + hw + k, yb + 2 - lift, C.gold);
  }
}

function lattice(pb: PB, x: number, y: number, w: number, h: number) {
  pb.rect(x, y, w, h, C.glow);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) if (i % 4 === 0 || j % 4 === 0) pb.set(x + i, y + j, hex('#7a4e2c'));
  for (let i = 0; i < w; i++) {
    pb.set(x + i, y - 1, C.woodD);
    pb.set(x + i, y + h, C.woodD);
  }
  for (let j = -1; j <= h; j++) {
    pb.set(x - 1, y + j, C.woodD);
    pb.set(x + w, y + j, C.woodD);
  }
}

function hangingLantern(pb: PB, x: number, y: number) {
  pb.rect(x, y - 5, 1, 4, C.woodD);
  pb.rect(x - 3, y - 1, 7, 1, C.gold);
  pb.ellipse(x, y + 5, 3, 5, C.red);
  pb.rect(x - 1, y + 1, 1, 8, C.redL);
  pb.rect(x - 3, y + 10, 7, 1, C.gold);
  pb.rect(x, y + 11, 1, 3, C.gold);
}

export function pavilion(x0: number, base: number) {
  const W = 216;
  const Hh = 172;
  return prop(W, Hh, x0, base, (pb, b) => {
    const cx = W / 2;
    // stone platform and steps
    pb.rect(0, b - 8, W, 8, C.stone);
    pb.rect(0, b - 8, W, 1, C.stoneL);
    pb.rect(0, b - 2, W, 2, C.stoneD);
    pb.rect(cx - 26, b - 5, 52, 5, C.stoneL);
    pb.rect(cx - 20, b - 9, 40, 4, C.stone);
    pb.rect(12, b - 14, W - 24, 6, C.stone);
    pb.rect(12, b - 14, W - 24, 1, C.stoneL);
    // walls, windows and the door
    pb.rect(30, b - 86, W - 60, 72, C.plaster);
    pb.rect(30, b - 86, W - 60, 3, C.plasterD);
    pb.rect(30, b - 19, W - 60, 5, C.woodD);
    lattice(pb, 42, b - 72, 20, 26);
    lattice(pb, W - 62, b - 72, 20, 26);
    lattice(pb, cx - 32, b - 64, 10, 16);
    lattice(pb, cx + 23, b - 64, 10, 16);
    pb.rect(cx - 15, b - 62, 30, 48, hex('#6e2620'));
    for (let y = b - 58; y < b - 16; y += 5) for (let x = cx - 12; x < cx + 13; x += 5) pb.set(x, y, C.gold);
    pb.rect(cx - 1, b - 62, 2, 48, C.glowL);
    pb.rect(cx - 15, b - 62, 30, 1, C.redD);
    // name plaque
    pb.rect(cx - 15, b - 78, 30, 10, hex('#2a1c14'));
    pb.rect(cx - 15, b - 78, 30, 1, C.gold);
    pb.rect(cx - 15, b - 69, 30, 1, C.gold);
    for (const gx of [-8, 0, 8]) pb.rect(cx + gx - 1, b - 75, 3, 4, C.cream);
    // red pillars
    for (const px of [24, 66, W - 73, W - 31]) {
      pb.rect(px, b - 92, 7, 78, C.red);
      pb.rect(px, b - 92, 2, 78, C.redL);
      pb.rect(px + 5, b - 92, 2, 78, C.redD);
      pb.rect(px - 1, b - 18, 9, 4, C.stoneL);
    }
    // painted beam (caihua) with gold dots
    pb.rect(14, b - 98, W - 28, 7, C.wood);
    pb.rect(14, b - 96, W - 28, 2, C.jade);
    for (let x = 18; x < W - 16; x += 6) pb.set(x, b - 95, C.gold);
    // double-eave roof
    roofRows(pb, cx, b - 126, 26, 70, 100);
    pb.rect(cx - 52, b - 138, 105, 12, C.plaster);
    for (const wx of [-34, -4, 26]) lattice(pb, cx + wx, b - 136, 8, 7);
    pb.rect(cx - 52, b - 138, 4, 12, C.red);
    pb.rect(cx + 49, b - 138, 4, 12, C.red);
    roofRows(pb, cx, b - 160, 20, 40, 64);
    // gold ridge with finials and the dragon's pearl
    pb.rect(cx - 44, b - 164, 89, 4, C.gold);
    pb.rect(cx - 44, b - 164, 89, 1, C.goldD);
    pb.map(cx - 50, b - 171, ['..gg..', '.g..g.', '.g.gg.', '..g...', 'gg....', 'g.....', 'gggggg'], { g: C.gold });
    pb.map(cx + 45, b - 171, ['..gg..', '.g..g.', '.gg.g.', '...g..', '....gg', '.....g', 'gggggg'], { g: C.gold });
    pb.disc(cx, b - 168, 3, C.redL);
    pb.set(cx - 4, b - 170, C.gold);
    pb.set(cx + 4, b - 170, C.gold);
    pb.set(cx, b - 172, C.gold);
    hangingLantern(pb, 18, b - 92);
    hangingLantern(pb, W - 18, b - 92);
  });
}

export function stele(cx: number, base: number) {
  const W = 56;
  const Hh = 74;
  return prop(W, Hh, cx - 26, base, (pb, b) => {
    const c = 26;
    // bixi: the stone turtle that carries steles in Chinese temples
    pb.ellipse(c - 2, b - 7, 22, 7, hex('#57564f'));
    pb.ellipse(c - 3, b - 9, 17, 4, hex('#6a685f'));
    for (const dx of [-12, -4, 4, 12]) pb.line(c - 3 + dx, b - 12, c - 1 + dx, b - 5, hex('#45443e'));
    pb.disc(c + 22, b - 9, 4, hex('#57564f'));
    pb.set(c + 24, b - 10, C.outline);
    pb.rect(c - 17, b - 3, 5, 3, hex('#4b4a44'));
    pb.rect(c + 10, b - 3, 5, 3, hex('#4b4a44'));
    // the slab, with a rounded top
    const insets = [5, 3, 2, 1, 1, 0];
    for (let y = b - 72; y < b - 14; y++) {
      const i = y - (b - 72);
      const inset = i < insets.length ? insets[i] : 0;
      for (let x = c - 11 + inset; x <= c + 11 - inset; x++) {
        const edge = x - (c - 11 + inset);
        const col = edge < 2 ? hex('#958f82') : x > c + 8 - inset ? hex('#5c5951') : hex('#7b786e');
        pb.set(x, y, col);
      }
    }
    // carved arch and inscription columns
    for (let x = c - 8; x <= c + 8; x++) pb.set(x, b - 64 + Math.round(Math.abs(x - c) / 3), hex('#55524b'));
    const r = rng(77);
    for (const colX of [-6, -2, 2, 6])
      for (let y = b - 56; y < b - 20; y++) if (r() < 0.62) pb.set(c + colX, y, hex('#54514a'));
    for (let k = 0; k < 14; k++) pb.set(c - 11 + Math.floor(r() * 4), b - 16 - Math.floor(r() * 26), C.mossL);
  });
}

export function campfire(cx: number, base: number) {
  const W = 104;
  const Hh = 26;
  return prop(W, Hh, cx - 52, base, (pb, b) => {
    const c = 52;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const sx = c + Math.round(Math.cos(a) * 12);
      const sy = b - 3 + Math.round(Math.sin(a) * 3);
      pb.disc(sx, sy, 2, C.stoneD);
      pb.set(sx - 1, sy - 1, C.stoneL);
    }
    pb.line(c - 9, b - 3, c + 8, b - 7, C.woodD);
    pb.line(c - 9, b - 4, c + 8, b - 8, C.wood);
    pb.line(c + 9, b - 3, c - 8, b - 7, C.woodD);
    pb.line(c + 9, b - 4, c - 8, b - 8, C.wood);
    // a fallen log to sit on
    pb.rect(2, b - 8, 26, 7, C.woodD);
    pb.rect(2, b - 8, 26, 2, C.wood);
    pb.disc(3, b - 5, 3, hex('#8a6a4e'));
    pb.set(3, b - 5, C.woodD);
    // a stump with a stack of books
    pb.rect(80, b - 12, 13, 12, C.woodD);
    pb.ellipse(86, b - 12, 6, 2, hex('#8a6a4e'));
    pb.rect(79, b - 16, 15, 3, C.red);
    pb.rect(80, b - 19, 13, 3, C.jade);
    pb.rect(79, b - 22, 14, 3, C.gold);
    pb.rect(79, b - 16, 1, 3, C.cream);
    pb.rect(98, b - 7, 5, 6, C.cream);
    pb.rect(103, b - 6, 1, 3, C.cream);
  });
}

export function stoneLantern(cx: number, base: number) {
  return prop(18, 38, cx - 9, base, (pb, b) => {
    const c = 9;
    pb.rect(c - 6, b - 4, 12, 4, C.stone);
    pb.rect(c - 6, b - 4, 12, 1, C.stoneL);
    pb.rect(c - 2, b - 16, 4, 12, C.stone);
    pb.rect(c - 2, b - 16, 1, 12, C.stoneL);
    pb.rect(c - 6, b - 19, 12, 3, C.stoneL);
    pb.rect(c - 5, b - 29, 10, 10, C.stone);
    pb.rect(c - 3, b - 27, 6, 6, C.glow);
    pb.rect(c - 1, b - 27, 2, 6, C.glowL);
    pb.rect(c - 8, b - 32, 16, 3, C.stoneD);
    pb.rect(c - 6, b - 34, 12, 2, C.stone);
    pb.rect(c - 1, b - 37, 2, 3, C.stone);
  });
}

export function questBoard(x0: number, base: number) {
  const W = 80;
  const Hh = 74;
  return prop(W, Hh, x0, base, (pb, b) => {
    for (const px of [6, W - 11]) {
      pb.rect(px, b - 66, 5, 66, C.woodD);
      pb.rect(px, b - 66, 1, 66, C.wood);
    }
    pb.rect(2, b - 62, W - 4, 36, C.woodL);
    for (let y = b - 56; y < b - 26; y += 6) pb.rect(2, y, W - 4, 1, C.wood);
    pb.rect(2, b - 62, W - 4, 1, hex('#8a5e3b'));
    // shingled roof
    for (let i = 0; i < 9; i++) {
      const hw = 34 + i;
      for (let x = W / 2 - hw; x <= W / 2 + hw; x++) pb.set(x, b - 72 + i, i % 3 === 2 || x % 5 === 0 ? C.woodD : hex('#4a3426'));
    }
    // six pinned notes, one per project
    const notes = [
      [7, -57],
      [29, -58],
      [51, -56],
      [9, -42],
      [31, -43],
      [53, -41],
    ];
    for (const [nx, ny] of notes) {
      pb.rect(nx, b + ny, 17, 13, C.paper);
      pb.rect(nx + 16, b + ny + 1, 1, 12, C.paperD);
      pb.rect(nx + 1, b + ny + 12, 16, 1, C.paperD);
      for (const ly of [3, 6, 9]) for (let x = 2; x < 13; x += 1) if ((x + ly) % 4 !== 0) pb.set(nx + x, b + ny + ly, C.ink);
      pb.rect(nx + 12, b + ny + 8, 3, 3, C.red);
      pb.set(nx + 8, b + ny, C.gold);
    }
    hangingLantern(pb, W - 3, b - 62);
  });
}

export function cottage(x0: number, base: number) {
  const W = 134;
  const Hh = 114;
  return prop(W, Hh, x0, base, (pb, b) => {
    const cx = 67;
    // chimney (behind the roof)
    pb.rect(92, b - 112, 11, 30, C.stone);
    for (let y = b - 108; y < b - 84; y += 4) pb.rect(92, y, 11, 1, C.stoneD);
    pb.rect(90, b - 114, 15, 3, C.stoneL);
    // walls and timber frame
    pb.rect(10, b - 60, 114, 54, C.plaster);
    for (const bx of [10, 64, 120]) pb.rect(bx, b - 60, 4, 54, C.woodD);
    pb.rect(10, b - 34, 114, 3, C.woodD);
    pb.rect(10, b - 60, 114, 3, C.woodD);
    pb.rect(8, b - 6, 118, 6, C.stone);
    for (let x = 10; x < 124; x += 7) pb.set(x, b - 3, C.stoneD);
    // tiled gable roof
    for (let i = 0; i < 44; i++) {
      const hw = Math.round(8 + 60 * (i / 43));
      const y = b - 104 + i;
      for (let x = cx - hw; x <= cx + hw; x++) {
        const row = Math.floor(i / 4);
        const tile = (x + row * 3) % 6 === 0;
        pb.set(x, y, tile ? hex('#5e231c') : row % 2 ? hex('#8a3a2e') : hex('#7a3026'));
      }
      pb.set(cx - hw, y, hex('#a54a3a'));
    }
    pb.rect(0, b - 61, W, 2, C.woodD);
    // door with an arched top
    pb.rect(57, b - 32, 18, 26, C.woodL);
    for (let x = 61; x < 75; x += 4) pb.rect(x, b - 32, 1, 26, C.wood);
    pb.rect(59, b - 35, 14, 3, C.woodL);
    pb.rect(61, b - 37, 10, 2, C.woodL);
    pb.set(71, b - 19, C.gold);
    pb.rect(55, b - 6, 22, 2, C.stoneL);
    // round window and square window, both lit
    pb.disc(33, b - 42, 8, C.woodD);
    pb.disc(33, b - 42, 6, C.glow);
    pb.rect(32, b - 48, 2, 13, hex('#7a4e2c'));
    pb.rect(27, b - 43, 13, 2, hex('#7a4e2c'));
    pb.rect(86, b - 52, 20, 16, C.woodD);
    pb.rect(88, b - 50, 16, 12, C.glow);
    pb.rect(95, b - 50, 2, 12, hex('#7a4e2c'));
    pb.rect(88, b - 45, 16, 2, hex('#7a4e2c'));
    // flower boxes
    for (const [fx, fw] of [
      [22, 22],
      [84, 24],
    ] as const) {
      pb.rect(fx, b - 30, fw, 4, C.wood);
      const r = rng(fx);
      for (let i = 0; i < fw; i += 2) {
        pb.set(fx + i, b - 31, C.leaf);
        pb.set(fx + i + 1, b - 32 - Math.round(r()), [C.redL, C.glow, C.cream][Math.floor(r() * 3)]);
      }
    }
    // potted plant and a small sign with the seal
    pb.rect(46, b - 12, 7, 6, hex('#8a4a32'));
    pb.disc(49, b - 15, 4, C.leaf);
    pb.rect(124, b - 52, 10, 9, C.woodL);
    pb.rect(127, b - 50, 4, 5, C.red);
    pb.rect(128, b - 56, 1, 4, C.woodD);
  });
}

export function ravenPost(cx: number, base: number) {
  return prop(32, 70, cx - 16, base, (pb, b) => {
    const c = 16;
    pb.rect(c - 2, b - 52, 5, 52, C.woodD);
    pb.rect(c - 2, b - 52, 1, 52, C.wood);
    // red mailbox with a raised gold flag
    pb.rect(c - 11, b - 62, 22, 12, C.red);
    pb.rect(c - 10, b - 64, 20, 2, C.red);
    pb.rect(c - 8, b - 65, 16, 1, C.red);
    pb.rect(c - 10, b - 64, 20, 1, C.redL);
    pb.rect(c - 11, b - 51, 22, 1, C.redD);
    pb.rect(c - 6, b - 57, 12, 1, hex('#4f1a16'));
    pb.rect(c + 11, b - 64, 2, 10, C.gold);
    pb.rect(c + 13, b - 64, 5, 4, C.gold);
    pb.rect(c - 6, b - 68, 9, 3, C.paper);
    pb.set(c - 2, b - 67, C.red);
  });
}

export function signpost(cx: number, base: number) {
  return prop(40, 44, cx - 20, base, (pb, b) => {
    pb.rect(18, b - 42, 4, 42, C.woodD);
    pb.rect(18, b - 42, 1, 42, C.wood);
    // arrow board pointing onward
    for (let i = 0; i < 12; i++) {
      const w = i < 6 ? 30 + i : 30 + (11 - i);
      pb.rect(4, b - 40 + i, w, 1, C.woodL);
    }
    pb.rect(4, b - 40, 30, 1, hex('#8a5e3b'));
    for (let x = 8; x < 30; x += 3) pb.rect(x, b - 35, 2, 3, C.cream);
  });
}

// ─── ground (walkable layer) ────────────────────────────────────────────────
export const POND = { x0: 1110, x1: 1460, top: 274, bottom: 301 };
export const WATERFALL = { x: 1262, w: 26, top: 170, bottom: 276 };

function buildGround(): { layer: Layer; hotspots: Hotspot[]; lights: Light[]; spots: Record<string, { x: number; y: number }> } {
  const w = WORLD_W;
  const pb = new PB(w, H);
  const r = rng(5);
  const n = noise1(17);

  // meadow behind the path
  pb.vgrad(0, 258, w, PATH_TOP - 258, ['#0e1f17', '#12291d', '#173323'].map(hex));
  for (let x = 0; x < w; x += 3 + Math.round(r() * 5)) clump(pb, x, 260 + r() * 4, 4 + r() * 4, hex('#0f2a1f'), hex('#173826'));
  for (let i = 0; i < 900; i++) {
    const x = r() * w;
    const y = 266 + r() * 34;
    pb.set(x, y, hex('#24472d'));
    pb.set(x, y - 1, hex('#2f5a38'));
  }
  for (let i = 0; i < 160; i++) pb.set(r() * w, 268 + r() * 30, [hex('#d9644f'), hex('#e8c06a'), hex('#cfe0d0')][Math.floor(r() * 3)]);

  // waterfall cliff of mossy boulders (behind the pond)
  const rocks: [number, number, number][] = [];
  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    rocks.push([WATERFALL.x + WATERFALL.w / 2 + (r() - 0.5) * (40 + t * 90), 176 + t * 98 + (r() - 0.5) * 10, 10 + r() * 8 + t * 6]);
  }
  for (const [rx, ry, rr] of rocks) {
    clump(pb, rx, ry, rr, hex('#25333a'), hex('#34454c'));
    clump(pb, rx - rr * 0.3, ry - rr * 0.55, rr * 0.55, C.moss, C.mossL);
  }

  // pond
  for (let x = POND.x0; x < POND.x1; x++) {
    const edge = Math.min(x - POND.x0, POND.x1 - x);
    const top = POND.top + Math.round(Math.sin(x / 23) * 2) + (edge < 30 ? Math.round((30 - edge) / 6) : 0);
    for (let y = top; y < POND.bottom; y++) {
      const t = (y - top) / (POND.bottom - top);
      pb.set(x, y, t < 0.18 ? hex('#1d4c53') : t + 0.15 * bayer(x, y) < 0.55 ? hex('#13363f') : hex('#0e2a33'));
    }
    if (x % 7 === 0) {
      const sr = 2 + Math.round(r() * 2);
      pb.disc(x, top - 1, sr, hex('#3b4a4d'));
      pb.set(x - 1, top - sr, hex('#56666a'));
    }
  }
  for (const lx of [1150, 1205, 1330, 1395, 1430]) {
    const ly = 286 + Math.round(r() * 8);
    pb.ellipse(lx, ly, 5, 1, hex('#2f6a4a'));
    pb.set(lx + 4, ly, hex('#13363f'));
    if (r() < 0.6) pb.rect(lx - 1, ly - 1, 2, 1, hex('#e7a0a8'));
  }
  for (const rx of [POND.x0 + 6, POND.x1 - 18]) {
    for (let k = 0; k < 7; k++) {
      const x = rx + k * 2;
      const hgt = 8 + Math.round(r() * 10);
      pb.rect(x, POND.top + 4 - hgt, 1, hgt, hex('#2c5a3a'));
      if (k % 2 === 0) pb.rect(x, POND.top + 4 - hgt - 3, 1, 3, C.wood);
    }
  }

  // dirt path with pebbles and a grassy lip
  pb.vgrad(0, PATH_TOP, w, 334 - PATH_TOP, ['#3b2f27', '#342922', '#2c231d'].map(hex));
  for (let i = 0; i < 1400; i++) pb.set(r() * w, PATH_TOP + 3 + r() * 29, r() < 0.5 ? hex('#4a3d32') : hex('#57493c'));
  for (let x = 0; x < w; x++) {
    const hgt = Math.round(1 + n(x / 3) * 4);
    for (let j = 0; j < hgt; j++) pb.set(x, PATH_TOP - j, j === hgt - 1 && x % 3 === 0 ? hex('#4f8a52') : hex('#2c5233'));
    if (n(x / 2 + 99) > 0.7) pb.set(x, PATH_TOP + 1, hex('#2c5233'));
  }
  // front verge
  pb.vgrad(0, 334, w, H - 334, ['#16241a', '#111c15', '#0c140f'].map(hex));
  for (let i = 0; i < 1200; i++) {
    const x = r() * w;
    const y = 335 + r() * 24;
    pb.set(x, y, hex('#1d3824'));
    pb.set(x, y - 1, hex('#27482d'));
  }

  // props
  const hotspots: Hotspot[] = [];
  const lights: Light[] = [];
  const spots: Record<string, { x: number; y: number }> = {};
  const place = (p: Prop) => pb.draw(p.pb, p.x, p.y);
  const addHotspot = (p: Prop, h: Omit<Hotspot, 'x0' | 'x1' | 'top' | 'bottom' | 'ring' | 'ringX' | 'ringY'>) =>
    hotspots.push({ ...h, x0: p.x, x1: p.x + p.pb.w, top: p.y, bottom: p.y + p.pb.h, ring: ringOf(p), ringX: p.x - 1, ringY: p.y - 1 });

  const base = PATH_TOP - 1;
  for (const lx of [650, 1040, 1700, 2240]) {
    place(stoneLantern(lx, base));
    lights.push({ x: lx, y: base - 24, r: 26, kind: 'warm' });
  }

  const pav = pavilion(120, base);
  place(pav);
  addHotspot(pav, { id: 'research', label: 'The Archive', flavor: 'Research & Publications', standX: 228, icon: 'book', markerY: base - 190 });
  lights.push({ x: 138, y: base - 84, r: 22, kind: 'warm' }, { x: 318, y: base - 84, r: 22, kind: 'warm' }, { x: 228, y: base - 40, r: 46, kind: 'window' });

  const st = stele(520, base);
  place(st);
  addHotspot(st, { id: 'experience', label: 'The Chronicle Stone', flavor: 'Experience', standX: 520, icon: 'scroll', markerY: base - 92 });

  const fire = campfire(860, base);
  place(fire);
  spots.fire = { x: 860, y: base - 6 };
  lights.push({ x: 860, y: base - 8, r: 70, kind: 'fire' });

  const qb = questBoard(1560, base);
  place(qb);
  addHotspot(qb, { id: 'projects', label: 'Quest Board', flavor: 'Projects', standX: 1600, icon: 'quest', markerY: base - 92 });
  lights.push({ x: 1637, y: base - 52, r: 20, kind: 'warm' });

  const cot = cottage(1790, base);
  place(cot);
  addHotspot(cot, { id: 'about', label: 'The Study', flavor: 'About me', standX: 1857, icon: 'seal', markerY: base - 132 });
  lights.push({ x: 1823, y: base - 42, r: 26, kind: 'window' }, { x: 1886, y: base - 44, r: 26, kind: 'window' });
  spots.chimney = { x: 1887, y: base - 114 };

  const rp = ravenPost(2080, base);
  place(rp);
  addHotspot(rp, { id: 'contact', label: 'Raven Post', flavor: 'Contact', standX: 2080, icon: 'letter', markerY: base - 96 });
  spots.raven = { x: 2080, y: base - 66 };

  const sp = signpost(2320, base);
  place(sp);
  addHotspot(sp, { id: 'classic', label: 'Signpost', flavor: 'Quick view (classic page)', standX: 2320, icon: 'arrow', markerY: base - 64 });

  for (const x of [1180, 1290, 1410]) lights.push({ x, y: 290, r: 14, kind: 'jade' });

  return { layer: { canvas: pb.canvas(), parallax: 1 }, hotspots, lights, spots };
}

function buildForeground(): Layer {
  const parallax = 1.2;
  const w = Math.ceil(VIEW_MAX + WORLD_W * parallax);
  const pb = new PB(w, H);
  const r = rng(88);
  const base = hex('#050b09');
  const rim = hex('#0d211b');
  for (let x = 140; x < w; x += 260 + r() * 240) {
    for (let k = 0; k < 4; k++) clump(pb, x + (r() - 0.5) * 50, 360 - r() * 10, 12 + r() * 12, base, rim);
    // fern fronds
    for (let f = 0; f < 5; f++) {
      const fx = x + (r() - 0.5) * 70;
      const len = 14 + r() * 16;
      for (let i = 0; i < len; i++) {
        const yy = 360 - i;
        const xx = fx + Math.round(Math.sin(i / 6 + f) * 3);
        pb.set(xx, yy, base);
        if (i % 3 === 0 && i > 3) {
          pb.set(xx - 2, yy + 1, rim);
          pb.set(xx + 2, yy + 1, rim);
        }
      }
    }
  }
  return { canvas: pb.canvas(), parallax };
}

// ─── animated pieces, pre-rendered as frames ────────────────────────────────
export function buildWaterfallFrames(count = 6): HTMLCanvasElement[] {
  const frames: HTMLCanvasElement[] = [];
  const offs = Array.from({ length: WATERFALL.w }, (_, i) => (i * 7) % 11);
  const hgt = WATERFALL.bottom - WATERFALL.top;
  for (let f = 0; f < count; f++) {
    const pb = new PB(WATERFALL.w, hgt);
    for (let x = 0; x < WATERFALL.w; x++) {
      const edge = x < 2 || x > WATERFALL.w - 3;
      for (let y = 0; y < hgt; y++) {
        const s = (y + offs[x] - f * 3 + 99) % 11;
        let c = edge ? hex('#3a7e88') : hex('#4f9aa2');
        if (!edge && s < 2) c = hex('#cdeee8');
        else if (!edge && s < 4) c = hex('#7cc3c4');
        pb.set(x, y, c);
      }
    }
    frames.push(pb.canvas());
  }
  return frames;
}

/** Mossy boulders drawn over the top of the waterfall so it pours out of the cliff. */
export function buildWaterfallCap(): HTMLCanvasElement {
  const pb = new PB(WATERFALL.w + 52, 34);
  const cx = 26 + WATERFALL.w / 2;
  for (const [dx, dy, rr] of [
    [-14, 20, 11],
    [12, 21, 10],
    [-2, 14, 9],
    [-24, 24, 8],
    [24, 24, 8],
  ] as const) {
    clump(pb, cx + dx, dy, rr, hex('#25333a'), hex('#34454c'));
    clump(pb, cx + dx - rr * 0.3, dy - rr * 0.55, rr * 0.55, C.moss, C.mossL);
  }
  // the lip of water spilling over
  pb.rect(cx - WATERFALL.w / 2 + 3, 27, WATERFALL.w - 6, 2, hex('#7cc3c4'));
  pb.rect(cx - WATERFALL.w / 2 + 5, 29, WATERFALL.w - 10, 1, hex('#cdeee8'));
  pb.outline(C.outline);
  return pb.canvas();
}

/** A soft band of mist that scrolls slowly across the valley. */
export function buildMist(): HTMLCanvasElement {
  const w = VIEW_MAX;
  const pb = new PB(w, 40);
  const n = noise1(31);
  const c = hex('#9ab8b4');
  for (let y = 0; y < 40; y++)
    for (let x = 0; x < w; x++) {
      const v = n(x / 60 + y / 30) * Math.sin((y / 40) * Math.PI);
      if (v > 0.35 + bayer(x, y) * 0.5) pb.set(x, y, c, 34);
    }
  return pb.canvas();
}

export function buildVignette(): HTMLCanvasElement {
  const w = VIEW_MAX;
  const pb = new PB(w, H);
  const c = hex('#02040a');
  for (let y = 0; y < H; y++)
    for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / (w / 2);
      const dy = (y - H * 0.55) / (H * 0.6);
      const d = Math.sqrt(dx * dx * 0.55 + dy * dy);
      const a = Math.max(0, (d - 0.55) / 0.6);
      if (a > bayer(x, y)) pb.set(x, y, c, 120);
    }
  return pb.canvas();
}

export function buildIcons(): Record<IconName, HTMLCanvasElement> {
  const out = {} as Record<IconName, HTMLCanvasElement>;
  for (const [k, v] of Object.entries(ICONS) as [IconName, IconData][]) {
    const pal = Object.fromEntries(Object.entries(v.pal).map(([ch, c]) => [ch, hex(c)]));
    const pb = new PB(v.rows[0].length + 2, v.rows.length + 2);
    pb.map(1, 1, v.rows, pal);
    pb.outline(C.outline);
    out[k] = pb.canvas();
  }
  return out;
}

export const RAVEN = {
  open: ['....kk......', '...kkkk.....', '..kkwkkk....', 'ykkkkkkk....', '..kkkkkkk...', '...kkkkkkk..', '....kkkkkkkk', '.....k..k...'],
  blink: ['....kk......', '...kkkk.....', '..kkkkkk....', 'ykkkkkkk....', '..kkkkkkk...', '...kkkkkkk..', '....kkkkkkkk', '.....k..k...'],
};

export function buildRaven(): HTMLCanvasElement[] {
  return [RAVEN.open, RAVEN.blink].map((rows) => {
    const pb = new PB(14, 10);
    pb.map(1, 1, rows, { k: hex('#171a22'), w: hex('#e8e0c8'), y: hex('#c6a15b') });
    pb.outline(hex('#2a2f3a'));
    return pb.canvas();
  });
}

export function buildShadow(w: number): HTMLCanvasElement {
  const pb = new PB(w, 4);
  pb.ellipse(w / 2, 2, w / 2 - 1, 1, hex('#05080a'));
  return pb.canvas();
}

export function buildWorld() {
  const ground = buildGround();
  return {
    sky: buildSky(),
    moon: buildMoon(),
    moonGlow: glowSprite(46, '#cfe0d4', [36, 22, 12, 6]),
    layers: [
      buildKarst({ parallax: 0.12, seed: 1, baseline: 262, towers: 18, hMin: 60, hMax: 150, wMin: 16, wMax: 44, body: ['#16283a', '#1b3142', '#22394a'], rim: '#30505e', crev: '#122131', mist: '#2f4f59', mistTop: 200, mistBottom: 262 }),
      buildKarst({ parallax: 0.26, seed: 2, baseline: 276, towers: 13, hMin: 80, hMax: 190, wMin: 24, wMax: 58, body: ['#0e1d29', '#132534', '#182c3a'], rim: '#22404b', crev: '#0b1722', mist: '#223f48', mistTop: 228, mistBottom: 276 }),
      buildForestBack(),
      buildForestFront(),
      ground.layer,
    ] as Layer[],
    fore: buildForeground(),
    hotspots: ground.hotspots,
    lights: ground.lights,
    spots: ground.spots,
    waterfall: buildWaterfallFrames(),
    waterfallCap: buildWaterfallCap(),
    mist: buildMist(),
    vignette: buildVignette(),
    icons: buildIcons(),
    raven: buildRaven(),
    glows: {
      warm: glowSprite(28, '#f2b85a', [70, 46, 26, 12]),
      window: glowSprite(48, '#f2c46a', [40, 26, 14, 6]),
      fire: glowSprite(72, '#f29a4a', [70, 48, 30, 16, 6]),
      jade: glowSprite(14, '#8fe0c0', [60, 30, 12]),
    },
  };
}

export type World = ReturnType<typeof buildWorld>;
export { VIEW_MAX };
