/**
 * A single hand, zoomed to fit. Used by the handshape gallery and the Studio inspector.
 *
 * It runs the real rig (`buildRenderPose`), so what you see here is exactly what the
 * avatar's hand looks like in a sign.
 */
import { useMemo } from 'react';
import type { HandState, RenderHand } from '../../types/animation';
import { buildRenderPose } from '../../core/rig/render';
import { neutralPose } from '../../core/rig/pose';
import { Hand } from './Hand';
import type { AvatarStyle } from './types';

export interface HandPreviewProps {
  hand: HandState;
  style?: AvatarStyle;
  showLandmarks?: boolean;
  className?: string;
  /** Extra stage units of padding around the hand. */
  padding?: number;
}

export function renderHandFor(hand: HandState): RenderHand {
  const pose = neutralPose();
  return buildRenderPose({ ...pose, right: hand }).rightHand;
}

export function HandPreview({ hand, style = 'human', showLandmarks = false, className = '', padding = 16 }: HandPreviewProps) {
  const render = useMemo(() => renderHandFor(hand), [hand]);

  const viewBox = useMemo(() => {
    const xs = render.landmarks.map((point) => point.x);
    const ys = render.landmarks.map((point) => point.y);
    const x0 = Math.min(...xs) - padding;
    const y0 = Math.min(...ys) - padding;
    const width = Math.max(...xs) - Math.min(...xs) + padding * 2;
    const height = Math.max(...ys) - Math.min(...ys) + padding * 2;
    return `${x0.toFixed(1)} ${y0.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`;
  }, [render, padding]);

  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label="Handshape preview">
      <Hand hand={render} style={style} showLandmarks={showLandmarks} />
    </svg>
  );
}
