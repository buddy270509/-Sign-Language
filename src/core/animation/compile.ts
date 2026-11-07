/**
 * Compiler + layer stack.
 *
 *   JSON (SignAnimation) → ticks (resolved, per channel) → RigPose at time t
 *                                                          ↑
 *                                        non-manual overlay (expression + head motion)
 *
 * The overlay is applied *after* the sign's own tracks, and only to the channel groups it
 * is allowed to touch, so a sentence-level emotion never overwrites a sign's mouth shape.
 */
import type {
  BodyState,
  FaceGroup,
  FaceState,
  HandState,
  HeadMotion,
  HeadState,
  RigPose,
  SignAnimation,
} from '../../types/animation';
import { clamp01 } from '../rig/anatomy';
import { ALL_FACE_GROUPS, blendFace, EXPRESSIONS, FACE_GROUPS, OVERLAY_FACE_GROUPS } from '../rig/face';
import { clampPose, NEUTRAL_BODY, blendHead, blendBody, neutralPose } from '../rig/pose';
import {
  resolveBodyTrack,
  resolveFaceTrack,
  resolveHandTrack,
  resolveHeadTrack,
  sampleBody,
  sampleFace,
  sampleHand,
  sampleHead,
  type Tick,
} from './interpolate';

export interface CompiledAnimation {
  animation: SignAnimation;
  durationMs: number;
  hands: { right: Tick<HandState>[]; left: Tick<HandState>[] };
  face: Tick<FaceState>[];
  head: Tick<HeadState>[];
  body: Tick<BodyState>[];
  base: RigPose;
  /**
   * True when this animation sets a mouth shape itself. Sentence overlays then leave the
   * mouth alone, so an emotion never flattens a mouth morpheme.
   */
  usesMouth: boolean;
}

const MOUTH_KEYS = new Set<keyof FaceState>(FACE_GROUPS.mouth);

function usesMouthTrack(tracks: SignAnimation['tracks']): boolean {
  return (tracks.face ?? []).some((key) =>
    (Object.keys(key) as Array<keyof FaceState>).some((name) => MOUTH_KEYS.has(name)),
  );
}

/** Face groups an overlay may touch for this animation. */
export function overlayGroupsFor(compiled: CompiledAnimation, requested?: FaceGroup[]): FaceGroup[] {
  if (requested) return requested;
  return compiled.usesMouth ? OVERLAY_FACE_GROUPS : ALL_FACE_GROUPS;
}

export function compileAnimation(animation: SignAnimation, base: RigPose = neutralPose()): CompiledAnimation {
  const { tracks } = animation;
  return {
    animation,
    durationMs: Math.max(120, animation.duration_ms),
    hands: {
      right: resolveHandTrack(tracks.rightHand ?? [], base.right),
      left: resolveHandTrack(tracks.leftHand ?? [], base.left),
    },
    face: resolveFaceTrack(tracks.face ?? [], base.face),
    head: resolveHeadTrack(tracks.head ?? [], base.head),
    body: resolveBodyTrack(tracks.body ?? [], base.body),
    base,
    usesMouth: usesMouthTrack(tracks),
  };
}

/** Pose for a normalized progress value (0..1) of the compiled animation, before overlays. */
export function poseAtProgress(compiled: CompiledAnimation, progress: number): RigPose {
  const p = clamp01(progress);
  const base = compiled.base;
  return {
    right: sampleHand(compiled.hands.right, p) ?? base.right,
    left: sampleHand(compiled.hands.left, p) ?? base.left,
    face: sampleFace(compiled.face, p) ?? base.face,
    head: sampleHead(compiled.head, p) ?? base.head,
    body: sampleBody(compiled.body, p) ?? base.body,
  };
}

export function poseAtTime(compiled: CompiledAnimation, timeMs: number): RigPose {
  return poseAtProgress(compiled, timeMs / compiled.durationMs);
}

/* ------------------------------------------------------------------ *
 * Non-manual overlay
 * ------------------------------------------------------------------ */

export interface OverlaySettings {
  /** Expression preset id. */
  expression?: string;
  /** 0..1 — how strongly the expression is mixed in. */
  weight?: number;
  /** Which face groups the expression may touch (default: everything but the mouth). */
  groups?: FaceGroup[];
  /** Procedural head movement ridden on top of the head track. */
  headMotion?: HeadMotion;
  /** Amplitude of that head movement, 0..2. */
  headMotionAmount?: number;
  /** Global multiplier for the whole overlay (Studio slider). */
  strength?: number;
}

export const DEFAULT_OVERLAY: OverlaySettings = {
  expression: 'neutral',
  weight: 0,
  groups: OVERLAY_FACE_GROUPS,
  headMotion: 'none',
  headMotionAmount: 1,
  strength: 1,
};

/**
 * Procedural head movement. Always zero at progress 0 and 1 so a marker never causes a
 * jump at the sign boundary.
 */
