/**
 * JSON validator for sign animations.
 *
 * The validator is deliberately strict and always explains *where* and *why*: every
 * issue carries a JSON path such as `tracks.rightHand[2].wrist[0]`. Importing a broken
 * file in the Studio shows these messages instead of failing silently.
 *
 * Errors stop playback; warnings are repaired by the rig (clamping) and still load.
 */
import type {
  BodyKeyframe,
  FaceKeyframe,
  FaceState,
  HandKeyframe,
  HeadKeyframe,
  SignAnimation,
  SignAnimationBundle,
} from '../../types/animation';
import { EASING_NAMES } from './easing';
import { getHandshape } from '../rig/handshapes';
import { PALM_ORIENTATIONS } from '../rig/anatomy';
import { FACE_KEYS } from '../rig/face';
import { EXPRESSIONS } from '../rig/face';

export interface ValidationIssue {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  /** Present when `ok` is true. */
  value?: SignAnimation;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const HEAD_KEYS = ['pitch', 'yaw', 'roll', 'forward', 'offsetX', 'offsetY'];
const BODY_KEYS = ['leanForward', 'leanSide', 'turn', 'shoulderRaiseL', 'shoulderRaiseR'];
const TRACK_NAMES = ['rightHand', 'leftHand', 'face', 'head', 'body'] as const;

class Checker {
  issues: ValidationIssue[] = [];

  error(path: string, message: string) {
    this.issues.push({ path, message, severity: 'error' });
  }

  warn(path: string, message: string) {
    this.issues.push({ path, message, severity: 'warning' });
  }

  numberIn(path: string, value: unknown, min: number, max: number, label: string) {
    if (!isFiniteNumber(value)) {
      this.error(path, `${label} must be a number, got ${describe(value)}`);
      return false;
    }
    if (value < min || value > max) {
      this.error(path, `${label} must be between ${min} and ${max}, got ${round(value)}`);
      return false;
    }
    return true;
  }

  easing(path: string, value: unknown) {
    if (value === undefined) return;
    if (typeof value !== 'string' || !EASING_NAMES.includes(value as never)) {
      this.error(
        path,
        `ease must be one of ${EASING_NAMES.join(', ')}; got ${describe(value)}`,
      );
    }
  }

  numericFields(path: string, key: Record<string, unknown>, allowed: string[], ranges?: Record<string, [number, number]>) {
    for (const [key2, value] of Object.entries(key)) {
      if (key2 === 't' || key2 === 'ease') continue;
      if (!allowed.includes(key2)) {
        this.warn(`${path}.${key2}`, `unknown parameter "${key2}" — ignored`);
        continue;
      }
      if (!isFiniteNumber(value)) {
        this.error(`${path}.${key2}`, `must be a number, got ${describe(value)}`);
        continue;
      }
      const range = ranges?.[key2];
      if (range && (value < range[0] || value > range[1])) {
        this.warn(`${path}.${key2}`, `${round(value)} is outside ${range[0]}..${range[1]} — will be clamped`);
      }
    }
  }

  handKeyframe(path: string, key: Record<string, unknown>) {
    this.numberIn(`${path}.t`, key.t, 0, 1, 't (normalized time)');
    if (key.handshape !== undefined) {
      if (typeof key.handshape !== 'string') {
        this.error(`${path}.handshape`, `must be a handshape id string, got ${describe(key.handshape)}`);
      } else if (!getHandshape(key.handshape)) {
        this.error(`${path}.handshape`, `unknown handshape "${key.handshape}" — not in the handshape library`);
      }
    }
    if (key.palm !== undefined && !PALM_ORIENTATIONS.includes(key.palm as never)) {
      this.error(
        `${path}.palm`,
        `palm must be one of ${PALM_ORIENTATIONS.join(', ')}; got ${describe(key.palm)}`,
      );
    }
    for (const [name, min, max] of [
      ['palmYaw', -180, 180],
      ['palmPitch', -90, 90],
      ['roll', -180, 180],
      ['scale', 0.7, 1.35],
    ] as const) {
      if (key[name] !== undefined && !this.numberIn(`${path}.${name}`, key[name], min, max, name)) {
        continue;
      }
    }
    if (key.wrist !== undefined) {
      if (!Array.isArray(key.wrist) || key.wrist.length !== 3) {
        this.error(`${path}.wrist`, 'wrist must be [x, y, z] with three numbers');
      } else {
        this.numberIn(`${path}.wrist[0]`, key.wrist[0], 0, 1, 'wrist x (0..1 across)');
        this.numberIn(`${path}.wrist[1]`, key.wrist[1], 0, 1, 'wrist y (0..1 down)');
        this.numberIn(`${path}.wrist[2]`, key.wrist[2], -1, 1, 'wrist z (−1..1 depth)');
      }
    }
    this.easing(`${path}.ease`, key.ease);
  }

