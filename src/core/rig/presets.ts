/**
 * Default rig state + the expressive presets available in Phase 1.
 *
 * Every preset changes the *whole* body, not just the mouth: eyebrows, eyes, cheeks,
 * mouth shape, head pose and (as animation) head movement. That is the point of the
 * project — the non-manual channel carries grammar in signed languages.
 */
import type { FaceControls, HandControls, HeadControls, TorsoControls } from '../../types/sign';

export const NEUTRAL_FACE: FaceControls = {
  browRaise: 0,
  browFurrow: 0,
  browAsymmetry: 0,
  eyeOpen: 0.82,
  eyeSquint: 0.05,
  gaze: { x: 0, y: 0 },
  cheekRaise: 0.06,
  mouthOpen: 0.03,
  mouthWidth: 0.4,
  mouthSmile: 0.08,
  mouthRound: 0,
  tongue: 0,
  nostrilFlare: 0,
};

export const NEUTRAL_HEAD: HeadControls = {
  pitch: 0,
  yaw: 0,
  roll: 0,
  offset: { x: 0, y: 0 },
};

export const NEUTRAL_TORSO: TorsoControls = {
  lean: 0,
  turn: 0,
  shoulderRaise: 0.04,
};

/** Wrist position and shape used when a hand is not being used for a sign. */
export const REST_HAND_RIGHT: HandControls = {
  position: { x: 0.7, y: 0.85 },
  orientation: { roll: 172, yaw: -30 },
  fingers: { index: 0.12, middle: 0.16, ring: 0.2, pinky: 0.26 },
  thumb: { curl: 0.1, spread: 0.85 },
  spread: 0.1,
  scale: 1,
};

export const REST_HAND_LEFT: HandControls = {
  position: { x: 0.3, y: 0.85 },
  orientation: { roll: -172, yaw: 30 },
  fingers: { index: 0.12, middle: 0.16, ring: 0.2, pinky: 0.26 },
  thumb: { curl: 0.1, spread: 0.85 },
  spread: 0.1,
  scale: 1,
};

/**
 * Neutral signing hand: dominant hand raised in front of the chest, palm turned
 * slightly inward, fingers relaxed. Sign keyframes are merged on top of this.
 */
export const SIGN_HAND_BASE: HandControls = {
  position: { x: 0.65, y: 0.65 },
  orientation: { roll: 0, yaw: -22 },
  fingers: { index: 0.08, middle: 0.08, ring: 0.08, pinky: 0.08 },
  thumb: { curl: 0.12, spread: 0.36 },
  spread: 0.1,
  scale: 1,
};

export type ExpressionId = 'neutral' | 'happy' | 'question' | 'negative' | 'wh-question';
export type HeadMotion = 'none' | 'shake' | 'nod' | 'tilt';

export interface ExpressionPreset {
  id: ExpressionId;
  label: string;
  /** Plain-language explanation shown on screen so learners can read the marker. */
  explanation: string;
  /** Short chips describing each channel that is active. */
  markers: string[];
  face: Partial<FaceControls>;
  head: Partial<HeadControls>;
  torso?: Partial<TorsoControls>;
  headMotion: HeadMotion;
  /** Multiplier on head movement amplitude. */
  motionAmount?: number;
}

export const EXPRESSION_PRESETS: Record<ExpressionId, ExpressionPreset> = {
  neutral: {
    id: 'neutral',
    label: 'Neutral',
    explanation: 'Relaxed face and level head — no question or negation marker.',
    markers: ['level head', 'relaxed brows'],
    face: {
      browRaise: 0,
      browFurrow: 0,
      eyeOpen: 0.82,
      eyeSquint: 0.05,
      cheekRaise: 0.06,
      mouthSmile: 0.08,
      mouthOpen: 0.03,
      mouthWidth: 0.4,
      mouthRound: 0,
      tongue: 0,
    },
    head: { pitch: 0, roll: 0 },
    headMotion: 'none',
  },
  happy: {
    id: 'happy',
    label: 'Happy',
    explanation: 'Smile with raised cheeks and slightly narrowed eyes — friendly, positive.',
    markers: ['cheeks up', 'smile', 'eyes soften'],
    face: {
      browRaise: 0.35,
      browFurrow: 0,
      eyeOpen: 0.72,
      eyeSquint: 0.35,
      cheekRaise: 0.85,
      mouthSmile: 1,
      mouthOpen: 0.34,
      mouthWidth: 0.62,
      mouthRound: 0,
      tongue: 0,
    },
    head: { pitch: -2, roll: 3 },
    torso: { shoulderRaise: 0.12 },
    headMotion: 'nod',
    motionAmount: 0.5,
  },
  question: {
    id: 'question',
    label: 'Yes/no question',
    explanation: 'Eyebrows up, eyes wide, head tilted forward — the yes/no question marker.',
    markers: ['brows up', 'eyes wide', 'head tilt + forward'],
    face: {
      browRaise: 1,
      browFurrow: 0,
      eyeOpen: 1,
      eyeSquint: 0,
      cheekRaise: 0.12,
      mouthSmile: 0.05,
      mouthOpen: 0.16,
      mouthWidth: 0.35,
      mouthRound: 0.1,
      tongue: 0,
    },
    head: { pitch: -7, roll: 5 },
    torso: { lean: 0.06 },
    headMotion: 'tilt',
    motionAmount: 0.7,
  },
  'wh-question': {
    id: 'wh-question',
    label: 'Wh-question',
    explanation: 'Brows pulled together and down, head tilted — the wh-question marker (who / what / where).',
    markers: ['brows down', 'head tilt', 'slight frown'],
    face: {
      browRaise: -0.15,
      browFurrow: 0.75,
      eyeOpen: 0.84,
      eyeSquint: 0.14,
      cheekRaise: 0.05,
      mouthSmile: -0.2,
      mouthOpen: 0.12,
      mouthWidth: 0.34,
      mouthRound: 0.25,
      tongue: 0,
    },
    head: { pitch: -4, roll: 4 },
    torso: { lean: 0.04 },
    headMotion: 'tilt',
    motionAmount: 0.4,
  },
  negative: {
    id: 'negative',
    label: 'Negative',
    explanation: 'Brows pulled down and together, head shaking side to side — no / not.',
    markers: ['brows down', 'head shake', 'corners down'],
    face: {
      browRaise: -0.35,
      browFurrow: 0.9,
      eyeOpen: 0.7,
      eyeSquint: 0.32,
      cheekRaise: 0.05,
      mouthSmile: -0.55,
      mouthOpen: 0.05,
      mouthWidth: 0.3,
      mouthRound: 0,
      tongue: 0,
    },
    head: { pitch: 3, roll: -2 },
    headMotion: 'shake',
    motionAmount: 1,
  },
};

export const EXPRESSION_ORDER: ExpressionId[] = ['neutral', 'happy', 'question', 'negative'];
