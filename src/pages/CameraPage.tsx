/**
 * Sign → Text (Phase 4+). This screen is deliberately a *plan plus a local camera
 * test*: it shows exactly how recognition will work and lets you confirm your camera
 * and framing, while making it impossible to mistake this build for a working
 * recogniser. No frames leave the browser.
 */
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/ui/Icon';
import { HandPreview } from '../components/avatar/HandPreview';
import { useSettings } from '../store/settings';

const PIPELINE = [
  { title: 'Camera frames', body: 'getUserMedia → video → canvas, entirely on-device.' },
  { title: 'Landmarks', body: 'MediaPipe Holistic: 21 points per hand + pose + face landmarks.' },
  { title: 'Windowing', body: 'Sliding window over the last ~2 s, normalised for handedness and body size.' },
  { title: 'Model', body: 'Sequence model (LSTM / 1D-CNN) trained in Python, exported to TensorFlow.js.' },
  { title: 'Sign boundaries', body: 'Confidence threshold detects the start and end of a sign — no button to press.' },
  { title: 'Meaning', body: 'Hand signs combined with face and head landmarks: brows up = question, head shake = negation.' },
];

const TIPS = [
  'Face a window or lamp — light on your face, not behind you.',
  'Keep a plain background; avoid a bright window or a busy wall.',
  'Frame from the waist up so both hands and your face stay visible.',
  'Stay about 1–1.5 m from the camera, hands inside the frame.',
  'Sign at a steady pace; the window needs the whole sign.',
];

type CameraState = 'idle' | 'starting' | 'live' | 'error';

export function CameraPage() {
  const { t, settings } = useSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  const stop = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setState('idle');
  };

  useEffect(() => () => stop(), []);

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('error');
      setError('This browser does not expose a camera API. Try Chrome, Edge or Safari on a device with a camera.');
      return;
    }
    setState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setState('live');
    } catch (err) {
      setState('error');
      const name = (err as DOMException)?.name;
      setError(
        name === 'NotAllowedError'
          ? 'Camera permission was blocked. Allow camera access in your browser settings and try again.'
          : name === 'NotFoundError'
            ? 'No camera was found on this device.'
            : name === 'NotReadableError'
              ? 'The camera is already being used by another app.'
              : 'The camera could not be started. Check your browser permissions.',
      );
    }
  };

  return (
    <div className="sb-fade-in flex flex-col gap-5">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold sm:text-3xl">{t('camera.title')}</h1>
          <span className="chip">
            <Icon name="info" className="h-4 w-4" /> Phase 4
          </span>
        </div>
        <p className="mt-1 max-w-2xl text-ink-soft">{t('camera.subtitle')}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="card">
          <div className="stage-grid relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line">
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label="Local camera preview"
              className={`h-full w-full scale-x-[-1] object-cover ${state === 'live' ? '' : 'hidden'}`}
            />

            {state !== 'live' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface text-ink-soft shadow-sm">
                  <Icon name="camera" className="h-7 w-7" />
                </span>
                <p className="max-w-sm text-sm text-pretty text-ink-soft">
                  Camera recognition is not switched on in this build. You can still check your camera, framing and
                  lighting — nothing is recorded or uploaded.
                </p>
                <label className="flex max-w-sm items-start gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-sm">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--sb-brand)]"
                  />
                  <span>
                    I understand the video stays on this device, is shown only to me, and is never sent anywhere.
                  </span>
                </label>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={start}
                  disabled={!consent || state === 'starting'}
                >
                  <Icon name="camera" className="h-5 w-5" />
                  {state === 'starting' ? 'Starting…' : t('camera.test')}
                </button>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold text-white">
                    <span className="sb-pulse-dot h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
                    Camera on · on-device only
                  </span>
                  <span className="rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold text-white">
                    Recognition: not available yet
                  </span>
                </div>
                <div className="absolute inset-8 rounded-xl border-2 border-dashed border-white/40" aria-hidden="true" />
                <p className="absolute inset-x-3 bottom-3 rounded-lg bg-black/70 px-3 py-2 text-center text-xs font-medium text-white">
                  Keep your face and both hands inside the dashed area · {settings.languageTag.toUpperCase()}
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {state === 'live' ? (
              <button type="button" className="btn" onClick={stop}>
                <Icon name="close" className="h-5 w-5" />
                {t('camera.stop')}
              </button>
            ) : null}
            <p className="flex items-center gap-2 text-sm text-ink-soft">
              <Icon name="shield" className="h-4.5 w-4.5 text-brand" />
              {t('camera.privacy')}
            </p>
          </div>

          {error ? (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
              <Icon name="warning" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
              {error}
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-4">
          <div className="card">
            <h2 className="text-lg font-extrabold">{t('camera.scopeTitle')}</h2>
            <p className="mt-1 text-sm text-pretty text-ink-soft">{t('camera.scopeBody')}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                'Version 1: 1-word signs and 3–4 word sentences from a fixed list',
                'Target: at least 90% accuracy per sign before it is marked “supported”',
                'Low confidence is never shown as a confident answer — you get the top 3 guesses',
                'Facial expression is fused with hand signs (same hands + brows up = question)',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Icon name="check" className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2 className="text-lg font-extrabold">{t('camera.tipsTitle')}</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              {TIPS.map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <Icon name="bulb" className="mt-0.5 h-4.5 w-4.5 shrink-0 text-accent" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="card-flat">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold">What the model will see</h2>
              <span className="chip text-xs">21 landmarks</span>
            </div>
            <div className="mx-auto mt-2 h-44 w-full max-w-[220px]">
              <HandPreview
                hand={{
                  wrist: [0.5, 0.5, 0.4],
                  handshape: 'open-5',
                  palm: 'forward',
                  palmYaw: 0,
                  palmPitch: 0,
                  roll: 0,
                  scale: 1.15,
                }}
                className="h-full w-full"
                showLandmarks
              />
            </div>
            <p className="text-xs text-ink-soft">
              Each frame becomes 21 points per hand plus face and pose landmarks — no video, no photos, no faces
              stored.
            </p>
          </div>
        </section>
      </div>

      <section className="card">
        <h2 className="text-lg font-extrabold">How recognition will work</h2>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map((step, index) => (
            <li key={step.title} className="rounded-2xl bg-surface-2 p-3">
              <span className="text-xs font-bold tracking-wider text-brand uppercase">Step {index + 1}</span>
              <h3 className="font-bold">{step.title}</h3>
              <p className="text-sm text-pretty text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
