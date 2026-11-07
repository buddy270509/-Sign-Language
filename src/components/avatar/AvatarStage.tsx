/**
 * The framed stage that hosts the avatar, with the two learning aids required in
 * Phase 1: a large "now signing" chip and a plain-language expression label.
 */
import type { ReactNode } from 'react';
import type { AvatarFrame } from '../../types/sign';
import { Avatar } from './Avatar';
import { Icon } from '../ui/Icon';

export interface AvatarStageProps {
  frame: AvatarFrame;
  label: string;
  /** Big label of the current sign, e.g. the letter being fingerspelled. */
  currentSign?: string;
  zoom?: boolean;
  onToggleZoom?: () => void;
  showLandmarks?: boolean;
  mirrored?: boolean;
  still?: boolean;
  caption?: ReactNode;
  children?: ReactNode;
}

export function AvatarStage({
  frame,
  label,
  currentSign,
  zoom = false,
  onToggleZoom,
  showLandmarks = false,
  mirrored = false,
  still = false,
  caption,
  children,
}: AvatarStageProps) {
  return (
    <div className="stage-grid relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-line shadow-sm">
      <Avatar
        frame={frame}
        zoom={zoom ? 'face' : 'full'}
        showLandmarks={showLandmarks}
        mirrored={mirrored}
        label={label}
        still={still}
      />

      {currentSign ? (
        <div className="pointer-events-none absolute top-3 left-3 rounded-2xl border border-line bg-surface/95 px-3.5 py-1.5 shadow-sm">
          <p className="text-[11px] font-bold tracking-wider text-ink-soft uppercase">Now signing</p>
          <p className="text-3xl leading-none font-black break-all">{currentSign}</p>
        </div>
      ) : null}

      {onToggleZoom ? (
        <button
          type="button"
          onClick={onToggleZoom}
          aria-pressed={zoom}
          className="absolute top-3 right-3 flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface/95 px-3 text-sm font-bold text-ink shadow-sm hover:bg-surface-2"
        >
          <Icon name="zoom" className="h-5 w-5" />
          {zoom ? 'Full body' : 'Face zoom'}
        </button>
      ) : null}

      {caption ? (
        <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-line bg-surface/95 px-3.5 py-2.5 shadow-sm">
          {caption}
        </div>
      ) : null}

      {children}
    </div>
  );
}
