import { describe, expect, it } from 'vitest';
import { clampTransitionMs, DEFAULT_TRANSITION_MS, MAX_TRANSITION_MS, MIN_TRANSITION_MS, transitionPose } from '../transition';
import { mirrorPose, neutralPose } from '../../rig/pose';
import type { RigPose } from '../../../types/animation';

const poseA = (): RigPose => ({
  ...neutralPose(),
  right: { ...neutralPose().right, wrist: [0.3, 0.7, 0.2], roll: 10 },
  left: { ...neutralPose().left, wrist: [0.7, 0.7, 0.2], roll: -10 },
  head: { ...neutralPose().head, yaw: -10 },
});

const poseB = (): RigPose => ({
  ...neutralPose(),
  right: { ...neutralPose().right, wrist: [0.7, 0.3, 0.4], roll: 40 },
  left: { ...neutralPose().left, wrist: [0.3, 0.3, 0.4], roll: -40 },
  head: { ...neutralPose().head, yaw: 10 },
});

describe('transitionPose', () => {
  it('returns the start pose at 0 and the end pose at 1', () => {
    const a = poseA();
    const b = poseB();
    const start = transitionPose(a, b, 0);
    const end = transitionPose(a, b, 1);
    expect(start.right.wrist[0]).toBeCloseTo(a.right.wrist[0], 5);
    expect(end.right.wrist[0]).toBeCloseTo(b.right.wrist[0], 5);
    expect(end.head.yaw).toBeCloseTo(b.head.yaw, 5);
  });

  it('moves the wrist along an arc instead of a straight line', () => {
    const a = poseA();
    const b = poseB();
    const mid = transitionPose(a, b, 0.5);
    const straightY = (a.right.wrist[1] + b.right.wrist[1]) / 2;
    // The arc lifts the hand, i.e. a smaller y (up the stage) than the straight line.
    expect(mid.right.wrist[1]).toBeLessThan(straightY);
    expect(mid.right.wrist[1]).toBeGreaterThanOrEqual(0);
  });

  it('is continuous: nearby progress values produce nearby poses', () => {
    const a = poseA();
    const b = poseB();
    let previous = transitionPose(a, b, 0);
    for (let step = 1; step <= 20; step += 1) {
      const current = transitionPose(a, b, step / 20);
      const jump = Math.hypot(
        current.right.wrist[0] - previous.right.wrist[0],
        current.right.wrist[1] - previous.right.wrist[1],
      );
      expect(jump).toBeLessThan(0.08);
      previous = current;
    }
  });

  it('clamps progress outside 0..1', () => {
    const a = poseA();
    const b = poseB();
    expect(transitionPose(a, b, -1).right.wrist[0]).toBeCloseTo(a.right.wrist[0], 5);
    expect(transitionPose(a, b, 2).right.wrist[0]).toBeCloseTo(b.right.wrist[0], 5);
  });

  it('keeps the wrapper pose inside the signing space', () => {
    const a = poseA();
    const b = poseB();
    for (let step = 0; step <= 10; step += 1) {
      const pose = transitionPose(a, b, step / 10);
      for (const hand of [pose.right, pose.left]) {
        expect(hand.wrist[0]).toBeGreaterThanOrEqual(0);
        expect(hand.wrist[1]).toBeGreaterThanOrEqual(0);
        expect(hand.wrist[1]).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('transition duration', () => {
  it('defaults to 200 ms and clamps into the documented window', () => {
    expect(DEFAULT_TRANSITION_MS).toBe(200);
    expect(clampTransitionMs(10)).toBe(MIN_TRANSITION_MS);
    expect(clampTransitionMs(9000)).toBe(MAX_TRANSITION_MS);
    expect(clampTransitionMs(180)).toBe(180);
  });
});

describe('mirroring', () => {
  it('swaps the hands and flips the lateral channels', () => {
    const pose = poseA();
    const mirrored = mirrorPose(pose);
    expect(mirrored.right.wrist[0]).toBeCloseTo(1 - pose.left.wrist[0], 6);
    expect(mirrored.left.wrist[0]).toBeCloseTo(1 - pose.right.wrist[0], 6);
    expect(mirrored.head.yaw).toBeCloseTo(-pose.head.yaw, 6);
    expect(mirrored.right.roll).toBeCloseTo(-pose.left.roll, 6);
  });

  it('is its own inverse', () => {
    const pose = poseA();
    const twice = mirrorPose(mirrorPose(pose));
    expect(twice.right.wrist[0]).toBeCloseTo(pose.right.wrist[0], 6);
    expect(twice.head.yaw).toBeCloseTo(pose.head.yaw, 6);
  });
});
