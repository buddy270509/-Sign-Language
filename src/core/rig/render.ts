/**
 * Rig → render model.
 *
 * This is the only place that turns a `RigPose` into stage-space geometry. It contains no
 * SVG, no React and no colours: a Three.js renderer can consume the same output (or the
 * `RigPose` directly) without any of the authoring data changing.
 */
import type {
  RenderArm,
  RenderBody,
  RenderHand,
  RenderHead,
  RenderPose,
  RigPose,
  Vec2,
  Vec3,
} from '../../types/animation';
import { FIGURE, PALM_ANGLES, toStage } from './anatomy';
import { solveArm, elbowClearance } from './arm';
import { faceGeometry } from './face';
import { getHandshape, resolveHandshape } from './handshapes';
import { BONE_WIDTH, handLandmarksLocal, placeHand, roundedPolygonPath } from './hand';
import { handshapeOf } from './pose';

const FINGER_CHAINS: Array<{ name: 'index' | 'middle' | 'ring' | 'pinky'; indices: [number, number, number, number] }> = [
  { name: 'index', indices: [5, 6, 7, 8] },
  { name: 'middle', indices: [9, 10, 11, 12] },
  { name: 'ring', indices: [13, 14, 15, 16] },
  { name: 'pinky', indices: [17, 18, 19, 20] },
];

function buildBody(pose: RigPose): RenderBody {
  const { body } = pose;
  const shiftX = body.leanSide * 13 + body.turn * 5;
  const shiftY = -body.leanForward * 5;
  const tilt = body.leanSide * 5;
  const shoulders = {
    left: {
      x: FIGURE.head.cx - FIGURE.shoulder.dx + shiftX,
      y: FIGURE.shoulder.y + shiftY - tilt - body.shoulderRaiseL * 8,
    },
    right: {
      x: FIGURE.head.cx + FIGURE.shoulder.dx + shiftX,
      y: FIGURE.shoulder.y + shiftY + tilt - body.shoulderRaiseR * 8,
    },
  };
  const waistY = FIGURE.waistY + shiftY * 0.4;
  const widthScale = 1 - Math.abs(body.turn) * 0.16;
  const halfBottom = FIGURE.torso.halfBottom * widthScale;
  const cx = (shoulders.left.x + shoulders.right.x) / 2;
  const neckHalf = 24;

  const shoulderHalf = FIGURE.shoulder.dx + 10;
  const torsoPath = [
    `M ${round(cx - neckHalf)} ${round(shoulders.left.y - 14)}`,
    `C ${round(cx - 56)} ${round(shoulders.left.y - 12)} ${round(cx - shoulderHalf + 10)} ${round(shoulders.left.y - 6)} ${round(cx - shoulderHalf)} ${round(shoulders.left.y + 4)}`,
    `C ${round(cx - shoulderHalf - 4)} ${round(shoulders.left.y + 62)} ${round(cx - halfBottom)} ${round(waistY - 84)} ${round(cx - halfBottom)} ${round(waistY)}`,
    `L ${round(cx + halfBottom)} ${round(waistY)}`,
    `C ${round(cx + halfBottom)} ${round(waistY - 84)} ${round(cx + shoulderHalf + 4)} ${round(shoulders.right.y + 62)} ${round(cx + shoulderHalf)} ${round(shoulders.right.y + 4)}`,
    `C ${round(cx + shoulderHalf - 10)} ${round(shoulders.right.y - 6)} ${round(cx + 56)} ${round(shoulders.right.y - 12)} ${round(cx + neckHalf)} ${round(shoulders.right.y - 14)}`,
    'Z',
  ].join(' ');

  return {
    shoulders,
    waistY,
    shift: { x: shiftX, y: shiftY },
    torsoPath,
    neckPath: '',
    widthScale,
  };
}

function buildHead(pose: RigPose, body: RenderBody): RenderHead {
  const { head } = pose;
  const cx = FIGURE.head.cx + body.shift.x * 0.7 + head.offsetX + head.yaw * 0.22;
  const cy = FIGURE.head.cy + body.shift.y * 0.5 + head.offsetY - head.forward * 3 + head.pitch * 0.25;
  return {
    cx,
    cy,
    rx: FIGURE.head.halfWidth * (1 - Math.abs(head.yaw) / 50 * 0.1),
    ry: FIGURE.head.halfHeight,
    roll: head.roll + pose.body.leanSide * 4,
    faceDx: -head.yaw * 0.26,
    faceDy: head.pitch * 0.13,
    squash: 1 - Math.abs(head.pitch) / 35 * 0.05,
  };
}

