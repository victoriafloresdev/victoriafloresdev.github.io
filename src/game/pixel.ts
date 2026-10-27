// Low-level pixel-art drawing on raw RGBA buffers. Scenery is painted once into
// these buffers at load, converted to canvases, and then only blitted per frame.

export type RGB = [number, number, number];

export const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
/** Ordered-dither threshold in (0,1) for pixel (x, y). */
export const bayer = (x: number, y: number) => BAYER4[((y & 3) << 2) | (x & 3)];

/** Deterministic PRNG so every visit paints the same world. */
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cheap 1-D value noise in [0,1). */
export function noise1(seed: number) {
  const r = rng(seed);
  const table = Array.from({ length: 256 }, () => r());
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = table[i & 255];
    const b = table[(i + 1) & 255];
    const s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  };
}

export class PB {
  data: Uint8ClampedArray<ArrayBuffer>;
  constructor(
    public w: number,
    public h: number,
  ) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  set(x: number, y: number, c: RGB, a = 255) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const d = this.data;
    const i = (y * this.w + x) * 4;
    if (a >= 255 || d[i + 3] === 0) {
      // opaque paint, or translucent paint onto an empty pixel
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
      d[i + 3] = Math.min(255, a);
      return;
    }
    const sa = a / 255;
    d[i] = d[i] + (c[0] - d[i]) * sa;
    d[i + 1] = d[i + 1] + (c[1] - d[i + 1]) * sa;
    d[i + 2] = d[i + 2] + (c[2] - d[i + 2]) * sa;
    d[i + 3] = Math.max(d[i + 3], a);
  }

  alpha(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }

  rect(x: number, y: number, w: number, h: number, c: RGB, a = 255) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, a);
  }

  /** Rectangle with an ordered-dither vertical gradient through `cs`. */
  vgrad(x: number, y: number, w: number, h: number, cs: RGB[]) {
    const n = cs.length - 1;
    for (let j = 0; j < h; j++) {
      const t = (j / Math.max(1, h - 1)) * n;
      const k = Math.min(n - 1, Math.floor(t));
      const f = t - k;
      for (let i = 0; i < w; i++) this.set(x + i, y + j, f > bayer(x + i, y + j) ? cs[k + 1] : cs[k]);
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGB) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  disc(cx: number, cy: number, r: number, c: RGB) {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.set(cx + x, cy + y, c);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB) {
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.05) this.set(cx + x, cy + y, c);
  }

  /** Draw a sprite given as rows of characters mapped to colors ('.' = empty). */
  map(x: number, y: number, rows: string[], pal: Record<string, RGB>) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch !== '.' && pal[ch]) this.set(x + i, y + j, pal[ch]);
      }
    });
  }

  /** Paint a 1px ring of `c` around every opaque pixel. */
  outline(c: RGB) {
    const src = new Uint8ClampedArray(this.data);
    const w = this.w;
    const h = this.h;
    const op = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (op(x, y)) continue;
        if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) this.set(x, y, c);
      }
    return this;
  }

  /** Alpha-composite another buffer onto this one. */
  draw(o: PB, ox: number, oy: number) {
    for (let y = 0; y < o.h; y++)
      for (let x = 0; x < o.w; x++) {
        const i = (y * o.w + x) * 4;
        const a = o.data[i + 3];
        if (a) this.set(ox + x, oy + y, [o.data[i], o.data[i + 1], o.data[i + 2]], a);
      }
  }

  canvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    c.getContext('2d')!.putImageData(new ImageData(this.data, this.w, this.h), 0, 0);
    return c;
  }
}
