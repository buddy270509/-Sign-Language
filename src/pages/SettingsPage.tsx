/**
 * Settings. Everything is device-local and every option has a visible effect — no dead
 * switches.
 */
import { Link } from 'react-router-dom';
import { Fieldset, RangeField, Segmented, Toggle } from '../components/ui/Controls';
import { Icon } from '../components/ui/Icon';
import { OUTFITS, useSettings, type Contrast, type SkinTone } from '../store/settings';
import { EXPRESSIONS, EXPRESSION_IDS } from '../core/rig/face';
import { LANGUAGES } from '../data';
import { UI_LANGUAGES } from '../i18n/strings';
import { AVATAR_VIEWS } from '../components/avatar/types';

const SKIN_TONES: Array<{ id: SkinTone; label: string; swatch: string }> = [
  { id: 'tone1', label: 'Tone 1', swatch: '#f4cdb0' },
  { id: 'tone2', label: 'Tone 2', swatch: '#e8b48b' },
  { id: 'tone3', label: 'Tone 3', swatch: '#cf9c74' },
  { id: 'tone4', label: 'Tone 4', swatch: '#a86f4b' },
  { id: 'tone5', label: 'Tone 5', swatch: '#6d4832' },
];

export function SettingsPage() {
  const { settings, update, reset, t } = useSettings();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t('settings.subtitle')}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Fieldset legend={t('settings.language')}>
          <label className="block text-sm font-semibold text-ink">
            {t('settings.language')}
            <select
              value={settings.languageTag}
              onChange={(event) => update({ languageTag: event.target.value })}
              className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-2 text-sm"
            >
              {LANGUAGES.map((language) => (
                <option key={language.tag} value={language.tag} disabled={language.status !== 'available'}>
                  {language.name}
                  {language.status !== 'available' ? ' (planned)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-ink">
            {t('settings.uiLanguage')}
            <select
              value={settings.uiLanguage}
              onChange={(event) => update({ uiLanguage: event.target.value as typeof settings.uiLanguage })}
              className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-2 text-sm"
            >
              {UI_LANGUAGES.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.native}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-ink-soft">{t('settings.i18nNote')}</p>
        </Fieldset>

        <Fieldset legend={t('settings.avatar')} hint="Skin tone, outfit and style are deliberately separate so you can keep the figure readable against the background.">
          <Segmented
            label={t('settings.avatarStyle')}
            value={settings.avatarStyle}
            options={[
              { id: 'human', label: t('settings.avatarStyle.human') },
              { id: 'stick', label: t('settings.avatarStyle.stick') },
            ]}
            onChange={(value) => update({ avatarStyle: value })}
          />

          <div>
            <span className="text-sm font-semibold text-ink">{t('settings.skinTone')}</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {SKIN_TONES.map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => update({ skinTone: tone.id })}
                  aria-pressed={settings.skinTone === tone.id}
                  aria-label={tone.label}
                  className={`h-11 w-11 rounded-full border-2 ${
                    settings.skinTone === tone.id ? 'border-[var(--sb-ink)]' : 'border-line'
                  }`}
                  style={{ background: tone.swatch }}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="text-sm font-semibold text-ink">{t('settings.outfit')}</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {OUTFITS.map((outfit) => (
                <button
                  key={outfit.id}
                  type="button"
                  onClick={() => update({ outfit: outfit.id })}
                  aria-pressed={settings.outfit === outfit.id}
                  className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold ${
                    settings.outfit === outfit.id ? 'border-[var(--sb-ink)] bg-surface-2' : 'border-line'
                  }`}
                >
                  <span className="h-4 w-4 rounded-full border border-line" style={{ background: outfit.swatch }} />
                  {outfit.label}
                </button>
              ))}
            </div>
          </div>

          <Segmented
            label={t('settings.view')}
            value={settings.view}
            options={AVATAR_VIEWS.map((view) => ({ id: view.id, label: view.label, description: view.description }))}
            onChange={(value) => update({ view: value })}
          />

          <Toggle
            label={t('settings.debug')}
            checked={settings.showLandmarks}
            onChange={(value) => update({ showLandmarks: value })}
            hint="Draws the 21 MediaPipe landmarks on each hand."
          />
          <Toggle
            label={t('settings.labels')}
            checked={settings.showLabels}
            onChange={(value) => update({ showLabels: value })}
            hint="Plain-language description of the face marker, on the stage."
          />
          <Toggle
            label={t('settings.fps')}
            checked={settings.showFps}
            onChange={(value) => update({ showFps: value })}
            hint="Live frame rate, for checking smoothness on your device."
          />
        </Fieldset>

        <Fieldset legend="Playback">
          <Segmented
            label={t('settings.speed')}
            value={String(settings.speed)}
            options={[0.25, 0.5, 1, 1.5, 2].map((speed) => ({ id: String(speed), label: `${speed}×` }))}
            onChange={(value) => update({ speed: Number(value) })}
          />
          <Segmented
            label={t('settings.handedness')}
            value={settings.handedness}
            options={[
              { id: 'right', label: 'Right-handed' },
              { id: 'left', label: 'Left-handed' },
            ]}
            onChange={(value) => update({ handedness: value })}
            hint="Left-handed mode mirrors the whole performance, not just the hands."
          />
          <Toggle
            label={t('common.loop')}
            checked={settings.loop !== 'off'}
            onChange={(value) => update({ loop: value ? 'all' : 'off' })}
            hint="Repeat the queue when it reaches the end."
          />
          <RangeField
            label={t('settings.transition')}
            value={settings.transitionMs}
            min={150}
            max={250}
            step={10}
            onChange={(value) => update({ transitionMs: value })}
            format={(value) => `${value} ms`}
            hint="Cross-fade between two signs. Shorter is snappier, longer is smoother."
          />
        </Fieldset>

        <Fieldset
          legend={t('settings.overlay')}
          hint="One expression laid over every sign — how sentence-level non-manual markers work."
        >
          <label className="block text-sm font-semibold text-ink">
            {t('settings.overlay')}
            <select
              value={settings.overlayExpression}
              onChange={(event) => update({ overlayExpression: event.target.value })}
              className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-2 text-sm"
            >
              {EXPRESSION_IDS.map((id) => (
                <option key={id} value={id}>
                  {EXPRESSIONS[id]?.label ?? id}
                </option>
              ))}
            </select>
          </label>
          <RangeField
            label={t('settings.overlayWeight')}
            value={settings.overlayWeight}
            min={0}
            max={1}
            step={0.05}
            onChange={(value) => update({ overlayWeight: value })}
            format={(value) => (value === 0 ? 'off' : value.toFixed(2))}
          />
          <p className="text-xs text-ink-soft">
            The overlay is masked: it can move the brows, eyes, cheeks and nose, but leaves the mouth to the sign
            itself (unless the sign does not use the mouth at all).
          </p>
        </Fieldset>

        <Fieldset legend="Accessibility">
          <Segmented
            label={t('settings.contrast')}
            value={settings.contrast}
            options={[
              { id: 'default', label: t('settings.contrast.default') },
              { id: 'high', label: t('settings.contrast.high') },
            ]}
            onChange={(value) => update({ contrast: value as Contrast })}
            hint="High contrast switches to a black canvas with yellow accents and heavier outlines."
          />
          <Toggle
            label={t('settings.motion')}
            checked={settings.reducedMotion}
            onChange={(value) => update({ reducedMotion: value })}
            hint={t('settings.motionBody')}
          />
        </Fieldset>

        <Fieldset legend="Privacy and quality">
          <p className="flex items-start gap-2 text-sm text-ink-soft">
            <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <span>{t('settings.privacyBody')}</span>
          </p>
          <p className="text-sm text-ink-soft">{t('settings.qualityBody')}</p>
          <p className="flex items-start gap-2 text-sm text-ink-soft">
            <Icon name="warning" className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <span>{t('disclaimer.short')}</span>
          </p>
          <p className="text-xs text-ink-soft">
            {t('settings.version')}: 0.2.0 · <Link to="/demos" className="font-semibold text-brand">demo motions</Link>
          </p>
          <button type="button" className="btn" onClick={reset}>
            {t('settings.reset')}
          </button>
        </Fieldset>
      </div>
    </div>
  );
}
