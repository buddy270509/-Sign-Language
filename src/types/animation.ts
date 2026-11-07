/**
 * SignBridge Phase 2 — "Sign Animation" format and rig state types.
 *
 * Two layers live here:
 *
 *  1. **Authored data** (`SignAnimation`, `HandKeyframe`, …) — language-agnostic JSON.
 *     Each channel (hands, face, head, body) is an independent track with its own
 *     keyframes, so face and head timing never has to match hand timing.
 *
 *  2. **Compiled rig state** (`RigPose`, `HandState`, …) — what the animation engine
 *     produces for a single instant and hands to the renderer. The rig never talks to
 *     SVG; a Three.js renderer can consume the same `RigPose`.
 *
 * Units: positions are normalized in signing space (0..1 across, 0..1 down, −1..1 depth
 * toward the viewer). Angles are degrees. Weights/opacities are 0..1 unless stated.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** A wrist position in signing space: `[x, y, z]`. */
export type WristTarget = readonly [number, number, number];

export type EasingName = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'snappy';

/* ------------------------------------------------------------------ *
 * Handshapes — explicit joint angles, no implicit curls
 * ------------------------------------------------------------------ */

export type FingerName = 'index' | 'middle' | 'ring' | 'pinky';

/**
 * One finger, in degrees. All values are non-negative except `spread`
 * (−1 = toward the thumb side, +1 = toward the pinky side).
 *
 * Limits are enforced by the rig (`FINGER_LIMITS`), never by the data files.
 */
export interface FingerJoints {
  /** Knuckle flexion. */
  mcp: number;
  /** First interphalangeal joint. */
  pip: number;
  /** Second interphalangeal joint. */
  dip: number;
  /** Abduction, −1..1. */
  spread: number;
}

/** Thumb, in degrees. `spread` 0 = across the palm, 1 = fully out. */
export interface ThumbJoints {
  /** Carpometacarpal — opposition. */
  cmc: number;
  /** Metacarpophalangeal flexion. */
  mcp: number;
  /** Interphalangeal flexion. */
  ip: number;
  /** How far the thumb is taken out of the palm, 0..1. */
  spread: number;
}

export interface HandshapeSpec {
  fingers: Record<FingerName, FingerJoints>;
  thumb: ThumbJoints;
}

export interface HandshapePreset extends HandshapeSpec {
  /** Stable id used by animation files, e.g. `flat`, `fist`, `fs-a`. */
  id: string;
  /** Human-readable name shown in the gallery and Studio. */
  name: string;
  /** What the shape is and how it is used. */
  description: string;
  category: 'basic' | 'alphabet' | 'number' | 'grammar' | 'classifier';
}

/** Named palm orientations. Mapped to yaw/pitch by the rig (`PALM_ANGLES`). */
export type PalmOrientation = 'forward' | 'back' | 'up' | 'down' | 'left' | 'right';

/* ------------------------------------------------------------------ *
 * Face — blendshape-style parameter set
 * ------------------------------------------------------------------ */

export interface FaceState {
  /** Eyebrow raise, 0..1, per side so expressions can be asymmetric. */
  browRaiseL: number;
  browRaiseR: number;
  /** Inner-brow pull down (furrow), 0..1, per side. */
  browFurrowL: number;
  browFurrowR: number;
  /** Eye openness, 0..1 (0 = closed, 0.5 = relaxed, 1 = wide). */
  eyeOpenL: number;
  eyeOpenR: number;
  /** Blink envelope, 0..1, layered on top of eyeOpen. */
  blink: number;
  /** Gaze, −1..1 each axis. */
  gazeX: number;
  gazeY: number;
  /** Cheek puff, 0..1. */
  cheekPuff: number;
  /** Cheek raise (genuine smile), 0..1. */
  cheekRaise: number;
  /** Nose wrinkle, 0..1. */
  noseWrinkle: number;
  /** Jaw opening, 0..1. */
  mouthOpen: number;
  /** Mouth spread, 0..1 (0 = narrow, 1 = wide). */
  mouthWidth: number;
  /** Smile (+) / frown (−), −1..1. */
  mouthSmile: number;
  /** Lips protruded/rounded ("oo" morpheme), 0..1. */
  lipPurse: number;
  /** Lips pressed flat ("mm"), 0..1. */
  lipsPressed: number;
  /** Tongue visible, 0..1. */
  tongueOut: number;
  /** Wide "ah" jaw shape, 0..1. */
  mouthAh: number;
  /** Spread "ee" shape, 0..1. */
  mouthEe: number;
  /** "pa" release/puff shape, 0..1. */
  mouthPa: number;
}