export function headMotionOffset(
  motion: HeadMotion | undefined,
  progress: number,
  amount = 1,
): Partial<HeadState> {
  const p = clamp01(progress);
  const a = Math.max(0, amount);
  switch (motion) {
    case 'nod':
      return { pitch: Math.sin(p * Math.PI * 3) * 7 * a, offsetY: Math.sin(p * Math.PI * 3) * 2 * a };
    case 'nod-once':
      return { pitch: Math.sin(p * Math.PI) * 9 * a, offsetY: Math.sin(p * Math.PI) * 3 * a };
    case 'shake':
      return { yaw: Math.sin(p * Math.PI * 4) * 9 * a, offsetX: Math.sin(p * Math.PI * 4) * 3 * a };
    case 'shake-once':
      return { yaw: Math.sin(p * Math.PI) * 11 * a, offsetX: Math.sin(p * Math.PI) * 3 * a };
    case 'tilt':
      return { roll: Math.sin(p * Math.PI * 2) * 8 * a };
    default:
      return {};
  }
}

/** Apply a sentence-level overlay on top of a pose. */
export function applyOverlay(pose: RigPose, settings: OverlaySettings, progress: number): RigPose {
  const strength = settings.strength ?? 1;
  if (strength <= 0) return pose;
  const expression = settings.expression ? EXPRESSIONS[settings.expression] : undefined;
  const weight = clamp01((settings.weight ?? (expression ? 1 : 0)) * strength);
  const groups = settings.groups ?? OVERLAY_FACE_GROUPS;

  let face = pose.face;
  let head = pose.head;
  let body = pose.body;

  if (expression && weight > 0) {
    face = blendFace(face, expression.face, weight, groups);
    if (expression.head) {
      const patch: Partial<HeadState> = {};
      for (const [key, value] of Object.entries(expression.head)) {
        if (typeof value !== 'number') continue;
        const base = pose.head[key as keyof HeadState];
        patch[key as keyof HeadState] = base + (value - base) * weight;
      }
      head = blendHead(head, { ...head, ...patch }, 1);
    }
    if (expression.body) {
      const patch: Partial<BodyState> = {};
      for (const [key, value] of Object.entries(expression.body)) {
        if (typeof value !== 'number') continue;
        const base = pose.body[key as keyof BodyState];
        patch[key as keyof BodyState] = base + (value - base) * weight;
      }
      body = blendBody(body, { ...body, ...patch }, 1);
    }
  }

  const motion = headMotionOffset(
    settings.headMotion ?? expression?.headMotion,
    progress,
    (settings.headMotionAmount ?? 1) * strength,
  );
  head = {
    ...head,
    pitch: head.pitch + (motion.pitch ?? 0),
    yaw: head.yaw + (motion.yaw ?? 0),
    roll: head.roll + (motion.roll ?? 0),
    offsetX: head.offsetX + (motion.offsetX ?? 0),
    offsetY: head.offsetY + (motion.offsetY ?? 0),
  };

  return clampPose({ ...pose, face, head, body });
}

/** Merge two overlays, with `over` winning where it has values. */
export function mergeOverlay(base: OverlaySettings, over: OverlaySettings): OverlaySettings {
  return { ...base, ...over };
}

/* ------------------------------------------------------------------ *
 * Idle
 * ------------------------------------------------------------------ */

/**
 * Breathing, weight shift and a natural blink, used when nothing is queued.
 * Deterministic in `elapsedMs` so previews are reproducible.
 */
export function idlePose(elapsedMs: number): RigPose {
  const pose = neutralPose();
  const t = Math.max(0, elapsedMs) / 1000;
  const breathe = Math.sin(t * 1.1) * 0.5 + 0.5;
  const sway = Math.sin(t * 0.53);

  const blinkPeriod = 4.2;
  const phase = ((t % blinkPeriod) + blinkPeriod) % blinkPeriod;
  const blink = phase > 3.95 && phase < 4.15 ? Math.sin(((phase - 3.95) / 0.2) * Math.PI) : 0;

  const face: FaceState = {
    ...pose.face,
    blink,
    browRaiseL: 0.12 + breathe * 0.05,
    browRaiseR: 0.12 + breathe * 0.05,
    cheekRaise: 0.08 + breathe * 0.04,
  };

  return clampPose({
    right: { ...pose.right, wrist: [pose.right.wrist[0] + sway * 0.004, pose.right.wrist[1] - breathe * 0.004, pose.right.wrist[2] ?? 0] },
    left: { ...pose.left, wrist: [pose.left.wrist[0] + sway * 0.004, pose.left.wrist[1] - breathe * 0.004, pose.left.wrist[2] ?? 0] },
    face,
    head: {
      pitch: Math.sin(t * 0.7) * 1.5,
      yaw: sway * 3,
      roll: sway * 1.5,
      forward: 0,
      offsetX: sway * 1.5,
      offsetY: breathe * 1.2,
    },
    body: { ...NEUTRAL_BODY, leanSide: sway * 0.03, leanForward: breathe * 0.02 },
  });
}
