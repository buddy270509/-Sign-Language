/**
 * App settings, persisted in localStorage and applied to <html> as data attributes so CSS
 * can switch the palette, the outfit and reduced-motion without re-rendering the tree.
 *
 * Everything here is device-local. There is no account and no upload.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_LANGUAGE, LANGUAGES } from '../data';
import { translate, UI_LANGUAGES, type MessageKey, type UiLanguage } from '../i18n/strings';
import { EXPRESSIONS } from '../core/rig/face';
import type { LoopMode } from '../core/animation/queue';
import type { AvatarStyle, AvatarView } from '../components/avatar/types';

export type SkinTone = 'tone1' | 'tone2' | 'tone3' | 'tone4' | 'tone5';
export type Contrast = 'default' | 'high';
export type Handedness = 'right' | 'left';
export type Outfit = 'teal' | 'navy' | 'plum' | 'charcoal' | 'contrast';

export const OUTFITS: Array<{ id: Outfit; label: string; swatch: string }> = [
  { id: 'teal', label: 'Teal', swatch: '#12455c' },
  { id: 'navy', label: 'Navy', swatch: '#1e2a5a' },
  { id: 'plum', label: 'Plum', swatch: '#4a1f4f' },
  { id: 'charcoal', label: 'Charcoal', swatch: '#22262b' },
  { id: 'contrast', label: 'High contrast', swatch: '#000000' },
];

export interface Settings {
  languageTag: string;
  uiLanguage: UiLanguage;
  /** `left` mirrors the whole performance, for left-handed signers. */
  handedness: Handedness;
  skinTone: SkinTone;
  outfit: Outfit;
  contrast: Contrast;
  reducedMotion: boolean;
  avatarStyle: AvatarStyle;
  view: AvatarView;
  speed: number;
  loop: LoopMode;
  transitionMs: number;
  showLandmarks: boolean;
  showLabels: boolean;
  showFps: boolean;
  /** Expression layered over every sign ('' = none). */
  overlayExpression: string;
  overlayWeight: number;
}

export const DEFAULT_SETTINGS: Settings = {
  languageTag: DEFAULT_LANGUAGE,
  uiLanguage: 'en',
  handedness: 'right',
  skinTone: 'tone3',
  outfit: 'teal',
  contrast: 'default',
  reducedMotion: false,
  avatarStyle: 'human',
  view: 'full',
  speed: 1,
  loop: 'off',
  transitionMs: 200,
  showLandmarks: false,
  showLabels: true,
  showFps: false,
  overlayExpression: 'neutral',
  overlayWeight: 0,
};

const STORAGE_KEY = 'signbridge.settings.v2';

function load(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    // Guard against stale or hand-edited storage: a bad value would otherwise leave the
    // app in a state it cannot render.
    if (!LANGUAGES.some((language) => language.tag === merged.languageTag)) {
      merged.languageTag = DEFAULT_LANGUAGE;
    }
    if (!UI_LANGUAGES.some((language) => language.id === merged.uiLanguage)) merged.uiLanguage = 'en';
    if (merged.overlayExpression && !EXPRESSIONS[merged.overlayExpression]) merged.overlayExpression = 'neutral';
    if (!['off', 'all', 'one'].includes(merged.loop)) merged.loop = 'off';
    if (!['human', 'stick'].includes(merged.avatarStyle)) merged.avatarStyle = 'human';
    if (!['full', 'hands', 'face'].includes(merged.view)) merged.view = 'full';
    if (!['right', 'left'].includes(merged.handedness)) merged.handedness = 'right';
    if (!OUTFITS.some((outfit) => outfit.id === merged.outfit)) merged.outfit = 'teal';
    merged.speed = [0.25, 0.5, 1, 1.5, 2].includes(merged.speed) ? merged.speed : 1;
    merged.transitionMs = Math.min(250, Math.max(150, Number(merged.transitionMs) || 200));
    merged.overlayWeight = Math.min(1, Math.max(0, Number(merged.overlayWeight) || 0));
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
  t: (key: MessageKey) => string;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.skin = settings.skinTone;
    root.dataset.contrast = settings.contrast;
    root.dataset.outfit = settings.outfit;
    root.dataset.avatarStyle = settings.avatarStyle;
    root.dataset.motion = settings.reducedMotion ? 'reduced' : 'default';
    root.lang = settings.uiLanguage;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage may be unavailable in private mode — settings just won't persist */
    }
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const t = useCallback((key: MessageKey) => translate(settings.uiLanguage, key), [settings.uiLanguage]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, update, reset, t }),
    [settings, update, reset, t],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
