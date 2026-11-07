/**
 * Hand forward kinematics.
 *
 * Input: a handshape (explicit joint angles in degrees) + a palm orientation.
 * Output: 21 landmarks in palm units, in MediaPipe Hands order:
 *
 *   0 wrist · 1-4 thumb (CMC, MCP, IP, TIP) · 5-8 index · 9-12 middle · 13-16 ring · 17-20 pinky
 *
 * Local frame: wrist at the origin, fingers up (−y), palm normal +z (toward the viewer),
 * palm width = 1 unit. Depth is real: joints rotate about the knuckle axis, so a curled
 * fist foreshortens exactly like a real one. The left hand is built by mirroring the local
 * x axis, which preserves the landmark ordering and gives correct thumb placement.
 */
import type { FingerJoints, FingerName, HandshapeSpec, ThumbJoints, Vec3 } from '../../types/animation';
import { clamp, LIMITS } from './anatomy';

export const FINGERS: readonly FingerName[] = ['index', 'middle', 'ring', 'pinky'];

/** Knuckle positions on the palm (palm units). */
const MCP: Record<FingerName, { x: number; y: number }> = {
  index: { x: -0.31, y: -0.92 },
  middle: { x: -0.1, y: -0.95 },
  ring: { x: 0.11, y: -0.92 },
  pinky: { x: 0.3, y: -0.87 },
};

/** Phalanx lengths: proximal, middle, distal. */
const SEGMENTS: Record<FingerName, readonly [number, number, number]> = {
  index: [0.42, 0.26, 0.2],
  middle: [0.46, 0.3, 0.2],
  ring: [0.42, 0.28, 0.2],
  pinky: [0.34, 0.22, 0.18],
};

/** Resting abduction, in units of `spread` (negative = toward the thumb). */
const ABDUCT_BASE: Record<FingerName, number> = {
  index: -0.1,
  middle: -0.02,
  ring: 0.06,
  pinky: 0.16,
};

const ABDUCT_RAD = 0.24;

const THUMB_BASE = { x: -0.3, y: -0.34 };
const THUMB_SEGMENTS = [0.3, 0.24, 0.2] as const;

export const BONE_WIDTH: Record<FingerName | 'thumb', number> = {
  thumb: 0.3,
  index: 0.255,
  middle: 0.255,
  ring: 0.245,
  pinky: 0.215,
};

export const DEG = Math.PI / 180;

/** Enforce anatomical joint limits. Applied on every frame, so bad data can never break the rig. */
export function clampFinger(finger: FingerJoints): FingerJoints {
  return {
    mcp: clamp(finger.mcp, LIMITS.finger.mcp.min, LIMITS.finger.mcp.max),
    pip: clamp(finger.pip, LIMITS.finger.pip.min, LIMITS.finger.pip.max),
    dip: clamp(finger.dip, LIMITS.finger.dip.min, LIMITS.finger.dip.max),
    spread: clamp(finger.spread, LIMITS.finger.spread.min, LIMITS.finger.spread.max),
  };
}

export function clampThumb(thumb: ThumbJoints): ThumbJoints {
  return {
    cmc: clamp(thumb.cmc, LIMITS.thumb.cmc.min, LIMITS.thumb.cmc.max),
    mcp: clamp(thumb.mcp, LIMITS.thumb.mcp.min, LIMITS.thumb.mcp.max),
    ip: clamp(thumb.ip, LIMITS.thumb.ip.min, LIMITS.thumb.ip.max),
    spread: clamp(thumb.spread, LIMITS.thumb.spread.min, LIMITS.thumb.spread.max),
  };
}

export function clampHandshape(spec: HandshapeSpec): HandshapeSpec {
  return {
    fingers: {
      index: clampFinger(spec.fingers.index),
      middle: clampFinger(spec.fingers.middle),
      ring: clampFinger(spec.fingers.ring),
      pinky: clampFinger(spec.fingers.pinky),
    },
    thumb: clampThumb(spec.thumb),
  };
}

/** True when any joint in the spec is outside its anatomical range. */
export function isHandshapeWithinLimits(spec: HandshapeSpec): boolean {
  const same = (a: FingerJoints, b: FingerJoints) =>
    a.mcp === b.mcp && a.pip === b.pip && a.dip === b.dip && a.spread === b.spread;
  const clamped = clampHandshape(spec);
  return (
    same(clamped.fingers.index, spec.fingers.index) &&
    same(clamped.fingers.middle, spec.fingers.middle) &&
    same(clamped.fingers.ring, spec.fingers.ring) &&
    same(clamped.fingers.pinky, spec.fingers.pinky) &&
    clamped.thumb.cmc === spec.thumb.cmc &&
    clamped.thumb.mcp === spec.thumb.mcp &&
    clamped.thumb.ip === spec.thumb.ip &&
    clamped.thumb.spread === spec.thumb.spread
  );
}

/**
 * Local (unplaced) landmarks in palm units. `side` mirrors the x axis so the thumb
 * sits on the correct side of the hand.
 */
