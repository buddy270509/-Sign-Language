/**
 * Pose algebra: the neutral figure, blending, mirroring, intensity.
 *
 * A `RigPose` is the complete state of all five channels at one instant. Everything the
 * animation engine produces is a RigPose, and everything the renderer consumes is a
 * RigPose — that is the contract that keeps drawing code swappable.
 */
import type {
  BodyState,
  FingerJoints,
  FingerName,
  HandState,
  HandshapeSpec,
  HeadState,
  RigPose,
  ThumbJoints,
} from '../../types/animation';
import { clamp, clamp01 } from './anatomy';
import { clampFace, NEUTRAL_FACE } from './face';
import { resolveHandshape } from './handshapes';
import { FINGERS } from './hand';

export const NEUTRAL_HEAD: HeadState = {
  pitch: 0,
  yaw: 0,
  roll: 0,
  forward: 0,
  offsetX: 0,
  offsetY: 0,
};

export const NEUTRAL_BODY: BodyState = {
  leanForward: 0,
  leanSide: 0,
  turn: 0,
  shoulderRaiseL: 0,
  shoulderRaiseR: 0,
};

/** Hands hanging at the sides, palms inward. Wrist positions are in signing space. */
export const REST_RIGHT: HandState = {
  wrist: [0.776, 0.962, 0.1],
  handshape: 'relaxed',
  palm: 'left',
  palmYaw: 0,
  palmPitch: 0,
  roll: 168,
  scale: 1,
};

export const REST_LEFT: HandState = {
  wrist: [0.224, 0.962, 0.1],
  handshape: 'relaxed',
  palm: 'right',
  palmYaw: 0,
  palmPitch: 0,
  roll: -168,
  scale: 1,
};

/** Where a signing hand starts: chest height, in front of the body, dominant side. */
export const SIGNING_RIGHT: HandState = {
  wrist: [0.613, 0.504, 0.25],
  handshape: 'relaxed',
  palm: 'left',
  palmYaw: 0,
  palmPitch: 0,
  roll: 0,
  scale: 1,
};

export const SIGNING_LEFT: HandState = {
  wrist: [0.388, 0.504, 0.25],
  handshape: 'relaxed',
  palm: 'right',
  palmYaw: 0,
  palmPitch: 0,
  roll: 0,
  scale: 1,
};

