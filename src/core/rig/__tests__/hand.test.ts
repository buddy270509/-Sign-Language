import { describe, expect, it } from 'vitest';
import {
  clampHandshape,
  handLandmarksLocal,
  isHandshapeWithinLimits,
  placeHand,
} from '../hand';
import { HANDSHAPES, BASIC_HANDSHAPES, resolveHandshape } from '../handshapes';
import { LIMITS } from '../anatomy';
import { handExtent } from '../render';
import type { FingerJoints, HandshapeSpec } from '../../../types/animation';

const flat: FingerJoints = { mcp: 0, pip: 4, dip: 3, spread: 0 };

const spec = (overrides: Partial<HandshapeSpec> = {}): HandshapeSpec => ({
  fingers: { index: flat, middle: flat, ring: flat, pinky: flat },
  thumb: { cmc: 10, mcp: 6, ip: 4, spread: 0.5 },
  ...overrides,
});

describe('joint limits', () => {
  it('clamps a backwards-bending finger to a straight one', () => {
    const bad = spec({ fingers: { index: { mcp: -40, pip: -20, dip: -10, spread: 0 }, middle: flat, ring: flat, pinky: flat } });
    const clamped = clampHandshape(bad);
    expect(clamped.fingers.index.mcp).toBe(LIMITS.finger.mcp.min);
    expect(clamped.fingers.index.pip).toBe(LIMITS.finger.pip.min);
    expect(isHandshapeWithinLimits(bad)).toBe(false);
    expect(isHandshapeWithinLimits(clamped)).toBe(true);
  });

  it('never lets a phalanx hyperextend or over-flex', () => {
    const extreme = spec({
      fingers: {
        index: { mcp: 400, pip: 400, dip: 400, spread: 9 },
        middle: { mcp: 400, pip: 400, dip: 400, spread: 9 },
        ring: { mcp: 400, pip: 400, dip: 400, spread: 9 },
        pinky: { mcp: 400, pip: 400, dip: 400, spread: 9 },
      },
      thumb: { cmc: 400, mcp: 400, ip: 400, spread: 9 },
    });
    const clamped = clampHandshape(extreme);
    expect(clamped.fingers.index.mcp).toBe(LIMITS.finger.mcp.max);
    expect(clamped.fingers.index.spread).toBe(1);
    expect(clamped.thumb.cmc).toBe(LIMITS.thumb.cmc.max);
    expect(clamped.thumb.spread).toBe(1);
  });

  it('ships every preset inside the limits', () => {
    expect(HANDSHAPES.length).toBeGreaterThanOrEqual(40);
    const offenders = HANDSHAPES.filter((preset) => !isHandshapeWithinLimits(preset));
    expect(offenders.map((preset) => preset.id)).toEqual([]);
  });

  it('has unique ids and descriptions', () => {
    const ids = new Set(HANDSHAPES.map((preset) => preset.id));
    expect(ids.size).toBe(HANDSHAPES.length);
    expect(HANDSHAPES.every((preset) => preset.description.length > 8)).toBe(true);
  });
});

describe('forward kinematics', () => {
  it('produces 21 landmarks in MediaPipe order', () => {
    const points = handLandmarksLocal(resolveHandshape('flat'), 'right');
    expect(points).toHaveLength(21);
    // wrist at the origin, middle fingertip is index 12
    expect(points[0]).toEqual({ x: 0, y: 0, z: 0 });
    expect(points[12]!.y).toBeLessThan(-1.5);
  });

  it('curls fingers in front of the palm, never backwards', () => {
    const points = handLandmarksLocal(resolveHandshape('fist'), 'right');
    for (const point of points) {
      expect(point.z).toBeGreaterThanOrEqual(-0.05);
    }
  });

  it('makes a fist noticeably shorter than a flat hand', () => {
    const flatExtent = handExtent('flat');
    const fistExtent = handExtent('fist');
    expect(fistExtent.heightPx).toBeLessThan(flatExtent.heightPx * 0.65);
  });

  it('mirrors the left hand across the palm axis', () => {
    const right = handLandmarksLocal(resolveHandshape('y-shape'), 'right');
    const left = handLandmarksLocal(resolveHandshape('y-shape'), 'left');
    right.forEach((point, index) => {
      expect(left[index]!.x).toBeCloseTo(-point.x, 6);
      expect(left[index]!.y).toBeCloseTo(point.y, 6);
    });
  });

  it('ranks every basic shape by a distinct landmark outline', () => {
    const signatures = BASIC_HANDSHAPES.map((preset) => {
      const points = handLandmarksLocal(preset, 'right');
      return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(';');
    });
    expect(new Set(signatures).size).toBe(BASIC_HANDSHAPES.length);
  });
});

describe('placement', () => {
  it('rotates the wrist in the picture plane', () => {
    const local = handLandmarksLocal(resolveHandshape('point'), 'right');
    const upright = placeHand(local, { yaw: 0, pitch: 0, roll: 0 }, 40, { x: 100, y: 100, z: 0 });
    const rolled = placeHand(local, { yaw: 0, pitch: 0, roll: 90 }, 40, { x: 100, y: 100, z: 0 });
    const tipUp = upright[8]!;
    const tipRolled = rolled[8]!;
    expect(tipUp.y).toBeLessThan(100);
    expect(tipRolled.x).toBeGreaterThan(100);
  });

  it('foreshortens the hand when the palm turns away', () => {
    const local = handLandmarksLocal(resolveHandshape('flat'), 'right');
    const width = (yaw: number) => {
      const placed = placeHand(local, { yaw, pitch: 0, roll: 0 }, 40, { x: 0, y: 0, z: 0 });
      const xs = placed.map((point) => point.x);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(width(62)).toBeLessThan(width(0));
    expect(width(0)).toBeGreaterThan(10);
  });

  it('keeps depth so hands can be ordered front to back', () => {
    const local = handLandmarksLocal(resolveHandshape('flat'), 'right');
    const near = placeHand(local, { yaw: 0, pitch: 0, roll: 0 }, 40, { x: 0, y: 0, z: 0.8 });
    const far = placeHand(local, { yaw: 0, pitch: 0, roll: 0 }, 40, { x: 0, y: 0, z: -0.8 });
    const avg = (points: Array<{ z: number }>) => points.reduce((sum, p) => sum + p.z, 0) / points.length;
    expect(avg(near)).toBeGreaterThan(avg(far));
  });
});
