import { hasOwn, isPlainObject } from '../shared/airQualitySchema.ts';

export interface UserPreferences {
  useLiveLookup: boolean;
  conciseMode: boolean;
  reduceMotion: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  useLiveLookup: true,
  conciseMode: false,
  reduceMotion: false,
};

const STORAGE_KEY = 'cleanair_companion_prefs_v1';

export function loadPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PREFERENCES;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
      return DEFAULT_PREFERENCES;
    }
    return {
      useLiveLookup:
        hasOwn(parsed, 'useLiveLookup') && typeof parsed.useLiveLookup === 'boolean'
          ? parsed.useLiveLookup
          : DEFAULT_PREFERENCES.useLiveLookup,
      conciseMode:
        hasOwn(parsed, 'conciseMode') && typeof parsed.conciseMode === 'boolean'
          ? parsed.conciseMode
          : DEFAULT_PREFERENCES.conciseMode,
      reduceMotion:
        hasOwn(parsed, 'reduceMotion') && typeof parsed.reduceMotion === 'boolean'
          ? parsed.reduceMotion
          : DEFAULT_PREFERENCES.reduceMotion,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: UserPreferences): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota or privacy-mode errors safely
  }
}

export function clearPreferences(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors safely
  }
}
