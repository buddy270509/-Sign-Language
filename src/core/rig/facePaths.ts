/**
 * Face geometry → path strings.
 *
 * Pure functions of `FaceGeometry`, so the same numbers drive the SVG, the renderer and
 * the tests ("does every face parameter visibly change the face?"). No colours, no React.
 */
import type { FaceGeometry } from '../../types/animation';

const r = (value: number) => Math.round(value * 100) / 100;

export interface FaceOrigin {
  cx: number;
  cy: number;
}

/** Feature layout inside the head (stage units). */
export const FACE_LAYOUT = {
  eyeDx: 15.5,
  eyeY: -7,
  browY: -23,
  noseY: 4,
  mouthY: 23,
  eyeRx: 7,
};

const at = (origin: FaceOrigin, x: number, y: number) => ({ x: origin.cx + x, y: origin.cy + y });

/** Eyebrow as a quadratic arc, tilted by furrow/raise. */
export function browPath(geometry: FaceGeometry, origin: FaceOrigin, side: 'left' | 'right'): string {
  const dx = side === 'left' ? -FACE_LAYOUT.eyeDx : FACE_LAYOUT.eyeDx;
  const y = FACE_LAYOUT.browY + (side === 'left' ? geometry.browYL : geometry.browYR);
  const tilt = side === 'left' ? geometry.browTiltL : geometry.browTiltR;
  const inner = at(origin, dx + (side === 'left' ? 9 : -9), y + tilt * 0.42);
  const outer = at(origin, dx + (side === 'left' ? -9 : 9), y - tilt * 0.16);
  const control = at(origin, dx, y - 4.2 + Math.abs(tilt) * 0.12);
  return `M ${r(outer.x)} ${r(outer.y)} Q ${r(control.x)} ${r(control.y)} ${r(inner.x)} ${r(inner.y)}`;
}

/** Eye outline: an almond whose height follows openness. */
export function eyePath(geometry: FaceGeometry, origin: FaceOrigin, side: 'left' | 'right'): string {
  const dx = side === 'left' ? -FACE_LAYOUT.eyeDx : FACE_LAYOUT.eyeDx;
  const open = side === 'left' ? geometry.eyeOpenL : geometry.eyeOpenR;
  const ry = 0.9 + open * 5.4;
  const center = at(origin, dx, FACE_LAYOUT.eyeY);
  return `M ${r(center.x - FACE_LAYOUT.eyeRx)} ${r(center.y)} Q ${r(center.x)} ${r(center.y - ry * 2)} ${r(center.x + FACE_LAYOUT.eyeRx)} ${r(center.y)} Q ${r(center.x)} ${r(center.y + ry * 2)} ${r(center.x - FACE_LAYOUT.eyeRx)} ${r(center.y)} Z`;
}

export function pupilCenter(geometry: FaceGeometry, origin: FaceOrigin, side: 'left' | 'right') {
  const dx = side === 'left' ? -FACE_LAYOUT.eyeDx : FACE_LAYOUT.eyeDx;
  return at(origin, dx + geometry.pupilX, FACE_LAYOUT.eyeY + geometry.pupilY);
}

export function eyeVisible(geometry: FaceGeometry, side: 'left' | 'right'): boolean {
  return (side === 'left' ? geometry.eyeOpenL : geometry.eyeOpenR) > 0.12;
}

/** Nose: a small hook whose shape tightens as the nose wrinkles. */
export function nosePath(geometry: FaceGeometry, origin: FaceOrigin): string {
  const top = at(origin, 0.5, FACE_LAYOUT.noseY - 9);
  const mid = at(origin, 4, FACE_LAYOUT.noseY - 1.5);
  const tip = at(origin, -1.5 + geometry.noseWrinkle * 2.2, FACE_LAYOUT.noseY + 1.5);
  return `M ${r(top.x)} ${r(top.y)} Q ${r(mid.x + geometry.noseWrinkle * 2)} ${r(mid.y)} ${r(tip.x)} ${r(tip.y)}`;
}

/** Nostril crease, drawn only when the nose wrinkles. */
export function wrinklePath(geometry: FaceGeometry, origin: FaceOrigin): string {
  if (geometry.noseWrinkle < 0.05) return '';
  const a = at(origin, -6, FACE_LAYOUT.noseY - 12);
  const b = at(origin, -1 - geometry.noseWrinkle * 2, FACE_LAYOUT.noseY - 8);
  return `M ${r(a.x)} ${r(a.y)} L ${r(b.x)} ${r(b.y)}`;
}

