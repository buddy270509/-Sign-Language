/**
 * Sign dictionary validator.
 *
 * Guards the properties the project's quality bar depends on:
 *   · every entry is schema-valid and has unique ids / glosses
 *   · keyframes are sorted, inside 0..1, and contain the required anatomy metadata
 *   · the alphabet is complete (A–Z and 0–9)
 *   · review status is explicit, and `supported` entries must name a reviewer
 *   · no sign claims `supported` without a per-sign accuracy figure
 *
 *   npm run check:signs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/data/signs';
const REQUIRED_FIELDS = ['id', 'gloss', 'displayLabel', 'kind', 'languageTag', 'durationMs', 'reviewStatus', 'keyframes'];
const KINDS = new Set(['fingerspelling', 'number', 'word', 'phrase', 'punctuation']);
const REVIEW = new Set(['draft', 'reviewed', 'supported']);
const EASINGS = new Set(['linear', 'easeInOut', 'easeOut', 'easeIn', 'spring']);
const NUM = (v) => typeof v === 'number' && Number.isFinite(v);

const errors = [];
const warnings = [];
let signCount = 0;

function checkHand(where, hand) {
  if (!hand || typeof hand !== 'object') return;
  if (hand.position && (!NUM(hand.position.x) || !NUM(hand.position.y))) {
    errors.push(`${where}: position must be numeric x/y`);
  } else if (hand.position) {
    const { x, y } = hand.position;
    if (x < 0 || x > 1 || y < 0 || y > 1) errors.push(`${where}: position must be inside 0..1 (got ${x}, ${y})`);
  }
  if (hand.orientation) {
    for (const key of ['roll', 'yaw']) {
      if (hand.orientation[key] !== undefined && !NUM(hand.orientation[key])) {
        errors.push(`${where}: orientation.${key} must be numeric`);
      }
    }
  }
  for (const [finger, value] of Object.entries(hand.fingers ?? {})) {
    if (!NUM(value) || value < 0 || value > 1) errors.push(`${where}: fingers.${finger} must be 0..1`);
  }
  if (hand.thumb) {
    if (!NUM(hand.thumb.curl) || hand.thumb.curl < 0 || hand.thumb.curl > 1) {
      errors.push(`${where}: thumb.curl must be 0..1`);
    }
    if (!NUM(hand.thumb.spread) || hand.thumb.spread < 0 || hand.thumb.spread > 1) {
      errors.push(`${where}: thumb.spread must be 0..1`);
    }
  }
  if (hand.spread !== undefined && (!NUM(hand.spread) || hand.spread < 0 || hand.spread > 1)) {
    errors.push(`${where}: spread must be 0..1`);
  }
}

const files = readdirSync(DIR).filter((name) => name.endsWith('.json'));
if (files.length === 0) errors.push(`no dictionary files in ${DIR}`);

for (const file of files) {
  const path = join(DIR, file);
  let doc;
  try {
    doc = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    errors.push(`${file}: invalid JSON (${error.message})`);
    continue;
  }

  const meta = doc.meta ?? {};
  if (!meta.languageTag) errors.push(`${file}: meta.languageTag is required`);
  if (!REVIEW.has(meta.reviewStatus)) errors.push(`${file}: meta.reviewStatus must be one of ${[...REVIEW].join(', ')}`);
  if (!meta.version) warnings.push(`${file}: meta.version is missing`);

  const seenIds = new Set();
  const seenGlosses = new Set();

  for (const sign of doc.signs ?? []) {
    signCount += 1;
    const where = `${file}:${sign.id ?? '(no id)'}`;

    for (const field of REQUIRED_FIELDS) {
      if (sign[field] === undefined) errors.push(`${where}: missing required field "${field}"`);
    }
    if (sign.languageTag && meta.languageTag && sign.languageTag !== meta.languageTag) {
      errors.push(`${where}: languageTag "${sign.languageTag}" does not match the file (${meta.languageTag})`);
    }
    if (sign.kind && !KINDS.has(sign.kind)) errors.push(`${where}: unknown kind "${sign.kind}"`);
    if (sign.reviewStatus && !REVIEW.has(sign.reviewStatus)) errors.push(`${where}: invalid reviewStatus`);
    if (sign.reviewStatus === 'supported') {
      if (!sign.reviewer) errors.push(`${where}: a "supported" sign must name its reviewer`);
      if (!sign.accuracy || !NUM(sign.accuracy.overall)) {
        errors.push(`${where}: a "supported" sign must include per-sign accuracy data`);
      }
    }
    if (!NUM(sign.durationMs) || sign.durationMs < 120 || sign.durationMs > 4000) {
      errors.push(`${where}: durationMs should be between 120 and 4000`);
    }

    // Anatomy metadata is what makes a sign a *sign* and not just a handshape.
    for (const field of ['handshape', 'location', 'movement', 'palmOrientation']) {
      if (!sign[field]) warnings.push(`${where}: missing ${field} metadata (required for signer review)`);
    }

    if (seenIds.has(sign.id)) errors.push(`${where}: duplicate id`);
    seenIds.add(sign.id);
    const gloss = (sign.gloss ?? '').toUpperCase();
    if (seenGlosses.has(gloss)) errors.push(`${where}: duplicate gloss "${sign.gloss}"`);
    seenGlosses.add(gloss);

    const keyframes = sign.keyframes ?? [];
    if (keyframes.length < 1) errors.push(`${where}: needs at least one keyframe`);
    let previousT = -1;
    for (const [index, kf] of keyframes.entries()) {
      const at = `${where} keyframe[${index}]`;
      if (!NUM(kf.t)) errors.push(`${at}: t must be numeric`);
      else if (kf.t < 0 || kf.t > 1) errors.push(`${at}: t must be within 0..1 (got ${kf.t})`);
      else if (kf.t <= previousT) errors.push(`${at}: keyframes must be strictly increasing`);
      if (NUM(kf.t)) previousT = kf.t;
      if (kf.ease && !EASINGS.has(kf.ease)) errors.push(`${at}: unknown easing "${kf.ease}"`);
      checkHand(`${at}.right`, kf.right);
      checkHand(`${at}.left`, kf.left);
    }
    checkHand(`${where}.base.right`, sign.base?.right);
  }

  // Alphabet completeness (only enforced for fingerspelling dictionaries).
  const hasLetters = (doc.signs ?? []).some((sign) => sign.kind === 'fingerspelling');
  if (hasLetters) {
    const glosses = new Set((doc.signs ?? []).map((sign) => (sign.gloss ?? '').toUpperCase()));
    for (const char of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
      if (!glosses.has(char)) errors.push(`${file}: missing fingerspelling entry for "${char}"`);
    }
  }
}

if (warnings.length) {
  console.warn(`${warnings.length} warning(s):`);
  for (const warning of warnings) console.warn(`  ! ${warning}`);
}

if (errors.length) {
  console.error(`\n${errors.length} error(s) in ${signCount} sign(s):`);
  for (const error of errors) console.error(`  ✗ ${error}`);
  process.exit(1);
}

console.log(`✓ ${signCount} signs across ${files.length} dictionary file(s) are valid.`);
