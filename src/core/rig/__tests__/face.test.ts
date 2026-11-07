import { describe, expect, it } from 'vitest';
import {
  ALL_FACE_GROUPS,
  blendFace,
  clampFace,
  EXPRESSIONS,
  EXPRESSION_IDS,
  faceGeometry,
  FACE_GROUPS,
  FACE_KEYS,
  NEUTRAL_FACE,
  OVERLAY_FACE_GROUPS,
} from '../face';
import { facePathSignature } from '../facePaths';

const origin = { cx: 0, cy: 0 };
const signature = (face: Partial<typeof NEUTRAL_FACE>) => facePathSignature(faceGeometry(clampFace(face)), origin);

describe('face parameters', () => {
  it('has the full documented set', () => {
    for (const key of [
      'browRaiseL',
      'browRaiseR',
      'browFurrowL',
      'browFurrowR',
      'eyeOpenL',
      'eyeOpenR',
      'blink',
      'gazeX',
      'gazeY',
      'cheekPuff',
      'cheekRaise',
      'noseWrinkle',
      'mouthOpen',
      'mouthWidth',
      'mouthSmile',
      'lipPurse',
      'lipsPressed',
      'tongueOut',
      'mouthAh',
      'mouthEe',
      'mouthPa',
    ]) {
      expect(FACE_KEYS).toContain(key);
    }
  });

  it('changes the drawing for every single parameter', () => {
    const base = signature({});
    for (const key of FACE_KEYS) {
      const probe = signature({ [key]: NEUTRAL_FACE[key] > 0.5 ? 0 : 1 });
      expect(probe, `${key} has no visible effect`).not.toBe(base);
    }
  });

  it('clamps out-of-range values instead of producing broken geometry', () => {
    const face = clampFace({ mouthOpen: 9, gazeX: -9, mouthSmile: 40 });
    expect(face.mouthOpen).toBe(1);
    expect(face.gazeX).toBe(-1);
    expect(face.mouthSmile).toBe(1);
  });

  it('keeps a closed eye closed even with a blink', () => {
    const geometry = faceGeometry(clampFace({ eyeOpenL: 0, blink: 1 }));
    expect(geometry.eyeOpenL).toBe(0);
  });

  it('rounds the mouth for the "oo" morpheme', () => {
    expect(faceGeometry(clampFace({ lipPurse: 1 })).mouthShape).toBe('oo');
    expect(faceGeometry(clampFace({ mouthAh: 1 })).mouthShape).toBe('ah');
    expect(faceGeometry(clampFace({ mouthEe: 1 })).mouthShape).toBe('ee');
  });
});

describe('expressions', () => {
  it('ships the documented set with plain-language labels and markers', () => {
    for (const id of [
      'neutral',
      'happy',
      'sad',
      'angry',
      'surprised',
      'yesNoQuestion',
      'whQuestion',
      'negation',
      'emphasis',
      'thinking',
    ]) {
      const expression = EXPRESSIONS[id];
      expect(expression, id).toBeTruthy();
      expect(expression!.label.length).toBeGreaterThan(2);
      expect(expression!.explanation.length).toBeGreaterThan(10);
      expect(expression!.markers.length).toBeGreaterThan(0);
    }
    expect(EXPRESSION_IDS.length).toBeGreaterThanOrEqual(10);
  });

  it('gives every expression a distinct face', () => {
    const signatures = EXPRESSION_IDS.map((id) => signature(EXPRESSIONS[id]!.face));
    expect(new Set(signatures).size).toBe(EXPRESSION_IDS.length);
  });
});

describe('masked blending', () => {
  it('leaves the mouth untouched when the mouth group is excluded', () => {
    const base = clampFace({ mouthSmile: -0.9, mouthWidth: 0.2, browRaiseL: 0.1 });
    const blended = blendFace(base, EXPRESSIONS.surprised!.face, 1, OVERLAY_FACE_GROUPS);
    expect(blended.mouthSmile).toBeCloseTo(base.mouthSmile, 6);
    expect(blended.mouthWidth).toBeCloseTo(base.mouthWidth, 6);
    expect(blended.browRaiseL).toBeCloseTo(1, 6);
  });

  it('touches everything when no mask is given', () => {
    const base = clampFace({ mouthSmile: -0.9 });
    const blended = blendFace(base, EXPRESSIONS.happy!.face, 1, ALL_FACE_GROUPS);
    expect(blended.mouthSmile).toBeCloseTo(EXPRESSIONS.happy!.face.mouthSmile!, 6);
  });

  it('is a no-op at weight 0 and lands exactly on the overlay at weight 1', () => {
    const base = clampFace({ mouthOpen: 0.2 });
    expect(blendFace(base, EXPRESSIONS.angry!.face, 0, ALL_FACE_GROUPS).mouthOpen).toBeCloseTo(0.2, 6);
    const full = blendFace(base, EXPRESSIONS.angry!.face, 1, ALL_FACE_GROUPS);
    expect(full.lipsPressed).toBeCloseTo(EXPRESSIONS.angry!.face.lipsPressed!, 6);
  });

  it('mixes part-way in the middle', () => {
    const base = clampFace({ browRaiseL: 0 });
    const half = blendFace(base, { browRaiseL: 1 }, 0.5, ['brows']);
    expect(half.browRaiseL).toBeCloseTo(0.5, 6);
  });

  it('assigns every parameter to exactly one group', () => {
    const seen = new Set<string>();
    for (const group of Object.values(FACE_GROUPS).flat()) {
      expect(seen.has(group)).toBe(false);
      seen.add(group);
    }
    expect(seen.size).toBe(FACE_KEYS.length);
  });
});
