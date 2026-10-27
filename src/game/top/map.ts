// The village of the Arcane Archive, seen from above (3/4 view, like a cozy
// farming RPG). The ground is painted once into a big buffer; trees, buildings
// and props are separate sprites drawn y-sorted with the characters.
import { PB, bayer, hex, noise1, rng, type RGB } from '../pixel';
import { C, campfire, clump, cottage, pavilion, questBoard, ravenPost, signpost, stele, stoneLantern, type Prop } from '../world';

export const MAP_W = 960;
export const MAP_H = 640;
export const CELL = 8; // navigation grid resolution
export const GRID_W = MAP_W / CELL;
export const GRID_H = MAP_H / CELL;

export type PlaceId = 'research' | 'experience' | 'projects' | 'about' | 'contact' | 'exit';

export interface Place {
  id: PlaceId;
  name: string;
  page: string;
  href: string;
  door: { x: number; y: number }; // where you stand to enter
  bounds: { x0: number; y0: number; x1: number; y1: number }; // clickable sprite area
}

export interface Sprite {
  canvas: HTMLCanvasElement;
  x: number; // top-left in world px
  y: number;
  baseY: number; // y-sort key: where it touches the ground
  place?: PlaceId;
}

export interface Lantern {
  x: number;
  y: number; // light position
  lit: boolean;
}

export interface Light {
  x: number;
  y: number;
  r: number;
  color: 'warm' | 'fire' | 'window' | 'jade' | 'moon';
}

// ─── layout ─────────────────────────────────────────────────────────────────
const PLAZA = { x: 480, y: 350, r: 64 };
export const POND = { x: 190, y: 410, rx: 118, ry: 64 };
const PATHS: { pts: [number, number][]; w: number }[] = [
  { pts: [[480, 660], [480, 560], [482, 470], [480, 410]], w: 22 },
  { pts: [[440, 316], [380, 292], [300, 262], [236, 238]], w: 18 },
  { pts: [[500, 292], [516, 250], [520, 214]], w: 14 },
  { pts: [[540, 340], [590, 326], [640, 316]], w: 16 },
  { pts: [[500, 410], [600, 462], [690, 506], [760, 530]], w: 18 },
  { pts: [[730, 518], [800, 494], [858, 486]], w: 12 },
  { pts: [[420, 360], [340, 372], [300, 360]], w: 12 },
];

const inBlob = (x: number, y: number, n: (t: number) => number) => {
  const dx = (x - POND.x) / POND.rx;
  const dy = (y - POND.y) / POND.ry;
  const a = Math.atan2(dy, dx);
  const r = 0.86 + 0.18 * n(a * 2 + 5);
  return dx * dx + dy * dy < r * r;
};

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const vx = bx - ax;
  const vy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

/** Signed "how far inside the path network" for a pixel (>0 inside). */
function pathDepth(x: number, y: number, n: (t: number) => number) {
  let best = -99;
  for (const p of PATHS) {
    for (let i = 0; i < p.pts.length - 1; i++) {
      const [ax, ay] = p.pts[i];
      const [bx, by] = p.pts[i + 1];
      const d = p.w / 2 + 1.6 * (n((x + y) / 9) - 0.5) - distToSeg(x, y, ax, ay, bx, by);
      if (d > best) best = d;
    }
  }
  const plaza = PLAZA.r - Math.hypot(x - PLAZA.x, (y - PLAZA.y) * 1.15);
  return { path: best, plaza };
}

// ─── ground ─────────────────────────────────────────────────────────────────
const G = {
  grass: ['#36593a', '#3d6440', '#467046', '#507a4c'].map(hex),
  tuft: hex('#5f8a52'),
  tuftL: hex('#7aa35e'),
  dirt: ['#6e5540', '#7a5f47', '#86694e'].map(hex),
  dirtEdge: hex('#56432f'),
  pebble: hex('#9a8466'),
  cobble: hex('#7d7a70'),
  cobbleL: hex('#97938a'),
  mortar: hex('#4e4c46'),
  water: ['#2c6c7a', '#2a6070', '#244f5e'].map(hex),
  waterL: hex('#4b97a3'),
  shore: hex('#5a6a52'),
  stone: hex('#6a6f6a'),
  stoneL: hex('#8a908a'),
};