/** Channel groups used for masked blending (an emotion must not overwrite a mouth shape). */
export type FaceGroup = 'brows' | 'eyes' | 'cheeks' | 'nose' | 'mouth';

/* ------------------------------------------------------------------ *
 * Head and body — independent channels
 * ------------------------------------------------------------------ */

export interface HeadState {
  /** Nod: + looks down. */
  pitch: number;
  /** Shake/turn: + turns to screen right. */
  yaw: number;
  /** Tilt: + to screen right. */
  roll: number;
  /** Forward/back lean of the head alone, −1..1 (+ forward). */
  forward: number;
  /** Pixel-free offset in stage units (−10..10), used by nod/shake animation. */
  offsetX: number;
  offsetY: number;
}

export interface BodyState {
  /** Torso lean forward/back, −1..1 (+ forward). */
  leanForward: number;
  /** Torso lean to the side, −1..1 (+ screen right). */
  leanSide: number;
  /** Torso turn, −1..1 (+ screen right). */
  turn: number;
  /** Shoulder raise, −1..1 (− = drop), per side. */
  shoulderRaiseL: number;
  shoulderRaiseR: number;
}

/* ------------------------------------------------------------------ *
 * Compiled rig state
 * ------------------------------------------------------------------ */

export interface HandState {
  /** Wrist position in signing space (normalized). */
  wrist: WristTarget;
  /** Id of a handshape preset. */
  handshape: string;
  /**
   * Resolved joint angles. Set by the animation engine when two handshapes are blended
   * (transitions, interference); when absent the renderer looks up `handshape`.
   */
  handshapeOverride?: HandshapeSpec;
  palm: PalmOrientation;
  /** Extra palm yaw/pitch in degrees, on top of the named orientation. */
  palmYaw: number;
  palmPitch: number;
  /** In-plane wrist rotation, degrees (+ clockwise on screen). */
  roll: number;
  /** Hand scale multiplier (1 = default). */
  scale: number;
}

export interface RigPose {
  right: HandState;
  left: HandState;
  face: FaceState;
  head: HeadState;
  body: BodyState;
}

/* ------------------------------------------------------------------ *
 * Authored animation format
 * ------------------------------------------------------------------ */

/** Hand track keyframe. `handshape` may be omitted to inherit from the previous one. */
export interface HandKeyframe {
  /** Normalized time in the animation, 0..1. */
  t: number;
  handshape?: string;
  palm?: PalmOrientation;
  /** Extra palm rotation in degrees (advanced authoring). */
  palmYaw?: number;
  palmPitch?: number;
  roll?: number;
  scale?: number;
  wrist?: WristTarget;
  /** Easing of the segment that ENDS at this keyframe. */
  ease?: EasingName;
}

export interface FaceKeyframe extends Partial<FaceState> {
  t: number;
  ease?: EasingName;
}

export interface HeadKeyframe extends Partial<HeadState> {
  t: number;
  ease?: EasingName;
}

export interface BodyKeyframe extends Partial<BodyState> {
  t: number;
  ease?: EasingName;
}

export interface AnimationTracks {
  rightHand: HandKeyframe[];
  leftHand: HandKeyframe[];
  face: FaceKeyframe[];
  head: HeadKeyframe[];
  body: BodyKeyframe[];
}

export type HeadMotion = 'none' | 'nod' | 'shake' | 'tilt' | 'nod-once' | 'shake-once';

/**
 * Sentence-level non-manual marker applied across several signs. `weight` scales how
 * much of the expression is mixed in (0 = off, 1 = full).
 */
export interface NonManualOverlay {
  /** Name of an expression preset, or a partial FaceState for custom markers. */
  expression?: string | FaceExpression;
  /** Procedural head movement layered on top of the head track. */
  headMotion?: HeadMotion;
  /** Amplitude of the head motion, 0..2 (default 1). */
  headMotionAmount?: number;
  /** 0..1 — how much of the expression is applied. */
  weight?: number;
  /**
   * Which face groups the overlay may touch. Defaults to everything except `mouth`,
   * so a sentence marker never flattens the mouth shape a signer is making.
   */
  groups?: FaceGroup[];
}

