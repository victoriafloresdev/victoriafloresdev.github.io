// Little speech-bubble emotes, Stardew style.
import { PB, hex } from '../pixel';

const MAPS: Record<string, string[]> = {
  heart: ['.rr.rr.', 'rRRrRRr', 'rRRRRRr', '.rRRRr.', '..rRr..', '...r...'],
  wow: ['..g..', '..g..', '..g..', '..g..', '.....', '..g..'],
  what: ['.ccc.', 'c...c', '...c.', '..c..', '.....', '..c..'],
  zz: ['bbbb...', '...b...', '..b....', '.bbbbb.', '....bbb', '.....b.', '....bbb'],
  note: ['..jjj', '..j.j', '..j.j', 'jjj.j', 'jjjjj', '.j...'],
  spark: ['...g...', '...g...', '.ggGgg.', 'ggGGGgg', '.ggGgg.', '...g...', '...g...'],
  bug: ['.k...k.', '..kkk..', '.kRRRk.', 'kRkRkRk', '.kRRRk.', 'k.kkk.k'],
};
const PAL = {
  r: hex('#b84a3a'),
  R: hex('#e5533d'),
  g: hex('#d9ae5b'),
  G: hex('#fff1c2'),
  c: hex('#ece4cf'),
  b: hex('#8fc4ea'),
  j: hex('#7fd1b5'),
  k: hex('#2a1c14'),
};

export type EmoteName = keyof typeof MAPS;

export function buildEmotes(): Record<EmoteName, HTMLCanvasElement> {
  const out = {} as Record<EmoteName, HTMLCanvasElement>;
  for (const [name, rows] of Object.entries(MAPS)) {
    const iw = rows[0].length;
    const ih = rows.length;
    const bw = iw + 6;
    const bh = ih + 6;
    const pb = new PB(bw + 2, bh + 5);
    // bubble with a little tail
    pb.rect(2, 1, bw - 2, bh, hex('#f6efdc'));
    pb.rect(1, 2, bw, bh - 2, hex('#f6efdc'));
    pb.rect(bw / 2 - 1, bh + 1, 3, 1, hex('#f6efdc'));
    pb.rect(bw / 2, bh + 2, 1, 1, hex('#f6efdc'));
    pb.map(4, 4, rows, PAL);
    pb.outline(hex('#1a1016'));
    out[name] = pb.canvas();
  }
  return out;
}
