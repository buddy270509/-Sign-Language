/**
 * SignBridge — language-agnostic sign format.
 *
 * Design goals
 * ------------
 * 1. No spoken-language assumptions inside the animation layer. A sign file is data,
 *    not code, so new sign languages (ISL today, ASL/BSL later) are added by dropping
 *    a JSON file into `src/data/signs/`.
 * 2. A sign records *all* of the parameters that carry meaning in signed languages —
 *    not just handshapes: location in signing space, movement, palm orientation,
 *    non-manual markers (face, head, torso), and size/speed.
 * 3. The same file drives (a) the 2D SVG avatar, (b) a future Three.js avatar and
 *    (c) the training pipeline, because every rig control compiles down to the
 *    MediaPipe landmark layout (21 points per hand).
 */

export type FingerName = 'index' | 'middle' | 'ring' | 'pinky';

/** Degrees. Positive roll rotates the hand clockwise on screen. */
export interface HandOrientation {
  /** In-plane rotation at the wrist. */
  roll: number;
  /**
   * Palm facing. 0 = palm toward camera, -90 = palm facing the signer's left
   * (profile), 180 = palm away from camera.
   */
  yaw: number;
  /** Tilt of the hand toward (−) or away from (+) the camera. Optional. */
  pitch?: number;
}

