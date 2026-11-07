/**
 * Demo animations: ten motions that exercise every channel, with an explicit warning that
 * none of them has been checked by a deaf signer.
 */
import { useMemo, useState } from 'react';
import { AvatarPlayer } from '../components/avatar/AvatarPlayer';
import { DEMO_ANIMATIONS, DEMO_NOTICE } from '../data/animations';
import { Icon } from '../components/ui/Icon';
import { useSettings } from '../store/settings';

const CHANNEL_LABEL: Record<string, string> = {
  hands: 'Hands',
  arms: 'Arms',
  face: 'Face',
  head: 'Head',
  body: 'Body',
  'two-hands': 'Two hands',
};

export function DemosPage() {
  const { t } = useSettings();
  const [selected, setSelected] = useState(0);
  const [all, setAll] = useState(false);

  const queue = useMemo(
    () => (all ? DEMO_ANIMATIONS : [DEMO_ANIMATIONS[selected] ?? DEMO_ANIMATIONS[0]!]),
    [all, selected],
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t('demos.title')}</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-soft">{t('demos.subtitle')}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div className="space-y-3">
          <AvatarPlayer
            key={queue.map((animation) => animation.id).join('-')}
            animations={queue}
            autoPlay
            onFinished={() => undefined}
          />
          <button type="button" onClick={() => setAll((value) => !value)} className="btn w-full">
            <Icon name={all ? 'play' : 'layers'} />
            {all ? 'Play this one only' : t('demos.playAll')}
          </button>
        </div>

        <div className="space-y-2">
          {DEMO_ANIMATIONS.map((animation, index) => {
            const active = !all && index === selected;
            return (
              <button
                key={animation.id}
                type="button"
                onClick={() => {
                  setAll(false);
                  setSelected(index);
                }}
                aria-pressed={active}
                className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                  active ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:bg-surface-2'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-ink">{animation.label ?? animation.id}</span>
                  <span className="chip shrink-0 text-[11px]">{(animation.duration_ms / 1000).toFixed(1)}s</span>
                </div>
                <p className="mt-1 text-xs leading-snug text-ink-soft">{animation.meta.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(animation.meta.channels ?? []).map((channel) => (
                    <span key={channel} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                      {CHANNEL_LABEL[channel] ?? channel}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <p className="card-flat flex items-start gap-3 text-sm text-ink-soft">
        <Icon name="warning" className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <span>{DEMO_NOTICE}</span>
      </p>
    </div>
  );
}
