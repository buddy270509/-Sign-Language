/**
 * Dictionary loading and lookup.
 *
 * A "dictionary" is any JSON file matching `SignDictionaryFile`. Adding a sign
 * language is a data change, not a code change: drop a file in `src/data/signs/`,
 * register it below, and every screen picks it up.
 */
import type { SignDictionaryFile, SignEntry } from '../types/sign';
import islFingerspelling from './signs/isl-fingerspelling.json';

export interface LanguageOption {
  tag: string;
  name: string;
  nativeName: string;
  /** `available` languages ship a dictionary in this build. */
  status: 'available' | 'planned';
  note?: string;
}

export const LANGUAGES: LanguageOption[] = [
  {
    tag: 'isl',
    name: 'Indian Sign Language',
    nativeName: 'भारतीय सांकेतिक भाषा',
    status: 'available',
    note: 'Default language. Phase 1 dictionary: one-handed manual alphabet and numerals (draft).',
  },
  {
    tag: 'asl',
    name: 'American Sign Language',
    nativeName: 'American Sign Language',
    status: 'planned',
    note: 'The sign format is language-agnostic, so ASL can be added as another JSON dictionary.',
  },
  {
    tag: 'bsl',
    name: 'British Sign Language',
    nativeName: 'British Sign Language',
    status: 'planned',
    note: 'BSL uses a two-handed fingerspelling alphabet — the rig already supports two hands.',
  },
];

const FILES: SignDictionaryFile[] = [islFingerspelling as unknown as SignDictionaryFile];

const dictionaries = new Map<string, SignDictionaryFile>(FILES.map((f) => [f.meta.languageTag, f]));

const byGloss = new Map<string, Map<string, SignEntry>>();
for (const file of FILES) {
  const map = new Map<string, SignEntry>();
  for (const sign of file.signs) map.set(sign.gloss.toUpperCase(), sign);
  byGloss.set(file.meta.languageTag, map);
}

export const DEFAULT_LANGUAGE = 'isl';

export function getDictionary(languageTag: string): SignDictionaryFile | undefined {
  return dictionaries.get(languageTag);
}

/** Case-insensitive lookup by gloss (letter, number or word). */
export function lookupSign(languageTag: string, gloss: string): SignEntry | undefined {
  return byGloss.get(languageTag)?.get(gloss.trim().toUpperCase());
}

/** All entries of a language, in dictionary order. */
export function listSigns(languageTag: string): SignEntry[] {
  return getDictionary(languageTag)?.signs ?? [];
}

export function dictionaryMeta(languageTag: string) {
  return getDictionary(languageTag)?.meta;
}

/** Characters this dictionary can fingerspell (used for input validation). */
export function supportedCharacters(languageTag: string): string[] {
  return listSigns(languageTag)
    .filter((s) => s.kind === 'fingerspelling' || s.kind === 'number')
    .map((s) => s.gloss);
}

export const REVIEW_LABEL: Record<string, string> = {
  draft: 'Draft — awaiting deaf signer review',
  reviewed: 'Reviewed by a deaf signer',
  supported: 'Reviewed and accuracy-tested',
};