function paintGround(): { pb: PB; water: Uint8Array } {
  const pb = new PB(MAP_W, MAP_H);
  const water = new Uint8Array(MAP_W * MAP_H);
  const n = noise1(3);
  const n2 = noise1(11);
  const r = rng(7);
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      // grass with soft, dithered patches
      const v = n(x / 37 + n2(y / 29) * 3) * 0.6 + n2(x / 13 + y / 17) * 0.4;
      const t = v * (G.grass.length - 1);
      const k = Math.min(G.grass.length - 2, Math.floor(t));
      let c: RGB = t - k > bayer(x, y) ? G.grass[k + 1] : G.grass[k];

      const { path, plaza } = pathDepth(x, y, n2);
      if (plaza > 0) {
        // cobblestone plaza
        const bx = Math.floor((x + (Math.floor(y / 5) % 2) * 4) / 8);
        const edge = (x + (Math.floor(y / 5) % 2) * 4) % 8 === 0 || y % 5 === 0;
        c = edge ? G.mortar : (bx * 7 + Math.floor(y / 5) * 3) % 5 === 0 ? G.cobbleL : G.cobble;
        if (plaza < 2.5) c = G.mortar;
      } else if (path > 0) {
        const d = Math.min(2, Math.floor(path / 3));
        c = path < 1.5 ? G.dirtEdge : G.dirt[Math.min(2, d)];
        if (path > 2 && r() < 0.02) c = G.pebble;
      } else if (path > -2.5 && bayer(x, y) < 0.5) {
        c = G.tuft; // grass overhanging the path edge
      }

      if (inBlob(x, y, n)) {
        water[y * MAP_W + x] = 1;
        c = G.water[Math.min(2, Math.floor(((y - POND.y + POND.ry) / (POND.ry * 2)) * 3 + bayer(x, y) * 0.6))];
      }
      pb.set(x, y, c);
    }
  // shoreline: a ring of stones and darker wet earth around the water
  for (let y = 1; y < MAP_H - 1; y++)
    for (let x = 1; x < MAP_W - 1; x++) {
      if (water[y * MAP_W + x]) continue;
      const near = water[y * MAP_W + x - 1] | water[y * MAP_W + x + 1] | water[(y - 1) * MAP_W + x] | water[(y + 1) * MAP_W + x];
      if (near) pb.set(x, y, G.shore);
    }
  for (let i = 0; i < 160; i++) {
    const a = r() * Math.PI * 2;
    const k = 0.98 + r() * 0.12;
    const x = POND.x + Math.cos(a) * POND.rx * k;
    const y = POND.y + Math.sin(a) * POND.ry * k;
    if (!water[Math.round(y) * MAP_W + Math.round(x)]) {
      pb.disc(Math.round(x), Math.round(y), 1 + Math.round(r() * 2), G.stone);
      pb.set(Math.round(x) - 1, Math.round(y) - 1, G.stoneL);
    }
  }
  // grass tufts and flowers
  for (let i = 0; i < 2600; i++) {
    const x = Math.floor(r() * MAP_W);
    const y = Math.floor(r() * MAP_H);
    const { path, plaza } = pathDepth(x, y, n2);
    if (path > -3 || plaza > -3 || water[y * MAP_W + x]) continue;
    if (r() < 0.82) {
      pb.set(x, y, G.tuft);
      pb.set(x - 1, y + 1, G.tuft);
      pb.set(x + 1, y + 1, G.tuft);
      pb.set(x, y - 1, G.tuftL);
    } else {
      const fc = [hex('#e07a63'), hex('#f2c46a'), hex('#e8dcc0'), hex('#9ec7e8'), hex('#c99ad9')][Math.floor(r() * 5)];
      pb.set(x, y, fc);
      pb.set(x + 1, y, fc);
      pb.set(x, y + 1, G.tuft);
    }
  }
  // lily pads
  for (const [lx, ly] of [
    [140, 395],
    [230, 430],
    [175, 452],
    [255, 384],
    [110, 430],
  ]) {
    pb.ellipse(lx, ly, 5, 3, hex('#3f8a55'));
    pb.set(lx + 4, ly, G.water[1]);
    pb.set(lx + 3, ly, G.water[1]);
    if ((lx + ly) % 3 === 0) {
      pb.rect(lx - 1, ly - 2, 2, 2, hex('#f0b4c0'));
    }
  }
  return { pb, water };
}

