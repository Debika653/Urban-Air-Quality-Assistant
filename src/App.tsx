import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AirQualityForm } from './components/AirQualityForm.tsx';
import { DashboardSkeleton } from './components/DashboardSkeleton.tsx';
import { EmptyGuidanceState } from './components/EmptyGuidanceState.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { GuidanceResults } from './components/GuidanceResults.tsx';
import { Header } from './components/Header.tsx';
import { PollutionStatusPanel } from './components/PollutionStatusPanel.tsx';
import { PreferencesPanel } from './components/PreferencesPanel.tsx';
import {
  DEFAULT_USER_INPUT,
  parseManualAqiInput,
  type GuidanceApiResult,
  type LiveAqiReading,
  type UserProfileInput,
  type ValidationErrors,
} from './shared/airQualitySchema.ts';
import { fetchLiveAqi, requestAirQualityGuidance } from './utils/apiClient.ts';
import {
  DEFAULT_PREFERENCES,
  clearPreferences,
  loadPreferences,
  savePreferences,
  type UserPreferences,
} from './utils/preferences.ts';

export default function App() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => loadPreferences());
  const [formValues, setFormValues] = useState<UserProfileInput>(DEFAULT_USER_INPUT);
  const [manualAqiText, setManualAqiText] = useState<string>('');
  const [serverErrors, setServerErrors] = useState<ValidationErrors>({});

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCheckingAqi, setIsCheckingAqi] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [lastSubmittedInput, setLastSubmittedInput] = useState<UserProfileInput | null>(null);

  const [guidanceResult, setGuidanceResult] = useState<GuidanceApiResult | null>(null);
  const [previewLiveAqi, setPreviewLiveAqi] = useState<LiveAqiReading | null>(null);
  const [activeSection, setActiveSection] = useState<string>('overview');

  const cityInputRef = useRef<HTMLInputElement | null>(null);
  const guidanceAbortRef = useRef<AbortController | null>(null);
  const aqiAbortRef = useRef<AbortController | null>(null);
  const focusTimerRef = useRef<number | null>(null);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    return () => {
      guidanceAbortRef.current?.abort();
      aqiAbortRef.current?.abort();
      if (focusTimerRef.current !== null) {
        window.clearTimeout(focusTimerRef.current);
      }
    };
  }, []);

  const handleNavigate = useCallback(
    (sectionId: string) => {
      setActiveSection(sectionId);
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({
          behavior: preferences.reduceMotion ? 'auto' : 'smooth',
          block: 'start',
        });
      }
    },
    [preferences.reduceMotion],
  );

  const handleFocusForm = useCallback(() => {
    setActiveSection('overview');
    const overview = document.getElementById('overview');
    if (overview) {
      overview.scrollIntoView({
        behavior: preferences.reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    }
    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current);
    }
    focusTimerRef.current = window.setTimeout(() => {
      cityInputRef.current?.focus();
    }, 100);
  }, [preferences.reduceMotion]);

  const handleCheckAqiOnly = useCallback(
    async (city: string) => {
      aqiAbortRef.current?.abort();
      const controller = new AbortController();
      aqiAbortRef.current = controller;

      setIsCheckingAqi(true);
      setApiError(null);

      try {
        const outcome = await fetchLiveAqi(
          city,
          preferences.useLiveLookup,
          controller.signal,
        );
        if (!outcome.ok) {
          setApiError(outcome.error);
          return;
        }
        setPreviewLiveAqi(outcome.data);
        setStatusMessage(
          outcome.data.status === 'available' && outcome.data.usAqi !== null
            ? `Checked air quality for ${city}: ${outcome.data.usAqi} US AQI.`
            : `Checked air quality for ${city}: live reading unavailable.`,
        );
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setApiError(
          'Live AQI check could not be completed. You can still enter a manual AQI or generate precautionary guidance.',
        );
      } finally {
        setIsCheckingAqi(false);
      }
    },
    [preferences.useLiveLookup],
  );

  const submitGuidanceRequest = useCallback(async (input: UserProfileInput) => {
    guidanceAbortRef.current?.abort();
    const controller = new AbortController();
    guidanceAbortRef.current = controller;

    setIsSubmitting(true);
    setApiError(null);
    setServerErrors({});
    setLastSubmittedInput(input);

    try {
      const outcome = await requestAirQualityGuidance(input, controller.signal);
      if (!outcome.ok) {
        if (outcome.fieldErrors) {
          setServerErrors(outcome.fieldErrors);
        }
        setApiError(outcome.error);
        return;
      }

      setGuidanceResult(outcome.data);
      setPreviewLiveAqi(outcome.data.liveAqi);
      setStatusMessage(`Personalized air-quality guidance generated for ${input.city}.`);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setApiError(
        'Network error while contacting the guidance service. Your inputs have been preserved; select Retry to try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleResetAll = useCallback(() => {
    guidanceAbortRef.current?.abort();
    aqiAbortRef.current?.abort();
    setFormValues(DEFAULT_USER_INPUT);
    setManualAqiText('');
    setServerErrors({});
    setApiError(null);
    setGuidanceResult(null);
    setPreviewLiveAqi(null);
    setLastSubmittedInput(null);
    setIsSubmitting(false);
    setIsCheckingAqi(false);
    setStatusMessage('Form and guidance plan cleared.');
  }, []);

  const handleRetry = useCallback(() => {
    if (lastSubmittedInput) {
      void submitGuidanceRequest(lastSubmittedInput);
    }
  }, [lastSubmittedInput, submitGuidanceRequest]);

  const handleResetPreferences = useCallback(() => {
    clearPreferences();
    setPreferences(DEFAULT_PREFERENCES);
    setStatusMessage('Accessibility and lookup preferences reset to defaults.');
  }, []);

  const manualAqiCheck = parseManualAqiInput(
    manualAqiText.trim() === '' ? null : manualAqiText.trim(),
  );
  const validManualPreview = manualAqiCheck.valid ? manualAqiCheck.value : null;

  const activeLiveAqi = guidanceResult?.liveAqi ?? previewLiveAqi;
  const activeEffectiveAqi =
    guidanceResult?.effectiveAqi ??
    (validManualPreview !== null
      ? validManualPreview
      : activeLiveAqi?.status === 'available'
        ? activeLiveAqi.usAqi
        : null);
  const activeSourceType: 'live' | 'manual' | 'none' =
    guidanceResult?.aqiSourceType ??
    (validManualPreview !== null
      ? 'manual'
      : activeLiveAqi?.status === 'available'
        ? 'live'
        : 'none');

  return (
    <ErrorBoundary>
      <div
        className={`min-h-screen bg-slate-50 text-slate-900 ${
          preferences.reduceMotion ? 'reduced-motion-active' : ''
        }`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-teal-800 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to main content
        </a>

        <div className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </div>

        <Header
          activeSection={activeSection}
          onNavigate={handleNavigate}
          onFocusForm={handleFocusForm}
        />

        <main
          id="main-content"
          className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8"
        >
          {/* Dashboard Intro & Overview */}
          <section id="overview" aria-labelledby="dashboard-title" className="scroll-mt-20">
            <div className="max-w-3xl">
              <h1
                id="dashboard-title"
                className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]"
              >
                Urban Air Quality &amp; Winter Smog Assistant
              </h1>
              <p className="mt-2 text-base leading-relaxed text-slate-600">
                Practical low-emission daily routines, indoor air strategies, sustainable travel alternatives, and safety-conscious guidance tailored to your city and household.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
              <div className="xl:col-span-8">
                <AirQualityForm
                  formValues={formValues}
                  manualAqiText={manualAqiText}
                  serverErrors={serverErrors}
                  isSubmitting={isSubmitting}
                  isCheckingAqi={isCheckingAqi}
                  useLiveLookup={preferences.useLiveLookup}
                  cityInputRef={cityInputRef}
                  onChangeValues={setFormValues}
                  onChangeManualAqiText={setManualAqiText}
                  onSubmit={(validated) => void submitGuidanceRequest(validated)}
                  onCheckAqiOnly={(city) => void handleCheckAqiOnly(city)}
                  onReset={handleResetAll}
                />
              </div>

              <div className="xl:col-span-4">
                <PollutionStatusPanel
                  city={guidanceResult ? lastSubmittedInput?.city ?? formValues.city : formValues.city}
                  manualAqi={validManualPreview}
                  liveAqi={activeLiveAqi}
                  effectiveAqi={activeEffectiveAqi}
                  aqiSourceType={activeSourceType}
                  generatedAt={guidanceResult?.generatedAt ?? null}
                />
              </div>
            </div>
          </section>

          {/* API Error Banner with Retry */}
          {apiError && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex flex-col justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-5 text-red-950 sm:flex-row sm:items-center"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold">Unable to complete request</h2>
                  <p className="mt-1 text-sm text-red-900">{apiError}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {lastSubmittedInput && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={isSubmitting}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-red-800 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-900 disabled:opacity-60 whitespace-nowrap"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Retry</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setApiError(null)}
                  className="inline-flex min-h-[40px] items-center rounded-lg border border-red-300 bg-white px-3.5 py-2 text-xs font-medium text-red-900 hover:bg-red-100 whitespace-nowrap"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Main Guidance Output / Loading / Empty State */}
          {isSubmitting ? (
            <DashboardSkeleton />
          ) : guidanceResult ? (
            <GuidanceResults
              key={guidanceResult.generatedAt}
              guidance={guidanceResult.guidance}
              conciseMode={preferences.conciseMode}
            />
          ) : (
            <EmptyGuidanceState onFocusForm={handleFocusForm} />
          )}

          {/* Preferences & Accessibility Settings */}
          <PreferencesPanel
            preferences={preferences}
            onChangePreferences={setPreferences}
            onResetPreferences={handleResetPreferences}
          />
        </main>

        <footer className="mt-12 border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-4 py-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <p>
              CleanAir Companion · Environmental guidance for urban air pollution and winter smog preparedness.
            </p>
            <p>
              Informational tool only; does not replace official local air-monitoring alerts or medical care.
            </p>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