export interface FaceExpression {
  id: string;
  label: string;
  /** Plain-language explanation for learners, shown on screen. */
  explanation: string;
  /** Short chips ("brows up", "head tilt", …). */
  markers: string[];
  face: Partial<FaceState>;
  head?: Partial<HeadState>;
  body?: Partial<BodyState>;
  /** Procedural head motion bundled with the expression. */
  headMotion?: HeadMotion;
}

export interface SignAnimationMeta {
  language: string;
  /** What the animation shows, in plain language. */
  description: string;
  /** True only after a fluent deaf signer has reviewed this animation. */
  reviewed_by_deaf_signer: boolean;
  /** Demo content is never presented as correct sign language. */
  demo?: boolean;
  author?: string;
  notes?: string;
  /** Which channels this animation exercises (used by the demo index). */
  channels?: Array<'hands' | 'arms' | 'face' | 'head' | 'body' | 'two-hands'>;
}

/** A file containing several animations (e.g. the fingerspelling bundle). */
export interface SignAnimationBundle {
  meta: { name: string; language: string; version?: string };
  animations: SignAnimation[];
}

export interface SignAnimation {
  id: string;
  /** Human-facing label (gloss or demo name). */
  label?: string;
  duration_ms: number;
  tracks: AnimationTracks;
  nonManualOverlay?: NonManualOverlay;
  /** Movement quality: 1 = neutral, 2 = larger/faster. */
  intensity?: number;
  meta: SignAnimationMeta;
}

/* ------------------------------------------------------------------ *
 * Render model (produced by core/rig/render.ts)
 * ------------------------------------------------------------------ */

export interface RenderHand {
  /** 21 landmarks in stage pixels, MediaPipe ordering (0 = wrist). */
  landmarks: Vec3[];
  bones: Array<{ a: number; b: number; width: number; depth: number }>;
  palmPath: string;
  knuckles: Array<{ x: number; y: number; r: number }>;
  wrist: Vec3;
  /** Average depth, used to order hands and arms. */
  depth: number;
  /** Stage-space tip of the middle finger, for framing/zoom. */
  tip: Vec3;
}

export interface RenderArm {
  shoulder: Vec2;
  elbow: Vec2;
  wrist: Vec2;
  /** True when the IK had to clamp the target (used by the Studio warning). */
  clamped: boolean;
  /** Torso field at the elbow; negative means the elbow overlaps the body. */
  clearance: number;
}

/** Numbers the SVG face draws with (pure geometry, no colours). */
export interface FaceGeometry {
  /** 0 = closed, 1 = wide. */
  eyeOpenL: number;
  eyeOpenR: number;
  pupilX: number;
  pupilY: number;
  browYL: number;
  browYR: number;
  browTiltL: number;
  browTiltR: number;
  mouthOpenPx: number;
  mouthHalfWidthPx: number;
  mouthCornerY: number;
  /** Signed smile/frown, kept for the closed-lip line. */
  mouthSmile: number;
  roundness: number;
  tonguePx: number;
  cheekPuffPx: number;
  cheekRaisePx: number;
  noseWrinkle: number;
  mouthShape: 'rest' | 'ah' | 'ee' | 'oo' | 'pa';
}

export interface RenderHead {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Rotation around the neck joint, degrees. */
  roll: number;
  /** Face feature offset inside the head, from pitch/yaw. */
  faceDx: number;
  faceDy: number;
  /** Vertical squash from head pitch (1 = none). */
  squash: number;
}

export interface RenderBody {
  shoulders: { left: Vec2; right: Vec2 };
  waistY: number;
  /** Whole-upper-body offset from body lean/turn. */
  shift: Vec2;
  torsoPath: string;
  neckPath: string;
  /** 0..1 narrowing caused by turning. */
  widthScale: number;
}

export interface RenderPose {
  rightHand: RenderHand;
  leftHand: RenderHand;
  rightArm: RenderArm;
  leftArm: RenderArm;
  face: { state: FaceState; geometry: FaceGeometry };
  head: RenderHead;
  body: RenderBody;
  /** Draw order: which hand is nearer the camera. */
  frontHand: 'left' | 'right';
  /** Bounding box of both hands in stage space (used by the hands-zoom view). */
  handsBounds: { x0: number; y0: number; x1: number; y1: number };
  warnings: string[];
}
