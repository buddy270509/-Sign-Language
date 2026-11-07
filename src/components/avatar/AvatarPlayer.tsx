/**
 * The avatar player: stage + transport controls + non-manual markers.
 *
 * All timing lives in `useAnimationPlayer` (one rAF loop, paused when idle). This
 * component only renders and forwards user intent, which keeps re-renders cheap.
 */
import { useMemo, useState } from 'react';
import type { SignAnimation } from '../../types/animation';
import { useAnimationPlayer } from '../../hooks/useAnimationPlayer';
import { useSettings } from '../../store/settings';
import { EXPRESSIONS } from '../../core/rig/face';
import { AVATAR_VIEWS } from './types';
import { AvatarStage } from './AvatarStage';
import { Icon } from '../ui/Icon';

const SPEEDS = [0.25, 0.5, 1, 1.5, 2];

export interface AvatarPlayerProps {
  animations: SignAnimation[];
  /** Autoplay when the queue loads (default false — the transport is the entry point). */
  autoPlay?: boolean;
  showViewSwitch?: boolean;
  showSpeed?: boolean;
  showScrubber?: boolean;
  className?: string;
  /** Called when the whole queue finishes. */
  onFinished?: () => void;
  /** Extra controls rendered under the transport. */
  footer?: React.ReactNode;
}

export function AvatarPlayer({
  animations,
  autoPlay = false,
  showViewSwitch = true,
  showSpeed = true,
  showScrubber = true,
  className = '',
  onFinished,
  footer,
}: AvatarPlayerProps) {
  const { settings, update, t } = useSettings();
  const [finishedOnce, setFinishedOnce] = useState(false);

  const overlay = useMemo(
    () => ({
      expression: settings.overlayExpression,
      weight: settings.overlayWeight,
      strength: 1,
    }),
    [settings.overlayExpression, settings.overlayWeight],
  );

  const player = useAnimationPlayer({
    animations,
    transitionMs: settings.transitionMs,
    speed: settings.speed,
    loop: settings.loop,
    mirrored: settings.handedness === 'left',
    overlay,
    autoPlay,
    stillWhenIdle: settings.reducedMotion,
    onQueueFinished: () => {
      setFinishedOnce(true);
      onFinished?.();
    },
  });

  const { snapshot } = player;
  const currentAnimation = animations.find((animation) => animation.id === snapshot.key);
  const overlayExpression = currentAnimation?.nonManualOverlay?.expression;
  const expressionId =
    (typeof overlayExpression === 'string' ? overlayExpression : undefined) ??
    (settings.overlayWeight > 0 ? settings.overlayExpression : 'neutral');
  const expression = EXPRESSIONS[expressionId] ?? EXPRESSIONS.neutral;

  const isDemo = currentAnimation?.meta.demo ?? false;
  const isUnreviewed = currentAnimation ? !currentAnimation.meta.reviewed_by_deaf_signer : false;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <AvatarStage
        pose={player.pose}
        view={settings.view}
        style={settings.avatarStyle}
        showLandmarks={settings.showLandmarks}
        showFps={settings.showFps}
        fps={player.fps}
        expressionLabel={expression?.label}
        expressionDetail={expression?.explanation}
        showExpression={settings.showLabels}
        onToggleExpression={() => update({ showLabels: !settings.showLabels })}
        caption={snapshot.label ? `${snapshot.label}` : undefined}
        badge={
          isDemo ? (
            <p className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-[11px] leading-snug font-semibold text-ink-soft">
              {t('player.demoNotice')}
            </p>
          ) : isUnreviewed ? (
            <p className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-[11px] leading-snug font-semibold text-ink-soft">
              Draft animation — still waiting for a fluent deaf signer to review it.
            </p>
          ) : null
        }
      />

      <div className="card-flat">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={player.toggle}
            className="btn btn-primary btn-lg flex-1"
            aria-label={snapshot.playing ? t('common.pause') : t('common.play')}
          >
            <Icon name={snapshot.playing ? 'pause' : 'play'} filled={!snapshot.playing} />
            {snapshot.playing ? t('common.pause') : t('common.play')}
          </button>
          <button type="button" onClick={player.replay} className="btn" aria-label={t('common.replay')}>
            <Icon name="replay" />
            <span className="hidden sm:inline">{t('common.replay')}</span>
          </button>
          <button type="button" onClick={player.stop} className="btn" aria-label="Stop">
            <Icon name="stop" />
            <span className="hidden sm:inline">Stop</span>
          </button>
          <button
            type="button"
            onClick={() => player.setLoop(settings.loop === 'off' ? 'all' : 'off')}
            className={`btn ${settings.loop === 'off' ? '' : 'btn-primary'}`}
            aria-pressed={settings.loop !== 'off'}
            aria-label={t('common.loop')}
          >
            <Icon name="loop" />
            <span className="hidden sm:inline">{t('common.loop')}</span>
          </button>
        </div>

        {showScrubber && snapshot.count > 0 ? (
          <div className="mt-3">
            <div className="flex items-baseline justify-between text-xs font-semibold text-ink-soft">
              <span>
                {snapshot.count > 1 ? `${snapshot.index + 1} / ${snapshot.count} · ` : ''}
                {(snapshot.timeMs / 1000).toFixed(2)}s
              </span>
              <span>{(snapshot.durationMs / 1000).toFixed(2)}s</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(1, snapshot.durationMs)}
              step={10}
              value={snapshot.timeMs}
              onChange={(event) => player.seek(Number(event.target.value))}
              aria-label="Scrub through this sign"
              className="mt-1 h-11 w-full accent-[var(--sb-brand)]"
            />
          </div>
        ) : null}

        <div className="mt-2 flex flex-wrap items-end gap-3">
          {showSpeed ? (
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              {t('common.speed')}
              <select
                value={settings.speed}
                onChange={(event) => {
                  const speed = Number(event.target.value);
                  update({ speed });
                  player.setSpeed(speed);
                }}
                className="min-h-11 rounded-xl border border-line bg-surface px-2 text-sm font-semibold"
              >
                {SPEEDS.map((speed) => (
                  <option key={speed} value={speed}>
                    {speed}×
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {showViewSwitch ? (
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              View
              <select
                value={settings.view}
                onChange={(event) => update({ view: event.target.value as typeof settings.view })}
                className="min-h-11 rounded-xl border border-line bg-surface px-2 text-sm font-semibold"
              >
                {AVATAR_VIEWS.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <p
            role="status"
            aria-live="polite"
            className="min-h-6 flex-1 text-xs font-semibold text-ink-soft"
          >
            {snapshot.playing
              ? `Signing: ${snapshot.label}`
              : finishedOnce
                ? 'Finished. Press play to watch again.'
                : snapshot.label
                  ? `Ready: ${snapshot.label}`
                  : 'Nothing queued yet.'}
          </p>
        </div>

        {footer}
      </div>
    </div>
  );
}
