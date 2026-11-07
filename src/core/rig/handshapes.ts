/**
 * Handshape library — explicit joint-angle sets.
 *
 * A handshape is *only* finger + thumb joint angles (degrees). Palm orientation, wrist
 * position and roll are separate parameters, so the same handshape can be used palm-up,
 * palm-down or sideways without duplicating it.
 *
 * All values sit inside the anatomical limits in `anatomy.ts`; the rig clamps anyway, so
 * a bad preset can never produce an impossible bend.
 */
import type { FingerJoints, HandshapePreset, ThumbJoints } from '../../types/animation';
import { ALPHABET_HANDSHAPES } from './alphabetHandshapes';

/** Finger joints: knuckle / first IP / second IP flexion + abduction. */
const F = (mcp: number, pip: number, dip: number, spread = 0): FingerJoints => ({ mcp, pip, dip, spread });
/** Thumb: opposition / MCP / IP + how far it is taken out of the palm. */
const T = (cmc: number, mcp: number, ip: number, spread: number): ThumbJoints => ({ cmc, mcp, ip, spread });

interface Row {
  id: string;
  name: string;
  description: string;
  fingers: [FingerJoints, FingerJoints, FingerJoints, FingerJoints];
  thumb: ThumbJoints;
  category?: HandshapePreset['category'];
}

const flat = F(0, 4, 3, 0);
const flatSpread = F(0, 4, 3, 0.55);
const curled = F(88, 105, 62, 0);
const hook = F(58, 42, 26, 0);
const round = F(62, 72, 42, 0.06);

