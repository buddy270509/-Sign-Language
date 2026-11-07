/**
 * Two-bone arm solver.
 *
 * "Put the wrist at this point" is all an animator should have to say. The solver returns
 * the shoulder, elbow and wrist, with:
 *   · reach clamping (the arm never stretches),
 *   · elbow flexion limits (10°–158°: no backward bending, no hyperextension),
 *   · a torso-collision preference so the elbow does not sit inside the body,
 *   · the natural "elbow low and out" preference.
 *
 * The elbow has two valid solutions for any wrist target (the arm is a two-link chain);
 * we choose the one that is outside the torso and lower, which is what a signer's arm
 * actually does.
 */
import type { Vec2 } from '../../types/animation';
import { clamp, FIGURE, LIMITS, torsoField } from './anatomy';

export interface ArmSolution {
  shoulder: Vec2;
  elbow: Vec2;
  wrist: Vec2;
  /** Interior angle at the elbow, degrees (180 = straight). */
  elbowAngle: number;
  /** True when the requested wrist target could not be reached as asked. */
  clamped: boolean;
  /**
   * Why the target was adjusted: 'reach' = too far, the arm is fully extended;
   * 'fold' = closer than the elbow can fold, so the hand is pushed out a little;
   * null = untouched.
   */
  clampKind: 'reach' | 'fold' | null;
  /** Distance the target was moved, in stage px (0 when untouched). */
  clampDistance: number;
  /** Torso field at the elbow: negative means the elbow overlaps the body silhouette. */
  clearance: number;
}

const L1 = FIGURE.upperArm;
const L2 = FIGURE.forearm;

// A straight arm (large interior angle) reaches furthest; a folded arm (small interior
// angle) reaches least. So the minimum reach comes from the most-flexed limit.
const MIN_REACH = Math.sqrt(
  L1 * L1 + L2 * L2 - 2 * L1 * L2 * Math.cos((LIMITS.elbow.minDeg * Math.PI) / 180),
);
const MAX_REACH = Math.sqrt(
  L1 * L1 + L2 * L2 - 2 * L1 * L2 * Math.cos((LIMITS.elbow.maxDeg * Math.PI) / 180),
);

export const ARM_REACH_LIMITS = { min: MIN_REACH, max: MAX_REACH };

/** Interior elbow angle (degrees) for a given shoulder→wrist distance. */
export function elbowAngleFor(distance: number): number {
  const d = clamp(distance, MIN_REACH, MAX_REACH);
  const cos = (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2);
  return (Math.acos(clamp(cos, -1, 1)) * 180) / Math.PI;
}

/**
 * @param outward +1 for the arm on the right of screen, −1 for the left.
 * @param depth    wrist depth, −1 (behind) … 1 (towards the viewer). A hand held in
 *                 front of the body can be closer to the shoulder in the flat
 *                 projection than a hand held at the side, because the forearm points
 *                 towards the camera. Without this every "raise the hand past the
 *                 shoulder" path would be clamped away from the body.
 */
export function solveArm(shoulder: Vec2, target: Vec2, outward: 1 | -1, depth = 0): ArmSolution {
  const dx = target.x - shoulder.x;
  const dy = target.y - shoulder.y;
  const rawDistance = Math.hypot(dx, dy) || 0.0001;
  const minReach = MIN_REACH * (1 - 0.8 * clamp(depth, 0, 1));
  const distance = clamp(rawDistance, minReach, MAX_REACH);
  const adjusted = Math.abs(distance - rawDistance) > 0.5;
  const clamped = adjusted;
  const clampKind: 'reach' | 'fold' | null = !adjusted
    ? null
    : rawDistance > MAX_REACH
      ? 'reach'
      : rawDistance < minReach
        ? 'fold'
        : 'reach';
  const ux = dx / rawDistance;
  const uy = dy / rawDistance;

  const wrist = { x: shoulder.x + ux * distance, y: shoulder.y + uy * distance };

  // A folded arm needs *depth* to fold into: the forearm points partly towards the
  // viewer, which a flat projection cannot show, so pure two-bone IK either throws the
  // elbow up beside the head or across the chest. Real arms keep the elbow low and out.
  // So: use the exact in-plane solution when the wrist is far (where it is correct) and
  // a fixed "elbow down and out" pole when the wrist is close, blending smoothly.
  const poleWeight = clamp((rawDistance - 60) / 80, 0, 1);

  const poleLength = Math.hypot(outward * 0.5, 1) || 1;
  const pole = {
    x: shoulder.x + ((outward * 0.5) / poleLength) * L1,
    y: shoulder.y + (1 / poleLength) * L1,
  };

  const a = (L1 * L1 - L2 * L2 + distance * distance) / (2 * distance);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const base = { x: shoulder.x + ux * a, y: shoulder.y + uy * a };
  const candidateA: Vec2 = { x: base.x - uy * h, y: base.y + ux * h };
  const candidateB: Vec2 = { x: base.x + uy * h, y: base.y - ux * h };

  const comfort = (elbow: Vec2) => {
    const headDistance = Math.hypot(elbow.x - FIGURE.head.cx, elbow.y - FIGURE.head.cy);
    const headPenalty = headDistance < 68 ? (68 - headDistance) * 1.4 : 0;
    return (elbow.y - shoulder.y) * 0.55 + (elbow.x - shoulder.x) * outward * 0.45 - headPenalty;
  };

  // Continuous pick between the two mirror solutions (a hard if/else pops the elbow
  // across the arm in a single frame).
  const preferA = torsoField(candidateA) * 2.2 + comfort(candidateA);
  const preferB = torsoField(candidateB) * 2.2 + comfort(candidateB);
  const weight = 0.5 + 0.5 * Math.tanh((preferA - preferB) / 110);
  const ikElbow = {
    x: candidateA.x * weight + candidateB.x * (1 - weight),
    y: candidateA.y * weight + candidateB.y * (1 - weight),
  };

  const blended = {
    x: ikElbow.x * poleWeight + pole.x * (1 - poleWeight),
    y: ikElbow.y * poleWeight + pole.y * (1 - poleWeight),
  };
  const blendLength = Math.hypot(blended.x - shoulder.x, blended.y - shoulder.y) || 1;
  const elbow: Vec2 = {
    x: shoulder.x + ((blended.x - shoulder.x) / blendLength) * L1,
    y: shoulder.y + ((blended.y - shoulder.y) / blendLength) * L1,
  };

  return {
    shoulder: { x: shoulder.x, y: shoulder.y },
    elbow,
    wrist,
    elbowAngle: elbowAngleFor(distance),
    clamped,
    clampKind,
    clampDistance: adjusted ? Math.abs(rawDistance - distance) : 0,
    clearance: torsoField(elbow),
  };
}

/** How far outside the torso the elbow ended up (negative = inside the body volume). */
export function elbowClearance(solution: ArmSolution): number {
  return solution.clearance;
}