/** Mouth outline. Openness, width, corners and roundness all feed into it. */
export function mouthPath(geometry: FaceGeometry, origin: FaceOrigin): string {
  const w = geometry.mouthHalfWidthPx;
  const h = geometry.mouthOpenPx;
  const cornerY = geometry.mouthCornerY;
  const center = at(origin, 0, FACE_LAYOUT.mouthY);

  if (geometry.mouthShape === 'oo' || geometry.roundness > 0.62) {
    const rx = Math.max(2.4, w * (1 - geometry.roundness * 0.55));
    const ry = Math.max(2.2, h * 0.55 + 1.6);
    return `M ${r(center.x - rx)} ${r(center.y + cornerY)} Q ${r(center.x)} ${r(center.y - ry - 1.4 + cornerY)} ${r(center.x + rx)} ${r(center.y + cornerY)} Q ${r(center.x)} ${r(center.y + ry + cornerY)} ${r(center.x - rx)} ${r(center.y + cornerY)} Z`;
  }

  const left = { x: center.x - w, y: center.y + cornerY };
  const right = { x: center.x + w, y: center.y + cornerY };
  const top = center.y - h * 0.22 + cornerY * 0.4;
  const bottom = center.y + Math.max(0.8, h * 0.78) + cornerY * 0.2;
  return `M ${r(left.x)} ${r(left.y)} Q ${r(center.x)} ${r(top)} ${r(right.x)} ${r(right.y)} Q ${r(center.x)} ${r(bottom)} ${r(left.x)} ${r(left.y)} Z`;
}

/** Upper lip line — visible even when the mouth is closed. */
export function lipLinePath(geometry: FaceGeometry, origin: FaceOrigin): string {
  const w = geometry.mouthHalfWidthPx;
  const center = at(origin, 0, FACE_LAYOUT.mouthY + geometry.mouthCornerY);
  const lift = geometry.mouthSmile > 0 ? -geometry.mouthSmile * 2.2 : -geometry.mouthSmile * -1.6;
  return `M ${r(center.x - w)} ${r(center.y)} Q ${r(center.x)} ${r(center.y + lift)} ${r(center.x + w)} ${r(center.y)}`;
}

export function tonguePath(geometry: FaceGeometry, origin: FaceOrigin): string {
  if (geometry.tonguePx <= 0.2) return '';
  const w = geometry.mouthHalfWidthPx * 0.5;
  const center = at(origin, 0, FACE_LAYOUT.mouthY);
  const y = center.y + geometry.mouthOpenPx * 0.5;
  return `M ${r(center.x - w)} ${r(y)} Q ${r(center.x)} ${r(y + geometry.tonguePx)} ${r(center.x + w)} ${r(y)} Z`;
}

/** Cheek shading circles, sized by puff and raise. */
export function cheekCircles(geometry: FaceGeometry, origin: FaceOrigin) {
  return [
    { cx: origin.cx - 21, cy: origin.cy + 10, r: 3 + geometry.cheekPuffPx * 1.6 + geometry.cheekRaisePx * 0.4 },
    { cx: origin.cx + 21, cy: origin.cy + 10, r: 3 + geometry.cheekPuffPx * 1.6 + geometry.cheekRaisePx * 0.4 },
  ];
}

/**
 * One string that changes whenever any face parameter changes the drawing.
 * Used by the tests to prove every parameter is visible.
 */
export function facePathSignature(geometry: FaceGeometry, origin: FaceOrigin): string {
  return [
    browPath(geometry, origin, 'left'),
    browPath(geometry, origin, 'right'),
    eyePath(geometry, origin, 'left'),
    eyePath(geometry, origin, 'right'),
    nosePath(geometry, origin),
    wrinklePath(geometry, origin),
    mouthPath(geometry, origin),
    lipLinePath(geometry, origin),
    tonguePath(geometry, origin),
    ...cheekCircles(geometry, origin).map((circle) => `${circle.cx.toFixed(2)},${circle.cy.toFixed(2)},${circle.r.toFixed(2)}`),
    `${pupilCenter(geometry, origin, 'left').x.toFixed(2)},${pupilCenter(geometry, origin, 'left').y.toFixed(2)}`,
  ].join('|');
}
