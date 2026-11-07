/**
 * Easing curves.
 *
 * All five are monotonic (no overshoot). That is deliberate: an overshooting curve can
 * push a joint past its limit for a frame, which reads as a snap. Snappy is a fast-out
 * curve instead of a spring for the same reason.
 */
import type { EasingName } from '../../types/animation';
import { clamp01 } from '../rig/anatomy';

export type EasingFn = (t: number) => number;

export const EASINGS: Record<EasingName, EasingFn> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
  snappy: (t) => 1 - Math.pow(1 - t, 4),
};

export const EASING_NAMES: EasingName[] = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'snappy'];

export function ease(name: EasingName | undefined, t: number): number {
  const fn = EASINGS[(name ?? 'easeInOut') as EasingName] ?? EASINGS.easeInOut;
  return fn(clamp01(t));
}

export function isEasingName(value: unknown): value is EasingName {
  return typeof value === 'string' && value in EASINGS;
}
