/**
 * Torso and arms.
 *
 * The body silhouette comes from the rig (`RenderBody.torsoPath`); the arms are the IK
 * solution drawn as two tapered strokes, so a sleeve always follows the elbow.
 */
import type { RenderArm, RenderBody } from '../../types/animation';
import type { AvatarStyle } from './types';

export function Torso({ body, style = 'human' }: { body: RenderBody; style?: AvatarStyle }) {
  const stick = style === 'stick';
  return (
    <g>
      <path
        d={body.torsoPath}
        fill={stick ? 'var(--sb-surface)' : 'var(--sb-shirt)'}
        stroke={stick ? 'var(--sb-ink)' : 'var(--sb-shirt-edge)'}
        strokeWidth={stick ? 2 : 1.6}
        strokeLinejoin="round"
      />
      {!stick ? (
        <path
          d={`M ${body.shoulders.left.x + 26} ${body.shoulders.left.y - 6} Q ${(body.shoulders.left.x + body.shoulders.right.x) / 2} ${body.shoulders.left.y + 16} ${body.shoulders.right.x - 26} ${body.shoulders.right.y - 6}`}
          fill="none"
          stroke="var(--sb-shirt-edge)"
          strokeWidth={1.4}
          opacity={0.7}
        />
      ) : null}
    </g>
  );
}

export function Arm({ arm, style = 'human', body }: { arm: RenderArm; style?: AvatarStyle; body?: RenderBody }) {
  const stick = style === 'stick';
  const color = stick ? 'var(--sb-ink)' : 'var(--sb-shirt)';
  const edge = 'var(--sb-shirt-edge)';
  // Start the sleeve a little inside the shoulder line so its round cap hides under the shirt.
  const inward = body ? Math.sign(body.shoulders.left.x - arm.shoulder.x) * 7 : 0;
  const sx = arm.shoulder.x + inward;
  const sy = arm.shoulder.y - 3;
  return (
    <g strokeLinecap="round" fill="none">
      <line
        x1={sx}
        y1={sy}
        x2={arm.elbow.x}
        y2={arm.elbow.y}
        stroke={stick ? color : edge}
        strokeWidth={stick ? 3 : 30}
      />
      <line
        x1={arm.elbow.x}
        y1={arm.elbow.y}
        x2={arm.wrist.x}
        y2={arm.wrist.y}
        stroke={stick ? color : edge}
        strokeWidth={stick ? 3 : 25}
      />
      {!stick ? (
        <>
          <line x1={sx} y1={sy} x2={arm.elbow.x} y2={arm.elbow.y} stroke={color} strokeWidth={27} />
          <line
            x1={arm.elbow.x}
            y1={arm.elbow.y}
            x2={arm.wrist.x}
            y2={arm.wrist.y}
            stroke={color}
            strokeWidth={22}
          />
        </>
      ) : null}
      {stick ? <circle cx={arm.elbow.x} cy={arm.elbow.y} r={2.6} fill="var(--sb-brand)" stroke="none" /> : null}
    </g>
  );
}
