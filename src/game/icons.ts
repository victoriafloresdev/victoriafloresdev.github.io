// Pixel icons shared by the canvas (markers above places) and the HTML UI.
export interface IconData {
  rows: string[];
  pal: Record<string, string>;
}

export const ICONS = {
  quest: {
    rows: ['..ggg..', '..gGg..', '..gGg..', '..gGg..', '..gGg..', '...g...', '.......', '..ggg..', '..gGg..', '..ggg..'],
    pal: { g: '#8a6a3a', G: '#f2c46a' },
  },
  book: {
    rows: ['rrrrrrr.', 'rRRRRRRc', 'rRggRRRc', 'rRRRRRRc', 'rRRRRRRc', 'rRRRRRRc', 'rrrrrrrc', '.cccccc.'],
    pal: { r: '#7a2b22', R: '#b84a3a', g: '#f2c46a', c: '#ede3cc' },
  },
  scroll: {
    rows: ['.bbbbbbb.', 'bcccccccb', '.ckkkkkc.', '.ccccccc.', '.ckkkkc..', '.ccccccc.', 'bcccccccb', '.bbbbbbb.'],
    pal: { b: '#7a5233', c: '#ede3cc', k: '#8a7a60' },
  },
  seal: {
    rows: ['rrrrrrr', 'rcccccr', 'rcrrrcr', 'rcrcrcr', 'rcrrrcr', 'rcccccr', 'rrrrrrr'],
    pal: { r: '#b84a3a', c: '#ede3cc' },
  },
  letter: {
    rows: ['ccccccccc', 'cCcccccCc', 'ccCcccCcc', 'cccCrCccc', 'ccccrcccc', 'ccccccccc'],
    pal: { c: '#ede3cc', C: '#b5a27c', r: '#b84a3a' },
  },
  arrow: {
    rows: ['....g...', '....gg..', 'gggggGg.', 'gGGGGGGg', 'gggggGg.', '....gg..', '....g...'],
    pal: { g: '#8a6a3a', G: '#f2c46a' },
  },
  heart: {
    rows: ['.rr.rr.', 'rRRrRRr', 'rRRRRRr', '.rRRRr.', '..rRr..', '...r...'],
    pal: { r: '#8e3428', R: '#e5533d' },
  },
  berry: {
    rows: ['...g..', '..gg..', '.rRr..', 'rRRRr.', 'rRrRr.', '.rrr..'],
    pal: { g: '#5fbf7a', r: '#8e3428', R: '#e5533d' },
  },
  orb: {
    rows: ['..jjj..', '.jJJJj.', 'jJwJJJj', 'jJJJJJj', 'jJJJJJj', '.jJJJj.', '..jjj..'],
    pal: { j: '#2f6f68', J: '#7fd1b5', w: '#f2fffa' },
  },
  flame: {
    rows: ['...r...', '..rr...', '..rOr..', '.rOOr..', '.rOYOr.', 'rOYYOr.', '.rOOr..'],
    pal: { r: '#b84a3a', O: '#f2a43a', Y: '#fbe3a0' },
  },
  zz: {
    rows: ['bbbb...', '...b...', '..b....', '.bbbb..', '....bbb', '.....b.', '....bbb'],
    pal: { b: '#8fc4ea' },
  },
  laptop: {
    rows: ['.kkkkkk.', '.kJJJJk.', '.kJjjJk.', '.kJJJJk.', '.kkkkkk.', 'kgggggggk'],
    pal: { k: '#3b2a1e', J: '#7fd1b5', j: '#2f6f68', g: '#8a6a3a' },
  },
  cup: {
    rows: ['.c.c...', '..c.c..', 'wwwwww.', 'wrrrrwww', 'wrwwrw.w', 'wwwwwwww', '.wwwww.'],
    pal: { c: '#bdb6a3', w: '#ece4cf', r: '#b84a3a' },
  },
  sparkle: {
    rows: ['...g...', '...G...', '.gGWGg.', 'gGWWWGg', '.gGWGg.', '...G...', '...g...'],
    pal: { g: '#8a6a3a', G: '#d9ae5b', W: '#fff1c2' },
  },
  star: {
    rows: ['...G...', '..GGG..', 'GGGWGGG', '.GGGGG.', '.GG.GG.', 'G.....G'],
    pal: { G: '#d9ae5b', W: '#fff1c2' },
  },
  bug: {
    rows: ['.k...k.', '..kkk..', '.kRRRk.', 'kRkRkRk', '.kRRRk.', 'k.kkk.k'],
    pal: { k: '#ece4cf', R: '#e5533d' },
  },
} satisfies Record<string, IconData>;

export type IconName = keyof typeof ICONS;
