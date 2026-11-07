/**
 * Sign language registry.
 *
 * Adding a language is a data change: drop animation JSON in `src/data/animations/`,
 * register the language here, and every screen picks it up.
 *
 * Phase 2 ships **animations only** — there is no dictionary of whole-word signs and no
 * grammar engine yet (those are later phases). What exists is the alphabet plus ten demo
 * motions.
 */
export interface LanguageOption {
  tag: string;
  name: string;
  nativeName: string;
  /** `available` languages ship content in this build. */
  status: 'available' | 'planned';
  note?: string;
}

export const LANGUAGES: LanguageOption[] = [
  {
    tag: 'isl',
    name: 'Indian Sign Language',
    nativeName: 'भारतीय सांकेतिक भाषा',
    status: 'available',
    note: 'Default. Phase 2 content: a draft one-handed manual alphabet, numerals and ten demo motions.',
  },
  {
    tag: 'asl',
    name: 'American Sign Language',
    nativeName: 'American Sign Language',
    status: 'planned',
    note: 'The animation format is language-agnostic, so ASL can be added as another JSON folder.',
  },
  {
    tag: 'bsl',
    name: 'British Sign Language',
    nativeName: 'British Sign Language',
    status: 'planned',
    note: 'BSL uses a two-handed fingerspelling alphabet — the rig already drives two hands.',
  },
];

export const DEFAULT_LANGUAGE = 'isl';

export const REVIEW_LABEL: Record<string, string> = {
  draft: 'Draft — awaiting deaf signer review',
  reviewed: 'Reviewed by a deaf signer',
  supported: 'Reviewed and accuracy-tested',
};
