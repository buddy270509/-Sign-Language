/**
 * Face engine — blendshape-style parameters.
 *
 * Every parameter is 0..1 (or −1..1 for directional ones) and is independent, so a sign
 * can set a mouth shape while a sentence-level emotion moves only the brows. Blending is
 * *masked by group*, which is what keeps an emotion from flattening a mouth morpheme:
 * the mouth is a group the overlay is not allowed to touch unless it asks for it.
 */
import type { FaceExpression, FaceGroup, FaceState } from '../../types/animation';
import { clamp01, clampSigned } from './anatomy';

export const NEUTRAL_FACE: FaceState = {
  browRaiseL: 0.12,
  browRaiseR: 0.12,
  browFurrowL: 0,
  browFurrowR: 0,
  eyeOpenL: 0.62,
  eyeOpenR: 0.62,
  blink: 0,
  gazeX: 0,
  gazeY: 0,
  cheekPuff: 0,
  cheekRaise: 0.08,
  noseWrinkle: 0,
  mouthOpen: 0.08,
  mouthWidth: 0.5,
  mouthSmile: 0.1,
  lipPurse: 0,
  lipsPressed: 0,
  tongueOut: 0,
  mouthAh: 0,
  mouthEe: 0,
  mouthPa: 0,
};

export const FACE_KEYS = Object.keys(NEUTRAL_FACE) as Array<keyof FaceState>;

export const FACE_GROUPS: Record<FaceGroup, Array<keyof FaceState>> = {
  brows: ['browRaiseL', 'browRaiseR', 'browFurrowL', 'browFurrowR'],
  eyes: ['eyeOpenL', 'eyeOpenR', 'blink', 'gazeX', 'gazeY'],
  cheeks: ['cheekPuff', 'cheekRaise'],
  nose: ['noseWrinkle'],
  mouth: ['mouthOpen', 'mouthWidth', 'mouthSmile', 'lipPurse', 'lipsPressed', 'tongueOut', 'mouthAh', 'mouthEe', 'mouthPa'],
};

export const ALL_FACE_GROUPS: FaceGroup[] = ['brows', 'eyes', 'cheeks', 'nose', 'mouth'];

/** Sentence-level overlays (question markers, intensity) must not touch the mouth by default. */
export const OVERLAY_FACE_GROUPS: FaceGroup[] = ['brows', 'eyes', 'cheeks', 'nose'];

/** Parameters that are signed (−1..1); everything else is 0..1. */
export const SIGNED_FACE_KEYS: Array<keyof FaceState> = ['gazeX', 'gazeY', 'mouthSmile'];

export function clampFace(face: Partial<FaceState>): FaceState {
  const out = { ...NEUTRAL_FACE };
  for (const key of FACE_KEYS) {
    const value = face[key];
    if (typeof value !== 'number' || Number.isNaN(value)) continue;
    out[key] = SIGNED_FACE_KEYS.includes(key) ? clampSigned(value) : clamp01(value);
  }
  return out;
}

/** Fill in only the fields present in `partial` (used when applying expressions). */
export function mergeFace(base: FaceState, partial: Partial<FaceState>): FaceState {
  return clampFace({ ...base, ...partial });
}

const groupSet = (groups?: FaceGroup[]) =>
  new Set<keyof FaceState>((groups ?? ALL_FACE_GROUPS).flatMap((g) => FACE_GROUPS[g] ?? []));

/**
 * Blend `overlay` on top of `base`, but only for the allowed groups.
 * `weight` 0 leaves the base untouched; 1 replaces it.
 */
export function blendFace(
  base: FaceState,
  overlay: Partial<FaceState>,
  weight = 1,
  groups?: FaceGroup[],
  easing: (t: number) => number = (t) => t,
): FaceState {
  const w = easing(clamp01(weight));
  if (w <= 0) return { ...base };
  const allowed = groupSet(groups);
  const out = { ...base };
  for (const key of FACE_KEYS) {
    if (!allowed.has(key)) continue;
    const target = overlay[key];
    if (typeof target !== 'number') continue;
    out[key] = base[key] + (target - base[key]) * w;
  }
  return clampFace(out);
}

/* ------------------------------------------------------------------ *
 * Derived geometry — the numbers the SVG actually draws with
 * ------------------------------------------------------------------ */