  keyframeList(path: string, value: unknown, validator: (path: string, key: Record<string, unknown>) => void) {
    if (value === undefined) {
      this.error(path, 'track is missing — use an empty array [] for a track with no motion');
      return 0;
    }
    if (!Array.isArray(value)) {
      this.error(path, `track must be an array of keyframes, got ${describe(value)}`);
      return 0;
    }
    let previousT = -1;
    value.forEach((key, index) => {
      const keyPath = `${path}[${index}]`;
      if (!isObject(key)) {
        this.error(keyPath, `keyframe must be an object, got ${describe(key)}`);
        return;
      }
      validator(keyPath, key);
      if (isFiniteNumber(key.t)) {
        if (key.t < previousT) {
          this.error(`${keyPath}.t`, `keyframes must be in time order (${round(key.t)} comes after ${round(previousT)})`);
        } else if (Math.abs(key.t - previousT) < 1e-6 && previousT >= 0) {
          this.warn(`${keyPath}.t`, `duplicate time ${round(key.t)} — the later keyframe wins`);
        }
        previousT = key.t;
      }
    });
    return value.length;
  }
}

const describe = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `array(${value.length})`;
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') return 'object';
  return String(value);
};

const round = (value: number) => Math.round(value * 1000) / 1000;

/** Validate one animation object. */
export function validateAnimation(input: unknown, basePath = ''): ValidationResult {
  const checker = new Checker();
  const path = (suffix: string) => (basePath ? `${basePath}.${suffix}` : suffix);

  if (!isObject(input)) {
    return { ok: false, issues: [{ path: basePath || '$', message: `animation must be an object, got ${describe(input)}`, severity: 'error' }] };
  }

  if (typeof input.id !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/i.test(input.id)) {
    checker.error(path('id'), 'id must be a short slug such as "hello" or "demo-wave" (letters, numbers, - and _)');
  }
  if (input.label !== undefined && typeof input.label !== 'string') {
    checker.error(path('label'), 'label must be a string');
  }
  checker.numberIn(path('duration_ms'), input.duration_ms, 120, 60000, 'duration_ms');
  if (input.intensity !== undefined) {
    checker.numberIn(path('intensity'), input.intensity, 0.3, 2, 'intensity');
  }

  // ---- tracks ----
  let keyframes = 0;
  if (!isObject(input.tracks)) {
    checker.error(path('tracks'), 'tracks must be an object with rightHand, leftHand, face, head and body');
  } else {
    const tracks = input.tracks;
    for (const name of TRACK_NAMES) {
      if (!(name in tracks)) {
        checker.error(path(`tracks.${name}`), `"${name}" track is missing — use [] when the channel does not move`);
      }
    }
    if (tracks.rightHand !== undefined) {
      keyframes += checker.keyframeList(path('tracks.rightHand'), tracks.rightHand, (p, k) => checker.handKeyframe(p, k));
    }
    if (tracks.leftHand !== undefined) {
      keyframes += checker.keyframeList(path('tracks.leftHand'), tracks.leftHand, (p, k) => checker.handKeyframe(p, k));
    }
    if (tracks.face !== undefined) {
      keyframes += checker.keyframeList(path('tracks.face'), tracks.face, (p, k) =>
        checker.numericFields(p, k, FACE_KEYS),
      );
    }
    if (tracks.head !== undefined) {
      keyframes += checker.keyframeList(path('tracks.head'), tracks.head, (p, k) =>
        checker.numericFields(p, k, HEAD_KEYS, { pitch: [-35, 35], yaw: [-50, 50], roll: [-32, 32] }),
      );
    }
    if (tracks.body !== undefined) {
      keyframes += checker.keyframeList(path('tracks.body'), tracks.body, (p, k) =>
        checker.numericFields(p, k, BODY_KEYS, { leanForward: [-1, 1], leanSide: [-1, 1], turn: [-1, 1] }),
      );
    }
  }
  if (keyframes === 0) {
    checker.error(path('tracks'), 'animation has no keyframes — at least one channel needs a keyframe');
  }

  // ---- meta ----
  if (!isObject(input.meta)) {
    checker.error(path('meta'), 'meta is required (language, description, reviewed_by_deaf_signer)');
  } else {
    if (typeof input.meta.language !== 'string' || input.meta.language.trim() === '') {
      checker.error(path('meta.language'), 'meta.language must be a non-empty string such as "ISL"');
    }
    if (typeof input.meta.description !== 'string' || input.meta.description.trim() === '') {
      checker.error(path('meta.description'), 'meta.description must explain what the animation shows');
    }
    if (typeof input.meta.reviewed_by_deaf_signer !== 'boolean') {
      checker.error(
        path('meta.reviewed_by_deaf_signer'),
        'meta.reviewed_by_deaf_signer must be true or false — never claim review without it',
      );
    }
  }

  // ---- overlay ----
  if (input.nonManualOverlay !== undefined) {
    if (!isObject(input.nonManualOverlay)) {
      checker.error(path('nonManualOverlay'), 'nonManualOverlay must be an object');
    } else {
      const overlay = input.nonManualOverlay;
      if (overlay.expression !== undefined && typeof overlay.expression === 'string') {
        if (!EXPRESSIONS[overlay.expression]) {
          checker.error(
            path('nonManualOverlay.expression'),
            `unknown expression "${overlay.expression}" — use one of ${Object.keys(EXPRESSIONS).join(', ')}`,
          );
        }
      }
      if (overlay.weight !== undefined) {
        checker.numberIn(path('nonManualOverlay.weight'), overlay.weight, 0, 1, 'overlay weight');
      }
      if (overlay.groups !== undefined) {
        const groups = overlay.groups;
        const allowed = ['brows', 'eyes', 'cheeks', 'nose', 'mouth'];
        if (!Array.isArray(groups) || groups.some((g) => !allowed.includes(g as never))) {
          checker.error(path('nonManualOverlay.groups'), `groups must be an array of ${allowed.join(', ')}`);
        }
      }
    }
  }

  const ok = !checker.issues.some((issue) => issue.severity === 'error');
  return ok ? { ok, issues: checker.issues, value: input as unknown as SignAnimation } : { ok, issues: checker.issues };
}

