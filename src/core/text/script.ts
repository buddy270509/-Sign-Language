/**
 * Text → sign script (Phase 1: normalization + fingerspelling fallback).
 *
 * Signed languages are not word-for-word encodings of spoken language. Phase 1 only
 * needs the first two stages of the pipeline — normalization and tokenization — so the
 * avatar can fingerspell anything the user types. The sentence-level non-manual
 * markers (question / negation) are already detected here, because they are the part
 * learners most often miss.
 *
 * Phase 3 replaces `toSignGloss()` with the editable grammar-rule engine
 * (topic-comment order, question marker at the end, negation with head shake).
 */
import type { FaceControls, HeadControls, SentenceType, SignEntry, SignScript, SignToken } from '../../types/sign';
import { lookupSign } from '../../data';
import type { ExpressionId } from '../rig/presets';

export interface SentenceMarker {
  label: string;
  /** Plain-language explanation for learners, shown on screen. */
  explanation: string;
  markers: string[];
  face: Partial<FaceControls>;
  head: Partial<HeadControls>;
  /** Expression preset that renders this marker. */
  expression: ExpressionId;
}

export const SENTENCE_MARKERS: Record<SentenceType, SentenceMarker> = {
  statement: {
    label: 'Statement',
    explanation: 'Level brows and a level head — a plain statement.',
    markers: ['level brows', 'level head'],
    face: { browRaise: 0, browFurrow: 0 },
    head: { pitch: 0, roll: 0 },
    expression: 'neutral',
  },
  'yes-no-question': {
    label: 'Yes/no question',
    explanation: 'Eyebrows raised + head tilted forward = this is a yes/no question.',
    markers: ['brows up', 'eyes wide', 'head forward'],
    face: { browRaise: 1, browFurrow: 0, eyeOpen: 1 },
    head: { pitch: -6, roll: 4 },
    expression: 'question',
  },
  'wh-question': {
    label: 'Wh-question',
    explanation: 'Brows pulled down and together + head tilt = a wh-question (who / what / where / when / why).',
    markers: ['brows down', 'head tilt'],
    face: { browRaise: -0.15, browFurrow: 0.75 },
    head: { pitch: -4, roll: 4 },
    expression: 'wh-question',
  },
  negative: {
    label: 'Negative',
    explanation: 'Brows down + head shaking side to side = no / not.',
    markers: ['brows down', 'head shake'],
    face: { browRaise: -0.35, browFurrow: 0.85, mouthSmile: -0.5 },
    head: { pitch: 2, roll: -2 },
    expression: 'negative',
  },
  command: {
    label: 'Command',
    explanation: 'Brows up, head forward and a sharp movement = a command or request.',
    markers: ['brows up', 'head forward', 'sharp movement'],
    face: { browRaise: 0.5, eyeOpen: 1 },
    head: { pitch: -8, roll: 0 },
    expression: 'question',
  },
};

const WH_WORDS = ['what', 'where', 'when', 'who', 'whom', 'whose', 'why', 'which', 'how'];
const NEGATIVE_WORDS = [
  'not',
  'no',
  'never',
  'nothing',
  'nobody',
  'none',
  "don't",
  'dont',
  "doesn't",
  "didn't",
  "can't",
  'cant',
  "won't",
  'wont',
  'cannot',
  'isn’t',
  'not',
];

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalizeText(input: string): string {
  return input
    .normalize('NFC')
    .replace(/[’']/g, "'")
    .replace(/[.,;:!?"“”()[\]{}/\\|<>@#$%^&*_+=~`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function detectSentenceType(raw: string): SentenceType {
  const trimmed = raw.trim();
  const words = normalizeText(trimmed).split(' ').filter(Boolean);
  const first = words[0] ?? '';
  const negative = words.some((w) => NEGATIVE_WORDS.includes(w));

  if (trimmed.endsWith('?') || WH_WORDS.includes(first)) {
    return WH_WORDS.includes(first) ? 'wh-question' : 'yes-no-question';
  }
  if (negative) return 'negative';
  if (trimmed.endsWith('!')) return 'command';
  return 'statement';
}

/**
 * Splits a token into dictionary characters. Returns `null` when any character is
 * not signable, so the caller can explain the failure instead of silently dropping it.
 */
function charactersOf(token: string, languageTag: string): SignEntry[] | null {
  const signs: SignEntry[] = [];
  for (const char of token) {
    if (/[a-z0-9]/.test(char)) {
      const sign = lookupSign(languageTag, char);
      if (!sign) return null;
      signs.push(sign);
    }
  }
  return signs.length > 0 ? signs : null;
}

/**
 * Phase 1 mapping: whole-word sign if the dictionary has one, otherwise fingerspell.
 * (Phase 3 will insert grammar rules here: topic-comment order, question markers,
 * negation, time lines, classifiers…)
 */
export function toSignTokens(raw: string, languageTag: string): SignToken[] {
  const tokens: SignToken[] = [];
  for (const word of normalizeText(raw).split(' ').filter(Boolean)) {
    const direct = lookupSign(languageTag, word);
    if (direct) {
      tokens.push({ source: word, signs: [direct], fingerspelled: false });
      continue;
    }
    const letters = charactersOf(word, languageTag);
    if (letters) {
      tokens.push({
        source: word,
        signs: letters,
        fingerspelled: true,
        reason: 'Not in the dictionary yet — fingerspelled instead.',
      });
      continue;
    }
    tokens.push({
      source: word,
      signs: [],
      fingerspelled: false,
      reason: 'No sign available for this word yet.',
    });
  }
  return tokens;
}

/** Complete script ready to be played by the avatar. */
export function buildScript(raw: string, languageTag: string): SignScript {
  const sentenceType = detectSentenceType(raw);
  const marker = SENTENCE_MARKERS[sentenceType];
  return {
    tokens: toSignTokens(raw, languageTag),
    sentenceType,
    face: marker.face,
    head: marker.head,
    expressionLabel: marker.explanation,
  };
}

export interface PlaylistEntry {
  sign: SignEntry;
  /** Index of the token this sign belongs to (used for highlighting). */
  tokenIndex: number;
  token: SignToken;
}

export function buildPlaylist(script: SignScript): PlaylistEntry[] {
  const entries: PlaylistEntry[] = [];
  script.tokens.forEach((token, tokenIndex) => {
    for (const sign of token.signs) entries.push({ sign, tokenIndex, token });
  });
  return entries;
}
