/**
 * Text → Sign (Phase 1): fingerspelling with a full expressive body.
 *
 * The page wires together the text processor, the sign player and the renderer, and
 * surfaces the learning aids: current sign, sentence type, the non-manual marker that
 * is being performed, and a fingerspelling tray so the alphabet can be practised.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AvatarStage } from '../components/avatar/AvatarStage';
import { Icon } from '../components/ui/Icon';
import { useSignPlayer } from '../hooks/useSignPlayer';
import { useSettings } from '../store/settings';
import { buildPlaylist, buildScript, SENTENCE_MARKERS } from '../core/text/script';
import { EXPRESSION_PRESETS, type ExpressionId } from '../core/rig/presets';
import { listSigns, REVIEW_LABEL } from '../data';

const SAMPLES = ['Hello', 'Asha', 'Water 2', 'Is it ok?', 'No 3'];

const EXPRESSION_CHOICES: Array<{ id: ExpressionId | null; label: string }> = [
  { id: null, label: 'Auto' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'happy', label: 'Happy' },
  { id: 'question', label: 'Yes/no Q' },
  { id: 'negative', label: 'Negative' },
];

export function TextToSignPage() {
  const { settings, update, t } = useSettings();
  const [draft, setDraft] = useState('Hello');
  const [submitted, setSubmitted] = useState('Hello');
  const [nonce, setNonce] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const script = useMemo(() => buildScript(submitted, settings.languageTag), [submitted, settings.languageTag]);
  const playlist = useMemo(
    () =>
      buildPlaylist(script).map((entry) => ({
        sign: entry.sign,
        tokenIndex: entry.tokenIndex,
        label: entry.token.source,
      })),
    [script],
  );

  const marker = SENTENCE_MARKERS[script.sentenceType];
  const autoExpression = marker.expression;
  const expression: ExpressionId = settings.expression ?? autoExpression;

  const player = useSignPlayer(playlist, {
    speed: settings.speed,
    loop: settings.loop,
    expression,
  });

  // Replay whenever the user submits new text (or taps a sample).
  const replayRef = useRef(player.replay);
  replayRef.current = player.replay;
  useEffect(() => {
    if (nonce === 0) return;
    replayRef.current();
  }, [nonce]);

  const submit = (value?: string) => {
    const next = (value ?? draft).trim();
    if (!next) return;
    setSubmitted(next);
    setDraft(next);
    setNonce((n) => n + 1);
  };

  const activeTokenIndex = playlist[player.index]?.tokenIndex ?? 0;
  const activeSign = playlist[player.index]?.sign;
  const activeToken = script.tokens[activeTokenIndex];
  const fingerspelled = activeToken?.fingerspelled;

  const preset = EXPRESSION_PRESETS[expression] ?? EXPRESSION_PRESETS.neutral;
  const expressionExplanation = settings.expression ? preset.explanation : marker.explanation;
  const expressionChips = settings.expression ? preset.markers : marker.markers;

  const letters = useMemo(() => listSigns(settings.languageTag), [settings.languageTag]);

  const append = (char: string) => {
    setDraft((prev) => (prev.length > 60 ? prev : prev + char));
    textareaRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName)) return;
    if (target.isContentEditable) return;
    if (event.code === 'Space') {
      event.preventDefault();
      player.toggle();
    }
  };

  return (
    <div className="sb-fade-in" onKeyDown={onKeyDown}>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{t('t2s.title')}</h1>
          <p className="mt-1 max-w-2xl text-ink-soft">{t('t2s.subtitle')}</p>
        </div>
        <span className="chip">
          <Icon name="sparkle" className="h-4 w-4" /> Phase 1 · fingerspelling
        </span>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        {/* ---------------- stage ---------------- */}
        <section aria-label="Avatar" className="lg:sticky lg:top-20 lg:self-start">
          <AvatarStage
            frame={player.frame}
            label={
              activeSign
                ? `Avatar signing ${activeSign.displayLabel}${fingerspelled ? ` as part of ${activeToken?.source}` : ''}`
                : 'Avatar at rest'
            }
            currentSign={activeSign?.displayLabel}
            zoom={settings.faceZoom}
            onToggleZoom={() => update({ faceZoom: !settings.faceZoom })}
            showLandmarks={settings.showLandmarks}
            mirrored={settings.handedness === 'left'}
            still={settings.reducedMotion}
            caption={
              settings.showExpressionLabels ? (
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                    <Icon name="eye" className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold tracking-wider text-ink-soft uppercase">
                      What the face is doing
                    </p>
                    <p className="text-sm leading-snug font-medium text-pretty">{expressionExplanation}</p>
                  </div>
                </div>
              ) : undefined
            }
          >
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-line/60">
              <div
                className="h-full bg-brand transition-[width] duration-100"
                style={{ width: `${Math.round(player.totalProgress * 100)}%` }}
              />
            </div>
          </AvatarStage>

          {/* transport controls */}
          <div className="card mt-3 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-sm"
                onClick={player.previous}
                aria-label={t('common.previous')}
                disabled={player.index <= 0}
              >
                <Icon name="skipBack" className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="btn btn-primary btn-lg flex-1"
                onClick={player.toggle}
                disabled={!player.canPlay}
              >
                <Icon name={player.isPlaying ? 'pause' : 'play'} filled={!player.isPlaying} className="h-6 w-6" />
                {player.isPlaying ? t('common.pause') : t('common.play')}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={player.next}
                aria-label={t('common.next')}
                disabled={player.index >= playlist.length - 1}
              >
                <Icon name="skipForward" className="h-5 w-5" />
              </button>
              <button type="button" className="btn btn-sm" onClick={player.replay} aria-label={t('common.replay')}>
                <Icon name="replay" className="h-5 w-5" />
                <span className="hidden sm:inline">{t('common.replay')}</span>
              </button>
              <button
                type="button"
                className="btn btn-sm"
                aria-pressed={settings.loop}
                onClick={() => update({ loop: !settings.loop })}
              >
                <Icon name="loop" className="h-5 w-5" />
                <span className="hidden sm:inline">{t('common.loop')}</span>
                <span className="sr-only">{settings.loop ? '(on)' : '(off)'}</span>
              </button>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <label htmlFor="speed" className="text-sm font-semibold whitespace-nowrap">
                {t('common.speed')}
              </label>
              <input
                id="speed"
                type="range"
                min={0.5}
                max={1.75}
                step={0.05}
                value={settings.speed}
                onChange={(event) => update({ speed: Number(event.target.value) })}
                className="h-11 flex-1 accent-[var(--sb-brand)]"
              />
              <output htmlFor="speed" className="w-12 text-right text-sm font-bold tabular-nums">
                {settings.speed.toFixed(2)}×
              </output>
            </div>

            <p aria-live="polite" className="sr-only">
              {player.isPlaying ? `Signing ${activeToken?.source ?? ''}` : 'Paused'}
            </p>
          </div>

          {/* sentence type + markers */}
          <div className="card-flat mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-ink-soft uppercase">Sentence type</span>
              <span className="chip chip-active">{marker.label}</span>
              <span className="text-sm text-ink-soft">
                {settings.expression ? 'expression set manually' : t('t2s.autoMode')}
              </span>
            </div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {expressionChips.map((chip) => (
                <li key={chip} className="chip bg-surface text-xs">
                  {chip}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------- input side ---------------- */}
        <section className="flex flex-col gap-4">
          <form
            className="card"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <label htmlFor="text-input" className="label">
              Your text
            </label>
            <textarea
              id="text-input"
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              maxLength={120}
              placeholder={t('t2s.placeholder')}
              className="field resize-none"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="submit" className="btn btn-primary min-h-12 flex-1">
                <Icon name="hand" className="h-5 w-5" />
                {t('t2s.sign')}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setDraft('');
                  setSubmitted('');
                }}
              >
                {t('common.clear')}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SAMPLES.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  className="chip hover:bg-surface-2"
                  onClick={() => submit(sample)}
                >
                  {sample}
                </button>
              ))}
            </div>
          </form>

          {/* token / gloss line */}
          <div className="card">
            <h2 className="label">Sign sequence</h2>
            {script.tokens.length === 0 ? (
              <p className="text-ink-soft">{t('t2s.empty')}</p>
            ) : (
              <ol className="flex flex-wrap gap-1.5">
                {script.tokens.map((token, index) => {
                  const active = index === activeTokenIndex;
                  const empty = token.signs.length === 0;
                  return (
                    <li key={`${token.source}-${index}`}>
                      <button
                        type="button"
                        onClick={() => {
                          const first = playlist.findIndex((entry) => entry.tokenIndex === index);
                          if (first >= 0) player.playIndex(first);
                        }}
                        className={`flex min-h-11 flex-col items-start justify-center rounded-xl border px-3 py-1.5 text-left transition-colors ${
                          active
                            ? 'border-transparent bg-brand text-[color:var(--sb-brand-ink)]'
                            : empty
                              ? 'border-danger/40 bg-danger-soft text-danger'
                              : 'border-line bg-surface-2 text-ink hover:bg-surface'
                        }`}
                        aria-current={active ? 'true' : undefined}
                      >
                        <span className="text-base font-bold">{token.source}</span>
                        <span className="text-[11px] font-medium opacity-80">
                          {empty
                            ? 'no sign yet'
                            : token.signs.length > 1
                              ? token.signs.map((s) => s.displayLabel).join(' · ')
                              : 'whole word'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}

            {script.tokens.some((token) => token.signs.length === 0) ? (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
                <Icon name="warning" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                {script.tokens.find((token) => token.signs.length === 0)?.reason}
              </p>
            ) : null}

            <p className="mt-3 text-sm text-ink-soft">{t('t2s.preview')}</p>
          </div>

          {/* expression chooser */}
          <div className="card">
            <h2 className="label">{t('t2s.expression')}</h2>
            <div className="seg" role="group" aria-label={t('t2s.expression')}>
              {EXPRESSION_CHOICES.map((choice) => (
                <button
                  key={choice.label}
                  type="button"
                  className="seg-item"
                  aria-pressed={settings.expression === choice.id}
                  onClick={() => update({ expression: choice.id })}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              {settings.expression
                ? EXPRESSION_PRESETS[settings.expression].explanation
                : `${marker.label} — ${marker.explanation}`}
            </p>
          </div>

          {/* fingerspelling tray */}
          <div className="card">
            <h2 className="label">{t('t2s.letters')}</h2>
            <div className="grid grid-cols-7 gap-1.5 sm:grid-flow-col sm:grid-cols-none sm:grid-rows-6">
              {letters.map((sign) => {
                const index = playlist.findIndex((entry) => entry.sign.id === sign.id);
                return (
                  <button
                    key={sign.id}
                    type="button"
                    onClick={() => (index >= 0 ? player.playIndex(index) : append(sign.displayLabel))}
                    className="flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface-2 text-base font-bold text-ink hover:bg-surface"
                    aria-label={`Sign ${sign.displayLabel} (${REVIEW_LABEL[sign.reviewStatus] ?? sign.reviewStatus})`}
                    title={sign.handshape}
                  >
                    {sign.displayLabel}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-1.5">
              <button type="button" className="btn btn-sm flex-1" onClick={() => append(' ')}>
                Space
              </button>
              <button
                type="button"
                className="btn btn-sm flex-1"
                onClick={() => setDraft((prev) => prev.slice(0, -1))}
              >
                ⌫ Delete
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              Tapping a letter signs it. This dictionary is still{' '}
              <strong>{REVIEW_LABEL.draft?.toLowerCase()}</strong> — see Settings → Quality.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
