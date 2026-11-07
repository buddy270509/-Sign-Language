/**
 * Animation registry.
 *
 * All signing content is JSON in `src/data/animations/`. Files are imported statically so
 * the whole app works offline and the data is type-checked at build time; `npm run
 * check:animations` validates every file against the schema.
 */
import type { SignAnimation, SignAnimationBundle } from '../../types/animation';
import fingerspellingBundle from './fingerspelling.json';
import demoHello from './demo-hello.json';
import demoTwoHandOpen from './demo-two-hand-open.json';
import demoThankYou from './demo-thank-you.json';
import demoYes from './demo-yes.json';
import demoNo from './demo-no.json';
import demoQuestion from './demo-question.json';
import demoAllChannels from './demo-all-channels.json';
import demoCount123 from './demo-count-123.json';
import demoBigSmall from './demo-big-small.json';
import demoEmphasis from './demo-emphasis.json';

const asAnimation = (value: unknown) => value as SignAnimation;

/** Fingerspelling A–Z and 0–9 (draft, unreviewed). */
export const FINGERSPELLING_ANIMATIONS: SignAnimation[] = (
  fingerspellingBundle as unknown as SignAnimationBundle
).animations.map(asAnimation);

/**
 * The ten demo animations. Each one is a *motion study*, not a verified sign: see
 * `DEMO_NOTICE` and the `meta.reviewed_by_deaf_signer` flag in every file.
 */
export const DEMO_ANIMATIONS: SignAnimation[] = [
  asAnimation(demoHello),
  asAnimation(demoTwoHandOpen),
  asAnimation(demoThankYou),
  asAnimation(demoYes),
  asAnimation(demoNo),
  asAnimation(demoQuestion),
  asAnimation(demoAllChannels),
  asAnimation(demoCount123),
  asAnimation(demoBigSmall),
  asAnimation(demoEmphasis),
];

export const DEMO_NOTICE =
  'Demo motions, not verified by a deaf signer. They show what the engine can do — do not treat them as correct ISL.';

const BY_ID = new Map<string, SignAnimation>(
  [...FINGERSPELLING_ANIMATIONS, ...DEMO_ANIMATIONS].map((animation) => [animation.id, animation]),
);

export function getAnimation(id: string): SignAnimation | undefined {
  return BY_ID.get(id);
}

export const ALL_ANIMATIONS: SignAnimation[] = [...FINGERSPELLING_ANIMATIONS, ...DEMO_ANIMATIONS];

/** Fingerspelling animation for one character, if it exists. */
export function animationForChar(char: string): SignAnimation | undefined {
  const normalized = char.toUpperCase();
  if (/^[A-Z]$/.test(normalized)) return BY_ID.get(`fs-${normalized.toLowerCase()}`);
  if (/^[0-9]$/.test(normalized)) return BY_ID.get(`fs-${normalized}`);
  return undefined;
}

export const ALPHABET_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

/** Bundle shape used by the Studio's export/import. */
export function makeBundle(animations: SignAnimation[], name = 'SignBridge animations'): SignAnimationBundle {
  return {
    meta: { name, language: 'ISL', version: '2.0.0' },
    animations,
  };
}