const ROWS: Row[] = [
  {
    id: 'relaxed',
    name: 'Relaxed',
    description: 'Resting hand: fingers softly curved, thumb free. Used for the idle pose.',
    fingers: [F(14, 18, 12, 0.05), F(16, 20, 12, 0), F(20, 24, 14, -0.05), F(24, 28, 16, -0.1)],
    thumb: T(10, 8, 6, 0.7),
    category: 'basic',
  },
  {
    id: 'flat',
    name: 'Flat hand',
    description: 'Four fingers straight and together, thumb alongside. The base shape for many signs.',
    fingers: [flat, flat, flat, flat],
    thumb: T(10, 6, 4, 0.5),
    category: 'basic',
  },
  {
    id: 'open-5',
    name: 'Open 5',
    description: 'All five fingers extended and spread wide — “five”, waving, and open-hand signs.',
    fingers: [flatSpread, flatSpread, flatSpread, flatSpread],
    thumb: T(8, 4, 2, 0.95),
    category: 'basic',
  },
  {
    id: 'fist',
    name: 'Fist',
    description: 'Closed fist with the thumb resting across the front of the fingers.',
    fingers: [curled, curled, curled, curled],
    thumb: T(30, 20, 12, 0.15),
    category: 'basic',
  },
  {
    id: 'fist-thumb-side',
    name: 'Fist, thumb to the side',
    description: 'Closed fist with the thumb pressed alongside the index finger.',
    fingers: [curled, curled, curled, curled],
    thumb: T(10, 6, 4, 0.38),
    category: 'basic',
  },
  {
    id: 'point',
    name: 'Point (index)',
    description: 'Index finger extended, other fingers closed, thumb resting on the middle finger.',
    fingers: [F(0, 4, 3, 0), curled, curled, curled],
    thumb: T(22, 16, 10, 0.3),
    category: 'basic',
  },
  {
    id: 'v-shape',
    name: 'V (two fingers apart)',
    description: 'Index and middle extended and spread apart — “two”, “victory”, the letter V.',
    fingers: [F(0, 4, 3, 0.6), F(0, 4, 3, 0.6), curled, curled],
    thumb: T(24, 16, 10, 0.2),
    category: 'basic',
  },
  {
    id: 'u-shape',
    name: 'U (two fingers together)',
    description: 'Index and middle extended and held together — the letter U.',
    fingers: [F(0, 4, 3, 0.02), F(0, 4, 3, -0.02), curled, curled],
    thumb: T(22, 14, 8, 0.25),
    category: 'basic',
  },
  {
    id: 'three-finger',
    name: 'Three fingers (W)',
    description: 'Index, middle and ring extended and spread — “three”, the letter W.',
    fingers: [flatSpread, flatSpread, flatSpread, curled],
    thumb: T(24, 16, 10, 0.22),
    category: 'basic',
  },
  {
    id: 'four-finger',
    name: 'Four fingers',
    description: 'Four fingers extended together, thumb folded across the palm — “four”, the letter B.',
    fingers: [flat, flat, flat, flat],
    thumb: T(32, 20, 10, 0.12),
    category: 'basic',
  },
  {
    id: 'c-shape',
    name: 'C shape',
    description: 'Fingers and thumb curved like a C with a clear gap — holding, or the letter C.',
    fingers: [F(46, 58, 30, 0.15), F(46, 58, 30, 0.15), F(48, 58, 30, 0.12), F(50, 58, 30, 0.08)],
    thumb: T(26, 18, 12, 0.55),
    category: 'basic',
  },
  {
    id: 'o-shape',
    name: 'O shape',
    description: 'All fingertips meeting the thumb in a closed ring — the letter O, or “zero”.',
    fingers: [round, round, round, round],
    thumb: T(34, 26, 16, 0.62),
    category: 'basic',
  },
  {
    id: 'claw',
    name: 'Claw',
    description: 'Fingers curved and spread like a claw — grabbing, holding, classifier shapes.',
    fingers: [F(56, 66, 40, 0.35), F(56, 66, 40, 0.35), F(56, 66, 40, 0.3), F(58, 66, 40, 0.25)],
    thumb: T(20, 16, 10, 0.7),
    category: 'classifier',
  },
  {
    id: 'thumbs-up',
    name: 'Thumbs up',
    description: 'Thumb extended upward, other fingers closed.',
    fingers: [curled, curled, curled, curled],
    thumb: T(0, 0, 0, 0.92),
    category: 'basic',
  },
  {
    id: 'y-shape',
    name: 'Y (“call me”)',
    description: 'Thumb and little finger extended, the other fingers closed.',
    fingers: [curled, curled, curled, F(0, 4, 3, 0.1)],
    thumb: T(0, 0, 0, 0.95),
    category: 'basic',
  },
  {
    id: 'pinch',
    name: 'Pinch',
    description: 'Thumb and index fingertips touching — picking up something small, or the letter F.',
    fingers: [F(64, 70, 40, 0.1), flat, flat, flat],
    thumb: T(40, 30, 20, 0.62),
    category: 'basic',
  },
  {
    id: 'bent-flat',
    name: 'Bent flat hand',
    description: 'Flat fingers bent at the knuckles only — “bent B”, tapping or pushing shapes.',
    fingers: [F(52, 4, 3, 0.02), F(52, 4, 3, 0), F(52, 4, 3, -0.02), F(52, 4, 3, -0.05)],
    thumb: T(18, 10, 6, 0.35),
    category: 'basic',
  },
  {
    id: 'hook',
    name: 'Hooked index',
    description: 'Index finger hooked at the middle joint, other fingers closed — “hook”, the letter X.',
    fingers: [hook, curled, curled, curled],
    thumb: T(26, 18, 10, 0.28),
    category: 'basic',
  },
  {
    id: 'l-shape',
    name: 'L shape',
    description: 'Index up and thumb out at a right angle — the letter L.',
    fingers: [F(0, 4, 3, 0), curled, curled, curled],
    thumb: T(0, 0, 0, 0.95),
    category: 'basic',
  },
  {
    id: 'i-shape',
    name: 'Little finger (I)',
    description: 'Little finger extended from a fist — the letter I.',
    fingers: [curled, curled, curled, F(0, 4, 3, 0.05)],
    thumb: T(26, 18, 10, 0.25),
    category: 'basic',
  },
  {
    id: 'r-crossed',
    name: 'R (crossed fingers)',
    description: 'Index and middle crossed — the letter R.',
    fingers: [F(0, 4, 3, 0.85), F(0, 4, 3, -0.85), curled, curled],
    thumb: T(24, 16, 10, 0.3),
    category: 'basic',
  },
  {
    id: 'ily',
    name: 'I-L-Y',
    description: 'Thumb, index and little finger extended. A common informal sign in ASL — please review for ISL before use.',
    fingers: [F(0, 4, 3, 0), curled, curled, F(0, 4, 3, 0.05)],
    thumb: T(0, 0, 0, 0.95),
    category: 'basic',
  },
  {
    id: 'ok',
    name: 'OK ring',
    description: 'Thumb and index form a circle, the other three fingers extended.',
    fingers: [F(66, 70, 42, 0.08), flatSpread, flatSpread, flatSpread],
    thumb: T(38, 28, 18, 0.62),
    category: 'basic',
  },
  {
    id: 'cupped',
    name: 'Cupped hand',
    description: 'Fingers and thumb curved into a bowl — holding water, offering, “give me”.',
    fingers: [F(40, 50, 30, 0.2), F(40, 50, 30, 0.2), F(42, 50, 30, 0.15), F(44, 50, 30, 0.1)],
    thumb: T(18, 14, 8, 0.6),
    category: 'classifier',
  },
  {
    id: 'tap-flat',
    name: 'Tap flat',
    description: 'Flat hand with slightly curved fingers — tapping the palm or a surface.',
    fingers: [F(16, 22, 14, 0.02), F(16, 22, 14, 0), F(18, 22, 14, -0.02), F(20, 22, 14, -0.05)],
    thumb: T(16, 10, 6, 0.4),
    category: 'basic',
  },
  {
    id: 't-shape',
    name: 'T (thumb between fingers)',
    description: 'Fist with the thumb pushed up between index and middle — the letter T.',
    fingers: [curled, curled, curled, curled],
    thumb: T(0, 4, 4, 0.42),
    category: 'basic',
  },
  {
    id: 'g-shape',
    name: 'G (index + thumb parallel)',
    description: 'Index and thumb extended parallel, pointing forward — the letter G.',
    fingers: [F(0, 4, 3, 0), curled, curled, curled],
    thumb: T(0, 0, 0, 0.72),
    category: 'basic',
  },
  {
    id: 'h-shape',
    name: 'H (two fingers sideways)',
    description: 'Index and middle extended together, pointing sideways.',
    fingers: [F(0, 4, 3, 0.02), F(0, 4, 3, -0.02), curled, curled],
    thumb: T(14, 8, 4, 0.55),
    category: 'basic',
  },
  {
    id: 'm-shape',
    name: 'M (three over the thumb)',
    description: 'Three fingers folded over a thumb tucked beneath them — the letter M.',
    fingers: [curled, curled, curled, F(80, 96, 56, 0)],
    thumb: T(22, 16, 8, 0.08),
    category: 'basic',
  },
  {
    id: 'n-shape',
    name: 'N (two over the thumb)',
    description: 'Two fingers folded over a thumb tucked beneath them — the letter N.',
    fingers: [curled, curled, curled, curled],
    thumb: T(16, 12, 6, 0.08),
    category: 'basic',
  },
  {
    id: 'k-shape',
    name: 'K (V with thumb forward)',
    description: 'Index and middle up in a V with the thumb forward between them — the letter K.',
    fingers: [F(0, 4, 3, -0.1), F(0, 4, 3, 0.6), curled, curled],
    thumb: T(6, 4, 2, 0.62),
    category: 'basic',
  },
  {
    id: 's-closed',
    name: 'S (fist, thumb over)',
    description: 'Closed fist with the thumb wrapped over the front of the fingers — the letter S.',
    fingers: [curled, curled, curled, curled],
    thumb: T(44, 30, 18, 0.1),
    category: 'basic',
  },
  {
    id: 'e-shape',
    name: 'E (fingertips on thumb)',
    description: 'Fingers bent at the knuckles with the tips resting on the thumb — the letter E.',
    fingers: [F(72, 82, 48, 0.05), F(72, 82, 48, 0.02), F(72, 82, 48, 0), F(74, 82, 48, -0.05)],
    thumb: T(26, 18, 10, 0.2),
    category: 'basic',
  },
  {
    id: 'd-shape',
    name: 'D (index up, others on thumb)',
    description: 'Index finger up while middle, ring and little finger curve to meet the thumb.',
    fingers: [F(0, 4, 3, 0), F(76, 88, 52, 0.05), F(78, 88, 52, 0), F(78, 88, 52, -0.05)],
    thumb: T(34, 24, 14, 0.5),
    category: 'basic',
  },
  {
    id: 'spread-bent',
    name: 'Spread and bent',
    description: 'All fingers bent and spread — intensity, effort, or a classifier surface.',
    fingers: [F(50, 60, 36, 0.4), F(50, 60, 36, 0.4), F(50, 60, 36, 0.35), F(52, 60, 36, 0.3)],
    thumb: T(18, 12, 8, 0.7),
    category: 'classifier',
  },
];

