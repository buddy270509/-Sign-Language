/**
 * Sign Studio — author animation by hand.
 *
 * Everything here writes the same JSON the engine plays, and the engine plays it as you
 * type (no separate preview path). Drafts autosave to IndexedDB so a refresh never loses
 * work; import/export uses the documented format and the schema validator.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  BodyKeyframe,
  FaceKeyframe,
  FaceState,
  HandKeyframe,
  HeadKeyframe,
  SignAnimation,
} from '../types/animation';
import { AvatarStage } from '../components/avatar/AvatarStage';
import { HandPreview } from '../components/avatar/HandPreview';
import { Timeline, TRACKS, type TrackName } from '../components/studio/Timeline';
import { Icon } from '../components/ui/Icon';
import { RangeField, Segmented } from '../components/ui/Controls';
import { HANDSHAPES } from '../core/rig/handshapes';
import { PALM_ORIENTATIONS } from '../core/rig/anatomy';
import { EXPRESSIONS, EXPRESSION_IDS } from '../core/rig/face';
import { EASING_NAMES } from '../core/animation/easing';
import { applyOverlay, compileAnimation, poseAtProgress, type OverlaySettings } from '../core/animation/compile';
import { buildRenderPose } from '../core/rig/render';
import { clampPose } from '../core/rig/pose';
import { formatIssues, validateAnimation } from '../core/animation/schema';
import { ALL_ANIMATIONS, DEMO_ANIMATIONS } from '../data/animations';
import { idbGet, idbSet } from '../lib/idb';
import { useSettings } from '../store/settings';
import type { EasingName, HeadMotion } from '../types/animation';

const DRAFT_KEY = 'studio.draft.v1';

const FACE_GROUPS: Array<{ id: string; label: string; keys: Array<keyof FaceState> }> = [
  { id: 'brows', label: 'Brows', keys: ['browRaiseL', 'browRaiseR', 'browFurrowL', 'browFurrowR'] },
  { id: 'eyes', label: 'Eyes', keys: ['eyeOpenL', 'eyeOpenR', 'blink', 'gazeX', 'gazeY'] },
  { id: 'cheeks', label: 'Cheeks & nose', keys: ['cheekPuff', 'cheekRaise', 'noseWrinkle'] },
  {
    id: 'mouth',
    label: 'Mouth',
    keys: ['mouthOpen', 'mouthWidth', 'mouthSmile', 'lipPurse', 'lipsPressed', 'tongueOut', 'mouthAh', 'mouthEe', 'mouthPa'],
  },
];

const FACE_RANGE: Partial<Record<keyof FaceState, [number, number]>> = {
  gazeX: [-1, 1],
  gazeY: [-1, 1],
  mouthSmile: [-1, 1],
};

function newAnimation(): SignAnimation {
  return {
    id: 'my-sign',
    label: 'My sign',
    duration_ms: 1600,
    tracks: { rightHand: [], leftHand: [], face: [], head: [], body: [] },
    nonManualOverlay: { expression: 'neutral', weight: 0, headMotion: 'none' },
    meta: {
      language: 'ISL',
      description: 'Draft created in Sign Studio.',
      reviewed_by_deaf_signer: false,
    },
  };
}

/** Complete state of a track at a given progress, used to seed a new keyframe. */
function seedKey(animation: SignAnimation, track: TrackName, progress: number) {
  const compiled = compileAnimation(animation);
  const pose = poseAtProgress(compiled, progress);
  if (track === 'rightHand' || track === 'leftHand') {
    const hand = track === 'rightHand' ? pose.right : pose.left;
    return {
      t: progress,
      wrist: [...hand.wrist] as [number, number, number],
      handshape: hand.handshape,
      palm: hand.palm,
      palmYaw: hand.palmYaw ?? 0,
      palmPitch: hand.palmPitch ?? 0,
      roll: hand.roll,
      scale: hand.scale ?? 1,
    };
  }
  return { t: progress, ...pose[track === 'face' ? 'face' : track === 'head' ? 'head' : 'body'] };
}