export function neutralPose(): RigPose {
  return {
    right: { ...REST_RIGHT, wrist: [...REST_RIGHT.wrist] },
    left: { ...REST_LEFT, wrist: [...REST_LEFT.wrist] },
    face: { ...NEUTRAL_FACE },
    head: { ...NEUTRAL_HEAD },
    body: { ...NEUTRAL_BODY },
  };
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Shortest-path angular interpolation, so 179° → −179° goes 2° and not 358°. */
export function lerpAngle(a: number, b: number, t: number): number {
  const delta = ((((b - a) % 360) + 540) % 360) - 180;
  return a + delta * t;
}

export function lerpFinger(a: FingerJoints, b: FingerJoints, t: number): FingerJoints {
  return {
    mcp: lerp(a.mcp, b.mcp, t),
    pip: lerp(a.pip, b.pip, t),
    dip: lerp(a.dip, b.dip, t),
    spread: lerp(a.spread, b.spread, t),
  };
}

export function lerpThumb(a: ThumbJoints, b: ThumbJoints, t: number): ThumbJoints {
  return {
    cmc: lerp(a.cmc, b.cmc, t),
    mcp: lerp(a.mcp, b.mcp, t),
    ip: lerp(a.ip, b.ip, t),
    spread: lerp(a.spread, b.spread, t),
  };
}

export function lerpHandshape(a: HandshapeSpec, b: HandshapeSpec, t: number): HandshapeSpec {
  const fingers = {} as Record<FingerName, FingerJoints>;
  for (const finger of FINGERS) {
    fingers[finger] = lerpFinger(a.fingers[finger], b.fingers[finger], t);
  }
  return { fingers, thumb: lerpThumb(a.thumb, b.thumb, t) };
}

export function handshapeOf(hand: HandState): HandshapeSpec {
  return hand.handshapeOverride ?? resolveHandshape(hand.handshape);
}

/** Blend two hand states, including their handshape joint angles. */
export function blendHand(a: HandState, b: HandState, t: number): HandState {
  const specA = handshapeOf(a);
  const specB = handshapeOf(b);
  const sameShape = a.handshape === b.handshape && !a.handshapeOverride && !b.handshapeOverride;
  return {
    wrist: [
      lerp(a.wrist[0], b.wrist[0], t),
      lerp(a.wrist[1], b.wrist[1], t),
      lerp(a.wrist[2] ?? 0, b.wrist[2] ?? 0, t),
    ],
    handshape: t < 0.5 ? a.handshape : b.handshape,
    handshapeOverride: sameShape ? undefined : lerpHandshape(specA, specB, t),
    palm: t < 0.5 ? a.palm : b.palm,
    palmYaw: lerpAngle(a.palmYaw ?? 0, b.palmYaw ?? 0, t),
    palmPitch: lerp(a.palmPitch ?? 0, b.palmPitch ?? 0, t),
    roll: lerpAngle(a.roll, b.roll, t),
    scale: lerp(a.scale ?? 1, b.scale ?? 1, t),
  };
}

export function blendHead(a: HeadState, b: HeadState, t: number): HeadState {
  return {
    pitch: lerp(a.pitch, b.pitch, t),
    yaw: lerpAngle(a.yaw, b.yaw, t),
    roll: lerpAngle(a.roll, b.roll, t),
    forward: lerp(a.forward, b.forward, t),
    offsetX: lerp(a.offsetX, b.offsetX, t),
    offsetY: lerp(a.offsetY, b.offsetY, t),
  };
}

export function blendBody(a: BodyState, b: BodyState, t: number): BodyState {
  return {
    leanForward: lerp(a.leanForward, b.leanForward, t),
    leanSide: lerp(a.leanSide, b.leanSide, t),
    turn: lerp(a.turn, b.turn, t),
    shoulderRaiseL: lerp(a.shoulderRaiseL, b.shoulderRaiseL, t),
    shoulderRaiseR: lerp(a.shoulderRaiseR, b.shoulderRaiseR, t),
  };
}

export function blendPose(a: RigPose, b: RigPose, t: number): RigPose {
  const k = clamp01(t);
  const face = { ...a.face };
  for (const key of Object.keys(face) as Array<keyof typeof face>) {
    face[key] = lerp(a.face[key], b.face[key], k);
  }
  return {
    right: blendHand(a.right, b.right, k),
    left: blendHand(a.left, b.left, k),
    face: clampFace(face),
    head: blendHead(a.head, b.head, k),
    body: blendBody(a.body, b.body, k),
  };
}

/** Mirror the whole figure: swap hands and negate the lateral channels. */
export function mirrorHand(hand: HandState): HandState {
  const palm = hand.palm === 'left' ? 'right' : hand.palm === 'right' ? 'left' : hand.palm;
  return {
    ...hand,
    wrist: [1 - hand.wrist[0], hand.wrist[1], hand.wrist[2] ?? 0],
    palm,
    palmYaw: -(hand.palmYaw ?? 0),
    palmPitch: hand.palmPitch ?? 0,
    roll: -hand.roll,
  };
}

export function mirrorPose(pose: RigPose): RigPose {
  const { face } = pose;
  return {
    right: mirrorHand(pose.left),
    left: mirrorHand(pose.right),
    face: {
      ...face,
      browRaiseL: face.browRaiseR,
      browRaiseR: face.browRaiseL,
      browFurrowL: face.browFurrowR,
      browFurrowR: face.browFurrowL,
      eyeOpenL: face.eyeOpenR,
      eyeOpenR: face.eyeOpenL,
      gazeX: -face.gazeX,
    },
    head: { ...pose.head, yaw: -pose.head.yaw, roll: -pose.head.roll, offsetX: -pose.head.offsetX },
    body: {
      ...pose.body,
      leanSide: -pose.body.leanSide,
      turn: -pose.body.turn,
      shoulderRaiseL: pose.body.shoulderRaiseR,
      shoulderRaiseR: pose.body.shoulderRaiseL,
    },
  };
}

/** Amplify a pose's movement around the signing centre. 1 = unchanged. */
export function applyIntensity(pose: RigPose, amount: number): RigPose {
  const k = clamp(amount, 0.3, 2);
  if (Math.abs(k - 1) < 0.001) return pose;
  const cx = 0.5;
  const cy = 0.55;
  const amplify = (hand: HandState): HandState => ({
    ...hand,
    wrist: [cx + (hand.wrist[0] - cx) * k, cy + (hand.wrist[1] - cy) * k, hand.wrist[2] ?? 0],
    roll: hand.roll * k,
  });
  return {
    right: amplify(pose.right),
    left: amplify(pose.left),
    face: pose.face,
    head: {
      ...pose.head,
      pitch: pose.head.pitch * k,
      yaw: pose.head.yaw * k,
      roll: pose.head.roll * k,
      offsetX: pose.head.offsetX * k,
      offsetY: pose.head.offsetY * k,
    },
    body: {
      leanForward: pose.body.leanForward * k,
      leanSide: pose.body.leanSide * k,
      turn: pose.body.turn * k,
      shoulderRaiseL: pose.body.shoulderRaiseL * k,
      shoulderRaiseR: pose.body.shoulderRaiseR * k,
    },
  };
}

/** Clamp every channel into its legal range. Called once per frame, before rendering. */
export function clampPose(pose: RigPose): RigPose {
  const clampHand = (hand: HandState): HandState => ({
    ...hand,
    wrist: [clamp01(hand.wrist[0]), clamp01(hand.wrist[1]), clamp(hand.wrist[2] ?? 0, -1, 1)],
    roll: clamp(hand.roll, -180, 180),
    scale: clamp(hand.scale ?? 1, 0.7, 1.35),
  });
  return {
    right: clampHand(pose.right),
    left: clampHand(pose.left),
    face: clampFace(pose.face),
    head: {
      pitch: clamp(pose.head.pitch, -35, 35),
      yaw: clamp(pose.head.yaw, -50, 50),
      roll: clamp(pose.head.roll, -32, 32),
      forward: clamp(pose.head.forward, -1, 1),
      offsetX: clamp(pose.head.offsetX, -24, 24),
      offsetY: clamp(pose.head.offsetY, -24, 24),
    },
    body: {
      leanForward: clamp(pose.body.leanForward, -1, 1),
      leanSide: clamp(pose.body.leanSide, -1, 1),
      turn: clamp(pose.body.turn, -1, 1),
      shoulderRaiseL: clamp(pose.body.shoulderRaiseL, -1, 1),
      shoulderRaiseR: clamp(pose.body.shoulderRaiseR, -1, 1),
    },
  };
}

/**
 * Cheap structural key for memoising renders. Two poses with the same key draw identically.
 */
export function poseKey(pose: RigPose): string {
  const h = (hand: HandState) =>
    `${hand.handshape}|${[hand.wrist[0], hand.wrist[1], hand.wrist[2]].map((v) => (v ?? 0).toFixed(4)).join(',')}|${hand.roll.toFixed(2)}|${hand.palm}|${(hand.palmYaw ?? 0).toFixed(2)}|${(hand.palmPitch ?? 0).toFixed(2)}|${(hand.scale ?? 1).toFixed(2)}|${hand.handshapeOverride ? handshapesKey(hand.handshapeOverride) : '-'}`;
  return [
    h(pose.right),
    h(pose.left),
    Object.values(pose.face).map((v) => v.toFixed(3)).join(','),
    `${pose.head.pitch.toFixed(2)},${pose.head.yaw.toFixed(2)},${pose.head.roll.toFixed(2)},${pose.head.forward.toFixed(2)},${pose.head.offsetX.toFixed(2)},${pose.head.offsetY.toFixed(2)}`,
    `${pose.body.leanForward.toFixed(2)},${pose.body.leanSide.toFixed(2)},${pose.body.turn.toFixed(2)},${pose.body.shoulderRaiseL.toFixed(2)},${pose.body.shoulderRaiseR.toFixed(2)}`,
  ].join('~');
}

function handshapesKey(spec: HandshapeSpec): string {
  return FINGERS.map((f) => {
    const j = spec.fingers[f];
    return `${j.mcp.toFixed(1)}/${j.pip.toFixed(1)}/${j.dip.toFixed(1)}/${j.spread.toFixed(2)}`;
  })
    .concat(`${spec.thumb.cmc.toFixed(1)}/${spec.thumb.mcp.toFixed(1)}/${spec.thumb.ip.toFixed(1)}/${spec.thumb.spread.toFixed(2)}`)
    .join('/');
}
