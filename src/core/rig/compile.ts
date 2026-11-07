/**
 * Sign (data) → per-frame rig state → avatar frame (21 landmarks per hand + face).
 *
 * Pipeline:
 *   SignEntry.keyframes  →  resolved keyframe poses (sparse overrides merged onto base)
 *                        →  interpolate at t with easing
 *                        →  sentence-level non-manual markers + intensity + blink
 *                        →  forward kinematics + 2-bone IK
 *                        →  AvatarFrame consumed by the SVG renderer
 */
import type {
  AvatarFrame,
  EasingName,
  FaceControls,
  HandControls,
  HeadControls,
  SignEntry,
  TorsoControls,
} from '../../types/sign';
import { BODY, solveArm, toStage } from './body';
import { buildHandFrame } from './handRig';
import { deepMerge, EASINGS, lerp, lerpFace, lerpHand, lerpHead, lerpTorso } from './interpolate';
import {
  EXPRESSION_PRESETS,
  NEUTRAL_FACE,
  NEUTRAL_HEAD,
  NEUTRAL_TORSO,
  REST_HAND_LEFT,
  REST_HAND_RIGHT,
  SIGN_HAND_BASE,
  type ExpressionId,
} from './presets';

export interface Pose {
  right: HandControls;
  left: HandControls;
  face: FaceControls;
  head: HeadControls;
  torso: TorsoControls;
  speed: number;
  size: number;
}

export interface ResolvedKeyframe extends Pose {
  t: number;
  ease: EasingName;
}

export interface ResolvedSign {
  sign: SignEntry;
  frames: ResolvedKeyframe[];
  durationMs: number;
}

export interface PerformanceOptions {
  /** Sentence-level non-manual marker that overrides the sign's own expression. */
  expression?: ExpressionId | null;
  /** Clock in ms, used to animate head shake / nod / tilt. */
  timeMs?: number;
  /** Movement size (1 = as authored). Small vs large movement can change meaning. */
  intensity?: number;
  /** 0 = eyes open, 1 = fully closed (blink envelope). */
  blink?: number;
}

const SIGN_CENTER = { x: 0.5, y: 0.42 };

const basePose = (sign?: SignEntry): Pose => {
  const base = sign?.base;
  return {
    right: deepMerge(SIGN_HAND_BASE, base?.right),
    left: deepMerge(REST_HAND_LEFT, base?.left),
    face: deepMerge(NEUTRAL_FACE, base?.face),
    head: deepMerge(NEUTRAL_HEAD, base?.head),
    torso: deepMerge(NEUTRAL_TORSO, base?.torso),
    speed: sign?.speed ?? 1,
    size: sign?.size ?? 1,
  };
};

/** Resolve sparse keyframes into fully-specified poses, ready for interpolation. */
export function resolveSign(sign: SignEntry): ResolvedSign {
  const sorted = [...sign.keyframes].sort((a, b) => a.t - b.t);
  const frames: ResolvedKeyframe[] = [];
  let previous = basePose(sign);

  for (const kf of sorted) {
    const merged = deepMerge(previous, {
      right: kf.right,
      left: kf.left,
      face: kf.face,
      head: kf.head,
      torso: kf.torso,
      speed: kf.speed,
      size: kf.size,
    } as Partial<Pose>);
    previous = merged;
    frames.push({ ...merged, t: Math.min(1, Math.max(0, kf.t)), ease: kf.ease ?? 'easeInOut' });
  }

  if (frames.length === 0) {
    frames.push({ ...previous, t: 0, ease: 'easeInOut' });
  }
  const first = frames[0] as ResolvedKeyframe;
  const last = frames[frames.length - 1] as ResolvedKeyframe;
  if (first.t > 0) frames.unshift({ ...first, t: 0 });
  if (last.t < 1) frames.push({ ...last, t: 1 });

  return { sign, frames, durationMs: Math.max(80, sign.durationMs) };
}

/** Interpolate a resolved sign at normalized progress 0..1 (pure, no side effects). */
export function poseAt(resolved: ResolvedSign, progress: number): Pose {
  const p = Math.min(1, Math.max(0, progress));
  const frames = resolved.frames;
  let a = frames[0] as ResolvedKeyframe;
  let b = frames[frames.length - 1] as ResolvedKeyframe;

  for (let i = 0; i < frames.length - 1; i += 1) {
    const cur = frames[i] as ResolvedKeyframe;
    const next = frames[i + 1] as ResolvedKeyframe;
    if (p >= cur.t && p <= next.t) {
      a = cur;
      b = next;
      break;
    }
  }

  const span = b.t - a.t;
  const raw = span <= 0.0001 ? 1 : (p - a.t) / span;
  const eased = EASINGS[b.ease ?? 'easeInOut'](Math.min(1, Math.max(0, raw)));

  return {
    right: lerpHand(a.right, b.right, eased),
    left: lerpHand(a.left, b.left, eased),
    face: lerpFace(a.face, b.face, eased),
    head: lerpHead(a.head, b.head, eased),
    torso: lerpTorso(a.torso, b.torso, eased),
    speed: lerp(a.speed, b.speed, eased),
    size: lerp(a.size, b.size, eased),
  };
}