export function StudioPage() {
  const { settings, update } = useSettings();
  const [animation, setAnimation] = useState<SignAnimation>(newAnimation);
  const [track, setTrack] = useState<TrackName>('rightHand');
  const [selectedKey, setSelectedKey] = useState(0);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState('');
  const [panel, setPanel] = useState<'none' | 'export' | 'import'>('none');
  const [importText, setImportText] = useState('');
  const [importIssues, setImportIssues] = useState<string>('');
  const [loaded, setLoaded] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const rafRef = useRef(0);

  /* ---------------- load draft ---------------- */
  useEffect(() => {
    let alive = true;
    idbGet<SignAnimation>(DRAFT_KEY).then((stored) => {
      if (!alive) return;
      if (stored && validateAnimation(stored).ok) {
        setAnimation(stored);
        setStatus('Restored your last draft.');
      }
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  /* ---------------- autosave ---------------- */
  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      idbSet(DRAFT_KEY, animation).then(() => setStatus('Saved to this device.'));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [animation, loaded]);

  /* ---------------- playback ---------------- */
  const compiled = useMemo(() => compileAnimation(animation), [animation]);
  const overlayExpressionId =
    typeof animation.nonManualOverlay?.expression === 'string'
      ? animation.nonManualOverlay.expression
      : animation.nonManualOverlay?.expression?.id;

  const overlay = useMemo<OverlaySettings>(
    () => ({
      expression: overlayExpressionId,
      weight: animation.nonManualOverlay?.weight ?? 0,
      headMotion: animation.nonManualOverlay?.headMotion ?? 'none',
      headMotionAmount: animation.nonManualOverlay?.headMotionAmount ?? 1,
    }),
    [animation.nonManualOverlay, overlayExpressionId],
  );

  const pose = useMemo(() => {
    const raw = poseAtProgress(compiled, playhead);
    const withOverlay = applyOverlay(raw, overlay, playhead);
    return buildRenderPose(clampPose(withOverlay));
  }, [compiled, playhead, overlay]);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const handle = (now: number) => {
      const dt = now - last;
      last = now;
      setPlayhead((current) => {
        const next = current + (dt / animation.duration_ms) * settings.speed;
        return next >= 1 ? 0 : next;
      });
      rafRef.current = requestAnimationFrame(handle);
    };
    rafRef.current = requestAnimationFrame(handle);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, animation.duration_ms, settings.speed]);

  /* ---------------- editing helpers ---------------- */
  const keys = animation.tracks[track] ?? [];
  const current = keys[selectedKey] as Record<string, unknown> | undefined;

  const setTrackKeys = useCallback(
    (nextKeys: Array<HandKeyframe | FaceKeyframe | HeadKeyframe | BodyKeyframe>) => {
      setAnimation((prev) => ({
        ...prev,
        tracks: { ...prev.tracks, [track]: [...nextKeys].sort((a, b) => a.t - b.t) },
      }));
    },
    [track],
  );

  const addKeyframe = useCallback(() => {
    const seed = seedKey(animation, track, playhead) as Record<string, unknown>;
    const next = [...keys, seed as never].sort((a, b) => a.t - b.t);
    setAnimation((prev) => ({ ...prev, tracks: { ...prev.tracks, [track]: next as never } }));
    setSelectedKey(next.findIndex((key) => key.t === playhead));
  }, [animation, keys, playhead, track]);

  const deleteKeyframe = useCallback(() => {
    if (!current) return;
    setTrackKeys(keys.filter((_key, index) => index !== selectedKey));
    setSelectedKey(Math.max(0, selectedKey - 1));
  }, [current, keys, selectedKey, setTrackKeys]);

  const patchKey = useCallback(
    (patch: Record<string, unknown>) => {
      if (!current) return;
      const next = keys.map((key, index) =>
        index === selectedKey ? ({ ...key, ...patch } as never) : key,
      ) as typeof keys;
      setTrackKeys(next);
    },
    [current, keys, selectedKey, setTrackKeys],
  );

  const patchMeta = (patch: Partial<SignAnimation>) => setAnimation((prev) => ({ ...prev, ...patch }));

  /* ---------------- import / export ---------------- */
  const exportJson = useMemo(() => JSON.stringify(animation, null, 2), [animation]);

  const download = () => {
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${animation.id || 'sign'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const loadImport = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      const result = validateAnimation(parsed);
      if (!result.ok) {
        setImportIssues(formatIssues(result.issues));
        return;
      }
      setAnimation(parsed as SignAnimation);
      setImportIssues(result.issues.length > 0 ? formatIssues(result.issues) : 'Loaded with no problems.');
      setPanel('none');
      setPlayhead(0);
      setSelectedKey(0);
    } catch (error) {
      setImportIssues(`That is not valid JSON: ${(error as Error).message}`);
    }
  };

  const selectedHand = track === 'rightHand' || track === 'leftHand';

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Sign Studio</h1>
          <p className="mt-1 max-w-prose text-sm text-ink-soft">
            Build a sign from keyframes. Each channel has its own track, so the face and hands can be timed
            independently. Drafts autosave on this device.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Load an existing animation"
            className="min-h-11 rounded-xl border border-line bg-surface px-2 text-sm font-semibold"
            value=""
            onChange={(event) => {
              const found = ALL_ANIMATIONS.find((entry) => entry.id === event.target.value);
              if (!found) return;
              const clone: SignAnimation = {
                ...JSON.parse(JSON.stringify(found)),
                id: `${found.id}-copy`,
                meta: { ...found.meta, description: `${found.meta.description} (Studio copy)` },
              };
              setAnimation(clone);
              setPlayhead(0);
              setSelectedKey(0);
              setStatus(`Loaded ${found.label ?? found.id}`);
            }}
          >
            <option value="">Load a template…</option>
            {DEMO_ANIMATIONS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label ?? entry.id}
              </option>
            ))}
            <option value="fs-a">Letter A</option>
          </select>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setAnimation(newAnimation());
              setStatus('New blank animation.');
              setPlayhead(0);
            }}
          >
            <Icon name="close" /> New
          </button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        {/* ---------------- preview ---------------- */}
        <div className="space-y-3">
          <AvatarStage
            pose={pose}
            view={settings.view}
            style={settings.avatarStyle}
            showLandmarks={settings.showLandmarks}
            expressionLabel={EXPRESSIONS[overlayExpressionId ?? 'neutral']?.label}
            expressionDetail={EXPRESSIONS[overlayExpressionId ?? 'neutral']?.explanation}
            showExpression={settings.showLabels}
            caption={`${(playhead * animation.duration_ms / 1000).toFixed(2)}s · ${TRACKS.find((entry) => entry.id === track)?.label}`}
          />
          <div className="card-flat flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-primary flex-1" onClick={() => setPlaying((value) => !value)}>
              <Icon name={playing ? 'pause' : 'play'} filled={!playing} />
              {playing ? 'Pause' : 'Play'}
            </button>
            <button type="button" className="btn" onClick={() => setPlayhead(0)}>
              <Icon name="replay" /> Start
            </button>
            <select
              aria-label="Preview camera"
              value={settings.view}
              onChange={(event) => update({ view: event.target.value as typeof settings.view })}
              className="min-h-11 rounded-xl border border-line bg-surface px-2 text-sm font-semibold"
            >
              <option value="full">Full body</option>
              <option value="hands">Hands</option>
              <option value="face">Face</option>
            </select>
          </div>

          <div className="card-flat space-y-2">
            <label className="block text-sm font-semibold text-ink" htmlFor="studio-label">
              Label
            </label>
            <input
              id="studio-label"
              value={animation.label ?? ''}
              onChange={(event) => patchMeta({ label: event.target.value })}
              className="min-h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm"
            />
            <label className="block text-sm font-semibold text-ink" htmlFor="studio-id">
              Id (file name)
            </label>
            <input
              id="studio-id"
              value={animation.id}
              onChange={(event) => patchMeta({ id: event.target.value.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase() })}
              className="min-h-11 w-full rounded-xl border border-line bg-surface-2 px-3 font-mono text-sm"
            />
            <RangeField
              label="Duration"
              value={animation.duration_ms}
              min={400}
              max={6000}
              step={100}
              onChange={(value) => patchMeta({ duration_ms: value })}
              format={(value) => `${(value / 1000).toFixed(2)}s`}
            />
            <label className="block text-sm font-semibold text-ink" htmlFor="studio-desc">
              Description
            </label>
            <textarea
              id="studio-desc"
              rows={2}
              value={animation.meta.description}
              onChange={(event) => patchMeta({ meta: { ...animation.meta, description: event.target.value } })}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm"
            />
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={animation.meta.reviewed_by_deaf_signer}
                onChange={(event) =>
                  patchMeta({ meta: { ...animation.meta, reviewed_by_deaf_signer: event.target.checked } })
                }
                className="h-5 w-5"
              />
              Reviewed by a deaf signer
            </label>
            <p className="text-xs text-ink-soft">
              Leave this unticked unless a fluent deaf signer has actually reviewed the motion.
            </p>
          </div>
        </div>

        {/* ---------------- editor ---------------- */}
        <div className="space-y-3">
          <section className="card space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold">Timeline</h2>
              <span className="text-xs font-semibold text-ink-soft">{status}</span>
            </div>
            <Timeline
              tracks={animation.tracks}
              playhead={playhead}
              selectedTrack={track}
              selectedKey={selectedKey}
              onSelect={(nextTrack, index) => {
                setTrack(nextTrack);
                setSelectedKey(index);
              }}
              onScrub={(value) => setPlayhead(value)}
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-sm btn-primary" onClick={addKeyframe}>
                <Icon name="pencil" /> Add keyframe at playhead
              </button>
              <button type="button" className="btn btn-sm" onClick={deleteKeyframe} disabled={!current}>
                <Icon name="close" /> Delete keyframe
              </button>
              <span className="chip">
                {TRACKS.find((entry) => entry.id === track)?.label}: {keys.length}
              </span>
            </div>
          </section>

          <section className="card space-y-3">
            <h2 className="text-base font-bold">
              {current ? `Keyframe ${selectedKey + 1} · ${(((current.t as number) ?? 0) * 100).toFixed(0)}%` : 'No keyframe selected'}
            </h2>

            {!current ? (
              <p className="text-sm text-ink-soft">
                Move the playhead and press “Add keyframe at playhead” to start capturing this channel.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <RangeField
                    label="Time"
                    value={(current.t as number) ?? 0}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(value) => patchKey({ t: value })}
                    format={(value) => `${(value * 100).toFixed(0)}%`}
                  />
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Easing</span>
                    <select
                      value={(current.ease as string) ?? 'easeInOut'}
                      onChange={(event) => patchKey({ ease: event.target.value as EasingName })}
                      className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-2 text-sm"
                    >
                      {EASING_NAMES.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {selectedHand ? (
                  <>
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">Handshape</span>
                      <select
                        value={(current.handshape as string) ?? 'relaxed'}
                        onChange={(event) => patchKey({ handshape: event.target.value })}
                        className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-2 text-sm"
                      >
                        {HANDSHAPES.map((shape) => (
                          <option key={shape.id} value={shape.id}>
                            {shape.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="rounded-xl border border-line bg-surface-2 p-2">
                      <HandPreview
                        hand={{
                          wrist: [(current.wrist as number[])?.[0] ?? 0.5, (current.wrist as number[])?.[1] ?? 0.5, 0.4],
                          handshape: (current.handshape as string) ?? 'relaxed',
                          palm: (current.palm as never) ?? 'forward',
                          palmYaw: (current.palmYaw as number) ?? 0,
                          palmPitch: (current.palmPitch as number) ?? 0,
                          roll: (current.roll as number) ?? 0,
                          scale: (current.scale as number) ?? 1,
                        }}
                        className="mx-auto h-40"
                        showLandmarks={settings.showLandmarks}
                      />
                    </div>
                    <Segmented
                      label="Palm"
                      value={(current.palm as string) ?? 'forward'}
                      options={PALM_ORIENTATIONS.map((orientation) => ({
                        id: orientation,
                        label: orientation[0]!.toUpperCase() + orientation.slice(1),
                      }))}
                      onChange={(value) => patchKey({ palm: value })}
                    />
                    <RangeField
                      label="Wrist roll"
                      value={(current.roll as number) ?? 0}
                      min={-180}
                      max={180}
                      onChange={(value) => patchKey({ roll: value })}
                      format={(value) => `${value}°`}
                    />
                    <RangeField
                      label="Palm yaw (extra)"
                      value={(current.palmYaw as number) ?? 0}
                      min={-90}
                      max={90}
                      onChange={(value) => patchKey({ palmYaw: value })}
                      format={(value) => `${value}°`}
                    />
                    {['x', 'y', 'z'].map((axis, index) => (
                      <RangeField
                        key={axis}
                        label={`Wrist ${axis.toUpperCase()} ${index === 2 ? '(depth)' : ''}`}
                        value={(current.wrist as number[])?.[index] ?? 0.5}
                        min={index === 2 ? -1 : 0}
                        max={1}
                        step={0.01}
                        onChange={(value) => {
                          const wrist = [...((current.wrist as number[]) ?? [0.5, 0.5, 0])];
                          wrist[index] = value;
                          patchKey({ wrist });
                        }}
                        format={(value) => value.toFixed(2)}
                      />
                    ))}
                  </>
                ) : null}

                {track === 'face'
                  ? FACE_GROUPS.map((group) => (
                      <details key={group.id} open={group.id === 'brows'} className="rounded-xl border border-line">
                        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-ink">
                          {group.label}
                        </summary>
                        <div className="space-y-2 px-3 pb-3">
                          {group.keys.map((key) => {
                            const range = FACE_RANGE[key] ?? [0, 1];
                            return (
                              <RangeField
                                key={key}
                                label={key}
                                value={(current[key as string] as number) ?? 0}
                                min={range[0]}
                                max={range[1]}
                                step={0.01}
                                onChange={(value) => patchKey({ [key]: value })}
                                format={(value) => value.toFixed(2)}
                              />
                            );
                          })}
                        </div>
                      </details>
                    ))
                  : null}

                {track === 'head' ? (
                  <>
                    {(['pitch', 'yaw', 'roll'] as const).map((axis) => (
                      <RangeField
                        key={axis}
                        label={`Head ${axis}`}
                        value={(current[axis] as number) ?? 0}
                        min={-35}
                        max={35}
                        onChange={(value) => patchKey({ [axis]: value })}
                        format={(value) => `${value}°`}
                      />
                    ))}
                    <RangeField
                      label="Head forward / back"
                      value={(current.forward as number) ?? 0}
                      min={-1}
                      max={1}
                      step={0.05}
                      onChange={(value) => patchKey({ forward: value })}
                      format={(value) => value.toFixed(2)}
                    />
                  </>
                ) : null}

                {track === 'body' ? (
                  <>
                    <RangeField
                      label="Lean forward / back"
                      value={(current.leanForward as number) ?? 0}
                      min={-1}
                      max={1}
                      step={0.05}
                      onChange={(value) => patchKey({ leanForward: value })}
                      format={(value) => value.toFixed(2)}
                    />
                    <RangeField
                      label="Lean sideways"
                      value={(current.leanSide as number) ?? 0}
                      min={-1}
                      max={1}
                      step={0.05}
                      onChange={(value) => patchKey({ leanSide: value })}
                      format={(value) => value.toFixed(2)}
                    />
                    <RangeField
                      label="Torso turn"
                      value={(current.turn as number) ?? 0}
                      min={-1}
                      max={1}
                      step={0.05}
                      onChange={(value) => patchKey({ turn: value })}
                      format={(value) => value.toFixed(2)}
                    />
                    <RangeField
                      label="Right shoulder"
                      value={(current.shoulderRaiseR as number) ?? 0}
                      min={-1}
                      max={1}
                      step={0.05}
                      onChange={(value) => patchKey({ shoulderRaiseR: value })}
                      format={(value) => value.toFixed(2)}
                    />
                    <RangeField
                      label="Left shoulder"
                      value={(current.shoulderRaiseL as number) ?? 0}
                      min={-1}
                      max={1}
                      step={0.05}
                      onChange={(value) => patchKey({ shoulderRaiseL: value })}
                      format={(value) => value.toFixed(2)}
                    />
                  </>
                ) : null}
              </div>
            )}
          </section>

          <section className="card space-y-3">
            <h2 className="text-base font-bold">Non-manual overlay</h2>
            <p className="text-xs text-ink-soft">
              The overlay is layered over every sign in a sentence. It leaves the mouth alone when a sign uses it.
            </p>
            <Segmented
              label="Expression"
              value={overlayExpressionId ?? 'neutral'}
              options={EXPRESSION_IDS.map((id) => ({ id, label: EXPRESSIONS[id]?.label ?? id }))}
              onChange={(value) =>
                patchMeta({ nonManualOverlay: { ...animation.nonManualOverlay, expression: value } })
              }
            />
            <RangeField
              label="Overlay weight"
              value={animation.nonManualOverlay?.weight ?? 0}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) =>
                patchMeta({ nonManualOverlay: { ...animation.nonManualOverlay, weight: value } })
              }
              format={(value) => value.toFixed(2)}
            />
            <Segmented
              label="Head motion"
              value={animation.nonManualOverlay?.headMotion ?? 'none'}
              options={(['none', 'nod', 'nod-once', 'shake', 'shake-once', 'tilt'] as HeadMotion[]).map((id) => ({
                id,
                label: id,
              }))}
              onChange={(value) =>
                patchMeta({ nonManualOverlay: { ...animation.nonManualOverlay, headMotion: value } })
              }
            />
          </section>

          <section className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold">JSON</h2>
              <div className="flex gap-2">
                <button type="button" className="btn btn-sm" onClick={() => setPanel(panel === 'export' ? 'none' : 'export')}>
                  <Icon name="download" /> Export
                </button>
                <button type="button" className="btn btn-sm" onClick={() => setPanel(panel === 'import' ? 'none' : 'import')}>
                  <Icon name="upload" /> Import
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    setAnimation(newAnimation());
                    setPlayhead(0);
                    setSelectedKey(0);
                    setStatus('Reset.');
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {panel === 'export' ? (
              <div className="space-y-2">
                <textarea
                  readOnly
                  value={exportJson}
                  rows={10}
                  className="w-full rounded-xl border border-line bg-surface-2 p-2 font-mono text-[11px]"
                  aria-label="Exported JSON"
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-sm" onClick={download}>
                    <Icon name="download" /> Download .json
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      navigator.clipboard?.writeText(exportJson).then(
                        () => setImportIssues('Copied to the clipboard.'),
                        () => setImportIssues('Could not copy — select the text and copy manually.'),
                      );
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            ) : null}

            {panel === 'import' ? (
              <div className="space-y-2">
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/json,.json"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    setImportText(text);
                    loadImport(text);
                  }}
                  className="w-full text-sm"
                />
                <textarea
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  rows={8}
                  placeholder="…or paste JSON here"
                  className="w-full rounded-xl border border-line bg-surface-2 p-2 font-mono text-[11px]"
                  aria-label="JSON to import"
                />
                <button type="button" className="btn btn-sm btn-primary" onClick={() => loadImport(importText)}>
                  Validate &amp; load
                </button>
              </div>
            ) : null}

            {importIssues ? (
              <pre className="max-h-40 overflow-auto rounded-xl border border-line bg-surface-2 p-2 text-[11px] whitespace-pre-wrap">
                {importIssues}
              </pre>
            ) : null}
          </section>

          <section className="card-flat opacity-70">
            <h2 className="text-base font-bold">Capture from webcam</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Recording your own signing into keyframes needs hand tracking, which is Phase 4. The button is
              here so the workflow is obvious — it does nothing yet.
            </p>
            <button type="button" className="btn mt-2" disabled>
              <Icon name="camera" /> Capture from webcam (Phase 4)
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
