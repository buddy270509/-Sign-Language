/** Inline icon set (24px grid, currentColor). No icon font, no network requests. */
export type IconName =
  | 'home'
  | 'hand'
  | 'camera'
  | 'settings'
  | 'play'
  | 'pause'
  | 'replay'
  | 'skipBack'
  | 'skipForward'
  | 'loop'
  | 'zoom'
  | 'eye'
  | 'check'
  | 'warning'
  | 'info'
  | 'shield'
  | 'sparkle'
  | 'arrowRight'
  | 'close'
  | 'bulb'
  | 'stop'
  | 'grid'
  | 'pencil'
  | 'download'
  | 'upload'
  | 'layers'
  | 'clock';

const PATHS: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5',
  hand: 'M8 12V5.5a1.5 1.5 0 0 1 3 0V11m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-.5V6a1.5 1.5 0 0 1 3 0v6.5c0 4-2.4 7-6.5 7-3 0-4.3-1.4-6-4L5 12.5a1.6 1.6 0 0 1 2.7-1.7L8 12',
  camera: 'M3 8.5A2.5 2.5 0 0 1 5.5 6h1.9l1.2-2h6.8l1.2 2h1.9A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9Z M12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.64 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.64h.09A1.7 1.7 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 9v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z',
  play: 'M8 5.5v13l11-6.5-11-6.5Z',
  pause: 'M9 5v14M15 5v14',
  replay: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  skipBack: 'M18 5v14L8 12l10-7ZM6 5v14',
  skipForward: 'M6 5v14l10-7L6 5ZM18 5v14',
  loop: 'M17 3l3 3-3 3M21 6H8a4 4 0 0 0 0 8h1M7 21l-3-3 3-3M3 18h13a4 4 0 0 0 0-8h-1',
  zoom: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4M8 11h6M11 8v6',
  eye: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  check: 'M4.5 12.5 9 17l10.5-10',
  warning: 'M12 3 2.5 20h19L12 3ZM12 9v5M12 17.2v.1',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 7.8v.1',
  shield: 'M12 3 4.5 6v6c0 4.4 3.1 7.9 7.5 9 4.4-1.1 7.5-4.6 7.5-9V6L12 3Z M9 12l2 2 4-4',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z M18.5 16l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z',
  arrowRight: 'M4 12h15M13 6l6 6-6 6',
  close: 'M6 6l12 12M18 6 6 18',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .9 1.6l.1.6h5.2l.1-.6c.1-.6.4-1.2.9-1.6A6 6 0 0 0 12 3Z',
  stop: 'M6.5 6.5h11v11h-11z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  pencil: 'M4 20h4L20 8l-4-4L4 16v4ZM14.5 5.5 18.5 9.5',
  download: 'M12 3v12M7.5 10.5 12 15l4.5-4.5M4 19h16',
  upload: 'M12 15V3M7.5 7.5 12 3l4.5 4.5M4 19h16',
  layers: 'M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 17.5l9 5 9-5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3.5 2',
};

export function Icon({
  name,
  className = 'h-5 w-5',
  filled = false,
}: {
  name: IconName;
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={filled ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
