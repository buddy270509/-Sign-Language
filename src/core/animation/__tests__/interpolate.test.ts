import { describe, expect, it } from 'vitest';
import {
  resolveFaceTrack,
  resolveHandTrack,
  sampleFace,
  sampleHand,
  sampleTicks,
  sortKeyframes,
} from '../interpolate';
import { REST_RIGHT, blendPose, lerpAngle, neutralPose } from '../../rig/pose';
import { NEUTRAL_FACE } from '../../rig/face';
import type { EasingName, FaceState, HandKeyframe } from '../../../types/animation';

describe('sortKeyframes', () => {
  it('sorts by time and keeps the last value for duplicate timestamps', () => {
    const sorted = sortKeyframes([
      { t: 0.5, label: 'b' },
      { t: 0, label: 'a' },
      { t: 0.5, label: 'c' },
    ]);
    expect(sorted.map((key) => key.label)).toEqual(['a', 'c']);
  });

  it('clamps times into 0..1', () => {
    const sorted = sortKeyframes([{ t: 2 }, { t: -1 }]);
    expect(sorted.map((key) => key.t)).toEqual([0, 1]);
  });
});

describe('sampleTicks', () => {
  type NumberTick = { t: number; ease: EasingName; value: number };
  const lerpNumber = (a: number, b: number, k: number) => a + (b - a) * k;
  const ticks: NumberTick[] = [
    { t: 0, ease: 'linear', value: 0 },
    { t: 1, ease: 'linear', value: 10 },
  ];

  it('holds the first and last values outside the range', () => {
    expect(sampleTicks(ticks, -0.5, lerpNumber)).toBe(0);
    expect(sampleTicks(ticks, 2, lerpNumber)).toBe(10);
  });

  it('interpolates linearly between ticks', () => {
    expect(sampleTicks(ticks, 0.5, lerpNumber)).toBeCloseTo(5, 6);
  });

  it('applies the easing of the segment that ends at the later keyframe', () => {
    const eased: NumberTick[] = [
      { t: 0, ease: 'linear', value: 0 },
      { t: 1, ease: 'easeIn', value: 10 },
    ];
    expect(sampleTicks(eased, 0.5, lerpNumber)).toBeCloseTo(2.5, 6);
  });

  it('returns null for an empty track', () => {
    expect(sampleTicks([], 0.4, lerpNumber)).toBeNull();
  });
});

describe('hand tracks', () => {
  it('forward-fills missing fields from the previous keyframe', () => {
    const keys: HandKeyframe[] = [
      { t: 0, handshape: 'fist', roll: 10, wrist: [0.5, 0.5, 0] },
      { t: 0.5, wrist: [0.6, 0.5, 0] },
      { t: 1, handshape: 'flat' },
    ];
    const ticks = resolveHandTrack(keys, REST_RIGHT);
    expect(ticks[1]?.value.handshape).toBe('fist');
    expect(ticks[1]?.value.roll).toBe(10);
    expect(ticks[2]?.value.handshape).toBe('flat');
    expect(ticks[2]?.value.wrist[0]).toBeCloseTo(0.6, 6);
  });

  it('takes the angles of the shortest path between rotations', () => {
    const keys: HandKeyframe[] = [
      { t: 0, roll: 170, wrist: [0.5, 0.5, 0] },
      { t: 1, roll: -170, ease: 'linear' },
    ];
    const ticks = resolveHandTrack(keys, REST_RIGHT);
    const mid = sampleHand(ticks, 0.5);
    // 170 -> -170 must pass through 180, i.e. it keeps growing past 175, not fall back to 0.
    expect(Math.abs(mid?.roll ?? 0)).toBeGreaterThan(175);
  });

  it('falls back to the base pose when the track is empty', () => {
    expect(resolveHandTrack([], REST_RIGHT)).toHaveLength(0);
  });
});

describe('face tracks', () => {
  it('only overrides the parameters a keyframe mentions', () => {
    const ticks = resolveFaceTrack([{ t: 0, mouthSmile: 0.9 }], NEUTRAL_FACE);
    const value = sampleFace(ticks, 0) as FaceState;
    expect(value.mouthSmile).toBe(0.9);
    expect(value.browRaiseL).toBe(NEUTRAL_FACE.browRaiseL);
  });
});

describe('lerpAngle', () => {
  it('takes the short way round', () => {
    expect(lerpAngle(10, 20, 0.5)).toBeCloseTo(15, 6);
    expect(lerpAngle(170, -170, 0.5)).toBeCloseTo(180, 6);
    expect(Math.abs(lerpAngle(-170, 170, 0.5))).toBeCloseTo(180, 6);
  });
});

describe('blendPose', () => {
  it('returns the start pose at 0 and the end pose at 1', () => {
    const a = neutralPose();
    const b = {
      ...neutralPose(),
      right: { ...neutralPose().right, wrist: [0.9, 0.2, 0.5] as [number, number, number] },
      head: { ...neutralPose().head, yaw: 20 },
    };
    const start = blendPose(a, b, 0);
    const end = blendPose(a, b, 1);
    expect(start.right.wrist[0]).toBeCloseTo(a.right.wrist[0], 6);
    expect(end.right.wrist[0]).toBeCloseTo(0.9, 6);
    expect(end.head.yaw).toBeCloseTo(20, 6);
  });
});
