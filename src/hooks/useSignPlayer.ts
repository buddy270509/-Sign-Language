/**
 * Sign playback engine.
 *
 * Responsibilities:
 *  - advance a virtual clock through a playlist of signs (speed / loop aware),
 *  - resolve each sign's keyframes and cross-fade between consecutive signs,
 *  - add the "life" layer (blink, sentence-level head movement),
 *  - expose frame + current index + progress for the UI.
 *
 * The animation loop always runs while mounted (so the face blinks and the head
 * moves even when paused) but the sign clock only advances while playing.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AvatarFrame, SignEntry } from '../types/sign';
import {
  blendPoses,
  buildAvatarFrame,
  getResolvedSign,
  IDLE_POSE,
  idleFrame,
  poseAt,
  type PerformanceOptions,
  type Pose,
} from '../core/rig/compile';
import type { ExpressionId } from '../core/rig/presets';
import { EASINGS } from '../core/rig/interpolate';

export interface PlaylistItem {
  sign: SignEntry;
  tokenIndex: number;
  label: string;
}

export interface PlayerOptions {
  speed?: number;
  loop?: boolean;
  expression?: ExpressionId | null;
  intensity?: number;
  /** Fraction of each sign spent morphing from the previous handshape. */
  transition?: number;
}

export interface PlayerState {
  frame: AvatarFrame;
  index: number;
  /** Progress inside the current sign, 0..1. */
  progress: number;
  /** Progress through the whole playlist, 0..1. */
  totalProgress: number;
  isPlaying: boolean;
  canPlay: boolean;
}

export interface SignPlayer extends PlayerState {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  replay: () => void;
  next: () => void;
  previous: () => void;
  playIndex: (index: number) => void;
  seek: (fraction: number) => void;
}

/** Cheap periodic blink so the avatar never looks frozen. */
function blinkAmount(now: number): number {
  const period = 4300;
  const phase = (now + 1500) % period;
  if (phase > 170) return 0;
  return 1 - Math.abs(phase - 85) / 85;
}

export function useSignPlayer(items: PlaylistItem[], options: PlayerOptions = {}): SignPlayer {
  const { speed = 1, loop = false, expression = null, intensity = 1, transition = 0.22 } = options;

  const resolved = useMemo(() => items.map((item) => getResolvedSign(item.sign)), [items]);
  const durations = useMemo(
    () => items.map((item) => Math.max(140, item.sign.durationMs / Math.max(0.25, speed))),
    [items, speed],
  );
  const offsets = useMemo(() => {
    const out: number[] = [];
    let acc = 0;
    for (const d of durations) {
      out.push(acc);
      acc += d;
    }
    return { starts: out, total: acc };
  }, [durations]);

  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const stateIndexRef = useRef(0);
  const [state, setState] = useState<PlayerState>({
    frame: idleFrame(),
    index: 0,
    progress: 0,
    totalProgress: 0,
    isPlaying: false,
    canPlay: items.length > 0,
  });

  // Keep the latest options in a ref so the animation loop never restarts mid-play.
  const perfRef = useRef<PerformanceOptions>({});
  useEffect(() => {
    perfRef.current = { expression, intensity };
  }, [expression, intensity]);

  const dataRef = useRef({ resolved, offsets, transition, loop });
  useEffect(() => {
    dataRef.current = { resolved, offsets, transition, loop };
  }, [resolved, offsets, transition, loop]);

  const setPlaying = useCallback((playing: boolean) => {
    playingRef.current = playing;
    setState((prev) => (prev.isPlaying === playing ? prev : { ...prev, isPlaying: playing }));
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const { resolved: signs, offsets: off, transition: trans, loop: doLoop } = dataRef.current;
      const perf = perfRef.current;

      if (playingRef.current && signs.length > 0) {
        timeRef.current += dt;
        if (timeRef.current >= off.total) {
          if (doLoop) timeRef.current = 0;
          else {
            timeRef.current = Math.max(0, off.total - 1);
            playingRef.current = false;
          }
        }
      }

      // Locate the active sign.
      let index = 0;
      if (signs.length === 0) {
        setState({
          frame: idleFrame({ ...perf, timeMs: now, blink: blinkAmount(now) }),
          index: 0,
          progress: 0,
          totalProgress: 0,
          isPlaying: false,
          canPlay: false,
        });
        raf = requestAnimationFrame(tick);
        return;
      }

      for (let i = 0; i < off.starts.length; i += 1) {
        const start = off.starts[i] as number;
        const dur = (off.starts[i + 1] ?? off.total) - start;
        if (timeRef.current < start + dur || i === off.starts.length - 1) {
          index = i;
          break;
        }
      }

      const start = off.starts[index] ?? 0;
      const dur = (off.starts[index + 1] ?? off.total) - start;
      const progress = dur <= 0 ? 1 : Math.min(1, Math.max(0, (timeRef.current - start) / dur));

      const current = signs[index];
      const previous = index > 0 ? signs[index - 1] : undefined;
      let pose: Pose = IDLE_POSE;
      if (current) {
        pose = poseAt(current, progress);
        if (progress < trans) {
          const from = previous ? poseAt(previous, 1) : IDLE_POSE;
          pose = blendPoses(from, pose, EASINGS.easeOut(progress / trans));
        }
      }

      const frame = buildAvatarFrame(pose, {
        ...perf,
        timeMs: now,
        blink: blinkAmount(now),
      });

      const totalProgress = off.total <= 0 ? 0 : Math.min(1, timeRef.current / off.total);
      stateIndexRef.current = index;
      setState({
        frame,
        index,
        progress,
        totalProgress,
        isPlaying: playingRef.current,
        canPlay: true,
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const play = useCallback(() => {
    if (durations.length === 0) return;
    if (timeRef.current >= offsets.total - 2) timeRef.current = 0;
    setPlaying(true);
  }, [durations.length, offsets.total, setPlaying]);

  const pause = useCallback(() => setPlaying(false), [setPlaying]);

  const toggle = useCallback(() => {
    if (playingRef.current) setPlaying(false);
    else play();
  }, [play, setPlaying]);

  const replay = useCallback(() => {
    timeRef.current = 0;
    if (durations.length > 0) setPlaying(true);
  }, [durations.length, setPlaying]);

  const playIndex = useCallback(
    (index: number) => {
      const start = offsets.starts[index];
      if (start === undefined) return;
      timeRef.current = start;
      setPlaying(true);
    },
    [offsets.starts, setPlaying],
  );

  const next = useCallback(
    () => playIndex(Math.min(items.length - 1, stateIndexRef.current + 1)),
    [playIndex, items.length],
  );
  const previous = useCallback(() => playIndex(Math.max(0, stateIndexRef.current - 1)), [playIndex]);

  const seek = useCallback(
    (fraction: number) => {
      timeRef.current = Math.min(offsets.total - 1, Math.max(0, fraction * offsets.total));
    },
    [offsets.total],
  );

  return { ...state, canPlay: items.length > 0, play, pause, toggle, replay, next, previous, playIndex, seek };
}
