// The Arcane Archive, top-down. A small cozy walk-around: the scholar explores a
// night-time village, her dragon follows and reacts, and each building is a door
// into a real page of the portfolio.
import { glowSprite } from '../world';
import { ICONS, type IconName } from '../icons';
import { PB, hex } from '../pixel';
import { findPath } from './astar';
import { buildEmotes, type EmoteName } from './emotes';
import { CELL, GRID_H, GRID_W, MAP_H, MAP_W, buildMap, type Place, type Sprite } from './map';

// ─── assets ─────────────────────────────────────────────────────────────────
interface Sheet {
  img: HTMLImageElement;
  fw: number;
  fh: number;
}
const load = (src: string) =>
  new Promise<HTMLImageElement>((ok, fail) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = fail;
    i.src = src;
  });

// animation clips: [sheet, first frame, frame count, ms per frame, loop]
type SheetKey = 'move' | 'poses' | 'actions' | 'dragon';
interface Clip {
  sheet: SheetKey;
  from: number;
  n: number;
  ms: number;
  loop: boolean;
}
const clip = (sheet: SheetKey, from: number, n: number, ms: number, loop = true): Clip => ({ sheet, from, n, ms, loop });
const HERO = {
  walk: clip('move', 0, 6, 95),
  front: clip('poses', 0, 1, 1000),
  back: clip('poses', 5, 1, 1000),
  idle: clip('actions', 0, 6, 260),
  read: clip('actions', 12, 6, 280),
  laptopStand: clip('actions', 18, 6, 180),
  cast: clip('actions', 24, 6, 150),
  cheer: clip('actions', 30, 6, 130, false),
  confused: clip('actions', 36, 6, 200),
  coffee: clip('actions', 42, 6, 240),
  sitDown: clip('move', 8, 4, 130, false),
  openLaptop: clip('move', 14, 4, 180, false),
  typing: clip('move', 18, 6, 170),
  standUp: clip('move', 30, 3, 110, false),
};
const PET = {
  idle: clip('dragon', 0, 5, 220),
  blink: clip('dragon', 5, 5, 110, false),
  sleep: clip('dragon', 15, 3, 400, false),
  flap: clip('dragon', 20, 5, 80),
  hop: clip('dragon', 25, 5, 110),
  happy: clip('dragon', 30, 5, 120),
  magic: clip('dragon', 40, 5, 120),
};

export type HeroAction = 'code' | 'read' | 'coffee' | 'cast' | 'cheer' | 'think';
export type PetAction = 'pet' | 'treat' | 'fetch' | 'fire' | 'nap';

export interface GameHooks {
  onPrompt(place: Place | null): void;
  onEnter(place: Place): void;
  announce(msg: string): void;
}