// ─── trees ──────────────────────────────────────────────────────────────────
function paintTree(seed: number, size: number): PB {
  const r = rng(seed);
  const w = Math.round(30 + size * 26);
  const h = Math.round(38 + size * 34);
  const pb = new PB(w + 2, h + 2);
  const cx = w / 2;
  const trunkH = 10 + Math.round(size * 6);
  // trunk with roots
  const tw = 5 + Math.round(size * 3);
  for (let y = h - trunkH; y < h; y++) {
    const flare = y > h - 4 ? y - (h - 4) : 0;
    for (let x = -tw / 2 - flare; x < tw / 2 + flare; x++) {
      const shade = x < -tw / 2 + 2 ? hex('#5c4632') : x > tw / 2 - 2 ? hex('#33261c') : hex('#47372a');
      pb.set(cx + x, y, shade);
    }
  }
  // canopy built from clumps, lit by the moon from the upper left
  const base = hex('#2f5a3a');
  const light = hex('#467a4a');
  const tip = hex('#6a9a5a');
  const top = 2;
  const ch = h - trunkH + 4;
  const blobs: [number, number, number][] = [];
  for (let k = 0; k < 7 + size * 4; k++) {
    const a = r() * Math.PI * 2;
    const d = r() * 0.55;
    blobs.push([cx + Math.cos(a) * d * w * 0.42, top + ch * 0.48 + Math.sin(a) * d * ch * 0.4, (0.22 + r() * 0.12) * w]);
  }
  blobs.sort((a, b) => a[1] - b[1]);
  pb.ellipse(Math.round(cx), Math.round(top + ch * 0.52), Math.round(w * 0.46), Math.round(ch * 0.44), hex('#244a30'));
  for (const [bx, by, br] of blobs) clump(pb, bx, by, br, base, light, tip);
  // darker underside so the canopy sits above the trunk
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!pb.alpha(x, y)) continue;
      const below = !pb.alpha(x, y + 2) || y > top + ch * 0.85;
      if (below && y > top + ch * 0.6 && y < h - trunkH + 2 && bayer(x, y) < 0.6) pb.set(x, y, hex('#244a30'));
    }
  const out = new PB(w + 2, h + 2);
  out.draw(pb, 1, 1);
  out.outline(hex('#14231a'));
  return out;
}

function paintBush(seed: number): PB {
  const r = rng(seed);
  const pb = new PB(22, 16);
  for (let k = 0; k < 4; k++) clump(pb, 6 + r() * 10, 8 + r() * 3, 4 + r() * 3, hex('#2f5a3a'), hex('#4a7d4c'), hex('#6a9a5a'));
  if (r() < 0.5) for (let k = 0; k < 3; k++) pb.set(5 + Math.floor(r() * 12), 4 + Math.floor(r() * 7), [hex('#e07a63'), hex('#f2c46a'), hex('#e8dcc0')][k]);
  const out = new PB(24, 18);
  out.draw(pb, 1, 1);
  out.outline(hex('#14231a'));
  return out;
}

function paintShadow(w: number, h: number): HTMLCanvasElement {
  const pb = new PB(w, h);
  pb.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, hex('#0c1410'));
  return pb.canvas();
}

