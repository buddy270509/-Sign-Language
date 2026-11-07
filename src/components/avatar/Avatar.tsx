/**
 * Avatar stage — composes the body parts into one responsive SVG.
 *
 * Face zoom is implemented by scaling the SVG inside an overflow-hidden wrapper
 * (rather than by changing the viewBox) so it can animate with a plain CSS
 * transition and respects `prefers-reduced-motion`.
 */
import type { AvatarFrame } from '../../types/sign';
import { Arm, Torso } from './Body';
import { Head } from './Head';
import { Hand } from './Hand';

export type AvatarZoom = 'full' | 'face';

export interface AvatarProps {
  frame: AvatarFrame;
  zoom?: AvatarZoom;
  showLandmarks?: boolean;
  /** Mirrors the whole figure for left-handed signers. */
  mirrored?: boolean;
  /** Accessible description of what the avatar is currently signing. */
  label?: string;
  className?: string;
  /** Disables the idle sway (e.g. when the user asked for reduced motion). */
  still?: boolean;
}

export function Avatar({
  frame,
  zoom = 'full',
  showLandmarks = false,
  mirrored = false,
  label,
  className = '',
  still = false,
}: AvatarProps) {
  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <div
        className="h-full w-full transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{
          transform: zoom === 'face' ? 'scale(2.45)' : 'scale(1)',
          transformOrigin: '50% 20.8%',
        }}
      >
        <svg
          viewBox="0 0 360 480"
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={label ?? 'Sign language avatar'}
        >
          <defs>
            <linearGradient id="sb-head-shade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#000" stopOpacity="0" />
              <stop offset="0.55" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.16" />
            </linearGradient>
            <linearGradient id="sb-hair-sheen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <filter id="sb-hand-shadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="1.2" dy="2" stdDeviation="1.5" floodColor="#0a1220" floodOpacity="0.22" />
            </filter>
          </defs>

          <g className={still ? undefined : 'sb-sway'}>
            <g transform={mirrored ? 'translate(360 0) scale(-1 1)' : undefined}>
              <Torso torso={frame.torso} />
              <Head face={frame.face} head={frame.head} />
              <Arm arm={frame.leftArm} side="left" />
              <Hand frame={frame.leftHand} showLandmarks={showLandmarks} />
              <Arm arm={frame.rightArm} side="right" />
              <Hand frame={frame.rightHand} showLandmarks={showLandmarks} />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
