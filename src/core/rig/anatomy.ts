/**
 * Anatomy: one place that defines the figure's proportions, signing space and joint
 * limits. Everything else (FK, IK, renderer, zoom views) derives from these numbers,
 * so the avatar can be re-proportioned or replaced by a 3D rig without touching data.
 *
 * Proportions are derived from a head height H = 100 px:
 *   shoulder width 1.56H · shoulder→wrist 2.26H · hand length 0.8H · palm width 0.42H
 * which is close to real anthropometry (arms long enough to reach above the head).
 */
import type { PalmOrientation, Vec3, WristTarget } from '../../types/animation';

export const STAGE = { width: 440, height: 560 } as const;

/**
 * Signing space: above the head down to the waist, and roughly one arm length each
 * side. Normalized 0..1 (x, y) with 0.5, 0.5 at the sternum. Depth z is −1..1, where
 * +1 is closest to the camera.
 */
export const SIGN_SPACE = { x0: 44, x1: 396, y0: 62, y1: 432 } as const;

export const FIGURE = {
  head: { cx: 220, cy: 112, halfWidth: 41, halfHeight: 50 },
  neck: { top: 150, bottom: 196, halfWidth: 14 },
  shoulder: { y: 196, dx: 78 },
  upperArm: 122,
  forearm: 104,
  palmWidth: 42,
  waistY: 420,
  hipY: 470,
  /** Torso silhouette half-widths at the shoulder line and at the waist. */
  torso: { top: 188, halfTopHalf: 62, halfBottom: 86 },
} as const;

export const SHOULDER_J = {
  left: { x: FIGURE.head.cx - FIGURE.shoulder.dx, y: FIGURE.shoulder.y },
  right: { x: FIGURE.head.cx + FIGURE.shoulder.dx, y: FIGURE.shoulder.y },
} as const;

export const ARM_REACH = FIGURE.upperArm + FIGURE.forearm;

/**
 * Approximate torso volume used for arm collision. The elbow is kept outside this
 * ellipse so arms never appear to pass through the body.
 */
export const TORSO_ELLIPSE = {
  cx: FIGURE.head.cx,
  cy: 340,
  rx: 88,
  ry: 132,
} as const;

/** Distance from the torso ellipse surface (positive = outside). */
export function torsoField(p: { x: number; y: number }): number {
  const dx = (p.x - TORSO_ELLIPSE.cx) / TORSO_ELLIPSE.rx;
  const dy = (p.y - TORSO_ELLIPSE.cy) / TORSO_ELLIPSE.ry;
  const r = Math.hypot(dx, dy);
  return (r - 1) * Math.min(TORSO_ELLIPSE.rx, TORSO_ELLIPSE.ry);
}

/** Joint limits (degrees). The rig clamps to these; the validator warns when data is outside. */
export const LIMITS = {
  finger: {
    mcp: { min: 0, max: 92 },
    pip: { min: 0, max: 115 },
    dip: { min: 0, max: 90 },
    spread: { min: -1, max: 1 },
  },
  thumb: {
    cmc: { min: 0, max: 70 },
    mcp: { min: -10, max: 80 },
    ip: { min: -10, max: 90 },
    spread: { min: 0, max: 1 },
  },
  elbow: { minDeg: 10, maxDeg: 158 },
  shoulder: { maxAbduction: 175 },
  wristRoll: { min: -110, max: 110 },
  handScale: { min: 0.7, max: 1.35 },
  head: { pitch: [-35, 35], yaw: [-50, 50], roll: [-32, 32] } as Record<'pitch' | 'yaw' | 'roll', [number, number]>,
  body: {
    leanForward: [-1, 1],
    leanSide: [-1, 1],
    turn: [-1, 1],
    shoulderRaise: [-1, 1],
  } as Record<string, [number, number]>,
} as const;

export const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
export const clamp01 = (v: number) => clamp(v, 0, 1);
export const clampSigned = (v: number) => clamp(v, -1, 1);

/** Named palm orientations → rotation of the local hand frame. */
/**
 * Named palm orientations → rotation of the local hand frame.
 *
 * These are the *readable* angles, not the anatomical 90°. A palm held exactly edge-on
 * collapses to a line in an orthographic 2D drawing, so sideways/up/down are limited to
 * about 60°, which still reads clearly as "turned away" while keeping the handshape
 * legible. A 3D renderer can use the full 90° values from PALM_TRUE_ANGLES.
 */
export const PALM_ANGLES: Record<PalmOrientation, { yaw: number; pitch: number }> = {
  forward: { yaw: 0, pitch: 0 },
  back: { yaw: 180, pitch: 0 },
  left: { yaw: -62, pitch: 0 },
  right: { yaw: 62, pitch: 0 },
  up: { yaw: 0, pitch: 58 },
  down: { yaw: 0, pitch: -58 },
};

/** Anatomically exact palm orientations, for a 3D renderer. */
export const PALM_TRUE_ANGLES: Record<PalmOrientation, { yaw: number; pitch: number }> = {
  forward: { yaw: 0, pitch: 0 },
  back: { yaw: 180, pitch: 0 },
  left: { yaw: -90, pitch: 0 },
  right: { yaw: 90, pitch: 0 },
  up: { yaw: 0, pitch: 90 },
  down: { yaw: 0, pitch: -90 },
};

export const PALM_ORIENTATIONS: PalmOrientation[] = ['forward', 'back', 'up', 'down', 'left', 'right'];

/** Normalized signing space → stage pixels. */
export function toStage(wrist: WristTarget): Vec3 {
  return {
    x: SIGN_SPACE.x0 + wrist[0] * (SIGN_SPACE.x1 - SIGN_SPACE.x0),
    y: SIGN_SPACE.y0 + wrist[1] * (SIGN_SPACE.y1 - SIGN_SPACE.y0),
    z: clamp(wrist[2] ?? 0, -1, 1),
  };
}

/** Stage pixels → normalized signing space (used by the Studio's drag handles). */
export function fromStage(p: { x: number; y: number; z?: number }): WristTarget {
  return [
    (p.x - SIGN_SPACE.x0) / (SIGN_SPACE.x1 - SIGN_SPACE.x0),
    (p.y - SIGN_SPACE.y0) / (SIGN_SPACE.y1 - SIGN_SPACE.y0),
    p.z ?? 0,
  ];
}

/** Clamp a normalized wrist position into the signing space. */
export function clampWrist(wrist: WristTarget): WristTarget {
  return [clamp01(wrist[0]), clamp01(wrist[1]), clamp(wrist[2] ?? 0, -1, 1)];
}
