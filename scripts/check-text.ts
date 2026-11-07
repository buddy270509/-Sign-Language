/**
 * Text-processing regression checks.
 *
 * The grammar layer is where sign language gets lost most easily ("word for word"
 * translation), so its behaviour is asserted rather than eyeballed.
 *
 *   npm run check:text
 */
import { buildPlaylist, buildScript, detectSentenceType, normalizeText } from '../src/core/text/script';
import { lookupSign } from '../src/data';

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures += 1;
    console.error(`✗ ${name}\n    expected ${JSON.stringify(expected)}\n    received ${JSON.stringify(actual)}`);
  } else {
    console.log(`✓ ${name}`);
  }
}

/* ---- normalization ---- */
check('normalize: lowercase + punctuation', normalizeText('Hello, World!'), 'hello world');
check('normalize: curly quotes', normalizeText("Don’t   stop"), "don't stop");
check('normalize: multiple spaces', normalizeText('  a    b  '), 'a b');

/* ---- sentence type → non-manual marker ---- */
check('sentence: statement', detectSentenceType('I need water'), 'statement');
check('sentence: yes/no question', detectSentenceType('Is it ok?'), 'yes-no-question');
check('sentence: wh-question', detectSentenceType('Where is the toilet?'), 'wh-question');
check('sentence: wh-question without punctuation', detectSentenceType('where toilet'), 'wh-question');
check('sentence: negative', detectSentenceType('I not go'), 'negative');
check('sentence: "no" is negative, not a wh-question', detectSentenceType('no water'), 'negative');
check('sentence: command', detectSentenceType('help me!'), 'command');

/* ---- tokens ---- */
const hello = buildScript('hello', 'isl');
check('tokens: hello is one word', hello.tokens.length, 1);
check('tokens: hello fingerspells 5 letters', hello.tokens[0]?.signs.length, 5);
check('tokens: hello is marked fingerspelled', hello.tokens[0]?.fingerspelled, true);
check(
  'tokens: letters are A–Z entries',
  hello.tokens[0]?.signs.map((sign) => sign.displayLabel),
  ['H', 'E', 'L', 'L', 'O'],
);

const spaced = buildScript('Hi 2', 'isl');
check('tokens: digits are signable', spaced.tokens[1]?.signs.map((sign) => sign.displayLabel), ['2']);
check('playlist: one entry per sign', buildPlaylist(spaced).length, 3);

const unspellable = buildScript('héllo ✓', 'isl');
check('tokens: unspellable text is reported, not silently dropped', unspellable.tokens[1]?.signs.length, 0);
check('tokens: unspellable token has a reason', typeof unspellable.tokens[1]?.reason, 'string');

/* ---- dictionary ---- */
check('dictionary: case-insensitive letter lookup', lookupSign('isl', 'q')?.gloss, 'Q');
check('dictionary: unknown word is undefined', lookupSign('isl', 'water'), undefined);

/* ---- the whole sentence carries its marker ---- */
const question = buildScript('Is it ok?', 'isl');
check('script: question marker attached', question.sentenceType, 'yes-no-question');
check('script: question face has raised brows', question.face.browRaise, 1);
check('script: learner-facing label present', question.expressionLabel.length > 10, true);

if (failures > 0) {
  console.error(`\n${failures} text-processing check(s) failed.`);
  process.exit(1);
}
console.log('\nText pipeline OK.');