export const BASIC_HANDSHAPES: HandshapePreset[] = ROWS.map((row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  category: row.category ?? 'basic',
  fingers: {
    index: row.fingers[0],
    middle: row.fingers[1],
    ring: row.fingers[2],
    pinky: row.fingers[3],
  },
  thumb: row.thumb,
}));

export const HANDSHAPES: HandshapePreset[] = [...BASIC_HANDSHAPES, ...ALPHABET_HANDSHAPES];

const BY_ID = new Map(HANDSHAPES.map((preset) => [preset.id, preset]));

export function getHandshape(id: string): HandshapePreset | undefined {
  return BY_ID.get(id);
}

/** Falls back to the relaxed hand so a typo in data never blanks the avatar. */
export function resolveHandshape(id: string | undefined): HandshapePreset {
  return (id ? BY_ID.get(id) : undefined) ?? (BY_ID.get('relaxed') as HandshapePreset);
}

export const DEFAULT_HANDSHAPE = 'relaxed';

export const HANDSHAPE_IDS = HANDSHAPES.map((preset) => preset.id);

export const HANDSHAPE_CATEGORY_LABEL: Record<HandshapePreset['category'], string> = {
  basic: 'Basic shapes',
  alphabet: 'Alphabet & numbers',
  number: 'Numbers',
  grammar: 'Grammar',
  classifier: 'Classifiers',
};
