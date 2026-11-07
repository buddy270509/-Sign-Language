/**
 * Content checks that do not need a browser.
 *
 *   npm run check:animations
 *
 * Verifies:
 *   1. every animation JSON validates against the schema (with readable errors),
 *   2. the handshape library is complete and inside anatomical limits,
 *   3. every handshape a file references actually exists,
 *   4. the ten demo animations are labelled as demos and unreviewed,
 *   5. every face parameter visibly changes the drawn face,
 *   6. no keyframe pair in a demo jumps far enough to look like a snap.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HANDSHAPES, HANDSHAPE_CATEGORY_LABEL } from '../src/core/rig/handshapes';
import { isHandshapeWithinLimits } from '../src/core/rig/hand';
import { formatIssues, validateAnimation } from '../src/core/animation/schema';
import { faceGeometry, FACE_KEYS, NEUTRAL_FACE } from '../src/core/rig/face';
import { facePathSignature } from '../src/core/rig/facePaths';
import { resolveHandTrack } from '../src/core/animation/interpolate';
import { REST_LEFT, REST_RIGHT } from '../src/core/rig/pose';
import type { SignAnimation } from '../src/types/animation';

const DIR = 'src/data/animations';
const failures: string[] = [];
const notes: string[] = [];

const fail = (message: string) => failures.push(message);

/* ---------------- 1. schema ---------------- */
const files = readdirSync(DIR).filter((file) => file.endsWith('.json')).sort();
const animations: SignAnimation[] = [];

for (const file of files) {
  const raw = JSON.parse(readFileSync(join(DIR, file), 'utf8')) as
    | { animations?: unknown[] }
    | SignAnimation;
  const candidates = Array.isArray((raw as { animations?: unknown[] }).animations)
    ? ((raw as { animations: unknown[] }).animations as unknown[])
    : [raw];
  candidates.forEach((candidate, index) => {
    const result = validateAnimation(candidate, candidates.length > 1 ? `${file}#${index}` : file);
    const errors = result.issues.filter((issue) => issue.severity === 'error');
    if (errors.length > 0) {
      fail(`${file}${candidates.length > 1 ? `[${index}]` : ''} is invalid:\n${formatIssues(errors)}`);
    }
    const warnings = result.issues.filter((issue) => issue.severity === 'warning');
    if (warnings.length > 0) notes.push(`${file}: ${formatIssues(warnings)}`);
    if (result.ok) animations.push(candidate as SignAnimation);
  });
}
console.log(`✓ ${files.length} files, ${animations.length} animations validated`);

/* ---------------- 2. handshapes ---------------- */
if (HANDSHAPES.length < 40) fail(`only ${HANDSHAPES.length} handshapes — at least 40 are required`);
const ids = new Set<string>();
for (const preset of HANDSHAPES) {
  if (ids.has(preset.id)) fail(`duplicate handshape id "${preset.id}"`);
  ids.add(preset.id);
  if (!isHandshapeWithinLimits(preset)) fail(`handshape "${preset.id}" has joints outside anatomical limits`);
  if (!preset.name || !preset.description) fail(`handshape "${preset.id}" is missing a name or description`);
}
const byCategory = Object.keys(HANDSHAPE_CATEGORY_LABEL).map((category) => {
  const count = HANDSHAPES.filter((preset) => preset.category === category).length;
  return `${category}: ${count}`;
});
console.log(`✓ ${HANDSHAPES.length} handshapes within limits (${byCategory.join(', ')})`);

/* ---------------- 3. references ---------------- */
for (const animation of animations) {
  for (const trackName of ['rightHand', 'leftHand'] as const) {
    for (const [index, key] of (animation.tracks[trackName] ?? []).entries()) {
      if (key.handshape && !ids.has(key.handshape)) {
        fail(`${animation.id}: tracks.${trackName}[${index}] uses unknown handshape "${key.handshape}"`);
      }
    }
  }
}
console.log('✓ handshape references resolve');

/* ---------------- 4. demos ---------------- */
const demos = animations.filter((animation) => animation.meta.demo);
if (demos.length !== 10) fail(`expected 10 demo animations, found ${demos.length}`);
for (const demo of demos) {
  if (demo.meta.reviewed_by_deaf_signer) {
    fail(`${demo.id} claims to be reviewed by a deaf signer — remove that claim unless it is true`);
  }
  if (!demo.meta.description || demo.meta.description.length < 20) {
    fail(`${demo.id} needs a real description`);
  }
}
const channels = new Set(demos.flatMap((demo) => demo.meta.channels ?? []));
for (const required of ['hands', 'arms', 'face', 'head', 'body', 'two-hands']) {
  if (!channels.has(required as never)) fail(`no demo covers the "${required}" channel`);
}
console.log(
  `✓ ${demos.length} demos, all marked unreviewed, covering ${[...channels].sort().join(', ')}`,
);

/* ---------------- 5. every face parameter is visible ---------------- */
const origin = { cx: 0, cy: 0 };
const baseSignature = facePathSignature(faceGeometry(NEUTRAL_FACE), origin);
const invisible: string[] = [];
for (const key of FACE_KEYS) {
  const probe = { ...NEUTRAL_FACE, [key]: key === 'mouthSmile' ? 0.95 : Math.abs(NEUTRAL_FACE[key] - 0.85) };
  const signature = facePathSignature(faceGeometry(probe), origin);
  if (signature === baseSignature) invisible.push(key);
}
if (invisible.length > 0) fail(`these face parameters do not change the drawing: ${invisible.join(', ')}`);
console.log(`✓ all ${FACE_KEYS.length} face parameters visibly change the face`);

/* ---------------- 6. no snapping ---------------- */
let worstJump = 0;
let worstSource = '';
for (const animation of animations) {
  for (const [trackName, base] of [
    ['rightHand', REST_RIGHT],
    ['leftHand', REST_LEFT],
  ] as const) {
    const ticks = resolveHandTrack(animation.tracks[trackName] ?? [], base);
    for (let i = 1; i < ticks.length; i += 1) {
      const a = ticks[i - 1]!.value;
      const b = ticks[i]!.value;
      const distance = Math.hypot(b.wrist[0] - a.wrist[0], b.wrist[1] - a.wrist[1]);
      if (distance > worstJump) {
        worstJump = distance;
        worstSource = `${animation.id}/${trackName}[${i}]`;
      }
    }
  }
}
if (worstJump > 0.62) {
  fail(
    `a keyframe pair moves the wrist ${(worstJump * 100).toFixed(0)}% of the stage in one segment (${worstSource}) — that will look like a snap`,
  );
}
console.log(`✓ largest wrist travel between keyframes: ${(worstJump * 100).toFixed(0)}% (${worstSource})`);

/* ---------------- summary ---------------- */
if (notes.length > 0) {
  console.log('\nWarnings:');
  for (const note of notes) console.log(`  ! ${note}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} problem(s):`);
  for (const message of failures) console.error(`  ✗ ${message}`);
  process.exit(1);
}
console.log('\nAll animation content checks passed.');
