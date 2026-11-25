import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { UserPreferences } from '../utils/preferences.ts';

interface PreferencesPanelProps {
  preferences: UserPreferences;
  onChangePreferences: (next: UserPreferences) => void;
  onResetPreferences: () => void;
}

export function PreferencesPanel({
  preferences,
  onChangePreferences,
  onResetPreferences,
}: PreferencesPanelProps) {
  return (
    <section
      id="safety-settings"
      aria-labelledby="preferences-heading"
      className="scroll-mt-20 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-teal-700" aria-hidden="true" />
          <div>
            <h2 id="preferences-heading" className="text-xl font-semibold text-slate-900">
              Preferences &amp; Accessibility Settings
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Stored locally in your browser only. No personal identifiers are sent or saved remotely.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetPreferences}
          className="inline-flex min-h-[40px] items-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Reset Defaults</span>
        </button>
      </div>

      <div className="mt-4 divide-y divide-slate-100">
        <div className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center">
          <div>
            <label htmlFor="pref-live-aqi" className="text-sm font-medium text-slate-900">
              Live regional AQI lookup (Open-Meteo)
            </label>
            <p className="mt-0.5 text-xs text-slate-600">
              When enabled, checking a city or generating a plan queries Open-Meteo for current modeled AQI. Disable to rely strictly on manual AQI input or precautionary mode.
            </p>
          </div>
          <button
            id="pref-live-aqi"
            type="button"
            role="switch"
            aria-checked={preferences.useLiveLookup}
            onClick={() =>
              onChangePreferences({
                ...preferences,
                useLiveLookup: !preferences.useLiveLookup,
              })
            }
            className={`inline-flex min-h-[40px] min-w-[96px] shrink-0 items-center justify-center rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
              preferences.useLiveLookup
                ? 'border-teal-700 bg-teal-700 text-white'
                : 'border-slate-300 bg-slate-100 text-slate-700'
            }`}
          >
            {preferences.useLiveLookup ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center">
          <div>
            <label htmlFor="pref-concise-mode" className="text-sm font-medium text-slate-900">
              Concise family reading view
            </label>
            <p className="mt-0.5 text-xs text-slate-600">
              Shows only priority, title, and direct action steps on cards for quick scanning; turn off to display full explanations and impact mechanisms.
            </p>
          </div>
          <button
            id="pref-concise-mode"
            type="button"
            role="switch"
            aria-checked={preferences.conciseMode}
            onClick={() =>
              onChangePreferences({
                ...preferences,
                conciseMode: !preferences.conciseMode,
              })
            }
            className={`inline-flex min-h-[40px] min-w-[96px] shrink-0 items-center justify-center rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
              preferences.conciseMode
                ? 'border-teal-700 bg-teal-700 text-white'
                : 'border-slate-300 bg-slate-100 text-slate-700'
            }`}
          >
            {preferences.conciseMode ? 'Concise' : 'Detailed'}
          </button>
        </div>

        <div className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center">
          <div>
            <label htmlFor="pref-reduce-motion" className="text-sm font-medium text-slate-900">
              Reduce interface motion
            </label>
            <p className="mt-0.5 text-xs text-slate-600">
              Minimizes smooth scrolling and visual transitions in addition to your operating system preference.
            </p>
          </div>
          <button
            id="pref-reduce-motion"
            type="button"
            role="switch"
            aria-checked={preferences.reduceMotion}
            onClick={() =>
              onChangePreferences({
                ...preferences,
                reduceMotion: !preferences.reduceMotion,
              })
            }
            className={`inline-flex min-h-[40px] min-w-[96px] shrink-0 items-center justify-center rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
              preferences.reduceMotion
                ? 'border-teal-700 bg-teal-700 text-white'
                : 'border-slate-300 bg-slate-100 text-slate-700'
            }`}
          >
            {preferences.reduceMotion ? 'Reduced' : 'Standard'}
          </button>
        </div>
      </div>
    </section>
  );
}
