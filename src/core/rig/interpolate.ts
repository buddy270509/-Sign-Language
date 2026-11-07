/**
 * Easing + control-space interpolation.
 *
 * We interpolate the *controls* (curls, wrist targets, brow values, head pose…)
 * rather than raw screen coordinates. Interpolating meaning-carrying parameters keeps
 * the anatomy plausible between keyframes: a finger cannot pass through the palm, and
 * an arm never stretches.
 */
import type { EasingName, FaceControls, HandControls, HeadControls, TorsoControls } from '../../types/sign';

export const EASINGS: Record<EasingName, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  // Slight overshoot: makes the hand "arrive" like a real sign rather than slide.
  spring: (t) => {
    if (t <= 0 || t >= 1) return t;
    return 1 - Math.exp(-6 * t) * Math.cos(9 * t);
  },
};

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Rec = Record<string, unknown>;
const isRecord = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Recursive merge used to layer sparse keyframes over a base pose. */
export function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === undefined || patch === null) return base;
  if (!isRecord(base) || !isRecord(patch)) return patch as T;
  const out: Rec = { ...base };
  for (const key of Object.keys(patch)) {
    out[key] = deepMerge(base[key], patch[key]);
  }
  return out as T;
}

export function lerpHand(a: HandControls, b: HandControls, t: number): HandControls {
  return {
    position: {
      x: lerp(a.position.x, b.position.x, t),
      y: lerp(a.position.y, b.position.y, t),
    },
    orientation: {
      roll: lerp(a.orientation.roll, b.orientation.roll, t),
      yaw: lerp(a.orientation.yaw, b.orientation.yaw, t),
      pitch: lerp(a.orientation.pitch ?? 0, b.orientation.pitch ?? 0, t),
    },
    fingers: {
      index: lerp(a.fingers.index, b.fingers.index, t),
      middle: lerp(a.fingers.middle, b.fingers.middle, t),
      ring: lerp(a.fingers.ring, b.fingers.ring, t),
      pinky: lerp(a.fingers.pinky, b.fingers.pinky, t),
    },
    thumb: {
      curl: lerp(a.thumb.curl, b.thumb.curl, t),
      spread: lerp(a.thumb.spread, b.thumb.spread, t),
    },
    spread: lerp(a.spread, b.spread, t),
    fingerSpread: {
      index: lerp(a.fingerSpread?.index ?? 0, b.fingerSpread?.index ?? 0, t),
      middle: lerp(a.fingerSpread?.middle ?? 0, b.fingerSpread?.middle ?? 0, t),
      ring: lerp(a.fingerSpread?.ring ?? 0, b.fingerSpread?.ring ?? 0, t),
      pinky: lerp(a.fingerSpread?.pinky ?? 0, b.fingerSpread?.pinky ?? 0, t),
    },
    scale: lerp(a.scale ?? 1, b.scale ?? 1, t),
  };
}

export function lerpFace(a: FaceControls, b: FaceControls, t: number): FaceControls {
  return {
    browRaise: lerp(a.browRaise, b.browRaise, t),
    browFurrow: lerp(a.browFurrow, b.browFurrow, t),
    browAsymmetry: lerp(a.browAsymmetry, b.browAsymmetry, t),
    eyeOpen: lerp(a.eyeOpen, b.eyeOpen, t),
    eyeSquint: lerp(a.eyeSquint, b.eyeSquint, t),
    gaze: { x: lerp(a.gaze.x, b.gaze.x, t), y: lerp(a.gaze.y, b.gaze.y, t) },
    cheekRaise: lerp(a.cheekRaise, b.cheekRaise, t),
    mouthOpen: lerp(a.mouthOpen, b.mouthOpen, t),
    mouthWidth: lerp(a.mouthWidth, b.mouthWidth, t),
    mouthSmile: lerp(a.mouthSmile, b.mouthSmile, t),
    mouthRound: lerp(a.mouthRound, b.mouthRound, t),
    tongue: lerp(a.tongue, b.tongue, t),
    nostrilFlare: lerp(a.nostrilFlare, b.nostrilFlare, t),
  };
}

export function lerpHead(a: HeadControls, b: HeadControls, t: number): HeadControls {
  return {
    pitch: lerp(a.pitch, b.pitch, t),
    yaw: lerp(a.yaw, b.yaw, t),
    roll: lerp(a.roll, b.roll, t),
    offset: { x: lerp(a.offset.x, b.offset.x, t), y: lerp(a.offset.y, b.offset.y, t) },
  };
}

export function lerpTorso(a: TorsoControls, b: TorsoControls, t: number): TorsoControls {
  return {
    lean: lerp(a.lean, b.lean, t),
    turn: lerp(a.turn, b.turn, t),
    shoulderRaise: lerp(a.shoulderRaise, b.shoulderRaise, t),
  };
}