export interface FaceGeometry {
  /** 0 = closed, 1 = wide. */
  eyeOpenL: number;
  eyeOpenR: number;
  /** Pupil offset in stage px. */
  pupilX: number;
  pupilY: number;
  /** Brow vertical offset in px (negative = raised). */
  browYL: number;
  browYR: number;
  /** Brow inner-end tilt in degrees (positive = inner end down / furrowed). */
  browTiltL: number;
  browTiltR: number;
  /** Mouth box in px. */
  mouthOpenPx: number;
  mouthHalfWidthPx: number;
  mouthCornerY: number;
  /** Signed smile/frown, kept for the closed-lip line. */
  mouthSmile: number;
  /** 0 = wide, 1 = round (the "oo" morpheme). */
  roundness: number;
  tonguePx: number;
  cheekPuffPx: number;
  cheekRaisePx: number;
  noseWrinkle: number;
  /** Dominant mouth morpheme, used for the SVG path choice. */
  mouthShape: 'rest' | 'ah' | 'ee' | 'oo' | 'pa';
}

/**
 * Pure mapping from face parameters to drawing numbers. Kept free of SVG so the renderer
 * (SVG today, Three.js later) and the tests can share it.
 */
export function faceGeometry(face: FaceState): FaceGeometry {
  const blink = clamp01(face.blink);
  const eyeOpenL = clamp01(face.eyeOpenL * (1 - blink));
  const eyeOpenR = clamp01(face.eyeOpenR * (1 - blink));

  const roundness = clamp01(face.lipPurse * 0.85 + face.mouthPa * 0.25 + face.mouthOpen * 0.1);
  const wide = clamp01(face.mouthWidth + face.mouthEe * 0.55 - face.lipPurse * 0.4);
  const openPx =
    1.5 +
    face.mouthOpen * 15 +
    face.mouthAh * 13 +
    face.mouthPa * 3 -
    face.lipsPressed * 1.2 -
    face.lipPurse * 2;

  const mouthShape: FaceGeometry['mouthShape'] =
    face.lipPurse > 0.45
      ? 'oo'
      : face.mouthAh > 0.4
        ? 'ah'
        : face.mouthEe > 0.4
          ? 'ee'
          : face.mouthPa > 0.4
            ? 'pa'
            : 'rest';

  return {
    eyeOpenL,
    eyeOpenR,
    pupilX: face.gazeX * 3.2,
    pupilY: face.gazeY * 2.6,
    browYL: -(face.browRaiseL * 5.5) + face.browFurrowL * 1.6,
    browYR: -(face.browRaiseR * 5.5) + face.browFurrowR * 1.6,
    browTiltL: face.browFurrowL * 16 - face.browRaiseL * 3,
    browTiltR: face.browFurrowR * 16 - face.browRaiseR * 3,
    mouthOpenPx: Math.max(0.4, openPx),
    mouthHalfWidthPx: 5.5 + wide * 7.5,
    mouthCornerY: -face.mouthSmile * 5.5 + face.lipsPressed * 0.8,
    mouthSmile: face.mouthSmile,
    roundness,
    tonguePx: face.tongueOut * 5,
    cheekPuffPx: face.cheekPuff * 4.5,
    cheekRaisePx: face.cheekRaise * 2.6,
    noseWrinkle: clamp01(face.noseWrinkle),
    mouthShape,
  };
}

/* ------------------------------------------------------------------ *
 * Named expressions
 * ------------------------------------------------------------------ */

function expression(
  id: string,
  label: string,
  explanation: string,
  markers: string[],
  face: Partial<FaceState>,
  extra: Partial<FaceExpression> = {},
): FaceExpression {
  return { id, label, explanation, markers, face, ...extra };
}

