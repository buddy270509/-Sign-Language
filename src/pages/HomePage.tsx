/**
 * Home: what the app is, what Phase 1 actually delivers (no over-claiming), and the
 * roadmap. The live avatar is the same engine used in Text to Sign.
 */
import { Link } from 'react-router-dom';
import { AvatarStage } from '../components/avatar/AvatarStage';
import { Icon, type IconName } from '../components/ui/Icon';
import { useSignPlayer } from '../hooks/useSignPlayer';
import { useSettings } from '../store/settings';
import { dictionaryMeta } from '../data';

const FEATURES: Array<{ icon: IconName; title: string; body: string }> = [
  { icon: 'hand', title: 'home.f1.title', body: 'home.f1.body' },
  { icon: 'eye', title: 'home.f2.title', body: 'home.f2.body' },
  { icon: 'sparkle', title: 'home.f3.title', body: 'home.f3.body' },
  { icon: 'shield', title: 'home.f4.title', body: 'home.f4.body' },
];

const PHASES: Array<{ n: number; title: string; status: 'done' | 'next' | 'planned' }> = [
  { n: 1, title: 'Foundation + expressive fingerspelling avatar', status: 'done' },
  { n: 2, title: 'Full avatar engine (hands, face, head, body)', status: 'next' },
  { n: 3, title: 'Text-to-Sign v1: 100 words, grammar, short sentences', status: 'planned' },
  { n: 4, title: 'Camera + landmark pipeline, alphabet recognition', status: 'planned' },
  { n: 5, title: 'Single-word sign recognition (50–100 signs)', status: 'planned' },
  { n: 6, title: '3–4 word sentences with facial expressions', status: 'planned' },
  { n: 7, title: 'Up to 8-word sentences + correction feedback loop', status: 'planned' },
  { n: 8, title: 'Conversation mode + speech in/out', status: 'planned' },
  { n: 9, title: 'Learning mode, data collection, offline PWA', status: 'planned' },
  { n: 10, title: 'Testing with deaf users, accuracy hardening, vocabulary', status: 'planned' },
];

const NO_SIGNS: never[] = [];

export function HomePage() {
  const { settings, update, t } = useSettings();
  const player = useSignPlayer(NO_SIGNS, { expression: 'happy' });
  const meta = dictionaryMeta(settings.languageTag);

  return (
    <div className="sb-fade-in flex flex-col gap-8">
      <section className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div>
          <span className="chip mb-4">
            <Icon name="sparkle" className="h-4 w-4 text-brand" /> Phase 1 · {meta?.languageName ?? 'Indian Sign Language'}
          </span>
          <h1 className="text-3xl leading-[1.1] font-extrabold sm:text-4xl">{t('home.title')}</h1>
          <p className="mt-3 max-w-xl text-lg text-pretty text-ink-soft">{t('home.intro')}</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link to="/text-to-sign" className="btn btn-primary btn-lg">
              <Icon name="hand" className="h-5 w-5" />
              {t('home.cta.try')}
            </Link>
            <Link to="/camera" className="btn btn-lg">
              <Icon name="camera" className="h-5 w-5" />
              {t('home.cta.camera')}
            </Link>
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-accent-soft px-3.5 py-3 text-sm text-pretty text-accent">
            <Icon name="warning" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
            {t('disclaimer.short')}
          </p>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <AvatarStage
            frame={player.frame}
            label="Sign language avatar at rest, smiling"
            zoom={settings.faceZoom}
            onToggleZoom={() => update({ faceZoom: !settings.faceZoom })}
            still={settings.reducedMotion}
            caption={<p className="text-sm font-medium">Live avatar · 21 landmarks per hand</p>}
          />
          <p className="mt-2 text-center text-sm text-ink-soft">
            Every hand is a real 21-point rig, not an image sequence.
          </p>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold">{t('home.phaseTitle')}</h2>
          <span className="chip">{settings.languageTag.toUpperCase()} · draft dictionary</span>
        </div>
        <p className="mt-2 text-pretty text-ink-soft">{t('home.phaseBody')}</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            'Fingerspelling A–Z and 0–9 with a visible face',
            'Neutral, happy, yes/no question, wh-question and negative expressions',
            'Head nod, shake and tilt; torso lean; speed control',
            'Face zoom, 21-landmark overlay, high contrast, English/Hindi/Marathi shell',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <Icon name="check" className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">{t('home.expressiveTitle')}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="card-flat">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon name={feature.icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-2.5 font-bold">{t(feature.title as 'home.f1.title')}</h3>
              <p className="mt-1 text-sm text-pretty text-ink-soft">{t(feature.body as 'home.f1.body')}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold">{t('home.roadmapTitle')}</h2>
          <Link to="/settings" className="link text-sm">
            About this build
          </Link>
        </div>
        <p className="mt-1 text-sm text-ink-soft">{t('home.roadmapBody')}</p>
        <ol className="mt-3 divide-y divide-line">
          {PHASES.map((phase) => (
            <li key={phase.n} className="flex items-center gap-3 py-2.5">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${
                  phase.status === 'done'
                    ? 'bg-brand text-[color:var(--sb-brand-ink)]'
                    : phase.status === 'next'
                      ? 'bg-accent-soft text-accent'
                      : 'bg-surface-2 text-ink-soft'
                }`}
              >
                {phase.n}
              </span>
              <span className={`flex-1 text-sm ${phase.status === 'done' ? 'font-semibold' : 'text-ink-soft'}`}>
                {phase.title}
              </span>
              {phase.status === 'done' ? (
                <span className="chip chip-active text-xs">this build</span>
              ) : phase.status === 'next' ? (
                <span className="chip text-xs">next</span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="card-flat flex items-start gap-3">
        <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <div>
          <h2 className="font-bold">{t('disclaimer.title')}</h2>
          <p className="mt-1 text-sm text-pretty text-ink-soft">{t('disclaimer.short')}</p>
        </div>
      </section>
    </div>
  );
}
