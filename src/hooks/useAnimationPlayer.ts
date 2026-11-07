/**
 * React binding for the animation queue.
 *
 * One requestAnimationFrame loop drives everything:
 *   · while playing  → advance the queue and re-render the avatar (60 fps)
 *   · while idle     → gentle idle pose at ~16 fps (cheap, no flashing)
 *
 * Re-renders are gated on `poseKey`, so a frame that would draw the same picture does
 * nothing. The transport UI reads a snapshot that only updates ~10 times a second, which
 * keeps the expensive list/panel tree out of the 60 fps path.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RenderPose, RigPose, SignAnimation } from '../types/animation';
import { buildRenderPose } from '../core/rig/render';
import { poseKey } from '../core/rig/pose';
import { idlePose } from '../core/animation/compile';
import { AnimationQueue, type LoopMode, type QueueItem, type QueueSnapshot } from '../core/animation/queue';
import { compileAnimation, type OverlaySettings } from '../core/animation/compile';

export interface PlayerOptions {
  animations?: SignAnimation[];
  transitionMs?: number;
  speed?: number;
  loop?: LoopMode;
  mirrored?: boolean;
  overlay?: OverlaySettings;
  autoPlay?: boolean;
  /** Turn the idle breathing off (reduced-motion users). */
  stillWhenIdle?: boolean;
  onSignStarted?: (item: QueueItem) => void;
  onSignEnded?: (item: QueueItem) => void;
  onQueueFinished?: () => void;
}

export interface PlayerApi {
  queue: AnimationQueue;
  pose: RenderPose;
  snapshot: QueueSnapshot;
  fps: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  replay: () => void;
  toggle: () => void;
  seek: (timeMs: number) => void;
  jumpTo: (index: number) => void;
  setSpeed: (speed: number) => void;
  setLoop: (loop: LoopMode) => void;
  setMirrored: (mirrored: boolean) => void;
  setOverlay: (overlay: OverlaySettings) => void;
  setTransitionMs: (ms: number) => void;
  load: (animations: SignAnimation[], options?: { autoplay?: boolean }) => void;
}

const IDLE_INTERVAL_MS = 62;

