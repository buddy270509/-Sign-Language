/**
 * Animation queue — the playback engine.
 *
 * Owns: which sign is playing, how far into it we are, transitions between signs, speed,
 * looping, mirroring and the sentence-level overlay. It is deliberately framework-free:
 * the React hook just calls `step(dt)` from requestAnimationFrame and reads `getPose()`.
 */
import type { RigPose } from '../../types/animation';
import { clamp01 } from '../rig/anatomy';
import { clampPose, mirrorPose, neutralPose, poseKey } from '../rig/pose';
import { applyOverlay, overlayGroupsFor, poseAtProgress, type CompiledAnimation, type OverlaySettings } from './compile';
import { clampTransitionMs, DEFAULT_TRANSITION_MS, transitionPose } from './transition';

export type LoopMode = 'off' | 'all' | 'one';

export interface QueueItem {
  key: string;
  compiled: CompiledAnimation;
  label?: string;
  overlay?: OverlaySettings;
}

export type QueueEventName = 'sign-started' | 'sign-ended' | 'queue-finished';

export type QueueListener<T = QueueItem> = (payload: { item: T; index: number; queue: AnimationQueue }) => void;

export interface QueueSnapshot {
  playing: boolean;
  finished: boolean;
  index: number;
  count: number;
  key: string;
  label: string;
  timeMs: number;
  durationMs: number;
  progress: number;
  totalMs: number;
  elapsedMs: number;
  loop: LoopMode;
  speed: number;
  mirrored: boolean;
}

export interface QueueOptions {
  transitionMs?: number;
  loop?: LoopMode;
  speed?: number;
  mirrored?: boolean;
  overlay?: OverlaySettings;
}

export class AnimationQueue {
  private items: QueueItem[] = [];
  private cursor = 0;
  private timeMs = 0;
  private playing = false;
  private finished = false;
  private speed = 1;
  private loop: LoopMode = 'off';
  private mirrored = false;
  private transitionMs = DEFAULT_TRANSITION_MS;
  private transitionFrom: RigPose | null = null;
  private transitionElapsed = 0;
  private overlay: OverlaySettings = {};
  private listeners = new Map<QueueEventName, Set<QueueListener<never>>>();
  private cachedKey = '';
  private cachedPose: RigPose | null = null;

  constructor(options: QueueOptions = {}) {
    this.transitionMs = clampTransitionMs(options.transitionMs ?? DEFAULT_TRANSITION_MS);
    this.loop = options.loop ?? 'off';
    this.speed = options.speed ?? 1;
    this.mirrored = options.mirrored ?? false;
    this.overlay = options.overlay ?? {};
  }

  /* ---------------- items ---------------- */

  get queueItems(): readonly QueueItem[] {
    return this.items;
  }

  get currentItem(): QueueItem | undefined {
    return this.items[this.cursor];
  }

  /** Replace the queue. Keeps playing state; restarts from the first item. */
  load(items: QueueItem[], options: { autoplay?: boolean; announce?: boolean } = {}): void {
    this.items = items;
    this.cursor = 0;
    this.timeMs = 0;
    this.transitionFrom = null;
    this.transitionElapsed = 0;
    this.finished = false;
    this.invalidate();
    this.playing = options.autoplay ?? this.playing;
    if (items.length > 0 && options.announce !== false) {
      this.emit('sign-started', items[0] as QueueItem);
    }
  }

  /* ---------------- transport ---------------- */

