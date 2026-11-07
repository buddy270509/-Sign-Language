/**
 * App settings: persisted in localStorage, applied to <html> as data attributes so
 * CSS can switch palettes (and the avatar can switch skin tone) without re-rendering
 * the whole tree.
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
import { EXPRESSION_PRESETS, type ExpressionId } from '../core/rig/presets';

export type SkinTone = 'tone1' | 'tone2' | 'tone3' | 'tone4' | 'tone5';
export type Contrast = 'default' | 'high';
export type Handedness = 'right' | 'left';

export interface Settings {
  languageTag: string;
  uiLanguage: UiLanguage;
  handedness: Handedness;
  skinTone: SkinTone;
  contrast: Contrast;
  reducedMotion: boolean;
  speed: number;
  faceZoom: boolean;
  showLandmarks: boolean;
  showExpressionLabels: boolean;
  loop: boolean;
  /** `null` = follow the sentence type detected by the text processor. */
  expression: ExpressionId | null;
}

export const DEFAULT_SETTINGS: Settings = {
  languageTag: DEFAULT_LANGUAGE,
  uiLanguage: 'en',
  handedness: 'right',
  skinTone: 'tone3',
  contrast: 'default',
  reducedMotion: false,
  speed: 1,
  faceZoom: false,
  showLandmarks: false,
  showExpressionLabels: true,
  loop: false,
  expression: null,
};

const STORAGE_KEY = 'signbridge.settings.v1';

function load(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    // Guard against stale or hand-edited storage (a bad language tag or expression
    // would otherwise leave the avatar with nothing to render).
    if (!LANGUAGES.some((language) => language.tag === merged.languageTag)) {
      merged.languageTag = DEFAULT_LANGUAGE;
    }
    if (merged.expression && !(merged.expression in EXPRESSION_PRESETS)) {
      merged.expression = null;
    }
    if (!UI_LANGUAGES.some((language) => language.id === merged.uiLanguage)) {
      merged.uiLanguage = 'en';
    }
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
