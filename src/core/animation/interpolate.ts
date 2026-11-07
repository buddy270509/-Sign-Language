/**
 * Track sampling.
 *
 * Each track is a list of sparse keyframes. Missing fields are forward-filled from the
 * previous keyframe (or from the neutral/base pose for the first one), so an author only
 * writes what changes — a head nod doesn't have to repeat the whole face.
 *
 * Sampling returns a fully resolved value for a normalized time `p` ∈ [0, 1].
 */
import type {
  BodyKeyframe,
  BodyState,
  EasingName,
  FaceKeyframe,
  FaceState,
  HandKeyframe,
  HandState,
  HeadKeyframe,
  HeadState,
} from '../../types/animation';
import { clamp } from '../rig/anatomy';
import { blendBody, blendHead, blendHand, lerp } from '../rig/pose';
import { ease } from './easing';

export interface Tick<T> {
  t: number;
  /** Easing of the segment that ends at this tick. */
  ease: EasingName;
  value: T;
}

const normalizeEase = (value: EasingName | undefined): EasingName => value ?? 'easeInOut';

/** Sort by time and drop duplicate timestamps (last one wins) so sampling is deterministic. */
export function sortKeyframes<T extends { t: number }>(keys: T[]): T[] {
  const sorted = keys
    .map((key) => ({ ...key, t: clamp(key.t, 0, 1) }))
    .sort((a, b) => a.t - b.t);
  const out: T[] = [];
  for (const key of sorted) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.t - key.t) < 1e-6) out[out.length - 1] = key;
    else out.push(key);
  }
  return out;
}

/**
 * Sample a sorted list of resolved ticks at `p`. Values outside the keyframe range hold
 * the nearest value (steady before the first key and after the last).
 */
export function sampleTicks<T>(
  ticks: Tick<T>[],
  p: number,
  lerpFn: (a: T, b: T, k: number) => T,
): T | null {
  if (ticks.length === 0) return null;
  const time = clamp(p, 0, 1);
  const first = ticks[0] as Tick<T>;
  if (time <= first.t) return first.value;
  const last = ticks[ticks.length - 1] as Tick<T>;
  if (time >= last.t) return last.value;

  for (let i = 0; i < ticks.length - 1; i += 1) {
    const a = ticks[i] as Tick<T>;
    const b = ticks[i + 1] as Tick<T>;
    if (time <= b.t) {
      const span = b.t - a.t;
      if (span <= 1e-6) return b.value;
      const k = ease(b.ease, (time - a.t) / span);
      return lerpFn(a.value, b.value, k);
    }
  }
  return last.value;
}

/* ------------------------------------------------------------------ *
 * Hand track
 * ------------------------------------------------------------------ */

export function resolveHandTrack(keys: HandKeyframe[], base: HandState): Tick<HandState>[] {
  const ticks: Tick<HandState>[] = [];
  let current: HandState = { ...base, wrist: [...base.wrist] as HandState['wrist'] };
  for (const key of sortKeyframes(keys)) {
    const next: HandState = {
      wrist: key.wrist
        ? ([key.wrist[0], key.wrist[1], key.wrist[2] ?? current.wrist[2] ?? 0] as HandState['wrist'])
        : current.wrist,
      handshape: key.handshape ?? current.handshape,
      palm: key.palm ?? current.palm,
      palmYaw: key.palmYaw ?? current.palmYaw ?? 0,
      palmPitch: key.palmPitch ?? current.palmPitch ?? 0,
      roll: key.roll ?? current.roll,
      scale: key.scale ?? current.scale ?? 1,
    };
    current = next;
    ticks.push({ t: clamp(key.t, 0, 1), ease: normalizeEase(key.ease), value: next });
  }
  return ticks;
}

/* ------------------------------------------------------------------ *
 * Face / head / body tracks
 * ------------------------------------------------------------------ */

type PartialTrack<S> = Array<{ t: number; ease: EasingName; value: S }>;

function resolvePartialTrack<K extends { t: number; ease?: EasingName }, S extends object>(
  keys: K[],
  base: S,
  pick: (key: K) => Partial<S>,
): PartialTrack<S> {
  let current = { ...base };
  const ticks: PartialTrack<S> = [];
  for (const key of sortKeyframes(keys)) {
    const patch = pick(key);
    const next = { ...current } as S;
    for (const k of Object.keys(patch) as Array<keyof S>) {
      const value = patch[k];
      if (typeof value === 'number' && !Number.isNaN(value)) next[k] = value as S[keyof S];
    }
    current = next;
    ticks.push({ t: clamp(key.t, 0, 1), ease: normalizeEase(key.ease), value: next });
  }
  return ticks;
}

export function resolveFaceTrack(keys: FaceKeyframe[], base: FaceState): Tick<FaceState>[] {
  return resolvePartialTrack(keys, base, (key) => {
    const { t: _t, ease: _ease, ...rest } = key;
    return rest;
  });
}

export function resolveHeadTrack(keys: HeadKeyframe[], base: HeadState): Tick<HeadState>[] {
  return resolvePartialTrack(keys, base, (key) => {
    const { t: _t, ease: _ease, ...rest } = key;
    return rest;
  });
}

export function resolveBodyTrack(keys: BodyKeyframe[], base: BodyState): Tick<BodyState>[] {
  return resolvePartialTrack(keys, base, (key) => {
    const { t: _t, ease: _ease, ...rest } = key;
    return rest;
  });
}

export const sampleHand = (ticks: Tick<HandState>[], p: number) => sampleTicks(ticks, p, blendHand);
export const sampleFace = (ticks: Tick<FaceState>[], p: number) => sampleTicks(ticks, p, blendFaceValues);
export const sampleHead = (ticks: Tick<HeadState>[], p: number) => sampleTicks(ticks, p, blendHead);
export const sampleBody = (ticks: Tick<BodyState>[], p: number) => sampleTicks(ticks, p, blendBody);

function blendFaceValues(a: FaceState, b: FaceState, k: number): FaceState {
  const out = { ...a };
  for (const key of Object.keys(a) as Array<keyof FaceState>) {
    out[key] = lerp(a[key], b[key], k);
  }
  return out;
}
