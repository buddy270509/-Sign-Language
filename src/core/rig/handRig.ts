/**
 * Parametric 2D hand rig.
 *
 * We do not hand-author 21 landmark coordinates for every sign — that would be
 * impossible to maintain and would not interpolate cleanly. Instead every hand is a
 * small forward-kinematic model driven by seven meaningful controls (four finger
 * curls, thumb curl + spread, palm orientation). The model outputs the exact
 * 21-point landmark layout that MediaPipe produces:
 *
 *   0 wrist · 1-4 thumb · 5-8 index · 9-12 middle · 13-16 ring · 17-20 pinky
 *
 * Keeping the same ordering means recorded keyframes can later be blended with, or
 * compared against, landmarks captured from a real camera without a translation layer.
 *
 * Local hand space: palm width = 1 unit, wrist at the origin, fingers point up
 * (−y), the palm faces the viewer (+z). The hand is projected orthographically
 * after pitch/yaw/roll, so a curled fist reads correctly (the fingertips foreshorten
 * toward the knuckles) and a palm-in-profile hand becomes thin.
 */
import type { FingerName, HandControls, HandFrame, HandOrientation, Vec2, Vec3 } from '../../types/sign';

export const FINGERS: readonly FingerName[] = ['index', 'middle', 'ring', 'pinky'];

/** MediaPipe landmark indices (useful for debugging, overlays and model work). */
export const HAND_LANDMARKS = [
  'wrist',
  'thumb_cmc',
  'thumb_mcp',
  'thumb_ip',
  'thumb_tip',
  'index_mcp',
  'index_pip',
  'index_dip',
  'index_tip',
  'middle_mcp',
  'middle_pip',
  'middle_dip',
  'middle_tip',
  'ring_mcp',
  'ring_pip',
  'ring_dip',
  'ring_tip',
  'pinky_mcp',
  'pinky_pip',
  'pinky_dip',
  'pinky_tip',
] as const;

/** Knuckle positions on the palm, in palm units. */
const MCP: Record<FingerName, Vec2> = {
  index: { x: -0.31, y: -0.92 },
  middle: { x: -0.1, y: -0.95 },
  ring: { x: 0.11, y: -0.92 },
  pinky: { x: 0.3, y: -0.87 },
};

/** Phalanx lengths (proximal, middle, distal) in palm units. */
const SEGMENTS: Record<FingerName, readonly [number, number, number]> = {
  index: [0.42, 0.26, 0.2],
  middle: [0.46, 0.3, 0.2],
  ring: [0.42, 0.28, 0.2],
  pinky: [0.34, 0.22, 0.18],
};

/** Resting abduction of each finger in radians (negative = toward the thumb side). */
const ABDUCT_BASE: Record<FingerName, number> = {
  index: -0.1,
  middle: -0.02,
  ring: 0.06,
  pinky: 0.16,
};

/** Maximum flexion per joint, in degrees, at curl = 1. */
const FLEX: Record<FingerName, readonly [number, number, number]> = {
  index: [92, 104, 62],
  middle: [92, 106, 62],
  ring: [92, 104, 60],
  pinky: [86, 100, 58],
};

const ABDUCT_PER_SPREAD = 0.36;
const ABDUCT_PER_OVERRIDE = 0.85;

const THUMB = {
  base: { x: -0.3, y: -0.34 },
  segments: [0.3, 0.24, 0.2] as const,
  flex: [34, 48, 40] as const,
};

/** Bone widths in palm units (fingertips taper). */
const BONE_WIDTH: Record<string, number> = {
  thumb: 0.32,
  index: 0.28,
  middle: 0.28,
  ring: 0.27,
  pinky: 0.24,
};

const DEG = Math.PI / 180;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Local (unplaced) landmarks in palm units: wrist at the origin, +z toward viewer.
 * These are the raw 21 MediaPipe points a camera would produce for the same pose.
 */