/** Throws a readable error when the animation is invalid. */
export function parseAnimation(input: unknown): SignAnimation {
  const result = validateAnimation(input);
  if (!result.ok || !result.value) {
    throw new AnimationFormatError(result.issues);
  }
  return result.value;
}

export class AnimationFormatError extends Error {
  issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    const errors = issues.filter((issue) => issue.severity === 'error');
    super(`Invalid sign animation:\n${errors.map((issue) => `  · ${issue.path}: ${issue.message}`).join('\n')}`);
    this.name = 'AnimationFormatError';
    this.issues = errors;
  }
}

/** True when the input looks like a bundle rather than a single animation. */
export function isBundle(input: unknown): input is SignAnimationBundle {
  return isObject(input) && Array.isArray((input as Record<string, unknown>).animations);
}

/** Validate a bundle (or a single animation). */
export function validateAny(input: unknown): ValidationResult {
  if (isBundle(input)) {
    const checker = new Checker();
    input.animations.forEach((animation, index) => {
      const result = validateAnimation(animation, `animations[${index}]`);
      checker.issues.push(...result.issues);
    });
    const ok = !checker.issues.some((issue) => issue.severity === 'error');
    return ok ? { ok, issues: checker.issues } : { ok, issues: checker.issues };
  }
  return validateAnimation(input);
}

export function formatIssues(issues: ValidationIssue[]): string {
  return issues
    .map((issue) => `${issue.severity === 'error' ? '✕' : '!'} ${issue.path}: ${issue.message}`)
    .join('\n');
}

/** Type guards used by the Studio importer. */
export type { HandKeyframe, FaceKeyframe, HeadKeyframe, BodyKeyframe, FaceState };
