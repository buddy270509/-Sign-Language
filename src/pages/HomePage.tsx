/**
 * Home: what this build does today, with a live avatar you can drive immediately.
 */
import { Link } from 'react-router-dom';
import { AvatarPlayer } from '../components/avatar/AvatarPlayer';
import { DEMO_ANIMATIONS } from '../data/animations';
import { HANDSHAPES } from '../core/rig/handshapes';
import { Icon, type IconName } from '../components/ui/Icon';
import { useSettings } from '../store/settings';

const FEATURES: Array<{ icon: IconName; title: string; body: string; to: string; cta: string }> = [
  {
    icon: 'hand',
    title: 'Five channels, five controls',
    body: 'Hands and arms, face, head and body each have their own track with their own timing, so they can move together without fighting.',
    to: '/demos',
    cta: 'See the demo motions',
  },
  {
    icon: 'grid',
    title: `${HANDSHAPES.length} handshapes`,
    body: 'Every handshape is a set of finger joint angles with anatomical limits, so fingers never bend backwards.',
    to: '/gallery',
    cta: 'Open the handshape gallery',
  },
  {
    icon: 'pencil',
    title: 'Sign Studio',
    body: 'Author your own animation: place keyframes per track on a timeline, preview live, then export the JSON.',
    to: '/studio',
    cta: 'Open Sign Studio',
  },
  {
    icon: 'camera',
    title: 'Sign to text — not yet',
    body: 'Recognition is Phase 4. The camera screen explains exactly how it will work and lets you check framing and light locally, with nothing recorded.',
    to: '/camera',
    cta: 'Open the camera screen',
  },
];

export function HomePage() {
  const { t } = useSettings();

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="space-y-4">
          <p className="chip">
            <Icon name="sparkle" className="h-4 w-4" /> Phase 2 · Full avatar engine
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-pretty sm:text-4xl">
            {t('home.title')}
          </h1>
          <p className="max-w-prose text-base text-ink-soft">{t('home.intro')}</p>

          <div className="flex flex-wrap gap-2">
            <Link to="/text-to-sign" className="btn btn-primary btn-lg">
              <Icon name="hand" /> {t('home.cta.try')}
            </Link>
            <Link to="/demos" className="btn btn-lg">
              <Icon name="layers" /> Demo motions
            </Link>
          </div>

          <div className="card-flat text-sm text-ink-soft">
            <p className="flex items-start gap-2">
              <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <span>
                This build animates <strong className="text-ink">fingerspelling</strong> and{' '}
                <strong className="text-ink">10 demo motions</strong>. It has no dictionary of whole-word signs
                and no grammar yet — that is Phase 3. Every demo clip is marked “not verified by a deaf signer”.
              </span>
            </p>
          </div>
        </div>

        <AvatarPlayer animations={DEMO_ANIMATIONS} showScrubber={false} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <Link key={feature.to} to={feature.to} className="card group flex flex-col gap-2 no-underline">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <Icon name={feature.icon} />
            </span>
            <h2 className="text-base font-bold text-ink">{feature.title}</h2>
            <p className="flex-1 text-sm text-ink-soft">{feature.body}</p>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
              {feature.cta} <Icon name="arrowRight" className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </section>

      <section className="card">
        <h2 className="text-lg font-bold">How the engine is put together</h2>
        <ol className="mt-3 space-y-2 text-sm text-ink-soft">
          <li>
            <strong className="text-ink">Data → rig → renderer.</strong> Animations are JSON keyframes. The rig turns
            them into joint angles with limits enforced, and only then does anything get drawn. Swapping SVG for
            Three.js later touches just the renderer.
          </li>
          <li>
            <strong className="text-ink">21 landmarks per hand.</strong> Hands use the same landmark ordering as
            MediaPipe Hands, so the avatar and the future camera pipeline speak the same language.
          </li>
          <li>
            <strong className="text-ink">Overlays, not overrides.</strong> A sentence-level emotion is layered over a
            sign and is not allowed to touch the mouth by default — signers change their mouth shape as part of the
            sign.
          </li>
        </ol>
      </section>
    </div>
  );
}
