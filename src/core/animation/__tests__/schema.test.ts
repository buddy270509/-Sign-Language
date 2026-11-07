import { describe, expect, it } from 'vitest';
import { AnimationFormatError, parseAnimation, validateAnimation, validateAny } from '../schema';
import { HANDSHAPES } from '../../rig/handshapes';

const valid = {
  id: 'test-sign',
  label: 'Test',
  duration_ms: 1200,
  tracks: {
    rightHand: [
      { t: 0, handshape: 'flat', palm: 'forward', roll: 0, wrist: [0.6, 0.5, 0.3], ease: 'easeOut' },
      { t: 1, wrist: [0.6, 0.6, 0.3] },
    ],
    leftHand: [],
    face: [{ t: 0, mouthSmile: 0.4 }],
    head: [{ t: 0, pitch: 4 }],
    body: [{ t: 0, leanForward: 0.1 }],
  },
  meta: { language: 'ISL', description: 'A test animation.', reviewed_by_deaf_signer: false },
};

const clone = () => JSON.parse(JSON.stringify(valid));
const errorPaths = (input: unknown) =>
  validateAnimation(input)
    .issues.filter((issue) => issue.severity === 'error')
    .map((issue) => issue.path);

describe('validateAnimation', () => {
  it('accepts a well-formed animation', () => {
    const result = validateAnimation(valid);
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('rejects a non-object with a path', () => {
    expect(errorPaths('nope')).toContain('$');
  });

  it('requires an id and a duration', () => {
    const input = clone();
    delete input.id;
    input.duration_ms = 10;
    const paths = errorPaths(input);
    expect(paths).toContain('id');
    expect(paths).toContain('duration_ms');
  });

  it('rejects an unknown handshape and says which one', () => {
    const input = clone();
    input.tracks.rightHand[0].handshape = 'not-a-shape';
    const result = validateAnimation(input);
    expect(result.ok).toBe(false);
    const issue = result.issues.find((entry) => entry.path === 'tracks.rightHand[0].handshape');
    expect(issue?.message).toContain('not-a-shape');
  });

  it('accepts every handshape that ships', () => {
    for (const preset of HANDSHAPES) {
      const input = clone();
      input.tracks.rightHand[0].handshape = preset.id;
      expect(validateAnimation(input).ok, preset.id).toBe(true);
    }
  });

  it('rejects a wrist that is not three numbers', () => {
    const input = clone();
    input.tracks.rightHand[0].wrist = [0.5, 0.5];
    expect(errorPaths(input)).toContain('tracks.rightHand[0].wrist');
  });

  it('rejects a normalized time outside 0..1', () => {
    const input = clone();
    input.tracks.rightHand[1].t = 1.4;
    expect(errorPaths(input)).toContain('tracks.rightHand[1].t');
  });

  it('rejects keyframes that are out of order', () => {
    const input = clone();
    input.tracks.rightHand[0].t = 0.8;
    input.tracks.rightHand[1].t = 0.2;
    const result = validateAnimation(input);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes('time order'))).toBe(true);
  });

  it('rejects an unknown easing', () => {
    const input = clone();
    input.tracks.rightHand[0].ease = 'spring';
    expect(errorPaths(input)).toContain('tracks.rightHand[0].ease');
  });

  it('requires all five tracks to be present', () => {
    const input = clone();
    delete (input.tracks as Record<string, unknown>).body;
    expect(errorPaths(input)).toContain('tracks.body');
  });

  it('requires meta and an explicit review flag', () => {
    const input = clone();
    delete (input.meta as Record<string, unknown>).reviewed_by_deaf_signer;
    expect(errorPaths(input)).toContain('meta.reviewed_by_deaf_signer');
  });

  it('rejects an animation with no keyframes at all', () => {
    const input = clone();
    input.tracks = { rightHand: [], leftHand: [], face: [], head: [], body: [] };
    expect(errorPaths(input)).toContain('tracks');
  });

  it('warns about unknown face parameters but still loads', () => {
    const input = clone();
    input.tracks.face[0].eyebrowWiggle = 1;
    const result = validateAnimation(input);
    expect(result.ok).toBe(true);
    expect(result.issues.some((issue) => issue.severity === 'warning')).toBe(true);
  });

  it('rejects an unknown overlay expression', () => {
    const input = clone();
    input.nonManualOverlay = { expression: 'sarcastic', weight: 1 };
    const result = validateAnimation(input);
    expect(result.issues.some((issue) => issue.path === 'nonManualOverlay.expression')).toBe(true);
  });

  it('validates inside a bundle with indexed paths', () => {
    const result = validateAny({ meta: { name: 'x', language: 'ISL' }, animations: [valid, { id: 'bad' }] });
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.path.startsWith('animations[1]'))).toBe(true);
  });
});

describe('parseAnimation', () => {
  it('throws a readable error listing every problem', () => {
    const input = clone();
    input.id = 'Bad Id!';
    input.duration_ms = -5;
    expect(() => parseAnimation(input)).toThrow(AnimationFormatError);
    try {
      parseAnimation(input);
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('id');
      expect(message).toContain('duration_ms');
    }
  });

  it('returns the animation when it is valid', () => {
    expect(parseAnimation(valid).id).toBe('test-sign');
  });
});