const scaleAround = (p: { x: number; y: number }, center: { x: number; y: number }, k: number) => ({
  x: center.x + (p.x - center.x) * k,
  y: center.y + (p.y - center.y) * k,
});

/** Apply non-manual markers, intensity and blink, then solve the skeleton. */
export function buildAvatarFrame(pose: Pose, options: PerformanceOptions = {}): AvatarFrame {
  let { right, left } = pose;
  let { face, head, torso } = pose;

  const expression = options.expression ?? null;
  if (expression) {
    const preset = EXPRESSION_PRESETS[expression];
    face = deepMerge(face, preset.face);
    head = deepMerge(head, preset.head);
    if (preset.torso) torso = deepMerge(torso, preset.torso);

    const seconds = (options.timeMs ?? 0) / 1000;
    const amount = preset.motionAmount ?? 1;
    if (preset.headMotion === 'shake') {
      head = { ...head, yaw: head.yaw + Math.sin(seconds * Math.PI * 2 * 1.45) * 5 * amount };
    } else if (preset.headMotion === 'nod') {
      head = {
        ...head,
        offset: { ...head.offset, y: head.offset.y + Math.sin(seconds * Math.PI * 2 * 1.1) * 1.6 * amount },
      };
    } else if (preset.headMotion === 'tilt') {
      head = { ...head, roll: head.roll + Math.sin(seconds * Math.PI * 2 * 0.5) * 1.4 * amount };
    }
  }

  const intensity = options.intensity ?? 1;
  if (intensity !== 1) {
    right = { ...right, position: scaleAround(right.position, SIGN_CENTER, intensity) };
    left = { ...left, position: scaleAround(left.position, SIGN_CENTER, intensity) };
  }

  if (options.blink !== undefined && options.blink > 0) {
    face = { ...face, eyeOpen: face.eyeOpen * (1 - Math.min(1, options.blink)) };
  }

  const rightArm = solveArm(BODY.shoulder.right, toStage(right.position), 1);
  const leftArm = solveArm(BODY.shoulder.left, toStage(left.position), -1);

  return {
    rightHand: buildHandFrame(right, BODY.palmWidth, rightArm.wrist),
    leftHand: buildHandFrame(left, BODY.palmWidth, leftArm.wrist),
    rightArm,
    leftArm,
    face,
    head,
    torso,
  };
}

/** Rest pose, used before playback and as the blend source for the first sign. */
export const IDLE_POSE: Pose = {
  right: REST_HAND_RIGHT,
  left: REST_HAND_LEFT,
  face: NEUTRAL_FACE,
  head: NEUTRAL_HEAD,
  torso: NEUTRAL_TORSO,
  speed: 1,
  size: 1,
};

export function idleFrame(options: PerformanceOptions = {}): AvatarFrame {
  return buildAvatarFrame(IDLE_POSE, options);
}

/**
 * Cross-fades two poses in control space. Used to transition between consecutive
 * signs so fingerspelling does not snap from one handshape to the next.
 */
export function blendPoses(a: Pose, b: Pose, t: number): Pose {
  const k = Math.min(1, Math.max(0, t));
  return {
    right: lerpHand(a.right, b.right, k),
    left: lerpHand(a.left, b.left, k),
    face: lerpFace(a.face, b.face, k),
    head: lerpHead(a.head, b.head, k),
    torso: lerpTorso(a.torso, b.torso, k),
    speed: lerp(a.speed, b.speed, k),
    size: lerp(a.size, b.size, k),
  };
}

export function frameAt(resolved: ResolvedSign, progress: number, options: PerformanceOptions = {}) {
  return buildAvatarFrame(poseAt(resolved, progress), options);
}

/** Cache of resolved signs — resolution is cheap but the player asks every frame. */
const cache = new WeakMap<SignEntry, ResolvedSign>();
export function getResolvedSign(sign: SignEntry): ResolvedSign {
  const hit = cache.get(sign);
  if (hit) return hit;
  const resolved = resolveSign(sign);
  cache.set(sign, resolved);
  return resolved;
}