// ─── build ──────────────────────────────────────────────────────────────────
export function buildMap() {
  const { pb: ground, water } = paintGround();
  const blocked = new Uint8Array(GRID_W * GRID_H);
  const block = (x0: number, y0: number, x1: number, y1: number) => {
    for (let gy = Math.max(0, Math.floor(y0 / CELL)); gy <= Math.min(GRID_H - 1, Math.floor(y1 / CELL)); gy++)
      for (let gx = Math.max(0, Math.floor(x0 / CELL)); gx <= Math.min(GRID_W - 1, Math.floor(x1 / CELL)); gx++)
        blocked[gy * GRID_W + gx] = 1;
  };
  // water blocks walking (the dragon can still fly over it)
  for (let gy = 0; gy < GRID_H; gy++)
    for (let gx = 0; gx < GRID_W; gx++) {
      const cx = gx * CELL + CELL / 2;
      const cy = gy * CELL + CELL / 2;
      if (water[cy * MAP_W + cx]) blocked[gy * GRID_W + gx] = 1;
    }

  const sprites: Sprite[] = [];
  const places: Place[] = [];
  const lights: Light[] = [];
  const lanterns: Lantern[] = [];
  const groundShadows: { c: HTMLCanvasElement; x: number; y: number }[] = [];
  const shadow = (cx: number, by: number, w: number, h: number) =>
    groundShadows.push({ c: paintShadow(w, h), x: cx - w / 2 + 3, y: by - h / 2 + 1 });

  const addProp = (p: Prop, place?: PlaceId) => {
    const c = p.pb.canvas();
    sprites.push({ canvas: c, x: p.x, y: p.y, baseY: p.y + p.pb.h - 2, place });
    return { x0: p.x, y0: p.y, x1: p.x + p.pb.w, y1: p.y + p.pb.h };
  };

  // the Archive (research)
  const pav = pavilion(122, 224);
  const pavB = addProp(pav, 'research');
  block(130, 150, 334, 220);
  shadow(230, 222, 230, 20);
  places.push({ id: 'research', name: 'The Archive', page: 'Research', href: '/research', door: { x: 230, y: 236 }, bounds: pavB });
  lights.push({ x: 140, y: 140, r: 22, color: 'warm' }, { x: 320, y: 140, r: 22, color: 'warm' }, { x: 230, y: 190, r: 52, color: 'window' });

  // the Chronicle stone (experience)
  const st = stele(522, 208);
  const stB = addProp(st, 'experience');
  block(498, 186, 548, 206);
  shadow(522, 206, 56, 12);
  places.push({ id: 'experience', name: 'Chronicle Stone', page: 'Experience', href: '/about#chronicle', door: { x: 522, y: 222 }, bounds: stB });

  // campfire on the plaza
  const fire = campfire(PLAZA.x, PLAZA.y + 4);
  addProp(fire);
  block(PLAZA.x - 14, PLAZA.y - 4, PLAZA.x + 14, PLAZA.y + 4);
  block(PLAZA.x - 50, PLAZA.y - 6, PLAZA.x - 24, PLAZA.y + 4);
  block(PLAZA.x + 28, PLAZA.y - 8, PLAZA.x + 42, PLAZA.y + 4);
  lights.push({ x: PLAZA.x, y: PLAZA.y - 4, r: 80, color: 'fire' });

  // quest board (projects)
  const qb = questBoard(602, 318);
  const qbB = addProp(qb, 'projects');
  block(604, 306, 680, 318);
  shadow(642, 316, 80, 12);
  places.push({ id: 'projects', name: 'Quest Board', page: 'Work', href: '/work', door: { x: 642, y: 332 }, bounds: qbB });
  lights.push({ x: 679, y: 262, r: 20, color: 'warm' });

  // the study (about)
  const cot = cottage(694, 528);
  const cotB = addProp(cot, 'about');
  block(700, 478, 824, 528);
  shadow(760, 526, 136, 18);
  places.push({ id: 'about', name: 'The Study', page: 'About', href: '/about', door: { x: 760, y: 542 }, bounds: cotB });
  lights.push({ x: 727, y: 486, r: 30, color: 'window' }, { x: 790, y: 482, r: 30, color: 'window' });

  // raven post (contact)
  const rp = ravenPost(866, 488);
  const rpB = addProp(rp, 'contact');
  block(860, 478, 872, 488);
  shadow(866, 487, 22, 8);
  places.push({ id: 'contact', name: 'Raven Post', page: 'Contact', href: '/#contact', door: { x: 852, y: 500 }, bounds: rpB });

  // signpost back to the main site
  const sp = signpost(522, 600);
  const spB = addProp(sp, 'exit');
  block(512, 592, 534, 600);
  places.push({ id: 'exit', name: 'Signpost', page: 'Back to the site', href: '/', door: { x: 500, y: 606 }, bounds: spB });

  // stone lanterns along the paths; some start unlit, for the dragon to light
  for (const [lx, ly, lit] of [
    [404, 282, true],
    [566, 282, false],
    [420, 432, true],
    [548, 450, false],
    [690, 330, true],
    [452, 540, false],
    [318, 248, true],
    [640, 470, false],
  ] as const) {
    const l = stoneLantern(lx, ly);
    addProp(l);
    block(lx - 6, ly - 4, lx + 6, ly);
    shadow(lx, ly - 1, 16, 6);
    lanterns.push({ x: lx, y: ly - 24, lit });
  }

  // trees: a dense forest ring plus a few in the clearing, never on paths or buildings
  const r = rng(99);
  const n2 = noise1(11);
  const nPond = noise1(3);
  const variants = Array.from({ length: 8 }, (_, i) => paintTree(200 + i, i % 3 === 0 ? 1 : i % 3 === 1 ? 0.6 : 0.2));
  const bushes = Array.from({ length: 4 }, (_, i) => paintBush(300 + i));
  const reserved = [
    [110, 30, 350, 250],
    [490, 170, 560, 230],
    [590, 250, 700, 340],
    [680, 400, 840, 560],
    [840, 420, 900, 510],
    [400, 280, 560, 420],
    [490, 560, 540, 610],
  ];
  const free = (x: number, y: number, pad: number) => {
    const { path, plaza } = pathDepth(x, y, n2);
    if (path > -pad || plaza > -pad) return false;
    if (inBlob(x, y, nPond) || inBlob(x, y - 10, nPond)) return false;
    for (const [a, b, c, d] of reserved) if (x > a - pad && x < c + pad && y > b - pad && y < d + pad) return false;
    return true;
  };
  const trees: { x: number; y: number; v: number }[] = [];
  const tryTree = (x: number, y: number) => {
    if (!free(x, y, 8)) return;
    for (const t of trees) if (Math.hypot(t.x - x, (t.y - y) * 1.4) < 26) return;
    trees.push({ x, y, v: Math.floor(r() * variants.length) });
  };
  for (let i = 0; i < 2200; i++) {
    const x = r() * MAP_W;
    const y = r() * (MAP_H + 40);
    const edge = Math.min(x, MAP_W - x, y, MAP_H - y);
    if (edge < 80 || r() < 0.035) tryTree(x, y);
  }
  for (const t of trees) {
    const c = variants[t.v].canvas();
    sprites.push({ canvas: c, x: Math.round(t.x - c.width / 2), y: Math.round(t.y - c.height + 2), baseY: t.y });
    shadow(t.x + 2, t.y, Math.round(c.width * 0.7), 10);
    block(t.x - 4, t.y - 4, t.x + 4, t.y);
  }
  for (let i = 0; i < 70; i++) {
    const x = r() * MAP_W;
    const y = 30 + r() * (MAP_H - 30);
    if (!free(x, y, 4)) continue;
    const b = bushes[i % bushes.length].canvas();
    sprites.push({ canvas: b, x: Math.round(x - 12), y: Math.round(y - 16), baseY: y });
  }

  // map edges are walls, except the path that leaves to the south
  for (let gx = 0; gx < GRID_W; gx++) {
    blocked[gx] = 1;
    if (Math.abs(gx * CELL - 480) > 14) blocked[(GRID_H - 1) * GRID_W + gx] = 1;
  }
  for (let gy = 0; gy < GRID_H; gy++) {
    blocked[gy * GRID_W] = 1;
    blocked[gy * GRID_W + GRID_W - 1] = 1;
  }

  // bake shadows into the ground
  const groundCanvas = ground.canvas();
  const g = groundCanvas.getContext('2d')!;
  g.globalAlpha = 0.45;
  for (const s of groundShadows) g.drawImage(s.c, Math.round(s.x), Math.round(s.y));
  g.globalAlpha = 1;

  return { ground: groundCanvas, water, blocked, sprites, places, lights, lanterns, plaza: PLAZA };
}

export type GameMap = ReturnType<typeof buildMap>;
export { C };