export function handLandmarksLocal(controls: HandControls): Vec3[] {
  const points: Vec3[] = [{ x: 0, y: 0, z: 0 }];

  /* ---- thumb (CMC, MCP, IP, TIP) ---- */
  const phi = lerp(-12, 138, clamp(controls.thumb.spread, 0, 1)) * DEG;
  const thumbCurl = clamp(controls.thumb.curl, 0, 1);
  let theta = 0;
  let thumbPoint: Vec3 = { x: THUMB.base.x, y: THUMB.base.y, z: 0 };
  points.push({ ...thumbPoint }); // thumb_cmc
  for (let i = 0; i < 3; i += 1) {
    const flex = [34, 48, 40][i] ?? 40;
    theta += (4 + thumbCurl * flex) * DEG;
    const dir: Vec3 = {
      x: Math.cos(phi) * Math.cos(theta),
      y: -Math.sin(phi) * Math.cos(theta),
      z: Math.sin(theta),
    };
    const len = THUMB.segments[i] ?? 0.2;
    thumbPoint = {
      x: thumbPoint.x + dir.x * len,
      y: thumbPoint.y + dir.y * len,
      z: thumbPoint.z + dir.z * len,
    };
    points.push({ ...thumbPoint });
  }

  /* ---- four fingers: MCP, PIP, DIP, TIP ---- */
  for (const finger of FINGERS) {
    const curl = clamp(controls.fingers[finger], 0, 1);
    const abduct =
      ABDUCT_BASE[finger] +
      controls.spread * ABDUCT_PER_SPREAD +
      (controls.fingerSpread?.[finger] ?? 0) * ABDUCT_PER_OVERRIDE;
    const mcp = MCP[finger];
    const segs = SEGMENTS[finger];
    const flex = FLEX[finger];

    let point: Vec3 = { x: mcp.x, y: mcp.y, z: 0 };
    points.push({ ...point });

    let cumulative = 8 * DEG; // fingers are never perfectly rigid
    for (let i = 0; i < 3; i += 1) {
      const base = i === 0 ? 8 : i === 1 ? 5 : 2;
      cumulative += (base + curl * (flex[i] ?? 0)) * DEG;
      const dir: Vec3 = {
        x: Math.sin(abduct),
        y: -Math.cos(abduct) * Math.cos(cumulative),
        z: Math.cos(abduct) * Math.sin(cumulative),
      };
      const len = segs[i] ?? 0.2;
      point = {
        x: point.x + dir.x * len,
        y: point.y + dir.y * len,
        z: point.z + dir.z * len,
      };
      points.push({ ...point });
    }
  }

  return points;
}

/** Rotate pitch → yaw → roll, then scale and translate into stage space. */
export function placeHandLandmarks(
  local: Vec3[],
  orientation: HandOrientation,
  scale: number,
  wrist: Vec2,
): Vec3[] {
  const pitch = (orientation.pitch ?? 0) * DEG;
  const yaw = orientation.yaw * DEG;
  const roll = orientation.roll * DEG;
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosR = Math.cos(roll);
  const sinR = Math.sin(roll);

  return local.map((p) => {
    // pitch (about x): tilt the hand toward / away from the camera
    const y1 = p.y * cosP - p.z * sinP;
    const z1 = p.y * sinP + p.z * cosP;
    // yaw (about y): turn the palm sideways
    const x2 = p.x * cosY + z1 * sinY;
    const z2 = -p.x * sinY + z1 * cosY;
    // roll (about z): in-plane rotation at the wrist
    const x3 = x2 * cosR - y1 * sinR;
    const y3 = x2 * sinR + y1 * cosR;
    return {
      x: wrist.x + x3 * scale,
      y: wrist.y + y3 * scale,
      z: z2 * scale,
    };
  });
}

/** Smooth closed outline through the given points (palm silhouette). */
export function roundedPolygonPath(points: Vec2[], radius: number, close = true): string {
  if (points.length < 3) return '';
  const n = points.length;
  const parts: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const prev = points[(i - 1 + n) % n] as Vec2;
    const cur = points[i] as Vec2;
    const next = points[(i + 1) % n] as Vec2;
    const inDir = { x: cur.x - prev.x, y: cur.y - prev.y };
    const outDir = { x: next.x - cur.x, y: next.y - cur.y };
    const inLen = Math.hypot(inDir.x, inDir.y) || 1;
    const outLen = Math.hypot(outDir.x, outDir.y) || 1;
    const rIn = Math.min(radius, inLen / 2);
    const rOut = Math.min(radius, outLen / 2);
    const p1 = { x: cur.x - (inDir.x / inLen) * rIn, y: cur.y - (inDir.y / inLen) * rIn };
    const p2 = { x: cur.x + (outDir.x / outLen) * rOut, y: cur.y + (outDir.y / outLen) * rOut };
    if (i === 0) parts.push(`M ${round(p1.x)} ${round(p1.y)}`);
    else parts.push(`L ${round(p1.x)} ${round(p1.y)}`);
    parts.push(`Q ${round(cur.x)} ${round(cur.y)} ${round(p2.x)} ${round(p2.y)}`);
  }
  if (close) parts.push('Z');
  return parts.join(' ');
}