export function useAnimationPlayer(options: PlayerOptions = {}): PlayerApi {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const queueRef = useRef<AnimationQueue | null>(null);
  if (!queueRef.current) {
    queueRef.current = new AnimationQueue({
      transitionMs: options.transitionMs,
      speed: options.speed,
      loop: options.loop,
      mirrored: options.mirrored,
      overlay: options.overlay,
    });
    queueRef.current.setFallbackPose(() => idlePose(0));
  }
  const queue = queueRef.current;

  const [pose, setPose] = useState<RenderPose>(() => buildRenderPose(idlePose(0)));
  const [snapshot, setSnapshot] = useState<QueueSnapshot>(() => queue.getSnapshot());
  const [fps, setFps] = useState(0);
  const poseKeyRef = useRef('');
  const idleElapsed = useRef(0);
  const idClock = useRef(0);
  const [idleTick, setIdleTick] = useState(0);

  /* ---- wire queue events to the latest callbacks ---- */
  useEffect(() => {
    const offStart = queue.on('sign-started', ({ item }) => optionsRef.current.onSignStarted?.(item));
    const offEnd = queue.on('sign-ended', ({ item }) => optionsRef.current.onSignEnded?.(item));
    const offDone = queue.on('queue-finished', () => optionsRef.current.onQueueFinished?.());
    return () => {
      offStart();
      offEnd();
      offDone();
    };
  }, [queue]);

  /* ---- load the initial animations ---- */
  const loadedRef = useRef<string>('');
  useEffect(() => {
    const animations = options.animations ?? [];
    const key = animations.map((animation) => animation.id).join(',');
    if (key === loadedRef.current) return;
    loadedRef.current = key;
    const items: QueueItem[] = animations.map((animation) => ({
      key: animation.id,
      label: animation.label ?? animation.id,
      compiled: compileAnimation(animation),
    }));
    queue.load(items, { autoplay: options.autoPlay ?? false, announce: false });
    setSnapshot(queue.getSnapshot());
  }, [options.animations, options.autoPlay, queue]);

  /* ---- the single rAF loop ---- */
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let fpsAccum = 0;
    let fpsFrames = 0;
    let snapshotClock = 0;

    const handle = (now: number) => {
      frame = requestAnimationFrame(handle);
      const dt = Math.min(64, Math.max(0, now - last));
      last = now;

      fpsAccum += dt;
      fpsFrames += 1;
      if (fpsAccum >= 500) {
        setFps(Math.round((fpsFrames * 1000) / fpsAccum));
        fpsAccum = 0;
        fpsFrames = 0;
      }

      const hasItems = queue.queueItems.length > 0;
      const playing = queue.getSnapshot().playing;

      if (hasItems && playing) {
        queue.step(dt);
        const key = queue.getPoseKey();
        if (key !== poseKeyRef.current) {
          poseKeyRef.current = key;
          setPose(buildRenderPose(queue.getPose()));
        }
        snapshotClock += dt;
        if (snapshotClock >= 100) {
          snapshotClock = 0;
          setSnapshot(queue.getSnapshot());
        }
        return;
      }

      // Idle: gently animated unless the user asked for still frames.
      if (!optionsRef.current.stillWhenIdle) {
        idClock.current += dt;
        if (idClock.current >= IDLE_INTERVAL_MS) {
          idClock.current = 0;
          idleElapsed.current += IDLE_INTERVAL_MS;
          setIdleTick((tick) => (tick + 1) % 100000);
        }
      }
    };

    frame = requestAnimationFrame(handle);
    return () => cancelAnimationFrame(frame);
  }, [queue]);

  /* ---- idle pose follows the idle clock ---- */
  const idlePoseBuilt = useMemo<RenderPose | null>(() => {
    const hasItems = queue.queueItems.length > 0;
    if (hasItems) return null;
    return buildRenderPose(idlePose(idleElapsed.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idleTick, queue]);

  const effectivePose = queue.queueItems.length === 0 && idlePoseBuilt ? idlePoseBuilt : pose;

  /* ---- transport ---- */
  const play = useCallback(() => {
    queue.play();
    setSnapshot(queue.getSnapshot());
  }, [queue]);

  const pause = useCallback(() => {
    queue.pause();
    setSnapshot(queue.getSnapshot());
  }, [queue]);

  const stop = useCallback(() => {
    queue.stop();
    setSnapshot(queue.getSnapshot());
    poseKeyRef.current = '';
  }, [queue]);

  const replay = useCallback(() => {
    queue.replay();
    setSnapshot(queue.getSnapshot());
    poseKeyRef.current = '';
  }, [queue]);

  const toggle = useCallback(() => {
    if (queue.getSnapshot().playing) pause();
    else play();
  }, [pause, play, queue]);

  const seek = useCallback(
    (timeMs: number) => {
      queue.seek(timeMs);
      poseKeyRef.current = '';
      setPose(buildRenderPose(queue.getPose()));
      setSnapshot(queue.getSnapshot());
    },
    [queue],
  );

  const jumpTo = useCallback(
    (index: number) => {
      queue.jumpTo(index);
      poseKeyRef.current = '';
      setPose(buildRenderPose(queue.getPose()));
      setSnapshot(queue.getSnapshot());
    },
    [queue],
  );

  const setSpeed = useCallback(
    (speed: number) => {
      queue.setSpeed(speed);
      setSnapshot(queue.getSnapshot());
    },
    [queue],
  );

  const setLoop = useCallback(
    (loop: LoopMode) => {
      queue.setLoop(loop);
      setSnapshot(queue.getSnapshot());
    },
    [queue],
  );

  const setMirrored = useCallback(
    (mirrored: boolean) => {
      queue.setMirrored(mirrored);
      poseKeyRef.current = '';
      setPose(buildRenderPose(queue.getPose()));
      setSnapshot(queue.getSnapshot());
    },
    [queue],
  );

  const setOverlay = useCallback(
    (overlay: OverlaySettings) => {
      queue.setOverlay(overlay);
      poseKeyRef.current = '';
      setPose(buildRenderPose(queue.getPose()));
    },
    [queue],
  );

  const setTransitionMs = useCallback(
    (ms: number) => {
      queue.setTransitionMs(ms);
    },
    [queue],
  );

  const load = useCallback(
    (animations: SignAnimation[], loadOptions: { autoplay?: boolean } = {}) => {
      const items: QueueItem[] = animations.map((animation) => ({
        key: animation.id,
        label: animation.label ?? animation.id,
        compiled: compileAnimation(animation),
      }));
      queue.load(items, { autoplay: loadOptions.autoplay ?? true, announce: true });
      poseKeyRef.current = '';
      setPose(buildRenderPose(queue.getPose()));
      setSnapshot(queue.getSnapshot());
    },
    [queue],
  );

  // Keep the visible pose in sync when the queue was loaded before the first frame.
  useEffect(() => {
    if (queue.queueItems.length === 0) return;
    const key = queue.getPoseKey();
    if (key !== poseKeyRef.current) {
      poseKeyRef.current = key;
      setPose(buildRenderPose(queue.getPose()));
    }
  }, [snapshot.key, queue]);

  return {
    queue,
    pose: effectivePose,
    snapshot,
    fps,
    play,
    pause,
    stop,
    replay,
    toggle,
    seek,
    jumpTo,
    setSpeed,
    setLoop,
    setMirrored,
    setOverlay,
    setTransitionMs,
    load,
  };
}

/** Pose key helper for callers that want to memoise on their own. */
export const rigPoseKey = (pose: RigPose) => poseKey(pose);
