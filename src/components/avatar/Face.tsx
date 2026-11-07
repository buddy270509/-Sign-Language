/**
 * Face layer: brows, eyes, nose, cheeks and mouth, drawn from `FaceGeometry`.
 *
 * Nothing here knows about expressions — an expression is just a set of parameter values,
 * which is why emotions and mouth morphemes can be blended independently.
 */
import type { FaceGeometry } from '../../types/animation';
import {
  browPath,
  cheekCircles,
  eyePath,
  eyeVisible,
  FACE_LAYOUT,
  lipLinePath,
  mouthPath,
  nosePath,
  pupilCenter,
  tonguePath,
  wrinklePath,
  type FaceOrigin,
} from '../../core/rig/facePaths';
import type { AvatarStyle } from './types';

export interface FaceProps {
  geometry: FaceGeometry;
  origin: FaceOrigin;
  style?: AvatarStyle;
}

export function Face({ geometry, origin, style = 'human' }: FaceProps) {
  const stick = style === 'stick';
  const ink = stick ? 'var(--sb-ink)' : 'var(--sb-hair)';
  const eyeWhite = 'var(--sb-surface)';
  const lips = 'var(--sb-lip)';
  const mouthInner = 'var(--sb-mouth-inner)';
  const brows = cheekCircles(geometry, origin);
  const leftPupil = pupilCenter(geometry, origin, 'left');
  const rightPupil = pupilCenter(geometry, origin, 'right');
  const mouthFilled = geometry.mouthOpenPx > 2.2 || geometry.roundness > 0.35 || geometry.tonguePx > 0.2;

  return (
    <g className="avatar-face">
      {/* cheeks */}
      {!stick &&
        brows.map((circle, index) => (
          <circle
            key={index}
            cx={circle.cx}
            cy={circle.cy}
            r={circle.r}
            fill="var(--sb-lip)"
            opacity={0.16 + geometry.cheekRaisePx * 0.02 + geometry.cheekPuffPx * 0.02}
          />
        ))}

      {/* brows */}
      <path
        d={browPath(geometry, origin, 'left')}
        stroke={ink}
        strokeWidth={stick ? 2.6 : 3.4}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={browPath(geometry, origin, 'right')}
        stroke={ink}
        strokeWidth={stick ? 2.6 : 3.4}
        strokeLinecap="round"
        fill="none"
      />

      {/* eyes */}
      {eyeVisible(geometry, 'left') ? (
        <g>
          <path d={eyePath(geometry, origin, 'left')} fill={eyeWhite} stroke={ink} strokeWidth={1.1} />
          <circle cx={leftPupil.x} cy={leftPupil.y} r={2.7} fill={ink} />
          <circle cx={leftPupil.x + 0.9} cy={leftPupil.y - 1} r={0.8} fill="var(--sb-surface)" opacity={0.85} />
        </g>
      ) : (
        <path
          d={`M ${origin.cx - FACE_LAYOUT.eyeDx - 7} ${origin.cy + FACE_LAYOUT.eyeY} Q ${origin.cx - FACE_LAYOUT.eyeDx} ${origin.cy + FACE_LAYOUT.eyeY + 3} ${origin.cx - FACE_LAYOUT.eyeDx + 7} ${origin.cy + FACE_LAYOUT.eyeY}`}
          stroke={ink}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
      )}
      {eyeVisible(geometry, 'right') ? (
        <g>
          <path d={eyePath(geometry, origin, 'right')} fill={eyeWhite} stroke={ink} strokeWidth={1.1} />
          <circle cx={rightPupil.x} cy={rightPupil.y} r={2.7} fill={ink} />
          <circle cx={rightPupil.x + 0.9} cy={rightPupil.y - 1} r={0.8} fill="var(--sb-surface)" opacity={0.85} />
        </g>
      ) : (
        <path
          d={`M ${origin.cx + FACE_LAYOUT.eyeDx - 7} ${origin.cy + FACE_LAYOUT.eyeY} Q ${origin.cx + FACE_LAYOUT.eyeDx} ${origin.cy + FACE_LAYOUT.eyeY + 3} ${origin.cx + FACE_LAYOUT.eyeDx + 7} ${origin.cy + FACE_LAYOUT.eyeY}`}
          stroke={ink}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* nose */}
      <path
        d={nosePath(geometry, origin)}
        stroke={stick ? ink : 'var(--sb-skin-deep)'}
        strokeWidth={stick ? 1.6 : 1.8}
        fill="none"
        strokeLinecap="round"
        opacity={stick ? 1 : 0.85}
      />
      <path
        d={wrinklePath(geometry, origin)}
        stroke={stick ? ink : 'var(--sb-skin-deep)'}
        strokeWidth={1.2}
        fill="none"
        strokeLinecap="round"
      />

      {/* mouth */}
      <path
        d={mouthPath(geometry, origin)}
        fill={mouthFilled ? mouthInner : lips}
        stroke={lips}
        strokeWidth={mouthFilled ? 1.2 : 1.9}
        strokeLinejoin="round"
      />
      {!mouthFilled ? (
        <path d={lipLinePath(geometry, origin)} stroke="var(--sb-skin-deep)" strokeWidth={1.2} fill="none" strokeLinecap="round" />
      ) : null}
      {geometry.tonguePx > 0.2 ? (
        <path d={tonguePath(geometry, origin)} fill="var(--sb-lip)" opacity={0.95} />
      ) : null}
    </g>
  );
}