/** Per-hand rig controls. All values are normalized; see `handRig.ts` for the FK. */
export interface HandControls {
  /** Wrist position in stage space, 0..1 (x: left→right, y: top→bottom). */
  position: Vec2;
  orientation: HandOrientation;
  /** 0 = extended, 1 = fully curled, per finger. */
  fingers: Record<FingerName, number>;
  /** Thumb: `curl` 0 = straight, 1 = bent; `spread` 0 = across the palm, 1 = out. */
  thumb: { curl: number; spread: number };
  /** Global finger abduction, 0 = fingers together, 1 = fanned. */
  spread: number;
  /** Optional per-finger abduction overrides (−1..1) for crossed shapes (R) etc. */
  fingerSpread?: Partial<Record<FingerName, number>>;
  /** Hand size multiplier (1 = default). */
  scale?: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 extends Vec2 {
  z: number;
}

/**
 * Non-manual markers for the face. Every field is normalized so the same values
 * can drive SVG today and morph targets later.
 */
export interface FaceControls {
  /** −1 = brows pulled down, 0 = neutral, 1 = brows raised high (yes/no questions). */
  browRaise: number;
  /** 0..1 — brows pulled together and down (wh-questions, negation, anger). */
  browFurrow: number;
  /** −1..1 — one brow up (scepticism / disbelief). */
  browAsymmetry: number;
  /** 0 = closed, 1 = wide open. */
  eyeOpen: number;
  /** 0..1 — lower-lid tension (squint). */
  eyeSquint: number;
  /** Gaze direction, −1..1 on each axis. */
  gaze: Vec2;
  /** 0..1 — cheek raise (genuine smile, “mm” marker). */
  cheekRaise: number;
  /** 0..1 — jaw opening. */
  mouthOpen: number;
  /** 0..1 — 0 = narrow, 1 = wide (spread mouth shape). */
  mouthWidth: number;
  /** −1 (frown) .. 1 (smile). */
  mouthSmile: number;
  /** 0..1 — rounded / protruded lips (the “oo” mouth morpheme). */
  mouthRound: number;
  /** 0..1 — tongue visible between teeth (adverbial markers). */
  tongue: number;
  /** 0..1 — nostril flare (intensity). */
  nostrilFlare: number;
}

export interface HeadControls {
  /** Degrees: + looks down. */
  pitch: number;
  /** Degrees: + turns to screen right. */
  yaw: number;
  /** Degrees: + tilts to screen right. */
  roll: number;
  /** Pixel offset of the head inside the stage (used for nods / shakes / leans). */
  offset: Vec2;
}

export interface TorsoControls {
  /** −1 leans to screen left, +1 to screen right. */
  lean: number;
  /** −1 turns to screen left, +1 to screen right. */
  turn: number;
  /** 0..1 shoulder raise (shrug). */
  shoulderRaise: number;
}

/** Which named location a sign is produced at — required dictionary metadata. */
export type SignLocation =
  | 'neutral-space'
  | 'chest'
  | 'chin'
  | 'mouth'
  | 'cheek'
  | 'forehead'
  | 'temple'
  | 'shoulder'
  | 'waist'
  | 'in-front-of-body';

export interface RigKeyframe {
  /** Normalized time within the sign, 0..1. Keyframes must be sorted and unique. */
  t: number;
  /** Active (dominant as authored) hand. Falls back to the sign-level base pose. */
  right?: Partial<HandControls>;
  left?: Partial<HandControls>;
  face?: Partial<FaceControls>;
  head?: Partial<HeadControls>;
  torso?: Partial<TorsoControls>;
  /** Sign-level modifiers of movement quality at this keyframe. */
  speed?: number;
  size?: number;
  ease?: EasingName;
}

export type EasingName = 'linear' | 'easeInOut' | 'easeOut' | 'easeIn' | 'spring';

export type SignKind = 'fingerspelling' | 'number' | 'word' | 'phrase' | 'punctuation';

/**
 * Review status gates what may be shown to end users. Per the project quality bar,
 * only `supported` signs may be presented as reliable. Phase 1 ships `draft`
 * handspecs that still need a fluent deaf signer's review.
 */
export type ReviewStatus = 'draft' | 'reviewed' | 'supported';

export interface SignEntry {
  /** Stable id, e.g. `isl-fs-a`. Used by models, corrections and analytics. */
  id: string;
  /** What the sign means. Glosses are upper-case by convention (WATER, NOT). */
  gloss: string;
  /** How to render the chip for this token in the UI. */
  displayLabel: string;
  kind: SignKind;
  /** Which language this entry belongs to (BCP-47-ish: isl, asl, bsl…). */
  languageTag: string;
  /** Spoken-language gloss used by text processing, when applicable. */
  english?: string;
  /** Nominal duration in ms before speed modifiers. */
  durationMs: number;
  reviewStatus: ReviewStatus;
  reviewer?: string;
  /** Human-readable dictionary metadata (handshape / location / movement / palm). */
  handshape?: string;
  location?: SignLocation;
  movement?: string;
  palmOrientation?: string;
  /** Non-manual sentence level markers this sign is compatible with. */
  nonManual?: string[];
  notes?: string;
  tags?: string[];
  /** Base pose for the sign; keyframes are merged onto it. */
  base?: RigKeyframe;
  keyframes: RigKeyframe[];
  /** Movement quality: 1 = neutral. Intensity is expressed through size + speed. */
  size?: number;
  speed?: number;
}

export interface SignDictionaryMeta {
  languageTag: string;
  languageName: string;
  /** Who produced this file and its review state. */
  version: string;
  updated: string;
  reviewStatus: ReviewStatus;
  reviewer?: string | null;
  source?: string;
  notes?: string;
}

export interface SignDictionaryFile {
  meta: SignDictionaryMeta;
  signs: SignEntry[];
}

/* ------------------------------------------------------------------ *
 * Compiled per-frame data (what the renderer consumes)
 * ------------------------------------------------------------------ */

export interface HandFrame {
  /** 21 landmarks in stage pixel space, MediaPipe ordering (0 = wrist). */
  landmarks: Vec3[];
  controls: HandControls;
  /** Bones as index pairs into `landmarks`, with a stroke width in px. */
  bones: Array<{ a: number; b: number; width: number; depth: number }>;
  palmPath: string;
  palmDepth: number;
  /** Knuckle ridge bumps (drawn on top of the palm when fingers are curled). */
  knuckles: Array<{ x: number; y: number; z: number; r: number }>;
  /** Stage-space wrist point (== landmarks[0]). */
  wrist: Vec3;
}

export interface ArmFrame {
  shoulder: Vec2;
  elbow: Vec2;
  wrist: Vec2;
  /** Angle of the forearm in degrees (used to keep the hand visually attached). */
  forearmAngle: number;
}

export interface AvatarFrame {
  rightHand: HandFrame;
  leftHand: HandFrame;
  rightArm: ArmFrame;
  leftArm: ArmFrame;
  face: FaceControls;
  head: HeadControls;
  torso: TorsoControls;
}

/* ------------------------------------------------------------------ *
 * Text processing (Phase 3 fills this out; Phase 1 uses it to split
 * typed text into signable tokens)
 * ------------------------------------------------------------------ */

export type SentenceType = 'statement' | 'yes-no-question' | 'wh-question' | 'negative' | 'command';

export interface SignToken {
  /** Surface form that produced this token ("A", "hello", "3"). */
  source: string;
  /** Resolved signs used to perform it (fingerspelling expands to many entries). */
  signs: SignEntry[];
  /** True when the token had to be fingerspelled because no dictionary entry exists. */
  fingerspelled: boolean;
  /** Short explanation shown in the UI ("not in dictionary — fingerspelled"). */
  reason?: string;
}

export interface SignScript {
  tokens: SignToken[];
  sentenceType: SentenceType;
  /** Non-manual marker attached to the whole utterance. */
  face: Partial<FaceControls>;
  head: Partial<HeadControls>;
  /** Plain-English description of the sentence-level marker, for learners. */
  expressionLabel: string;
}
