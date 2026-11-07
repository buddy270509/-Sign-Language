/**
 * Transition blender.
 *
 * Cutting straight from one sign's final pose to the next sign's first pose looks like a
 * teleport. Instead we cross-fade over a short, configurable window (150–250 ms by
 * default) *and* route the wrists along a slight arc, which is how a hand actually travels.
 */
import type { HandState, RigPose } from '../../types/animation';
import { clamp01, SIGN_SPACE } from '../rig/anatomy';
import { blendPose, clampPose } from '../rig/pose';
import { EASINGS } from './easing';

export const DEFAULT_TRANSITION_MS = 200;
export const MIN_TRANSITION_MS = 150;
export const MAX_TRANSITION_MS = 250;

export const clampTransitionMs = (value: number) =>
  Math.min(MAX_TRANSITION_MS, Math.max(MIN_TRANSITION_MS, Math.round(value)));

const SIGN_SPACE_HEIGHT = SIGN_SPACE.y1 - SIGN_SPACE.y0;

/** How far the hand lifts mid-transition, in normalized units. */
function arcLift(from: HandState, to: HandState): number {
  const dx = (to.wrist[0] - from.wrist[0]) * (SIGN_SPACE.x1 - SIGN_SPACE.x0);
  const dy = (to.wrist[1] - from.wrist[1]) * SIGN_SPACE_HEIGHT;
  const distance = Math.hypot(dx, dy);
  return Math.min(0.05, (distance * 0.00022));
}

/**
 * @param progress 0 = fully `from`, 1 = fully `to`.
 */
export function transitionPose(from: RigPose, to: RigPose, progress: number): RigPose {
  const p = clamp01(progress);
  const eased = EASINGS.easeInOut(p);
  const blended = blendPose(from, to, eased);

  // Natural hand path: lift the wrist mid-way, never beyond the signing space.
  const lift = Math.sin(Math.PI * eased);
  const arcHand = (a: HandState, b: HandState, hand: HandState): HandState => {
    if (lift <= 0.0001) return hand;
    const amount = arcLift(a, b) * lift;
    return { ...hand, wrist: [hand.wrist[0], clamp01(hand.wrist[1] - amount), hand.wrist[2] ?? 0] };
  };

  return clampPose({
    ...blended,
    right: arcHand(from.right, to.right, blended.right),
    left: arcHand(from.left, to.left, blended.left),
  });
}

/** True when a transition is long enough to be perceivable. */
export function isTransitionActive(elapsedMs: number, durationMs: number): boolean {
  return elapsedMs < durationMs;
}