function buildHand(pose: RigPose, side: 'left' | 'right', wrist: Vec3, warnings: string[]): RenderHand {
  const state = side === 'right' ? pose.right : pose.left;
  const preset = getHandshape(state.handshape);
  if (!preset) warnings.push(`unknown handshape "${state.handshape}" — using the relaxed hand`);
  const spec = handshapeOf(state);
  const base = PALM_ANGLES[state.palm] ?? PALM_ANGLES.forward;
  const local = handLandmarksLocal(spec, side);
  const scale = FIGURE.palmWidth * (state.scale ?? 1);
  const landmarks = placeHand(
    local,
    { yaw: base.yaw + (state.palmYaw ?? 0), pitch: base.pitch + (state.palmPitch ?? 0), roll: state.roll },
    scale,
    wrist,
  );

  const bones: RenderHand['bones'] = [];
  const bone = (a: number, b: number, width: number) => {
    const pa = landmarks[a];
    const pb = landmarks[b];
    if (!pa || !pb) return;
    bones.push({ a, b, width, depth: (pa.z + pb.z) / 2 });
  };
  const thumbWidth = BONE_WIDTH.thumb * scale;
  bone(0, 1, thumbWidth);
  bone(1, 2, thumbWidth * 0.88);
  bone(2, 3, thumbWidth * 0.8);
  bone(3, 4, thumbWidth * 0.72);
  for (const { name, indices } of FINGER_CHAINS) {
    const width = BONE_WIDTH[name] * scale;
    bone(indices[0], indices[1], width);
    bone(indices[1], indices[2], width * 0.9);
    bone(indices[2], indices[3], width * 0.8);
  }

  const outlinePoints = [0, 1, 5, 9, 13, 17]
    .map((index) => landmarks[index])
    .filter((point): point is Vec3 => Boolean(point))
    .map((point) => ({ x: point.x, y: point.y }));

  const depth = landmarks.reduce((sum, point) => sum + point.z, 0) / landmarks.length;
  const tip = landmarks[12] ?? landmarks[0] ?? wrist;

  return {
    landmarks,
    bones,
    palmPath: roundedPolygonPath(outlinePoints, scale * 0.16),
    knuckles: [5, 9, 13, 17]
      .map((index) => landmarks[index])
      .filter((point): point is Vec3 => Boolean(point))
      .map((point) => ({ x: point.x, y: point.y, r: scale * 0.14 })),
    wrist: landmarks[0] ?? wrist,
    depth,
    tip,
  };
}

function armFor(solution: ReturnType<typeof solveArm>): RenderArm {
  return {
    shoulder: solution.shoulder,
    elbow: solution.elbow,
    wrist: solution.wrist,
    clamped: solution.clamped,
    clearance: solution.clearance,
  };
}

const round = (value: number) => Math.round(value * 100) / 100;

/** Build the complete render model for one instant. */
export function buildRenderPose(pose: RigPose): RenderPose {
  const warnings: string[] = [];
  const body = buildBody(pose);
  const head = buildHead(pose, body);

  const rightWrist = toStage(pose.right.wrist);
  const leftWrist = toStage(pose.left.wrist);

  const rightSolution = solveArm(body.shoulders.right, { x: rightWrist.x, y: rightWrist.y }, 1, rightWrist.z);
  const leftSolution = solveArm(body.shoulders.left, { x: leftWrist.x, y: leftWrist.y }, -1, leftWrist.z);

  // A couple of pixels of reach correction is rounding, not a problem worth a warning.
  const REACH_TOLERANCE_PX = 4;
  // A folded arm with the hand in front of the body folds partly towards the viewer,
  // which cannot be seen in a flat projection — that is not an authoring mistake.
  const reachWarning = (side: 'right' | 'left', solution: ReturnType<typeof solveArm>, depth: number) => {
    if (solution.clampDistance <= REACH_TOLERANCE_PX) return;
    if (solution.clampKind === 'fold' && depth > 0) return;
    const moved = Math.round(solution.clampDistance);
    warnings.push(
      solution.clampKind === 'fold'
        ? `${side} hand is closer to the shoulder than the elbow can fold — moved ${moved} px out`
        : `${side} hand target out of reach — moved ${moved} px`,
    );
  };
  reachWarning('right', rightSolution, rightWrist.z);
  reachWarning('left', leftSolution, leftWrist.z);
  // An elbow that overlaps the body silhouette is only wrong when the hand is *behind*
  // the body. With the hand in front (z > 0) the arm is drawn over the shirt, which is
  // exactly what a folded arm in front of the chest looks like.
  if (rightWrist.z <= 0 && elbowClearance(rightSolution) < -6) {
    warnings.push('right elbow passes through the torso');
  }
  if (leftWrist.z <= 0 && elbowClearance(leftSolution) < -6) {
    warnings.push('left elbow passes through the torso');
  }

  const rightHand = buildHand(pose, 'right', { ...rightSolution.wrist, z: rightWrist.z }, warnings);
  const leftHand = buildHand(pose, 'left', { ...leftSolution.wrist, z: leftWrist.z }, warnings);

  const allPoints = [...rightHand.landmarks, ...leftHand.landmarks];
  const xs = allPoints.map((point) => point.x);
  const ys = allPoints.map((point) => point.y);
  const pad = 14;

  return {
    rightHand,
    leftHand,
    rightArm: armFor(rightSolution),
    leftArm: armFor(leftSolution),
    face: { state: pose.face, geometry: faceGeometry(pose.face) },
    head,
    body,
    frontHand: rightHand.depth >= leftHand.depth ? 'right' : 'left',
    handsBounds: {
      x0: Math.min(...xs) - pad,
      y0: Math.min(...ys) - pad,
      x1: Math.max(...xs) + pad,
      y1: Math.max(...ys) + pad,
    },
    warnings,
  };
}

/** Convenience for previews and tests: resolve a handshape id and measure its reach. */
export function handExtent(handshapeId: string, side: 'left' | 'right' = 'right') {
  const local = handLandmarksLocal(resolveHandshape(handshapeId), side);
  const xs = local.map((point) => point.x);
  const ys = local.map((point) => point.y);
  return {
    widthPx: (Math.max(...xs) - Math.min(...xs)) * FIGURE.palmWidth,
    heightPx: (Math.max(...ys) - Math.min(...ys)) * FIGURE.palmWidth,
  };
}

export function stagePointOf(pose: RigPose, side: 'left' | 'right'): Vec2 {
  const wrist = toStage(side === 'right' ? pose.right.wrist : pose.left.wrist);
  return { x: wrist.x, y: wrist.y };
}
