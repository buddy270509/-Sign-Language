import { describe, expect, it } from 'vitest';
import { AnimationQueue, type QueueItem } from '../queue';
import { compileAnimation } from '../compile';
import type { SignAnimation } from '../../../types/animation';

function animation(id: string, duration: number, opts: Partial<SignAnimation> = {}): SignAnimation {
  return {
    id,
    label: id,
    duration_ms: duration,
    tracks: {
      rightHand: [
        { t: 0, handshape: 'flat', palm: 'forward', roll: 0, wrist: [0.55, 0.55, 0.3] },
        { t: 1, wrist: [0.7, 0.4, 0.3] },
      ],
      leftHand: [],
      face: [],
      head: [],
      body: [],
    },
    meta: { language: 'ISL', description: `${id} description`, reviewed_by_deaf_signer: false },
    ...opts,
  };
}

const items = (): QueueItem[] =>
  [animation('a', 400), animation('b', 400), animation('c', 400)].map((entry) => ({
    key: entry.id,
    label: entry.id,
    compiled: compileAnimation(entry),
  }));

describe('transport', () => {
  it('starts paused and does not advance', () => {
    const queue = new AnimationQueue();
    queue.load(items());
    expect(queue.getSnapshot().playing).toBe(false);
    queue.step(100);
    expect(queue.getSnapshot().timeMs).toBe(0);
  });

  it('plays, pauses and resumes', () => {
    const queue = new AnimationQueue();
    queue.load(items(), { autoplay: true });
    queue.step(100);
    expect(queue.getSnapshot().timeMs).toBeCloseTo(100, 5);
    queue.pause();
    queue.step(100);
    expect(queue.getSnapshot().timeMs).toBeCloseTo(100, 5);
    queue.resume();
    queue.step(50);
    expect(queue.getSnapshot().timeMs).toBeCloseTo(150, 5);
  });

  it('stops back to the first frame', () => {
    const queue = new AnimationQueue();
    queue.load(items(), { autoplay: true });
    queue.step(300);
    queue.stop();
    const snapshot = queue.getSnapshot();
    expect(snapshot.timeMs).toBe(0);
    expect(snapshot.index).toBe(0);
    expect(snapshot.playing).toBe(false);
  });

  it('seeks and scrubs within the current sign', () => {
    const queue = new AnimationQueue();
    queue.load(items(), { autoplay: true });
    queue.seek(220);
    expect(queue.getSnapshot().timeMs).toBeCloseTo(220, 5);
    queue.seek(9999);
    expect(queue.getSnapshot().timeMs).toBeCloseTo(400, 5);
    queue.seek(-50);
    expect(queue.getSnapshot().timeMs).toBe(0);
  });

  it('scales time with the playback speed', () => {
    const fast = new AnimationQueue({ speed: 2 });
    fast.load(items(), { autoplay: true });
    fast.step(50);
    expect(fast.getSnapshot().timeMs).toBeCloseTo(100, 5);

    const slow = new AnimationQueue({ speed: 0.5 });
    slow.load(items(), { autoplay: true });
    slow.step(100);
    expect(slow.getSnapshot().timeMs).toBeCloseTo(50, 5);
  });
});