export function handLandmarksLocal(spec: HandshapeSpec, side: 'right' | 'left' = 'right'): Vec3[] {
  const mirror = side === 'left' ? -1 : 1;
  const points: Vec3[] = [{ x: 0, y: 0, z: 0 }];

  /* ---- thumb: CMC, MCP, IP, TIP ---- */
  const thumb = clampThumb(spec.thumb);
  const phi = (-12 + thumb.spread * 150) * DEG; // 0 = across the palm, 1 = out
  let theta = thumb.cmc * DEG;
  let point: Vec3 = { x: THUMB_BASE.x, y: THUMB_BASE.y, z: 0 };
  points.push({ x: point.x * mirror, y: point.y, z: 0 });
  const thumbAngles = [thumb.cmc, thumb.cmc + thumb.mcp, thumb.cmc + thumb.mcp + thumb.ip];
  for (let i = 0; i < 3; i += 1) {
    theta = (thumbAngles[i] ?? 0) * DEG;
    const dir: Vec3 = {
      x: Math.cos(phi) * Math.cos(theta),
      y: -Math.sin(phi) * Math.cos(theta),
      z: Math.sin(theta),
    };
    const len = THUMB_SEGMENTS[i] ?? 0.2;
    point = { x: point.x + dir.x * len, y: point.y + dir.y * len, z: point.z + dir.z * len };
    points.push({ x: point.x * mirror, y: point.y, z: point.z });
  }

  /* ---- four fingers: MCP, PIP, DIP, TIP ---- */
  for (const finger of FINGERS) {
    const joints = clampFinger(spec.fingers[finger]);
    const abduct = ABDUCT_BASE[finger] + joints.spread * ABDUCT_RAD;
    const mcp = MCP[finger];
    const segs = SEGMENTS[finger];
    const angles = [joints.mcp, joints.mcp + joints.pip, joints.mcp + joints.pip + joints.dip];

    let p: Vec3 = { x: mcp.x, y: mcp.y, z: 0 };
    points.push({ x: p.x * mirror, y: p.y, z: 0 });

    for (let i = 0; i < 3; i += 1) {
      const theta = (angles[i] ?? 0) * DEG;
      const dir: Vec3 = {
        x: Math.sin(abduct) * Math.cos(theta),
        y: -Math.cos(abduct) * Math.cos(theta),
        z: Math.cos(abduct) * Math.sin(theta),
      };
      const len = segs[i] ?? 0.2;
      p = { x: p.x + dir.x * len, y: p.y + dir.y * len, z: p.z + dir.z * len };
      points.push({ x: p.x * mirror, y: p.y, z: p.z });
    }
  }

  return points;
}

export interface HandOrientation {
  /** Palm facing (degrees), see PALM_ANGLES. */
  yaw: number;
  /** Palm tilt (degrees). */
  pitch: number;
  /** In-plane wrist rotation (degrees). */
  roll: number;
}

/** Rotate → scale → translate. Orthographic projection; z is kept for depth ordering. */
export function placeHand(
  local: Vec3[],
  orientation: HandOrientation,
  scale: number,
  wrist: { x: number; y: number; z: number },
): Vec3[] {
  const pitch = (orientation.pitch ?? 0) * DEG;
  const yaw = (orientation.yaw ?? 0) * DEG;
  const roll = (orientation.roll ?? 0) * DEG;
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosR = Math.cos(roll);
  const sinR = Math.sin(roll);
  const depth = wrist.z * 12;

  return local.map((p) => {
    const y1 = p.y * cosP - p.z * sinP;
    const z1 = p.y * sinP + p.z * cosP;
    const x2 = p.x * cosY + z1 * sinY;
    const z2 = -p.x * sinY + z1 * cosY;
    const x3 = x2 * cosR - y1 * sinR;
    const y3 = x2 * sinR + y1 * cosR;
    return {
      x: wrist.x + x3 * scale,
      y: wrist.y + y3 * scale,
      z: z2 * scale + depth,
    };
  });
}

/** Extra palm-outline points so the palm has a wide wrist end instead of tapering to a point. */
export const PALM_EXTRAS: Vec3[] = [
  { x: -0.27, y: -0.04, z: 0 },
  { x: 0.25, y: -0.04, z: 0 },
];

/** Smooth closed outline through the given points (palm silhouette). */
export function roundedPolygonPath(points: Array<{ x: number; y: number }>, radius: number): string {
  if (points.length < 3) return '';
  const n = points.length;
  const parts: string[] = [];
  const round = (v: number) => Math.round(v * 100) / 100;
  for (let i = 0; i < n; i += 1) {
    const prev = points[(i - 1 + n) % n] as { x: number; y: number };
    const cur = points[i] as { x: number; y: number };
    const next = points[(i + 1) % n] as { x: number; y: number };
    const inDir = { x: cur.x - prev.x, y: cur.y - prev.y };
    const outDir = { x: next.x - cur.x, y: next.y - cur.y };
    const inLen = Math.hypot(inDir.x, inDir.y) || 1;
    const outLen = Math.hypot(outDir.x, outDir.y) || 1;
    const rIn = Math.min(radius, inLen / 2);
    const rOut = Math.min(radius, outLen / 2);
    const p1 = { x: cur.x - (inDir.x / inLen) * rIn, y: cur.y - (inDir.y / inLen) * rIn };
    const p2 = { x: cur.x + (outDir.x / outLen) * rOut, y: cur.y + (outDir.y / outLen) * rOut };
    parts.push(`${i === 0 ? 'M' : 'L'} ${round(p1.x)} ${round(p1.y)}`);
    parts.push(`Q ${round(cur.x)} ${round(cur.y)} ${round(p2.x)} ${round(p2.y)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}