const round = (v: number) => Math.round(v * 100) / 100;

/**
 * Build everything the renderer needs for one hand: placed landmarks, tapered bones
 * (with a depth value so the renderer can order them), and the palm silhouette.
 */
export function buildHandFrame(controls: HandControls, palmWidthPx: number, wrist: Vec2): HandFrame {
  const local = handLandmarksLocal(controls);
  // Two synthetic points give the palm a wide wrist end instead of tapering to a point.
  const palmExtras: Vec3[] = [
    { x: -0.27, y: -0.04, z: 0 },
    { x: 0.25, y: -0.04, z: 0 },
  ];
  const scale = palmWidthPx * (controls.scale ?? 1);
  const placed = placeHandLandmarks([...local, ...palmExtras], controls.orientation, scale, wrist);
  const landmarks = placed.slice(0, 21);
  const at = (i: number): Vec3 => landmarks[i] ?? { x: wrist.x, y: wrist.y, z: 0 };
  const extra = (i: number): Vec3 => placed[21 + i] ?? { x: wrist.x, y: wrist.y, z: 0 };

  const bones: HandFrame['bones'] = [];
  const addBone = (a: number, b: number, widthPalm: number) => {
    const pa = at(a);
    const pb = at(b);
    const width = widthPalm * scale;
    // A phalanx pointing at the camera projects to almost nothing. Drawing it as a
    // fat round-capped stroke would leave a knuckle-shaped lump, so it is skipped —
    // exactly as it is invisible on a real fist.
    const projected = Math.hypot(pb.x - pa.x, pb.y - pa.y);
    if (projected < width * 0.42) return;
    bones.push({ a, b, width, depth: (pa.z + pb.z) / 2 });
  };

  // thumb
  addBone(0, 1, 0.3);
  addBone(1, 2, BONE_WIDTH.thumb ?? 0.3);
  addBone(2, 3, 0.29);
  addBone(3, 4, 0.24);
  // four fingers
  FINGERS.forEach((finger, f) => {
    const base = 5 + f * 4;
    const w = BONE_WIDTH[finger] ?? 0.24;
    addBone(base, base + 1, w);
    addBone(base + 1, base + 2, w * 0.9);
    addBone(base + 2, base + 3, w * 0.78);
  });

  // Palm silhouette, clockwise: wrist → thumb base → knuckles → wrist.
  const palmPoints: Vec2[] = [
    extra(0),
    { x: at(1).x - 0.03 * scale, y: at(1).y },
    at(5),
    at(9),
    at(13),
    at(17),
    extra(1),
  ];

  const palmDepth = palmPoints.reduce((sum, p) => sum + ((p as Vec3).z ?? 0), 0) / palmPoints.length;

  // Knuckle ridge: visible bumps at the MCPs only when the fingers are curled.
  const knuckles = FINGERS.map((finger, f) => {
    const curl = controls.fingers[finger];
    const point = at(5 + f * 4);
    const r = 0.115 * scale * (0.6 + curl * 0.4);
    // Inset towards the palm so only a soft knuckle arc shows above the silhouette.
    return { x: point.x, y: point.y + r * 0.7, z: point.z, r };
  }).filter((_, f) => controls.fingers[FINGERS[f] as FingerName] > 0.35);

  return {
    landmarks,
    controls,
    bones: bones.sort((a, b) => a.depth - b.depth),
    palmPath: roundedPolygonPath(palmPoints, 0.13 * scale),
    palmDepth,
    knuckles,
    wrist: at(0),
  };
}

/** Convenience for the debug overlay and tests. */
export function fingerTips(landmarks: Vec3[]): Record<string, Vec3> {
  return {
    thumb: landmarks[4] as Vec3,
    index: landmarks[8] as Vec3,
    middle: landmarks[12] as Vec3,
    ring: landmarks[16] as Vec3,
    pinky: landmarks[20] as Vec3,
  };
}
