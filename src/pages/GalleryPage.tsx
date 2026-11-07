/**
 * Handshape gallery.
 *
 * Shows every preset as a set of joint angles, and proves the point that palm orientation
 * is a separate parameter: the same handshape can be spun and turned without changing.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { HandPreview } from '../components/avatar/HandPreview';
import { Segmented, Toggle } from '../components/ui/Controls';
import { Icon } from '../components/ui/Icon';
import { HANDSHAPES, HANDSHAPE_CATEGORY_LABEL } from '../core/rig/handshapes';
import { PALM_ORIENTATIONS, PALM_ANGLES } from '../core/rig/anatomy';
import type { HandState, HandshapePreset, PalmOrientation } from '../types/animation';
import { clampPose, neutralPose } from '../core/rig/pose';
import { useSettings } from '../store/settings';
import { Link } from 'react-router-dom';

const CATEGORIES: Array<HandshapePreset['category']> = ['basic', 'alphabet', 'classifier'];

function useSpin(enabled: boolean, speed = 26) {
  const [angle, setAngle] = useState(0);
  const frame = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    last.current = performance.now();
    const handle = (now: number) => {
      const dt = Math.min(64, now - last.current);
      last.current = now;
      setAngle((current) => (current + (dt / 1000) * speed) % 360);
      frame.current = requestAnimationFrame(handle);
    };
    frame.current = requestAnimationFrame(handle);
    return () => cancelAnimationFrame(frame.current);
  }, [enabled, speed]);

  return enabled ? angle : 0;
}

export function GalleryPage() {
  const { t, settings } = useSettings();
  const [category, setCategory] = useState<HandshapePreset['category']>('basic');
  const [selected, setSelected] = useState<string>('flat');
  const [palm, setPalm] = useState<PalmOrientation>('forward');
  const [spinning, setSpinning] = useState(false);

  const angle = useSpin(spinning);
  const preset = HANDSHAPES.find((shape) => shape.id === selected) ?? HANDSHAPES[0]!;
  const visible = useMemo(() => HANDSHAPES.filter((shape) => shape.category === category), [category]);

  const hand = useMemo<HandState>(
    () =>
      clampPose({
        ...neutralPose(),
        right: {
          wrist: [0.5, 0.5, 0.4],
          handshape: preset.id,
          palm,
          palmYaw: 0,
          palmPitch: 0,
          roll: spinning ? 0 : angle,
          scale: 1.1,
        },
      }).right,
    [preset.id, palm, angle, spinning],
  );

  const baseAngles = PALM_ANGLES[palm];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t('gallery.title')}</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-soft">{t('gallery.subtitle')}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr] lg:items-start">
        <section className="card space-y-4">
          <div className="rounded-2xl border border-line bg-surface-2 p-2">
            <HandPreview hand={hand} className="mx-auto h-64 w-full" showLandmarks={settings.showLandmarks} padding={20} />
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-ink">{preset.name}</h2>
            <p className="mt-1 text-sm text-ink-soft">{preset.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-soft">
            <span className="chip">palm yaw {Math.round(baseAngles.yaw)}°</span>
            <span className="chip">palm pitch {Math.round(baseAngles.pitch)}°</span>
            <span className="chip">wrist roll {Math.round(hand.roll)}°</span>
            <span className="chip">id: {preset.id}</span>
          </div>

          <Toggle
            label={t('gallery.rotate')}
            checked={spinning}
            onChange={setSpinning}
            hint="Spins the wrist so you can see the depth in the fingers."
          />

          <Segmented
            label={t('gallery.palm')}
            value={palm}
            options={PALM_ORIENTATIONS.map((orientation) => ({
              id: orientation,
              label: orientation[0]!.toUpperCase() + orientation.slice(1),
            }))}
            onChange={setPalm}
            hint="Palm direction is a parameter of the pose, not part of the handshape."
          />

          <div className="flex flex-wrap gap-2">
            <Link to="/studio" className="btn btn-primary">
              <Icon name="pencil" /> Open in Sign Studio
            </Link>
          </div>
        </section>

        <section className="space-y-3">
          <Segmented
            label="Category"
            value={category}
            options={CATEGORIES.map((id) => ({
              id,
              label: `${HANDSHAPE_CATEGORY_LABEL[id]} (${
                HANDSHAPES.filter((shape) => shape.category === id).length
              })`,
            }))}
            onChange={setCategory}
          />

          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {visible.map((shape) => {
              const active = shape.id === preset.id;
              return (
                <li key={shape.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(shape.id)}
                    aria-pressed={active}
                    className={`flex w-full flex-col items-center gap-1 rounded-2xl border p-2 transition-colors ${
                      active ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:bg-surface-2'
                    }`}
                  >
                    <HandPreview
                      hand={{
                        wrist: [0.5, 0.5, 0.4],
                        handshape: shape.id,
                        palm: 'forward',
                        palmYaw: 0,
                        palmPitch: 0,
                        roll: 0,
                        scale: 1,
                      }}
                      className="h-16 w-full"
                      style={settings.avatarStyle}
                      padding={10}
                    />
                    <span className="line-clamp-2 text-center text-[11px] leading-tight font-semibold text-ink">
                      {shape.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="card-flat flex items-start gap-2 text-xs text-ink-soft">
            <Icon name="warning" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>
              The A–Z and 0–9 shapes are drafts derived from the Phase 1 fingerspelling data. Alphabet handshapes
              vary by region — a fluent deaf ISL signer still needs to review these.
            </span>
          </p>
        </section>
      </div>
    </div>
  );
}
