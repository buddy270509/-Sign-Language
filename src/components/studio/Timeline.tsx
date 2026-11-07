/**
 * Keyframe timeline for the Sign Studio.
 *
 * One lane per track, so you can see at a glance that the face and the hands are timed
 * independently. Editing is deliberate rather than drag-heavy: tap a keyframe to select it,
 * then adjust its time with the slider — which is far more precise on a phone than dragging.
 */
import type { AnimationTracks } from '../../types/animation';

export type TrackName = keyof AnimationTracks;

export const TRACKS: Array<{ id: TrackName; label: string; colour: string }> = [
  { id: 'rightHand', label: 'Right hand', colour: 'var(--sb-brand)' },
  { id: 'leftHand', label: 'Left hand', colour: 'var(--sb-brand)' },
  { id: 'face', label: 'Face', colour: 'var(--sb-accent)' },
  { id: 'head', label: 'Head', colour: 'var(--sb-accent)' },
  { id: 'body', label: 'Body', colour: 'var(--sb-accent)' },
];

export interface TimelineProps {
  tracks: AnimationTracks;
  playhead: number;
  selectedTrack: TrackName;
  selectedKey: number;
  onSelect: (track: TrackName, index: number) => void;
  onScrub: (progress: number) => void;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function Timeline({ tracks, playhead, selectedTrack, selectedKey, onSelect, onScrub }: TimelineProps) {
  return (
    <div className="space-y-1.5">
      {TRACKS.map((track) => {
        const keys = tracks[track.id] ?? [];
        const isSelected = track.id === selectedTrack;
        return (
          <div key={track.id} className="flex items-center gap-2">
            <span
              className={`w-20 shrink-0 text-[11px] font-bold ${isSelected ? 'text-ink' : 'text-ink-soft'}`}
            >
              {track.label}
            </span>
            <div
              className={`relative h-9 flex-1 rounded-lg border ${
                isSelected ? 'border-brand bg-brand-soft' : 'border-line bg-surface-2'
              }`}
            >
              {/* playhead */}
              <div
                className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-[var(--sb-danger)]"
                style={{ left: `${playhead * 100}%` }}
              />
              {keys.map((key, index) => {
                const active = isSelected && index === selectedKey;
                return (
                  <button
                    key={`${track.id}-${index}`}
                    type="button"
                    onClick={() => onSelect(track.id, index)}
                    aria-label={`${track.label} keyframe ${index + 1} at ${(key.t * 100).toFixed(0)}%`}
                    aria-pressed={active}
                    className="absolute top-1.5 h-6 w-2.5 -translate-x-1/2 rounded-sm border border-surface shadow-sm"
                    style={{
                      left: `${clamp01(key.t) * 100}%`,
                      background: active ? 'var(--sb-danger)' : track.colour,
                    }}
                  />
                );
              })}
              {keys.length === 0 ? (
                <span className="absolute inset-0 grid place-items-center text-[11px] text-ink-soft">
                  no keyframes
                </span>
              ) : null}
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-2 pt-1">
        <span className="w-20 shrink-0 text-[11px] font-bold text-ink-soft">Playhead</span>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(playhead * 1000)}
          onChange={(event) => onScrub(Number(event.target.value) / 1000)}
          aria-label="Playhead position"
          className="h-11 flex-1 accent-[var(--sb-brand)]"
        />
        <span className="w-10 shrink-0 text-right text-[11px] font-bold tabular-nums text-ink-soft">
          {(playhead * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
