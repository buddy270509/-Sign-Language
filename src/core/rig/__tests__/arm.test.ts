import { describe, expect, it } from 'vitest';
import { ARM_REACH_LIMITS, elbowAngleFor, elbowClearance, solveArm } from '../arm';
import { FIGURE, LIMITS, SHOULDER_J, torsoField } from '../anatomy';

const right = SHOULDER_J.right;
const left = SHOULDER_J.left;

describe('reach', () => {
  it('keeps the elbow between the flexion limits', () => {
    expect(elbowAngleFor(ARM_REACH_LIMITS.max)).toBeCloseTo(LIMITS.elbow.maxDeg, 1);
    expect(elbowAngleFor(ARM_REACH_LIMITS.min)).toBeCloseTo(LIMITS.elbow.minDeg, 1);
    expect(elbowAngleFor(10_000)).toBeLessThanOrEqual(LIMITS.elbow.maxDeg + 0.001);
  });

  it('hits the wrist target when it is in range', () => {
    const target = { x: right.x - 30, y: right.y + 120 };
    const solution = solveArm(right, target, 1);
    expect(solution.clamped).toBe(false);
    expect(solution.wrist.x).toBeCloseTo(target.x, 5);
    expect(solution.wrist.y).toBeCloseTo(target.y, 5);
  });

  it('clamps instead of stretching when the target is too far', () => {
    const target = { x: 20, y: 540 };
    const solution = solveArm(right, target, 1);
    expect(solution.clamped).toBe(true);
    expect(solution.clampDistance).toBeGreaterThan(10);
    const distance = Math.hypot(solution.wrist.x - right.x, solution.wrist.y - right.y);
    expect(distance).toBeLessThanOrEqual(ARM_REACH_LIMITS.max + 0.001);
  });

  it('clamps when the target is inside the arm itself', () => {
    const solution = solveArm(right, { x: right.x + 2, y: right.y + 2 }, 1);
    expect(solution.clamped).toBe(true);
    const distance = Math.hypot(solution.wrist.x - right.x, solution.wrist.y - right.y);
    expect(distance).toBeGreaterThanOrEqual(ARM_REACH_LIMITS.min - 0.001);
  });

  it('never folds the elbow backwards', () => {
    for (const y of [0, 60, 120, 180, 240, 320]) {
      for (const x of [-120, -60, 0, 60, 120]) {
        const solution = solveArm(right, { x: right.x + x, y: right.y + y }, 1);
        expect(solution.elbowAngle).toBeGreaterThanOrEqual(LIMITS.elbow.minDeg - 0.001);
        expect(solution.elbowAngle).toBeLessThanOrEqual(LIMITS.elbow.maxDeg + 0.001);
      }
    }
  });
});

describe('body collision', () => {
  it('keeps the elbow out of the torso for normal signing positions', () => {
    for (const y of [40, 100, 160, 220]) {
      for (const x of [-90, -40, 0, 40, 90]) {
        const target = { x: right.x + x, y: right.y + y };
        if (Math.hypot(target.x - right.x, target.y - right.y) > ARM_REACH_LIMITS.max) continue;
        const solution = solveArm(right, target, 1);
        expect(elbowClearance(solution)).toBeGreaterThan(-14);
      }
    }
  });

  it('mirrors for the left arm', () => {
    const target = { x: left.x + 40, y: left.y + 120 };
    const solution = solveArm(left, target, -1);
    expect(solution.elbow.x).toBeLessThan(left.x);
    expect(solution.wrist.x).toBeCloseTo(target.x, 5);
  });

  it('agrees that the torso centre is inside the body volume', () => {
    expect(torsoField({ x: FIGURE.head.cx, y: 340 })).toBeLessThan(0);
    expect(torsoField({ x: FIGURE.head.cx, y: 40 })).toBeGreaterThan(0);
  });
});

describe('sanity', () => {
  it('has arms long enough to reach above the head', () => {
    const reach = Math.hypot(right.x - FIGURE.head.cx, right.y - 40);
    expect(reach).toBeLessThan(ARM_REACH_LIMITS.max);
  });

  it('returns a continuous solution for nearby targets', () => {
    let previous = solveArm(right, { x: right.x - 40, y: right.y + 100 }, 1);
    for (let step = 1; step <= 20; step += 1) {
      const solution = solveArm(right, { x: right.x - 40 + step, y: right.y + 100 - step * 4 }, 1);
      const jump = Math.hypot(solution.elbow.x - previous.elbow.x, solution.elbow.y - previous.elbow.y);
      expect(jump).toBeLessThan(30);
      previous = solution;
    }
  });
});
