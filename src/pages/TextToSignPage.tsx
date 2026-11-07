/**
 * Text → fingerspelling.
 *
 * Phase 2 scope: letters and digits only. There is no dictionary of whole words and no
 * grammar engine yet, and the page says so instead of pretending otherwise.
 */
import { useMemo, useState } from 'react';
import { AvatarPlayer } from '../components/avatar/AvatarPlayer';
import { Segmented } from '../components/ui/Controls';
import { Icon } from '../components/ui/Icon';
import { MAX_CHARACTERS, planFingerspelling, SAMPLE_TEXTS } from '../core/text/fingerspell';
import { EXPRESSION_IDS, EXPRESSIONS } from '../core/rig/face';
import { useSettings } from '../store/settings';

export function TextToSignPage() {
  const { t, settings, update } = useSettings();
  const [text, setText] = useState('Hello');
  const [submitted, setSubmitted] = useState('Hello');

  const plan = useMemo(() => planFingerspelling(submitted), [submitted]);
  const queueKey = plan.characters.join('');

  const expressionOptions = useMemo(
    () => EXPRESSION_IDS.map((id) => ({ id, label: EXPRESSIONS[id]?.label ?? id })),
    [],
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t('t2s.title')}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t('t2s.subtitle')}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div className="space-y-3">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitted(text);
            }}
            className="card space-y-3"
          >
            <label htmlFor="t2s-input" className="block text-sm font-semibold text-ink">
              What should the avatar fingerspell?
            </label>
            <textarea
              id="t2s-input"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={MAX_CHARACTERS * 2}
              rows={2}
              placeholder={t('t2s.placeholder')}
              className="w-full resize-none rounded-xl border border-line bg-surface-2 px-3 py-2 text-base text-ink"
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn btn-primary flex-1">
                <Icon name="hand" /> {t('t2s.sign')}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setText('');
                  setSubmitted('');
                }}
              >
                {t('common.clear')}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_TEXTS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  className="chip"
                  onClick={() => {
                    setText(sample);
                    setSubmitted(sample);
                  }}
                >
                  {sample}
                </button>
              ))}
            </div>
          </form>

          <div className="card-flat space-y-3">
            <Segmented
              label={t('t2s.expression')}
              value={settings.overlayWeight > 0 ? settings.overlayExpression : 'neutral'}
              options={expressionOptions}
              onChange={(value) => update({ overlayExpression: value, overlayWeight: value === 'neutral' ? 0 : 0.6 })}
              hint="Emotions are layered over the sign and leave the sign's own mouth shape alone."
            />
            <Segmented
              label="Signing hand"
              value={settings.handedness}
              options={[
                { id: 'right', label: 'Right-handed' },
                { id: 'left', label: 'Left-handed (mirror)' },
              ]}
              onChange={(value) => update({ handedness: value })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <AvatarPlayer key={queueKey || 'empty'} animations={plan.animations} autoPlay={Boolean(queueKey)} />

          <div className="card-flat">
            <p className="text-xs font-bold tracking-wide text-ink-soft uppercase">Queue</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {plan.characters.length === 0 ? (
                <span className="text-sm text-ink-soft">{t('t2s.empty')}</span>
              ) : (
                plan.characters.map((character, index) => (
                  <span
                    key={`${character}-${index}`}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-sm font-bold text-ink"
                  >
                    {character}
                  </span>
                ))
              )}
            </div>
            {plan.skipped.length > 0 ? (
              <p className="mt-2 text-xs text-accent">
                Skipped (no animation yet): <strong>{plan.skipped.join(' ')}</strong>
              </p>
            ) : null}
          </div>

          <p className="card-flat flex items-start gap-3 text-sm text-ink-soft">
            <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <span>{t('t2s.preview')}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
