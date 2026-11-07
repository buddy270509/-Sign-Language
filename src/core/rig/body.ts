/**
 * Body geometry for the 2D avatar: stage space, sign-space mapping and 2-bone IK.
 *
 * Stage space is a fixed 360 × 480 drawing surface (the SVG viewBox). Sign positions
 * in the JSON files are normalized (0..1) so they stay valid if the stage is redrawn
 * or replaced by a 3D rig, which is why `toStage` exists in one place only.
 */
import type { ArmFrame, Vec2 } from '../../types/sign';

export const STAGE = { width: 360, height: 480 } as const;

/** The region hands may occupy ("signing space"). Normalized 0..1 → stage px. */
export const SIGN_SPACE = { x0: 58, x1: 302, y0: 116, y1: 356 } as const;

/**
 * Proportions: head height 107 px, shoulder span 128 px (≈ 2.3 heads wide), palm
 * width 42 px (≈ 0.48 × head width). Hands are deliberately slightly larger than
 * life so fingerspelling stays legible on a phone screen.
 */
export const BODY = {
  headCenter: { x: 180, y: 100 },
  headHalfWidth: 44,
  headHalfHeight: 58,
  neck: { x: 180, width: 36, top: 134, bottom: 176 },
  shoulderY: 194,
  shoulder: { left: { x: 124, y: 196 }, right: { x: 236, y: 196 } },
  upperArm: 66,
  forearm: 64,
  /** Widest point of the palm in stage px. */
  palmWidth: 45,
} as const;

export const toStage = (p: Vec2): Vec2 => ({
  x: SIGN_SPACE.x0 + p.x * (SIGN_SPACE.x1 - SIGN_SPACE.x0),
  y: SIGN_SPACE.y0 + p.y * (SIGN_SPACE.y1 - SIGN_SPACE.y0),
});

const DEG = 180 / Math.PI;

/**
 * Two-bone IK with a natural elbow preference (down and away from the body).
 * Targets outside the arm's reach are clamped so the rig never visibly detaches.
 */
export function solveArm(shoulder: Vec2, target: Vec2, outward: 1 | -1): ArmFrame {
  const L1 = BODY.upperArm;
  const L2 = BODY.forearm;
  const reach = L1 + L2 - 1.5;
  const dx = target.x - shoulder.x;
  const dy = target.y - shoulder.y;
  const rawDist = Math.hypot(dx, dy) || 0.0001;
  const dist = Math.min(Math.max(rawDist, Math.abs(L1 - L2) + 1), reach);
  const ux = dx / rawDist;
  const uy = dy / rawDist;

  const wrist = { x: shoulder.x + ux * dist, y: shoulder.y + uy * dist };
  const a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const base = { x: shoulder.x + ux * a, y: shoulder.y + uy * a };

  const candidates: Vec2[] = [
    { x: base.x + -uy * h, y: base.y + ux * h },
    { x: base.x + uy * h, y: base.y - ux * h },
  ];
  // Prefer an elbow that is low (natural) and slightly outside the body.
  const pref = { x: outward * 0.42, y: 0.91 };
  const score = (e: Vec2) =>
    (e.x - shoulder.x) * pref.x + (e.y - shoulder.y) * pref.y + e.x * outward * 0.35;
  const first = candidates[0] as Vec2;
  const second = candidates[1] as Vec2;
  const elbow = score(first) >= score(second) ? first : second;

  return {
    shoulder: { ...shoulder },
    elbow,
    wrist,
    forearmAngle: Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x) * DEG,
  };
}
