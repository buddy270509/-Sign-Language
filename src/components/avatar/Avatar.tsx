/**
 * The avatar figure.
 *
 * Pure presentation: give it a `RenderPose` and it draws one frame. All animation state
 * lives in `useAnimationPlayer`, and all geometry in `core/rig/render.ts`.
 *
 * Layer order follows depth: a hand that is behind the body plane is drawn first, then the
 * torso, then the head, then the hands in front. That single rule is what makes two-handed
 * signs read correctly.
 */
import { memo } from 'react';
import type { RenderPose } from '../../types/animation';
import { STAGE } from '../../core/rig/anatomy';
import { Hand } from './Hand';
import { Head } from './Head';
import { Torso, Arm } from './Torso';
import type { AvatarStyle, AvatarView } from './types';

export interface AvatarProps {
  pose: RenderPose;
  view?: AvatarView;
  style?: AvatarStyle;
  showLandmarks?: boolean;
  className?: string;
  /** Described to screen readers; the surrounding player provides the live status text. */
  label?: string;
  /** Geometry for embedding the figure inside a larger SVG (review sheets, print). */
  x?: number;
  y?: number;
  width?: number | string;
  height?: number | string;
}

const ASPECT = 4 / 5;

/** Framing box for each view. The full view is exactly the signing stage. */
export function viewBoxFor(pose: RenderPose, view: AvatarView = 'full'): string {
  if (view === 'full') return `0 0 ${STAGE.width} ${STAGE.height}`;

  let cx: number;
  let cy: number;
  let size: number;

  if (view === 'hands') {
    const b = pose.handsBounds;
    const width = Math.max(150, b.x1 - b.x0);
    const height = Math.max(188, b.y1 - b.y0);
    cx = (b.x0 + b.x1) / 2;
    cy = (b.y0 + b.y1) / 2;
    size = Math.max(width / ASPECT, height);
  } else {
    cx = pose.head.cx;
    cy = pose.head.cy + 6;
    size = pose.head.ry * 3.05;
  }

  const width = size * ASPECT;
  return `${round(cx - width / 2)} ${round(cy - size / 2)} ${round(width)} ${round(size)}`;
}

const round = (value: number) => Math.round(value * 10) / 10;

export const Avatar = memo(function Avatar({
  pose,
  view = 'full',
  style = 'human',
  showLandmarks = false,
  className,
  label = 'Signing avatar',
  x,
  y,
  width,
  height,
}: AvatarProps) {
  const rightBehind = pose.rightHand.depth < -0.5;
  const leftBehind = pose.leftHand.depth < -0.5;

  const limb = (side: 'right' | 'left') => (
    <g>
      <Arm arm={side === 'right' ? pose.rightArm : pose.leftArm} style={style} body={pose.body} />
      <Hand
        hand={side === 'right' ? pose.rightHand : pose.leftHand}
        style={style}
        tone={side === 'right' ? (rightBehind ? 'far' : 'near') : leftBehind ? 'far' : 'near'}
        showLandmarks={showLandmarks}
      />
    </g>
  );

  return (
    <svg
      className={className}
      x={x}
      y={y}
      width={width}
      height={height}
      viewBox={viewBoxFor(pose, view)}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      <g className="avatar-figure">
        {rightBehind ? limb('right') : null}
        {leftBehind ? limb('left') : null}
        <Torso body={pose.body} style={style} />
        <Head head={pose.head} geometry={pose.face.geometry} style={style} neckTopY={pose.body.shoulders.left.y} />
        {rightBehind ? null : limb('right')}
        {leftBehind ? null : limb('left')}
      </g>
    </svg>
  );
});
