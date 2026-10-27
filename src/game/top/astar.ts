// A* on the navigation grid: 8 directions, no corner cutting, octile distance
// with a small tie-breaker for straighter paths (Amit Patel's notes).

export function findPath(
  blocked: Uint8Array,
  w: number,
  h: number,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): [number, number][] | null {
  const idx = (x: number, y: number) => y * w + x;
  const free = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && !blocked[idx(x, y)];
  // if the goal is blocked, aim for the nearest free cell around it
  if (!free(tx, ty)) {
    let best: [number, number] | null = null;
    for (let r = 1; r < 8 && !best; r++)
      for (let dy = -r; dy <= r && !best; dy++)
        for (let dx = -r; dx <= r; dx++)
          if (free(tx + dx, ty + dy)) {
            best = [tx + dx, ty + dy];
            break;
          }
    if (!best) return null;
    [tx, ty] = best;
  }
  if (!free(sx, sy)) return null;

  const D2 = Math.SQRT2;
  const hfn = (x: number, y: number) => {
    const dx = Math.abs(x - tx);
    const dy = Math.abs(y - ty);
    const cross = Math.abs((x - tx) * (sy - ty) - (sx - tx) * (y - ty));
    return dx + dy + (D2 - 2) * Math.min(dx, dy) + cross * 0.001;
  };
  const g = new Float32Array(w * h).fill(Infinity);
  const from = new Int32Array(w * h).fill(-1);
  const closed = new Uint8Array(w * h);
  // binary heap of [f, index]
  const heap: [number, number][] = [];
  const push = (f: number, i: number) => {
    heap.push([f, i]);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (heap[p][0] <= heap[c][0]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]];
      c = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        const l = 2 * c + 1;
        const r = l + 1;
        let m = c;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]];
        c = m;
      }
    }
    return top;
  };

  const start = idx(sx, sy);
  const goal = idx(tx, ty);
  g[start] = 0;
  push(hfn(sx, sy), start);
  const dirs = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, D2],
    [1, -1, D2],
    [-1, 1, D2],
    [-1, -1, D2],
  ];
  while (heap.length) {
    const [, cur] = pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % w;
    const cy = (cur - cx) / w;
    for (const [dx, dy, cost] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!free(nx, ny)) continue;
      if (dx && dy && (!free(cx + dx, cy) || !free(cx, cy + dy))) continue; // no corner cutting
      const ni = idx(nx, ny);
      const ng = g[cur] + cost;
      if (ng < g[ni]) {
        g[ni] = ng;
        from[ni] = cur;
        push(ng + hfn(nx, ny), ni);
      }
    }
  }
  if (from[goal] === -1 && goal !== start) return null;
  const path: [number, number][] = [];
  for (let c = goal; c !== -1; c = from[c]) path.push([c % w, Math.floor(c / w)]);
  path.reverse();
  return smooth(path, free);
}

/** Drop waypoints that are in direct line of sight of an earlier one. */
function smooth(path: [number, number][], free: (x: number, y: number) => boolean) {
  if (path.length < 3) return path;
  const los = (a: [number, number], b: [number, number]) => {
    const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) * 2;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t;
      if (!free(Math.round(x), Math.round(y)) || !free(Math.floor(x), Math.floor(y)) || !free(Math.ceil(x), Math.ceil(y))) return false;
    }
    return true;
  };
  const out: [number, number][] = [path[0]];
  let anchor = 0;
  for (let i = 2; i < path.length; i++) {
    if (!los(path[anchor], path[i])) {
      out.push(path[i - 1]);
      anchor = i - 1;
    }
  }
  out.push(path[path.length - 1]);
  return out;
}
