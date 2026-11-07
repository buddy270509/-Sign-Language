/**
 * Settings: language, avatar appearance, accessibility, privacy, quality.
 * Everything persists to localStorage on this device only.
 */
import { useState } from 'react';
import { Icon } from '../components/ui/Icon';
import { useSettings, type SkinTone } from '../store/settings';
import { LANGUAGES, dictionaryMeta, REVIEW_LABEL } from '../data';
import { UI_LANGUAGES } from '../i18n/strings';

const SKIN_TONES: Array<{ id: SkinTone; label: string; swatch: string }> = [
  { id: 'tone1', label: 'Tone 1', swatch: '#f4cdb0' },
  { id: 'tone2', label: 'Tone 2', swatch: '#e8b48b' },
  { id: 'tone3', label: 'Tone 3', swatch: '#cf9c74' },
  { id: 'tone4', label: 'Tone 4', swatch: '#a86f4b' },
  { id: 'tone5', label: 'Tone 5', swatch: '#6d4832' },
];

function Section({
  title,
  icon,
  children,
  description,
}: {
  title: string;
  icon: Parameters<typeof Icon>[0]['name'];
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <section className="card">
      <h2 className="flex items-center gap-2 text-lg font-extrabold">
        <Icon name={icon} className="h-5 w-5 text-brand" />
        {title}
      </h2>
      {description ? <p className="mt-1 text-sm text-pretty text-ink-soft">{description}</p> : null}
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-line bg-surface-2 px-3.5 py-3">
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        {hint ? <span className="mt-0.5 block text-sm text-pretty text-ink-soft">{hint}</span> : null}
      </span>
      <span className="relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-line transition-colors peer-checked:bg-brand peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--sb-focus)]" />
        <span className="absolute left-1 h-5 w-5 rounded-full bg-surface shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function SettingsPage() {
  const { settings, update, reset, t } = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);
  const meta = dictionaryMeta(settings.languageTag);

  return (
    <div className="sb-fade-in flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t('settings.title')}</h1>
        <p className="mt-1 text-ink-soft">{t('settings.subtitle')}</p>
      </header>

      <Section title={t('settings.language')} icon="hand" description="Indian Sign Language is the default. The sign format is language-agnostic so more can be added.">
        <div className="space-y-2">
          {LANGUAGES.map((language) => (
            <label
              key={language.tag}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 ${
                language.status === 'available' ? 'border-line bg-surface-2' : 'border-dashed border-line opacity-70'
              }`}
            >
              <input
                type="radio"
                name="sign-language"
                checked={settings.languageTag === language.tag}
                disabled={language.status !== 'available'}
                onChange={() => update({ languageTag: language.tag })}
                className="mt-1 h-5 w-5 accent-[var(--sb-brand)]"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 font-semibold">
                  {language.name}
                  <span className="chip text-xs">{language.tag.toUpperCase()}</span>
                  {language.status === 'planned' ? (
                    <span className="chip text-xs">{t('common.comingSoon')}</span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-sm text-ink-soft">{language.note}</span>
              </span>
            </label>
          ))}
        </div>
        {meta ? (
          <p className="text-sm text-ink-soft">
            Dictionary <strong>v{meta.version}</strong> · updated {meta.updated} ·{' '}
            <span className="chip text-xs">{REVIEW_LABEL[meta.reviewStatus]}</span>
          </p>
        ) : null}
      </Section>

      <Section title={t('settings.uiLanguage')} icon="info" description={t('settings.i18nNote')}>
        <div className="seg" role="group" aria-label={t('settings.uiLanguage')}>
          {UI_LANGUAGES.map((language) => (
            <button
              key={language.id}
              type="button"
              className="seg-item"
              aria-pressed={settings.uiLanguage === language.id}
              onClick={() => update({ uiLanguage: language.id })}
            >
              {language.native}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('settings.avatar')} icon="sparkle">
        <div>
          <span className="label">{t('settings.skinTone')}</span>
          <div className="flex flex-wrap gap-2">
            {SKIN_TONES.map((tone) => (
              <button
                key={tone.id}
                type="button"
                onClick={() => update({ skinTone: tone.id })}
                aria-pressed={settings.skinTone === tone.id}
                aria-label={tone.label}
                className={`flex min-h-12 items-center gap-2 rounded-xl border-2 px-3 font-semibold ${
                  settings.skinTone === tone.id ? 'border-brand bg-brand-soft' : 'border-line bg-surface-2'
                }`}
              >
                <span className="h-6 w-6 rounded-full border border-black/15" style={{ background: tone.swatch }} />
                {tone.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">{t('settings.handedness')}</span>
          <div className="seg" role="group" aria-label={t('settings.handedness')}>
            <button
              type="button"
              className="seg-item"
              aria-pressed={settings.handedness === 'right'}
              onClick={() => update({ handedness: 'right' })}
            >
              {t('settings.handedness.right')}
            </button>
            <button
              type="button"
              className="seg-item"
              aria-pressed={settings.handedness === 'left'}
              onClick={() => update({ handedness: 'left' })}
            >
              {t('settings.handedness.left')}
            </button>
          </div>
          <p className="mt-1 text-sm text-ink-soft">Mirrors the whole figure, so the same sign data works for left-handed signers.</p>
        </div>

        <div>
          <label className="label" htmlFor="default-speed">
            {t('settings.speed')} — {settings.speed.toFixed(2)}×
          </label>
          <input
            id="default-speed"
            type="range"
            min={0.5}
            max={1.75}
            step={0.05}
            value={settings.speed}
            onChange={(event) => update({ speed: Number(event.target.value) })}
            className="h-11 w-full accent-[var(--sb-brand)]"
          />
        </div>

        <Toggle
          label={t('t2s.zoom')}
          hint="Frames the avatar on the face and head so expressions are easier to read."
          checked={settings.faceZoom}
          onChange={(value) => update({ faceZoom: value })}
        />
        <Toggle
          label={t('settings.labels')}
          hint="Shows a plain-language label such as “Eyebrows up = this is a question”."
          checked={settings.showExpressionLabels}
          onChange={(value) => update({ showExpressionLabels: value })}
        />
        <Toggle
          label={t('settings.debug')}
          hint="Draws the 21 landmarks per hand that the recognition pipeline will produce."
          checked={settings.showLandmarks}
          onChange={(value) => update({ showLandmarks: value })}
        />
      </Section>

      <Section title="Accessibility" icon="eye">
        <div>
          <span className="label">{t('settings.contrast')}</span>
          <div className="seg" role="group" aria-label={t('settings.contrast')}>
            <button
              type="button"
              className="seg-item"
              aria-pressed={settings.contrast === 'default'}
              onClick={() => update({ contrast: 'default' })}
            >
              {t('settings.contrast.default')}
            </button>
            <button
              type="button"
              className="seg-item"
              aria-pressed={settings.contrast === 'high'}
              onClick={() => update({ contrast: 'high' })}
            >
              {t('settings.contrast.high')}
            </button>
          </div>
        </div>
        <Toggle
          label={t('settings.motion')}
          hint="Stops the avatar's idle sway. Follows your system setting by default."
          checked={settings.reducedMotion}
          onChange={(value) => update({ reducedMotion: value })}
        />
        <p className="text-sm text-ink-soft">
          All controls are at least 44 px tall, every icon has a text label or an accessible name, and nothing
          flashes or auto-scrolls.
        </p>
      </Section>

      <Section title={t('settings.privacyTitle')} icon="shield">
        <p className="text-sm text-pretty text-ink-soft">{t('settings.privacyBody')}</p>
        <p className="text-sm text-pretty text-ink-soft">
          Recordings for the data-collection phase will require explicit consent, will be stored locally first, and
          will never be uploaded automatically.
        </p>
      </Section>

      <Section title={t('settings.qualityTitle')} icon="check">
        <p className="text-sm text-pretty text-ink-soft">{t('settings.qualityBody')}</p>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-center gap-2">
            <span className="chip text-xs">draft</span> {REVIEW_LABEL.draft}
          </li>
          <li className="flex items-center gap-2">
            <span className="chip text-xs">reviewed</span> {REVIEW_LABEL.reviewed}
          </li>
          <li className="flex items-center gap-2">
            <span className="chip text-xs">supported</span> {REVIEW_LABEL.supported}
          </li>
        </ul>
        <p className="text-sm text-ink-soft">
          Every handshape in this build is <strong>draft</strong>: the review sheet is generated with{' '}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">npm run render:avatar</code> and is waiting for a
          fluent deaf signer.
        </p>
      </Section>

      <Section title={t('settings.disclaimerTitle')} icon="warning">
        <p className="flex items-start gap-2 rounded-xl bg-accent-soft px-3.5 py-3 text-sm text-pretty text-accent">
          <Icon name="warning" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
          {t('disclaimer.short')}
        </p>
      </Section>

      <Section title="About" icon="info">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-ink-soft">{t('settings.version')}</dt>
          <dd className="font-semibold">SignBridge 0.1.0 · Phase 1</dd>
          <dt className="text-ink-soft">Avatar</dt>
          <dd className="font-semibold">2D SVG rig → 21 landmarks/hand</dd>
          <dt className="text-ink-soft">Storage</dt>
          <dd className="font-semibold">localStorage settings, IndexedDB in Phase 9</dd>
        </dl>
        <div className="flex flex-wrap gap-2">
          {!confirmReset ? (
            <button type="button" className="btn" onClick={() => setConfirmReset(true)}>
              {t('settings.reset')}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  reset();
                  setConfirmReset(false);
                }}
              >
                Yes, reset everything
              </button>
              <button type="button" className="btn" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </>
          )}
        </div>
      </Section>
    </div>
  );
}
