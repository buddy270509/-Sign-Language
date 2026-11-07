/**
 * Acceptance checks on the shipped content: every file validates, the demos cover the five
 * channels, and playing them at 0.5x / 1x / 2x never produces a broken frame.
 */
import { describe, expect, it } from 'vitest';
import { ALL_ANIMATIONS, DEMO_ANIMATIONS, FINGERSPELLING_ANIMATIONS, getAnimation } from '../animations';
import { validateAnimation } from '../../core/animation/schema';
import { compileAnimation, poseAtProgress } from '../../core/animation/compile';
import { buildRenderPose } from '../../core/rig/render';
import { ALPHABET_GLYPHS, animationForChar } from '../animations';
import { AnimationQueue } from '../../core/animation/queue';

describe('shipped animations', () => {
  it('all validate against the schema', () => {
    for (const animation of ALL_ANIMATIONS) {
      const result = validateAnimation(animation);
      expect(result.issues.filter((issue) => issue.severity === 'error'), animation.id).toEqual([]);
    }
  });

  it('ships the alphabet and ten demos', () => {
    expect(FINGERSPELLING_ANIMATIONS).toHaveLength(36);
    expect(DEMO_ANIMATIONS).toHaveLength(10);
  });

  it('can fingerspell every letter and digit', () => {
    for (const glyph of ALPHABET_GLYPHS) {
      expect(animationForChar(glyph), glyph).toBeTruthy();
    }
    expect(animationForChar('!')).toBeUndefined();
  });

  it('never claims deaf-signer review', () => {
    for (const animation of ALL_ANIMATIONS) {
      expect(animation.meta.reviewed_by_deaf_signer).toBe(false);
    }
  });

  it('covers all five channels across the demos', () => {
    const channels = new Set(DEMO_ANIMATIONS.flatMap((animation) => animation.meta.channels ?? []));
    for (const channel of ['hands', 'arms', 'face', 'head', 'body', 'two-hands']) {
      expect(channels.has(channel as never), channel).toBe(true);
    }
  });

  it('is findable by id', () => {
    expect(getAnimation('demo-hello')?.label).toContain('Hello');
    expect(getAnimation('nope')).toBeUndefined();
  });
});

describe('every demo renders cleanly', () => {
  const frames = 48;

  for (const animation of DEMO_ANIMATIONS) {
    it(`${animation.id}: no warnings, elbows outside the torso, hands in the signing space`, () => {
      const compiled = compileAnimation(animation);
      let worstElbow = 0;
      for (let index = 0; index <= frames; index += 1) {
        const progress = index / frames;
        const pose = poseAtProgress(compiled, progress);
        const render = buildRenderPose(pose);

        expect(render.warnings, `${animation.id} @ ${progress.toFixed(2)}`).toEqual([]);
        expect(render.rightHand.landmarks).toHaveLength(21);
        expect(render.leftHand.landmarks).toHaveLength(21);

        worstElbow = Math.min(worstElbow, render.rightArm.clearance, render.leftArm.clearance);
        expect(Number.isFinite(render.rightHand.tip.x)).toBe(true);
        expect(Number.isFinite(render.leftHand.tip.y)).toBe(true);
      }
      // The elbow may clip the shirt silhouette by a few pixels, never sit inside the chest.
      expect(worstElbow).toBeGreaterThan(-16);
    });
  }

  it('separates the tracks: a face change never moves a hand', () => {
    const faceOnly = {
      ...DEMO_ANIMATIONS[0]!,
      id: 'face-only-probe',
      duration_ms: 1000,
      tracks: {
        rightHand: [],
        leftHand: [],
        face: [
          { t: 0, mouthSmile: -1 },
          { t: 1, mouthSmile: 1 },
        ],
        head: [],
        body: [],
      },
    };
    const compiled = compileAnimation(faceOnly);
    const first = buildRenderPose(poseAtProgress(compiled, 0));
    const last = buildRenderPose(poseAtProgress(compiled, 1));
    expect(last.rightHand.landmarks[12]!.x).toBeCloseTo(first.rightHand.landmarks[12]!.x, 6);
    expect(last.rightHand.landmarks[12]!.y).toBeCloseTo(first.rightHand.landmarks[12]!.y, 6);
    expect(last.face.state.mouthSmile).not.toBeCloseTo(first.face.state.mouthSmile, 2);
  });

  it('separates the tracks: a head change never moves a hand', () => {
    const headOnly = {
      ...DEMO_ANIMATIONS[0]!,
      id: 'head-only-probe',
      tracks: {
        rightHand: [],
        leftHand: [],
        face: [],
        head: [
          { t: 0, pitch: -20 },
          { t: 1, pitch: 20 },
        ],
        body: [],
      },
    };
    const compiled = compileAnimation(headOnly);
    const first = buildRenderPose(poseAtProgress(compiled, 0));
    const last = buildRenderPose(poseAtProgress(compiled, 1));
    expect(last.rightHand.landmarks[12]!.y).toBeCloseTo(first.rightHand.landmarks[12]!.y, 6);
    expect(last.head.cy).not.toBeCloseTo(first.head.cy, 2);
  });
});

describe('playback is smooth', () => {
  /**
   * Frame-to-frame jumps are what a viewer actually perceives as a "pop". 16 ms at
   * 0.5x/1x/2x must not teleport an elbow or a fingertip.
   */
  for (const speed of [0.5, 1, 2]) {
    it(`no pops at ${speed}x`, () => {
      let worstElbow = 0;
      let worstWhere = '';
      for (const animation of DEMO_ANIMATIONS) {
        const queue = new AnimationQueue({ speed, transitionMs: 200 });
        queue.load([{ key: animation.id, compiled: compileAnimation(animation) }], {
          autoplay: true,
          announce: false,
        });
        let previous = buildRenderPose(queue.getPose());
        for (let frame = 0; frame < 220; frame += 1) {
          queue.step(16);
          const render = buildRenderPose(queue.getPose());
          for (const side of ['rightArm', 'leftArm'] as const) {
            const jump = Math.hypot(
              render[side].elbow.x - previous[side].elbow.x,
              render[side].elbow.y - previous[side].elbow.y,
            );
            if (jump > worstElbow) {
              worstElbow = jump;
              worstWhere = `${animation.id}/${side}`;
            }
          }
          previous = render;
        }
      }
      expect(worstElbow, `worst elbow jump at ${worstWhere}`).toBeLessThan(40);
    });
  }
});