describe('queue events', () => {
  it('emits sign-started, sign-ended and queue-finished in order', () => {
    const queue = new AnimationQueue({ transitionMs: 150 });
    const events: string[] = [];
    queue.on('sign-started', ({ item }) => events.push(`start:${item.key}`));
    queue.on('sign-ended', ({ item }) => events.push(`end:${item.key}`));
    queue.on('queue-finished', () => events.push('finished'));
    queue.load(items(), { autoplay: true, announce: false });

    for (let step = 0; step < 200 && !events.includes('finished'); step += 1) queue.step(16);

    expect(events).toEqual([
      'end:a',
      'start:b',
      'end:b',
      'start:c',
      'end:c',
      'finished',
    ]);
  });

  it('reports the active sign through the snapshot', () => {
    const queue = new AnimationQueue();
    queue.load(items(), { autoplay: true });
    queue.step(420);
    const snapshot = queue.getSnapshot();
    expect(snapshot.index).toBe(1);
    expect(snapshot.label).toBe('b');
    expect(snapshot.count).toBe(3);
    expect(snapshot.elapsedMs).toBeCloseTo(420, 5);
  });

  it('loops the whole queue when asked', () => {
    const queue = new AnimationQueue({ loop: 'all' });
    const events: string[] = [];
    queue.on('sign-started', ({ item }) => events.push(item.key));
    queue.load(items(), { autoplay: true, announce: false });
    for (let step = 0; step < 200; step += 1) queue.step(16);
    expect(events.filter((key) => key === 'a').length).toBeGreaterThan(1);
    expect(queue.getSnapshot().playing).toBe(true);
  });

  it('loops a single sign when asked', () => {
    const queue = new AnimationQueue({ loop: 'one' });
    queue.load(items(), { autoplay: true, announce: false });
    for (let step = 0; step < 100; step += 1) queue.step(16);
    expect(queue.getSnapshot().index).toBe(0);
  });
});

describe('continuity', () => {
  it('does not snap between signs', () => {
    const queue = new AnimationQueue({ transitionMs: 200 });
    queue.load(items(), { autoplay: true, announce: false });
    let previous = queue.getPose();
    let worst = 0;
    for (let step = 0; step < 80; step += 1) {
      queue.step(16);
      const pose = queue.getPose();
      const jump = Math.hypot(
        pose.right.wrist[0] - previous.right.wrist[0],
        pose.right.wrist[1] - previous.right.wrist[1],
      );
      worst = Math.max(worst, jump);
      previous = pose;
    }
    // 16 ms at 1x is ~4% of a 400 ms sign; a snap would show up as a much bigger jump.
    expect(worst).toBeLessThan(0.2);
  });

  it('mirrors the pose when mirrored mode is on', () => {
    const queue = new AnimationQueue();
    queue.load(items(), { autoplay: true });
    queue.seek(200);
    const normal = queue.getPose();
    queue.setMirrored(true);
    const mirrored = queue.getPose();
    expect(mirrored.right.wrist[0]).toBeCloseTo(1 - normal.left.wrist[0], 5);
  });
});

describe('overlay layering', () => {
  const withMouth: SignAnimation = {
    ...animation('mouth-sign', 400),
    tracks: {
      ...animation('mouth-sign', 400).tracks,
      face: [
        { t: 0, mouthSmile: -0.8, mouthWidth: 0.3 },
        { t: 1, mouthSmile: -0.8, mouthWidth: 0.3 },
      ],
    },
  };

  it('leaves a sign\u2019s own mouth shape alone', () => {
    const queue = new AnimationQueue({ overlay: { expression: 'surprised', weight: 1 } });
    queue.load([{ key: 'm', compiled: compileAnimation(withMouth) }], { autoplay: false });
    const pose = queue.getPose();
    expect(pose.face.mouthSmile).toBeCloseTo(-0.8, 5);
    // but the brows still move
    expect(pose.face.browRaiseL).toBeGreaterThan(0.12);
  });

  it('may use the mouth when the sign does not', () => {
    const queue = new AnimationQueue({ overlay: { expression: 'surprised', weight: 1 } });
    queue.load([{ key: 'a', compiled: compileAnimation(animation('a', 400)) }], { autoplay: false });
    const pose = queue.getPose();
    expect(pose.face.mouthOpen).toBeGreaterThan(0.4);
  });

  it('applies the same overlay across every sign in the queue', () => {
    const queue = new AnimationQueue({ overlay: { expression: 'happy', weight: 0.8 } });
    queue.load(
      ['a', 'b', 'c'].map((id) => ({ key: id, compiled: compileAnimation(animation(id, 300)) })),
      { autoplay: false },
    );
    const smilies: number[] = [];
    for (let index = 0; index < 3; index += 1) {
      queue.jumpTo(index);
      smilies.push(queue.getPose().face.mouthSmile);
    }
    expect(smilies.every((value) => value > 0.4)).toBe(true);
  });
});