export const EXPRESSIONS: Record<string, FaceExpression> = {
  neutral: expression(
    'neutral',
    'Neutral',
    'Relaxed face, no particular emotion. The default between signs.',
    ['relaxed brows', 'soft eyes'],
    { ...NEUTRAL_FACE },
  ),
  happy: expression(
    'happy',
    'Happy',
    'Smile with raised cheeks and slightly narrowed, bright eyes.',
    ['smile', 'cheeks up', 'eyes soft'],
    { mouthSmile: 0.85, mouthWidth: 0.72, cheekRaise: 0.8, browRaiseL: 0.3, browRaiseR: 0.3, eyeOpenL: 0.55, eyeOpenR: 0.55 },
  ),
  sad: expression(
    'sad',
    'Sad',
    'Inner brows lifted, mouth corners down, eyes slightly lowered.',
    ['inner brows up', 'corners down', 'gaze down'],
    { browFurrowL: 0.55, browFurrowR: 0.55, browRaiseL: 0.2, browRaiseR: 0.2, mouthSmile: -0.75, mouthWidth: 0.42, gazeY: 0.3, eyeOpenL: 0.45, eyeOpenR: 0.45 },
  ),
  angry: expression(
    'angry',
    'Angry',
    'Brows pulled down and together, eyes narrowed, jaw set.',
    ['brows down', 'eyes narrow', 'jaw tight'],
    { browFurrowL: 1, browFurrowR: 1, browRaiseL: 0, browRaiseR: 0, eyeOpenL: 0.38, eyeOpenR: 0.38, lipsPressed: 0.7, mouthSmile: -0.35 },
  ),
  surprised: expression(
    'surprised',
    'Surprised',
    'Brows high, eyes wide, mouth open in an “ah”.',
    ['brows high', 'eyes wide', 'mouth open'],
    { browRaiseL: 1, browRaiseR: 1, eyeOpenL: 1, eyeOpenR: 1, mouthOpen: 0.55, mouthAh: 0.75, mouthWidth: 0.45 },
  ),
  yesNoQuestion: expression(
    'yesNoQuestion',
    'Yes/no question',
    'Brows up across the whole question, head slightly forward. Used for questions answered with yes or no.',
    ['brows up', 'head forward'],
    { browRaiseL: 0.85, browRaiseR: 0.85, eyeOpenL: 0.75, eyeOpenR: 0.75, mouthSmile: 0.15 },
    { head: { pitch: 6, forward: 0.25 } },
  ),
  whQuestion: expression(
    'whQuestion',
    'Wh- question',
    'Brows pulled together and down for who/what/where/when/why questions.',
    ['brows together', 'brows down', 'head tilt'],
    { browFurrowL: 0.9, browFurrowR: 0.9, browRaiseL: 0.15, browRaiseR: 0.15, eyeOpenL: 0.6, eyeOpenR: 0.6 },
    { head: { pitch: -4, yaw: 8, roll: 5 } },
  ),
  negation: expression(
    'negation',
    'Negation',
    'Head shake with a flat, pressed mouth and lowered brows.',
    ['head shake', 'lips pressed', 'brows down'],
    { browFurrowL: 0.6, browFurrowR: 0.6, lipsPressed: 0.75, mouthSmile: -0.5, eyeOpenL: 0.5, eyeOpenR: 0.5 },
    { headMotion: 'shake', head: { yaw: 0 } },
  ),
  emphasis: expression(
    'emphasis',
    'Emphasis / intensity',
    'Stronger movement, brows pushed down, eyes focused. Used to stress a sign.',
    ['brows down', 'eyes focused', 'bigger movement'],
    { browFurrowL: 0.45, browFurrowR: 0.45, eyeOpenL: 0.8, eyeOpenR: 0.8, lipsPressed: 0.25, mouthSmile: 0.05 },
    { body: { leanForward: 0.35 } },
  ),
  thinking: expression(
    'thinking',
    'Thinking',
    'Eyes up and to the side, one brow raised, lips pursed.',
    ['gaze up', 'one brow up', 'lips pursed'],
    { gazeX: 0.7, gazeY: -0.5, browRaiseL: 0.7, browRaiseR: 0.15, lipPurse: 0.5, mouthWidth: 0.3, eyeOpenL: 0.55, eyeOpenR: 0.55 },
    { head: { pitch: -6, roll: 7 } },
  ),
  pain: expression(
    'pain',
    'Pain / discomfort',
    'Brows drawn together, eyes squeezed, mouth pulled wide and flat.',
    ['brows together', 'eyes squeezed', 'mouth flat'],
    { browFurrowL: 0.85, browFurrowR: 0.85, eyeOpenL: 0.25, eyeOpenR: 0.25, lipsPressed: 0.6, mouthWidth: 0.75, mouthSmile: -0.4 },
  ),
};

export const EXPRESSION_IDS = Object.keys(EXPRESSIONS);

export function getExpression(id: string | undefined): FaceExpression {
  return EXPRESSIONS[id ?? 'neutral'] ?? (EXPRESSIONS.neutral as FaceExpression);
}
