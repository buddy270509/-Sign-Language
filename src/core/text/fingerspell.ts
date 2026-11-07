/**
 * Text → fingerspelling plan.
 *
 * Phase 2 deliberately does **no** grammar or word lookup: text is turned into a queue of
 * letter animations. Anything that is not a letter or digit is reported back so the UI can
 * tell the user what was skipped instead of silently dropping it.
 */
import type { SignAnimation } from '../../types/animation';
import { animationForChar } from '../../data/animations';

export interface FingerspellPlan {
  characters: string[];
  skipped: string[];
  /** Animations in order; empty when nothing could be signed. */
  animations: SignAnimation[];
}

export const MAX_CHARACTERS = 32;

export function planFingerspelling(text: string, max = MAX_CHARACTERS): FingerspellPlan {
  const characters: string[] = [];
  const skipped: string[] = [];
  const animations: SignAnimation[] = [];

  for (const raw of text) {
    if (characters.length >= max) break;
    if (/\s/.test(raw)) continue;
    const animation = animationForChar(raw);
    if (animation) {
      characters.push(raw.toUpperCase());
      animations.push(animation);
    } else if (skipped.length < 8) {
      skipped.push(raw);
    }
  }

  return { characters, skipped, animations };
}

export const SAMPLE_TEXTS = ['Hello', 'My name is Asha', 'ISL 2026', 'Thank you'];
