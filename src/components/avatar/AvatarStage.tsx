/**
 * The stage: a framed, plain-background area that shows one avatar frame plus optional
 * overlays (expression label, FPS meter, "now signing" caption).
 *
 * Presentation only — it renders whatever pose it is given, so the Studio and the players
 * can share it.
 */
import type { ReactNode } from 'react';
import type { RenderPose } from '../../types/animation';
import { Avatar } from './Avatar';
import type { AvatarStyle, AvatarView } from './types';

export interface AvatarStageProps {
  pose: RenderPose;
  view?: AvatarView;
  style?: AvatarStyle;
  showLandmarks?: boolean;
  showFps?: boolean;
  fps?: number;
  /** Plain-language expression name, e.g. "Yes/no question". */
  expressionLabel?: string;
  expressionDetail?: string;
  showExpression?: boolean;
  onToggleExpression?: () => void;
  /** Small badge under the stage, e.g. the demo warning. */
  badge?: ReactNode;
  /** Caption shown while a sign plays. */
  caption?: string;
  className?: string;
  /** Anything rendered over the stage (studio handles, warnings). */
  children?: ReactNode;
}

export function AvatarStage({
  pose,
  view = 'full',
  style = 'human',
  showLandmarks = false,
  showFps = false,
  fps,
  expressionLabel,
  expressionDetail,
  showExpression = true,
  onToggleExpression,
  badge,
  caption,
  className = '',
  children,
}: AvatarStageProps) {
  return (
    <div className={`relative ${className}`}>
      <div
        className="relative w-full overflow-hidden rounded-3xl border border-line"
        style={{ background: 'var(--sb-stage)', aspectRatio: '4 / 5' }}
      >
        <Avatar
          pose={pose}
          view={view}
          style={style}
          showLandmarks={showLandmarks}
          className="h-full w-full"
          label={caption ? `Signing avatar: ${caption}` : 'Signing avatar'}
        />

        {showExpression && expressionLabel ? (
          <div className="absolute top-2 left-2 max-w-[70%] rounded-2xl border border-line bg-surface px-3 py-1.5 shadow-sm">
            <p className="text-[11px] font-bold tracking-wide text-ink-soft uppercase">Face</p>
            <p className="text-sm leading-tight font-extrabold text-ink">{expressionLabel}</p>
            {expressionDetail ? (
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-soft">{expressionDetail}</p>
            ) : null}
          </div>
        ) : null}

        <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5">
          {showFps ? (
            <span className="rounded-full border border-line bg-surface px-2 py-1 text-[11px] font-bold tabular-nums text-ink-soft">
              {fps ?? 0} FPS
            </span>
          ) : null}
          {onToggleExpression ? (
            <button
              type="button"
              onClick={onToggleExpression}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-bold text-ink-soft"
            >
              {showExpression ? 'Hide face label' : 'Show face label'}
            </button>
          ) : null}
        </div>

        {caption ? (
          <p className="absolute bottom-2 left-0 right-0 px-3 text-center text-xs font-semibold text-ink-soft">
            {caption}
          </p>
        ) : null}

        {children}
      </div>
      {badge ? <div className="mt-2">{badge}</div> : null}
    </div>
  );
}