export async function startArchive(canvas: HTMLCanvasElement, hooks: GameHooks) {
  const meta = await (await fetch('/sprites/sprites.json')).json();
  const [move, poses, actions, dragon] = await Promise.all([
    load(meta.mageMoveS.src),
    load(meta.mageS.src),
    load(meta.mageActionsS.src),
    load(meta.dragonAnimS.src),
  ]);
  const sheets: Record<SheetKey, Sheet> = {
    move: { img: move, fw: meta.mageMoveS.frameW, fh: meta.mageMoveS.frameH },
    poses: { img: poses, fw: meta.mageS.frameW, fh: meta.mageS.frameH },
    actions: { img: actions, fw: meta.mageActionsS.frameW, fh: meta.mageActionsS.frameH },
    dragon: { img: dragon, fw: meta.dragonAnimS.frameW, fh: meta.dragonAnimS.frameH },
  };

  const map = buildMap();
  const emotes = buildEmotes();
  const markers = Object.fromEntries(
    (['book', 'scroll', 'quest', 'seal', 'letter', 'arrow'] as IconName[]).map((k) => {
      const d = ICONS[k];
      const pb = new PB(d.rows[0].length + 2, d.rows.length + 2);
      pb.map(1, 1, d.rows, Object.fromEntries(Object.entries(d.pal).map(([c, h]) => [c, hex(h)])));
      pb.outline(hex('#1a1016'));
      return [k, pb.canvas()];
    }),
  ) as Record<IconName, HTMLCanvasElement>;
  const placeIcon: Record<Place['id'], IconName> = { research: 'book', experience: 'scroll', projects: 'quest', about: 'seal', contact: 'letter', exit: 'arrow' };
  const rings = new Map<Sprite, HTMLCanvasElement>();
  for (const s of map.sprites) if (s.place) rings.set(s, ringOf(s.canvas));
  const shadowHero = ellipse(18, 5, '#0a0f0c');
  const shadowPet = ellipse(14, 4, '#0a0f0c');

  const glowCache = new Map<string, HTMLCanvasElement>();
  const glow = (r: number, color: string, alphas: number[]) => {
    const key = `${r}${color}${alphas}`;
    if (!glowCache.has(key)) glowCache.set(key, glowSprite(r, color, alphas));
    return glowCache.get(key)!;
  };
  const LIGHT_COLORS = { warm: '#ffcf8a', fire: '#ffb070', window: '#ffd98f', jade: '#9ff0d0', moon: '#c9d8ff' };

  // ─── canvases and integer scaling ────────────────────────────────────────
  const dctx = canvas.getContext('2d')!;
  const buf = document.createElement('canvas');
  const ctx = buf.getContext('2d')!;
  const lightBuf = document.createElement('canvas');
  const lctx = lightBuf.getContext('2d')!;
  let scale = 2;
  let viewW = 640;
  let viewH = 360;
  let dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    const devW = Math.max(1, Math.round(cssW * dpr));
    const devH = Math.max(1, Math.round(cssH * dpr));
    const portrait = devH > devW;
    const minW = portrait ? 300 : 600;
    const minH = portrait ? 420 : 330;
    scale = Math.max(1, Math.floor(Math.min(devW / minW, devH / minH)));
    viewW = Math.ceil(devW / scale);
    viewH = Math.ceil(devH / scale);
    canvas.width = devW;
    canvas.height = devH;
    buf.width = lightBuf.width = viewW;
    buf.height = lightBuf.height = viewH;
    for (const c of [dctx, ctx, lctx]) c.imageSmoothingEnabled = false;
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  // ─── state ───────────────────────────────────────────────────────────────
  const saved = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('archive:state') ?? 'null');
    } catch {
      return null;
    }
  })();
  if (saved?.lit) saved.lit.forEach((v: boolean, i: number) => map.lanterns[i] && (map.lanterns[i].lit = v));

  const hero = {
    x: saved?.x ?? 480,
    y: saved?.y ?? 440,
    face: 1 as 1 | -1,
    dir: 'down' as 'side' | 'up' | 'down',
    moving: false,
    path: [] as { x: number; y: number }[],
    goal: null as Place | null,
    clip: HERO.idle,
    clipT: 0,
    idleT: 0,
    action: null as HeroAction | null,
    seq: [] as Clip[], // queued one-shot clips before the action loop
    lock: 0, // seconds during which input is ignored (standing up)
    emote: null as { name: EmoteName; t: number } | null,
  };
  const pet = {
    x: saved?.px ?? hero.x - 36,
    y: saved?.py ?? hero.y + 2,
    z: 0,
    face: -1 as 1 | -1,
    state: 'follow' as 'follow' | 'idle' | 'wander' | 'goto' | 'react' | 'sleep',
    target: null as { x: number; y: number; then: () => void } | null,
    clip: PET.idle,
    clipT: 0,
    t: 0,
    blinkAt: 2.5,
    wanderAt: 6,
    carry: false,
    emote: null as { name: EmoteName; t: number } | null,
  };
  let camX = hero.x - viewW / 2;
  let camY = hero.y - viewH / 2;
  let calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let near: Place | null = null;
  let hover: Place | null = null;
  let mouse: { x: number; y: number } | null = null;
  const keys = new Set<string>();
  const items: { kind: 'berry' | 'orb'; x: number; y: number; z: number; vx: number; vy: number; vz: number; t: number; landed: boolean }[] = [];
  const sparks: { x: number; y: number; vx: number; vy: number; life: number; c: string }[] = [];
  const smoke: { x: number; y: number; life: number; s: number }[] = [];
  const rnd = (() => {
    let s = 98765;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  })();
  const fireflies = Array.from({ length: 60 }, () => ({ x: rnd() * MAP_W, y: rnd() * MAP_H, ph: rnd() * 6.3, sp: 0.3 + rnd() * 0.6, amp: 6 + rnd() * 16 }));
  const waterSpots: [number, number][] = [];
  while (waterSpots.length < 34) {
    const x = Math.floor(rnd() * MAP_W);
    const y = Math.floor(rnd() * MAP_H);
    if (map.water[y * MAP_W + x]) waterSpots.push([x, y]);
  }

  // ─── helpers ─────────────────────────────────────────────────────────────
  const blockedAt = (x: number, y: number) => {
    const gx = Math.floor(x / CELL);
    const gy = Math.floor(y / CELL);
    return gx < 0 || gy < 0 || gx >= GRID_W || gy >= GRID_H || map.blocked[gy * GRID_W + gx] === 1;
  };
  const feetFree = (x: number, y: number) => !blockedAt(x - 5, y) && !blockedAt(x + 5, y) && !blockedAt(x - 5, y - 3) && !blockedAt(x + 5, y - 3);
  const setClip = (o: typeof hero | typeof pet, c: Clip) => {
    if (o.clip !== c) {
      o.clip = c;
      o.clipT = 0;
    }
  };
  const frameOf = (c: Clip, t: number) => {
    const k = Math.floor((t * 1000) / c.ms);
    return c.from + (c.loop ? k % c.n : Math.min(c.n - 1, k));
  };
  const clipDone = (c: Clip, t: number) => !c.loop && (t * 1000) / c.ms >= c.n;
  const emote = (who: typeof hero | typeof pet, name: EmoteName) => (who.emote = { name, t: 0 });

  function walkTo(x: number, y: number, goal: Place | null = null) {
    const p = findPath(map.blocked, GRID_W, GRID_H, Math.floor(hero.x / CELL), Math.floor((hero.y - 1) / CELL), Math.floor(x / CELL), Math.floor(y / CELL));
    if (!p) return;
    hero.path = p.slice(1).map(([gx, gy]) => ({ x: gx * CELL + CELL / 2, y: gy * CELL + CELL / 2 + 2 }));
    if (goal) hero.path.push({ x: goal.door.x, y: goal.door.y });
    hero.goal = goal;
    stopAction();
  }
  function stopAction() {
    if (hero.action === 'code') {
      hero.seq = [HERO.standUp];
      hero.lock = (HERO.standUp.n * HERO.standUp.ms) / 1000;
    }
    hero.action = null;
  }
  function enter(place: Place) {
    hero.path = [];
    hero.goal = null;
    sessionStorage.setItem(
      'archive:state',
      JSON.stringify({ x: hero.x, y: hero.y + 10, px: pet.x, py: pet.y + 10, lit: map.lanterns.map((l) => l.lit) }),
    );
    hooks.onEnter(place);
  }

  // ─── input ───────────────────────────────────────────────────────────────
  const toWorld = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * dpr) / scale + camX, y: ((e.clientY - r.top) * dpr) / scale + camY };
  };
  const placeAt = (p: { x: number; y: number }) =>
    map.places.find((pl) => p.x >= pl.bounds.x0 && p.x <= pl.bounds.x1 && p.y >= pl.bounds.y0 && p.y <= pl.bounds.y1) ?? null;
  canvas.addEventListener('pointermove', (e) => (mouse = toWorld(e)));
  canvas.addEventListener('pointerleave', () => (mouse = null));
  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus();
    const p = toWorld(e);
    const pl = placeAt(p);
    if (pl) {
      if (Math.hypot(hero.x - pl.door.x, hero.y - pl.door.y) < 22) enter(pl);
      else walkTo(pl.door.x, pl.door.y, pl);
    } else if (Math.hypot(p.x - pet.x, p.y - (pet.y - 14)) < 16) petAction('pet');
    else walkTo(p.x, p.y);
  });
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    const t = e.target as HTMLElement;
    if (t.closest('a,button,input,textarea,select') && (k === 'enter' || k === ' ')) return;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
      keys.add(k);
      hero.path = [];
      hero.goal = null;
      if (hero.action) stopAction();
      e.preventDefault();
    } else if ((k === 'e' || k === 'enter') && near) {
      e.preventDefault();
      enter(near);
    }
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());

  // ─── actions ─────────────────────────────────────────────────────────────
  function heroAction(a: HeroAction) {
    hero.path = [];
    hero.goal = null;
    if (hero.action === a) return stopAction();
    if (hero.action === 'code') stopAction();
    hero.action = a;
    hero.idleT = 0;
    if (a === 'code') hero.seq = [HERO.sitDown, HERO.openLaptop];
    if (a === 'think') emote(hero, 'bug');
    if (a === 'cheer') emote(pet, 'note');
    hooks.announce(
      { code: 'You sit down and open the laptop.', read: 'You open a book.', coffee: 'Coffee break.', cast: 'Holograms of graphs float around you.', cheer: 'A small celebration!', think: 'A bug! Time to debug.' }[a],
    );
  }
  function petGoto(x: number, y: number, then: () => void) {
    pet.state = 'goto';
    pet.target = { x, y, then };
  }
  function petReact(c: Clip, secs: number, em?: EmoteName) {
    pet.state = 'react';
    setClip(pet, c);
    pet.t = -secs;
    if (em) emote(pet, em);
  }
  function petAction(a: PetAction) {
    const ahead = { x: hero.x + hero.face * 60, y: hero.y + (hero.dir === 'down' ? 30 : hero.dir === 'up' ? -30 : 4) };
    if (a === 'pet') {
      petGoto(hero.x + hero.face * 30, hero.y + 2, () => petReact(PET.happy, 1.8, 'heart'));
      hooks.announce('You pet the dragon. It looks very pleased.');
    } else if (a === 'nap') {
      pet.state = 'sleep';
      setClip(pet, PET.sleep);
      emote(pet, 'zz');
      hooks.announce('The dragon curls up for a nap.');
    } else if (a === 'treat' || a === 'fetch') {
      const kind = a === 'treat' ? 'berry' : 'orb';
      const far = a === 'fetch' ? 2 : 1;
      let tx = mouse ? mouse.x : hero.x + (ahead.x - hero.x) * far;
      let ty = mouse ? mouse.y : hero.y + (ahead.y - hero.y) * far;
      tx = Math.max(20, Math.min(MAP_W - 20, tx));
      ty = Math.max(20, Math.min(MAP_H - 20, ty));
      const dur = 0.6;
      items.push({ kind, x: hero.x, y: hero.y, z: 20, vx: (tx - hero.x) / dur, vy: (ty - hero.y) / dur, vz: 60, t: 0, landed: false });
      emote(pet, 'wow');
      const it = items[items.length - 1];
      petGoto(tx, ty, () => {
        const i = items.indexOf(it);
        if (i >= 0) items.splice(i, 1);
        if (kind === 'berry') petReact(PET.happy, 1.4, 'heart');
        else {
          pet.carry = true;
          petGoto(hero.x + hero.face * 30, hero.y + 2, () => {
            pet.carry = false;
            petReact(PET.happy, 1.6, 'heart');
          });
        }
      });
      hooks.announce(kind === 'berry' ? 'You toss a berry. The dragon zooms after it.' : 'You throw the glowing orb. Fetch!');
    } else if (a === 'fire') {
      const dark = map.lanterns.filter((l) => !l.lit).sort((p, q) => Math.hypot(p.x - hero.x, p.y - hero.y) - Math.hypot(q.x - hero.x, q.y - hero.y))[0];
      if (dark) {
        const side = dark.x > hero.x ? -1 : 1;
        petGoto(dark.x + side * 22, dark.y + 26, () => {
          pet.face = (side * -1) as 1 | -1;
          petReact(PET.magic, 1.2);
          for (let i = 0; i < 26; i++)
            sparks.push({ x: pet.x + pet.face * 8, y: pet.y - 16, vx: pet.face * (50 + rnd() * 60), vy: -10 - rnd() * 25, life: 0.6 + rnd() * 0.4, c: rnd() < 0.5 ? '#ffb070' : '#ffe08a' });
          setTimeout(() => {
            dark.lit = true;
            const left = map.lanterns.filter((l) => !l.lit).length;
            hooks.announce(left ? 'A lantern glows again.' : 'Every lantern in the archive is lit.');
            if (!left) emote(hero, 'spark');
          }, 500);
        });
      } else {
        petReact(PET.magic, 1.4, 'spark');
        for (let i = 0; i < 40; i++) {
          const a2 = rnd() * Math.PI * 2;
          sparks.push({ x: pet.x, y: pet.y - 30, vx: Math.cos(a2) * 60, vy: Math.sin(a2) * 60 - 20, life: 0.8 + rnd() * 0.6, c: ['#ffb070', '#ffe08a', '#e5533d', '#7fd1b5'][i % 4] });
        }
        hooks.announce('All lanterns are lit, so the dragon makes fireworks instead.');
      }
    }
  }

  // ─── update ──────────────────────────────────────────────────────────────
  function update(dt: number, time: number) {
    // hero movement: keys win over a clicked path
    let vx = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
    let vy = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0);
    if (!vx && !vy && hero.path.length) {
      const wp = hero.path[0];
      const dx = wp.x - hero.x;
      const dy = wp.y - hero.y;
      const d = Math.hypot(dx, dy);
      if (d < 2) {
        hero.path.shift();
        if (!hero.path.length && hero.goal) {
          const g = hero.goal;
          hero.goal = null;
          enter(g);
        }
      } else {
        vx = dx / d;
        vy = dy / d;
      }
    }
    if (hero.lock > 0) {
      hero.lock -= dt;
      vx = vy = 0;
    }
    const len = Math.hypot(vx, vy);
    hero.moving = len > 0;
    if (hero.moving) {
      const sp = 74 * dt;
      const mx = (vx / len) * sp;
      const my = (vy / len) * sp;
      if (feetFree(hero.x + mx, hero.y)) hero.x += mx;
      if (feetFree(hero.x, hero.y + my)) hero.y += my;
      // pick a facing with a little hysteresis
      if (Math.abs(vx) > Math.abs(vy) * 0.8) {
        hero.dir = 'side';
        hero.face = vx > 0 ? 1 : -1;
      } else if (Math.abs(vy) > Math.abs(vx) * 1.2) hero.dir = vy > 0 ? 'down' : 'up';
      hero.idleT = 0;
    } else hero.idleT += dt;

    // hero animation
    hero.clipT += dt;
    if (hero.seq.length) {
      setClip(hero, hero.seq[0]);
      if (clipDone(hero.clip, hero.clipT)) {
        hero.seq.shift();
        hero.clipT = 0;
        if (hero.seq.length) hero.clip = hero.seq[0];
      }
    } else if (hero.moving) setClip(hero, hero.dir === 'side' ? HERO.walk : hero.dir === 'up' ? HERO.back : HERO.front);
    else if (hero.action) {
      const c = { code: HERO.typing, read: HERO.read, coffee: HERO.coffee, cast: HERO.cast, cheer: HERO.cheer, think: HERO.confused }[hero.action];
      setClip(hero, c);
      if (hero.action === 'cheer' && clipDone(c, hero.clipT)) hero.action = null;
    } else if (hero.idleT > 14) setClip(hero, HERO.coffee);
    else setClip(hero, HERO.idle);
    if (hero.emote && (hero.emote.t += dt) > 2.2) hero.emote = null;

    // dragon brain
    pet.clipT += dt;
    pet.t += dt;
    const flyTo = (tx: number, ty: number, speed: number) => {
      const dx = tx - pet.x;
      const dy = ty - pet.y;
      const d = Math.hypot(dx, dy);
      if (d < 3) return true;
      const v = Math.min(speed, 30 + d * 3) * dt; // arrival: slow down when close
      pet.x += (dx / d) * Math.min(d, v);
      pet.y += (dy / d) * Math.min(d, v);
      if (Math.abs(dx) > 1) pet.face = dx > 0 ? 1 : -1;
      setClip(pet, PET.flap);
      return false;
    };
    let wantZ = 0;
    if (pet.state === 'goto' && pet.target) {
      wantZ = 14;
      if (flyTo(pet.target.x, pet.target.y, 150)) {
        const then = pet.target.then;
        pet.target = null;
        pet.state = 'idle';
        then();
      }
    } else if (pet.state === 'react') {
      if (pet.t > 0) {
        pet.state = 'follow';
        pet.t = 0;
      }
    } else if (pet.state === 'sleep') {
      setClip(pet, PET.sleep);
      if (Math.hypot(hero.x - pet.x, hero.y - pet.y) > 120) pet.state = 'follow';
      if (!pet.emote && rnd() < dt * 0.4) emote(pet, 'zz');
    } else if (pet.state === 'wander' && pet.target) {
      wantZ = 0;
      const done = flyTo(pet.target.x, pet.target.y, 40);
      setClip(pet, PET.hop);
      if (done || hero.moving) {
        pet.target = null;
        pet.state = 'idle';
      }
    } else {
      // follow at a comfortable distance behind the hero
      const gx = hero.x - hero.face * 36;
      const gy = hero.y + 2;
      const d = Math.hypot(gx - pet.x, gy - pet.y);
      if (d > 34 || (pet.state === 'follow' && d > 6)) {
        pet.state = 'follow';
        wantZ = d > 40 ? 14 : 6;
        flyTo(gx, gy, 130);
      } else {
        pet.state = 'idle';
        pet.face = hero.x >= pet.x ? 1 : -1;
        if (hero.action === 'code' && hero.idleT > 6) {
          pet.state = 'sleep';
          emote(pet, 'zz');
        } else if (hero.idleT > pet.wanderAt && !hero.action) {
          pet.wanderAt = hero.idleT + 5 + rnd() * 6;
          const a = rnd() * Math.PI * 2;
          const tx = hero.x + Math.cos(a) * 40;
          const ty = hero.y + Math.sin(a) * 22;
          if (feetFree(tx, ty)) {
            pet.state = 'wander';
            pet.target = { x: tx, y: ty, then: () => {} };
          }
        } else if (pet.t > pet.blinkAt) {
          setClip(pet, PET.blink);
          if (clipDone(PET.blink, pet.clipT)) {
            pet.t = 0;
            pet.blinkAt = 2 + rnd() * 4;
          }
        } else setClip(pet, PET.idle);
      }
    }
    pet.z += (wantZ - pet.z) * Math.min(1, dt * 6);
    if (pet.emote && (pet.emote.t += dt) > 2) pet.emote = null;

    // thrown items arc and land
    for (const it of items) {
      it.t += dt;
      if (!it.landed) {
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.vz -= 260 * dt;
        it.z = Math.max(0, it.z + it.vz * dt);
        if (it.t > 0.6) it.landed = true;
      }
    }
    if (pet.carry && items.length) items.length = 0;

    // particles
    if (!calm) {
      if (rnd() < dt * 12) sparks.push({ x: map.plaza.x + (rnd() - 0.5) * 8, y: map.plaza.y - 8, vx: (rnd() - 0.5) * 6, vy: -20 - rnd() * 20, life: 1, c: '#ffd08a' });
      if (rnd() < dt * 2) smoke.push({ x: 793, y: 414, life: 1, s: 2 + Math.floor(rnd() * 3) });
    }
    for (const s of sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
    }
    for (const s of smoke) {
      s.y -= 8 * dt;
      s.x += 4 * dt;
      s.life -= dt * 0.25;
    }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
    for (let i = smoke.length - 1; i >= 0; i--) if (smoke[i].life <= 0) smoke.splice(i, 1);

    // camera
    const wantX = MAP_W <= viewW ? (MAP_W - viewW) / 2 : Math.max(0, Math.min(MAP_W - viewW, hero.x - viewW / 2));
    const wantY = MAP_H <= viewH ? (MAP_H - viewH) / 2 : Math.max(0, Math.min(MAP_H - viewH, hero.y - 20 - viewH / 2));
    const k = calm ? 1 : 1 - Math.pow(2, -8 * dt);
    camX += (wantX - camX) * k;
    camY += (wantY - camY) * k;

    // what's near / under the cursor
    const n = map.places.find((p) => Math.hypot(hero.x - p.door.x, hero.y - p.door.y) < 22) ?? null;
    if (n !== near) {
      near = n;
      hooks.onPrompt(near);
      if (near) hooks.announce(`Near ${near.name}. Press E to open ${near.page}.`);
    }
    hover = mouse ? placeAt(mouse) : null;
    canvas.style.cursor = hover || (mouse && Math.hypot(mouse.x - pet.x, mouse.y - (pet.y - 14)) < 16) ? 'pointer' : 'default';
    void time;
  }

  // ─── render ──────────────────────────────────────────────────────────────
  function drawClip(c: Clip, t: number, x: number, feetY: number, flip: boolean) {
    const s = sheets[c.sheet];
    const f = frameOf(c, t);
    const dx = Math.round(x - s.fw / 2);
    const dy = Math.round(feetY - s.fh + 1);
    if (!flip) ctx.drawImage(s.img, f * s.fw, 0, s.fw, s.fh, dx, dy, s.fw, s.fh);
    else {
      ctx.save();
      ctx.translate(dx + s.fw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(s.img, f * s.fw, 0, s.fw, s.fh, 0, 0, s.fw, s.fh);
      ctx.restore();
    }
  }

  function render(time: number) {
    const cx = Math.round(camX);
    const cy = Math.round(camY);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0c1410';
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.save();
    ctx.translate(-cx, -cy);
    ctx.drawImage(map.ground, 0, 0);

    // water sparkle (under everything)
    if (!calm)
      for (const [wx, wy] of waterSpots) {
        const b = Math.sin(time * 2 + wx * 0.3 + wy);
        if (b > 0.6) {
          ctx.fillStyle = 'rgba(190,235,230,0.8)';
          ctx.fillRect(wx, wy, 2, 1);
        }
      }

    // y-sorted world
    const vis: { y: number; draw: () => void }[] = [];
    for (const s of map.sprites) {
      if (s.x > cx + viewW + 8 || s.x + s.canvas.width < cx - 8 || s.y > cy + viewH + 8 || s.y + s.canvas.height < cy - 8) continue;
      vis.push({
        y: s.baseY,
        draw: () => {
          ctx.drawImage(s.canvas, s.x, s.y);
          if (s.place && (hover?.id === s.place || near?.id === s.place)) ctx.drawImage(rings.get(s)!, s.x - 1, s.y - 1);
        },
      });
    }
    vis.push({
      y: hero.y,
      draw: () => {
        ctx.globalAlpha = 0.5;
        ctx.drawImage(shadowHero, Math.round(hero.x - 9), Math.round(hero.y - 3));
        ctx.globalAlpha = 1;
        const bob = hero.moving && hero.dir !== 'side' && Math.floor(hero.clipT * 7) % 2 ? -1 : 0;
        const flip = hero.clip === HERO.walk ? hero.face < 0 : false;
        drawClip(hero.clip, hero.clipT, hero.x, hero.y + bob, flip);
      },
    });
    vis.push({
      y: pet.y,
      draw: () => {
        ctx.globalAlpha = pet.z > 2 ? 0.3 : 0.5;
        ctx.drawImage(shadowPet, Math.round(pet.x - 7), Math.round(pet.y - 2));
        ctx.globalAlpha = 1;
        drawClip(pet.clip, pet.clipT, pet.x, Math.round(pet.y - pet.z), pet.face < 0);
        if (pet.carry) drawOrb(pet.x + pet.face * 8, pet.y - pet.z - 16, time);
      },
    });
    for (const it of items)
      vis.push({
        y: it.y,
        draw: () => (it.kind === 'orb' ? drawOrb(it.x, it.y - it.z - 3, time) : drawBerry(it.x, it.y - it.z - 2)),
      });
    vis.sort((a, b) => a.y - b.y);
    for (const v of vis) v.draw();

    // campfire flames
    for (const [col, h, w] of [
      ['#d9644f', 12, 5],
      ['#f2a43a', 8, 4],
      ['#f8dc94', 4, 2],
    ] as const)
      for (let dx = -w; dx <= w; dx++) {
        const hh = Math.round(h * (1 - Math.abs(dx) / (w + 1)) * (calm ? 0.9 : 0.7 + 0.3 * Math.sin(time * 13 + dx * 1.7 + h)));
        ctx.fillStyle = col;
        ctx.fillRect(map.plaza.x + dx, map.plaza.y - 2 - hh, 1, hh);
      }
    for (const s of smoke) {
      ctx.fillStyle = `rgba(150,160,170,${(s.life * 0.3).toFixed(2)})`;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s);
    }
    ctx.restore();

    // ─── night lighting: ambient darkness with additive light pools ───────
    lctx.globalCompositeOperation = 'source-over';
    lctx.fillStyle = 'rgb(102,114,166)';
    lctx.fillRect(0, 0, viewW, viewH);
    lctx.globalCompositeOperation = 'lighter';
    const light = (x: number, y: number, r: number, color: string, a = 1) => {
      const g = glow(r, color, [150, 110, 70, 34]);
      lctx.globalAlpha = a;
      lctx.drawImage(g, Math.round(x - cx - r), Math.round(y - cy - r));
    };
    const flick = (seed: number, amt: number) => (calm ? 1 : 1 - amt + amt * (0.5 + 0.5 * Math.sin(time * 9 + seed) * Math.sin(time * 5.7 + seed * 2)));
    for (const L of map.lights) light(L.x, L.y, L.r, LIGHT_COLORS[L.color], L.color === 'fire' ? flick(1, 0.2) : 1);
    for (const l of map.lanterns) if (l.lit) light(l.x, l.y, 30, LIGHT_COLORS.warm, flick(l.x, 0.12));
    light(hero.x, hero.y - 20, 46, LIGHT_COLORS.moon, 0.55);
    if (pet.clip === PET.magic) light(pet.x, pet.y - 16, 36, LIGHT_COLORS.fire, 0.9);
    if (hero.action === 'code' || hero.action === 'cast') light(hero.x + 6, hero.y - 14, 22, LIGHT_COLORS.jade, 0.8);
    lctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(lightBuf, 0, 0);

    // ─── after the night: things that glow, emotes, markers ──────────────
    ctx.globalCompositeOperation = 'lighter';
    ctx.save();
    ctx.translate(-cx, -cy);
    for (const l of map.lanterns) if (l.lit) ctx.drawImage(glow(6, '#ffcf8a', [120, 60]), l.x - 6, l.y - 6);
    for (const s of sparks) {
      ctx.fillStyle = s.c;
      ctx.globalAlpha = Math.max(0, Math.min(1, s.life));
      ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }
    ctx.globalAlpha = 1;
    for (const f of fireflies) {
      const x = f.x + (calm ? 0 : Math.sin(time * f.sp + f.ph) * f.amp);
      const y = f.y + (calm ? 0 : Math.cos(time * f.sp * 0.7 + f.ph) * f.amp * 0.6);
      if (x < cx - 4 || x > cx + viewW + 4 || y < cy - 4 || y > cy + viewH + 4) continue;
      const b = 0.5 + 0.5 * Math.sin(time * 2.1 + f.ph * 3);
      if (b < 0.2) continue;
      ctx.fillStyle = `rgba(150,230,140,${(b * 0.35).toFixed(2)})`;
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      ctx.fillStyle = `rgba(240,255,190,${b.toFixed(2)})`;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const p of map.places) {
      const icon = markers[placeIcon[p.id]];
      const bob = calm ? 0 : Math.round(Math.sin(time * 3 + p.door.x) * 2);
      const active = p === near || p === hover;
      ctx.globalAlpha = active ? 1 : 0.8;
      ctx.drawImage(icon, Math.round((p.bounds.x0 + p.bounds.x1) / 2 - icon.width / 2), p.bounds.y0 - 14 + bob - (active ? 3 : 0));
    }
    ctx.globalAlpha = 1;
    const bubble = (who: { x: number; y: number; emote: { name: EmoteName; t: number } | null }, top: number) => {
      if (!who.emote) return;
      const e = emotes[who.emote.name];
      const pop = who.emote.t < 0.12 ? 2 : 0;
      ctx.drawImage(e, Math.round(who.x - e.width / 2), Math.round(top - e.height - pop));
    };
    bubble(hero, hero.y - 60);
    bubble(pet, pet.y - pet.z - 34);
    ctx.restore();

    // integer upscale to the screen
    dctx.drawImage(buf, 0, 0, viewW * scale, viewH * scale);
  }

  function drawOrb(x: number, y: number, t: number) {
    ctx.fillStyle = '#7fd1b5';
    ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
    ctx.fillStyle = '#e8fff6';
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1 - (Math.floor(t * 4) % 2), 1, 1);
  }
  function drawBerry(x: number, y: number) {
    ctx.fillStyle = '#e5533d';
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    ctx.fillStyle = '#4c8a52';
    ctx.fillRect(Math.round(x), Math.round(y) - 2, 1, 1);
  }

  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt, now / 1000);
    render(now / 1000);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    heroAction,
    petAction,
    goTo(id: Place['id']) {
      const p = map.places.find((x) => x.id === id)!;
      walkTo(p.door.x, p.door.y, p);
      canvas.focus();
    },
    setCalm(v: boolean) {
      calm = v;
    },
    get calm() {
      return calm;
    },
    places: map.places,
  };
}

function ringOf(c: HTMLCanvasElement): HTMLCanvasElement {
  const w = c.width;
  const h = c.height;
  const src = c.getContext('2d')!.getImageData(0, 0, w, h).data;
  const a = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 0;
  const pb = new PB(w + 2, h + 2);
  const gold = hex('#f2c46a');
  for (let y = -1; y <= h; y++)
    for (let x = -1; x <= w; x++) if (!a(x, y) && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) pb.set(x + 1, y + 1, gold);
  return pb.canvas();
}

function ellipse(w: number, h: number, color: string): HTMLCanvasElement {
  const pb = new PB(w, h);
  pb.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, hex(color));
  return pb.canvas();
}