  play(): void {
    if (this.items.length === 0) return;
    if (this.finished) {
      this.replay();
      return;
    }
    if (this.playing) return;
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  resume(): void {
    this.play();
  }

  stop(): void {
    this.playing = false;
    this.cursor = 0;
    this.timeMs = 0;
    this.transitionFrom = null;
    this.transitionElapsed = 0;
    this.finished = false;
    this.invalidate();
  }

  replay(): void {
    if (this.items.length === 0) return;
    this.cursor = 0;
    this.timeMs = 0;
    this.transitionFrom = null;
    this.transitionElapsed = 0;
    this.finished = false;
    this.playing = true;
    this.invalidate();
    this.emit('sign-started', this.items[0] as QueueItem);
  }

  /** Jump to a time inside the current sign. Scrubbing skips the cross-fade. */
  seek(timeMs: number): void {
    const duration = this.currentItem?.compiled.durationMs ?? 0;
    this.timeMs = Math.max(0, Math.min(duration, timeMs));
    this.transitionFrom = null;
    this.transitionElapsed = 0;
    if (this.timeMs < duration) this.finished = false;
    this.invalidate();
  }

  /** Jump to a sign by index (used by the Studio and the demo list). */
  jumpTo(index: number): void {
    if (this.items.length === 0) return;
    const next = Math.max(0, Math.min(this.items.length - 1, Math.round(index)));
    if (next === this.cursor) {
      this.seek(0);
      return;
    }
    this.transitionFrom = this.getPose();
    this.transitionElapsed = 0;
    this.cursor = next;
    this.timeMs = 0;
    this.finished = false;
    this.invalidate();
    const item = this.items[next];
    if (item) this.emit('sign-started', item);
  }

  /* ---------------- settings ---------------- */

  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(3, speed));
  }

  getSpeed(): number {
    return this.speed;
  }

  setLoop(loop: LoopMode): void {
    this.loop = loop;
  }

  setMirrored(mirrored: boolean): void {
    this.mirrored = mirrored;
    this.invalidate();
  }

  setOverlay(overlay: OverlaySettings): void {
    this.overlay = overlay;
    this.invalidate();
  }

  setTransitionMs(ms: number): void {
    this.transitionMs = clampTransitionMs(ms);
  }

  getTransitionMs(): number {
    return this.transitionMs;
  }

  /* ---------------- events ---------------- */

  on<T extends QueueItem = QueueItem>(event: QueueEventName, listener: QueueListener<T>): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(listener as QueueListener<never>);
    this.listeners.set(event, set);
    return () => {
      set.delete(listener as QueueListener<never>);
    };
  }

  private emit(event: QueueEventName, item: QueueItem): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of set) {
      (listener as unknown as QueueListener)({ item, index: this.cursor, queue: this });
    }
  }

  /* ---------------- time ---------------- */

  /**
   * Advance the queue by wall-clock milliseconds. Returns true when the visible state
   * changed (so callers can skip re-renders on identical frames).
   */
  step(deltaMs: number): boolean {
    if (!this.playing || this.items.length === 0) return false;
    const delta = Math.max(0, deltaMs) * this.speed;
    if (delta === 0) return false;
    if (this.transitionFrom) this.transitionElapsed += delta;

    let remaining = delta;
    let guard = 0;
    while (remaining > 0 && guard < 64) {
      guard += 1;
      const item = this.items[this.cursor];
      if (!item) break;
      const duration = item.compiled.durationMs;
      const left = duration - this.timeMs;
      if (remaining < left) {
        this.timeMs += remaining;
        remaining = 0;
        break;
      }
      remaining -= left;
      this.timeMs = duration;
      const ended = item;
      const endedIndex = this.cursor;
      this.invalidate();
      this.emit('sign-ended', ended);

      const nextIndex = this.nextIndex(endedIndex);
      if (nextIndex === null) {
        this.playing = false;
        this.finished = true;
        this.transitionFrom = null;
        this.emit('queue-finished', ended);
        break;
      }
      // Freeze what is on screen as the "from" pose of the cross-fade.
      this.transitionFrom = this.getPose();
      this.transitionElapsed = 0;
      this.cursor = nextIndex;
      this.timeMs = 0;
      this.invalidate();
      const next = this.items[nextIndex];
      if (next) this.emit('sign-started', next);
    }
    return true;
  }

  private nextIndex(index: number): number | null {
    if (this.loop === 'one') return index;
    if (index + 1 < this.items.length) return index + 1;
    if (this.loop === 'all') return 0;
    return null;
  }

  /* ---------------- reading state ---------------- */

  getPose(): RigPose {
    const key = this.poseCacheKey();
    if (this.cachedPose && key === this.cachedKey) return this.cachedPose;
    const pose = this.computePose();
    this.cachedPose = pose;
    this.cachedKey = key;
    return pose;
  }

  private computePose(): RigPose {
    const item = this.items[this.cursor];
    if (!item) return clampPose(this.fallbackPose());
    const progress = clamp01(this.timeMs / item.compiled.durationMs);
    let pose = poseAtProgress(item.compiled, progress);
    const overlay = item.overlay ?? this.overlay;
    if (overlay && Object.keys(overlay).length > 0) {
      // Per-sign decision: leave the mouth alone when the sign is using it.
      pose = applyOverlay(pose, { ...overlay, groups: overlayGroupsFor(item.compiled, overlay.groups) }, progress);
    }
    if (this.transitionFrom && this.transitionElapsed < this.transitionMs) {
      pose = transitionPose(this.transitionFrom, pose, this.transitionElapsed / this.transitionMs);
    }
    pose = clampPose(pose);
    return this.mirrored ? mirrorPose(pose) : pose;
  }

  /** Used when the queue is empty: the first item's base pose, or the neutral figure. */
  private fallbackPose(): RigPose {
    return this.items[0]?.compiled.base ?? this.emptyPose();
  }

  private emptyPose: () => RigPose = () => neutralPose();

  setFallbackPose(provider: () => RigPose): void {
    this.emptyPose = provider;
  }

  private poseCacheKey(): string {
    const item = this.items[this.cursor];
    return [
      this.cursor,
      this.timeMs.toFixed(2),
      item?.compiled.durationMs ?? 0,
      this.transitionFrom ? this.transitionElapsed.toFixed(2) : '-',
      this.mirrored ? 'm' : 'n',
      this.finished ? 'f' : 'r',
      JSON.stringify(this.items[this.cursor]?.overlay ?? this.overlay ?? {}),
    ].join('|');
  }

  private invalidate(): void {
    this.cachedKey = '';
    this.cachedPose = null;
  }

  getSnapshot(): QueueSnapshot {
    const item = this.items[this.cursor];
    const durationMs = item?.compiled.durationMs ?? 0;
    let total = 0;
    let elapsed = 0;
    this.items.forEach((entry, index) => {
      total += entry.compiled.durationMs;
      if (index < this.cursor) elapsed += entry.compiled.durationMs;
    });
    elapsed += this.timeMs;
    return {
      playing: this.playing,
      finished: this.finished,
      index: this.cursor,
      count: this.items.length,
      key: item?.key ?? '',
      label: item?.label ?? item?.compiled.animation.label ?? item?.compiled.animation.id ?? '',
      timeMs: this.timeMs,
      durationMs,
      progress: durationMs > 0 ? clamp01(this.timeMs / durationMs) : 0,
      totalMs: total,
      elapsedMs: elapsed,
      loop: this.loop,
      speed: this.speed,
      mirrored: this.mirrored,
    };
  }

  /** Debug helper: the pose key at the current instant. */
  getPoseKey(): string {
    return poseKey(this.getPose());
  }
}
