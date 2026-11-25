import { Loader2, RotateCcw, Search } from 'lucide-react';
import {
  type Dispatch,
  memo,
  type FormEvent,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  COMMUTE_METHODS,
  COMMUTE_METHOD_LABELS,
  INDOOR_RESOURCES,
  INDOOR_RESOURCE_LABELS,
  MAIN_CONCERNS,
  MAIN_CONCERN_LABELS,
  MAX_CITY_LENGTH,
  MAX_HOUSEHOLD_LENGTH,
  OUTDOOR_HABITS,
  OUTDOOR_HABIT_LABELS,
  SEASON_MODES,
  SEASON_MODE_LABELS,
  SUSTAINABILITY_GOALS,
  SUSTAINABILITY_GOAL_LABELS,
  validateCityName,
  validateUserProfileInput,
  type CommuteMethod,
  type IndoorResource,
  type MainConcern,
  type OutdoorHabit,
  type SeasonMode,
  type SustainabilityGoal,
  type UserProfileInput,
  type ValidationErrors,
} from '../shared/airQualitySchema.ts';
import { SCENARIO_PRESETS } from '../utils/presets.ts';
import { ChecklistFieldset, SelectField, TextInputField } from './FormControls.tsx';

interface AirQualityFormProps {
  formValues: UserProfileInput;
  manualAqiText: string;
  serverErrors: ValidationErrors;
  isSubmitting: boolean;
  isCheckingAqi: boolean;
  useLiveLookup: boolean;
  cityInputRef: RefObject<HTMLInputElement | null>;
  onChangeValues: Dispatch<SetStateAction<UserProfileInput>>;
  onChangeManualAqiText: (text: string) => void;
  onSubmit: (validatedInput: UserProfileInput) => void;
  onCheckAqiOnly: (city: string) => void;
  onReset: () => void;
}

const FIELD_INPUT_IDS: Partial<Record<keyof ValidationErrors, string>> = {
  city: 'city-input',
  manualAqi: 'manual-aqi-input',
  seasonMode: 'season-mode-select',
  commuteMethod: 'commute-select',
  outdoorHabits: 'outdoor-habits-select',
  mainConcern: 'main-concern-select',
  householdContext: 'household-context-input',
};

export const AirQualityForm = memo(function AirQualityForm({
  formValues,
  manualAqiText,
  serverErrors,
  isSubmitting,
  isCheckingAqi,
  useLiveLookup,
  cityInputRef,
  onChangeValues,
  onChangeManualAqiText,
  onSubmit,
  onCheckAqiOnly,
  onReset,
}: AirQualityFormProps) {
  const [clientErrors, setClientErrors] = useState<ValidationErrors>({});
  const [presetNotice, setPresetNotice] = useState<string>('');
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const shouldFocusErrorsRef = useRef(false);

  const errors: ValidationErrors = useMemo(
    () => ({ ...clientErrors, ...serverErrors }),
    [clientErrors, serverErrors],
  );
  const errorEntries = useMemo(
    () =>
      (Object.entries(errors) as Array<[keyof ValidationErrors, string | undefined]>).filter(
        (entry): entry is [keyof ValidationErrors, string] => Boolean(entry[1]),
      ),
    [errors],
  );

  useEffect(() => {
    if (Object.keys(serverErrors).length > 0 && errorSummaryRef.current) {
      errorSummaryRef.current.focus();
    }
  }, [serverErrors]);

  useEffect(() => {
    if (shouldFocusErrorsRef.current && errorEntries.length > 0 && errorSummaryRef.current) {
      errorSummaryRef.current.focus();
      shouldFocusErrorsRef.current = false;
    }
  }, [errorEntries]);

  const handleCityChange = useCallback(
    (city: string) => {
      onChangeValues((prev) => ({ ...prev, city }));
      setClientErrors((prev) => (prev.city ? { ...prev, city: undefined } : prev));
    },
    [onChangeValues],
  );

  const handleManualAqiChange = useCallback(
    (text: string) => {
      onChangeManualAqiText(text);
      setClientErrors((prev) => (prev.manualAqi ? { ...prev, manualAqi: undefined } : prev));
    },
    [onChangeManualAqiText],
  );

  const handleHouseholdChange = useCallback(
    (householdContext: string) => {
      onChangeValues((prev) => ({ ...prev, householdContext }));
      setClientErrors((prev) =>
        prev.householdContext ? { ...prev, householdContext: undefined } : prev,
      );
    },
    [onChangeValues],
  );

  const handleSeasonChange = useCallback(
    (seasonMode: SeasonMode) => onChangeValues((prev) => ({ ...prev, seasonMode })),
    [onChangeValues],
  );

  const handleCommuteChange = useCallback(
    (commuteMethod: CommuteMethod) => onChangeValues((prev) => ({ ...prev, commuteMethod })),
    [onChangeValues],
  );

  const handleOutdoorChange = useCallback(
    (outdoorHabits: OutdoorHabit) => onChangeValues((prev) => ({ ...prev, outdoorHabits })),
    [onChangeValues],
  );

  const handleConcernChange = useCallback(
    (mainConcern: MainConcern) => onChangeValues((prev) => ({ ...prev, mainConcern })),
    [onChangeValues],
  );

  const toggleIndoorResource = useCallback(
    (resource: IndoorResource) => {
      onChangeValues((prev) => {
        const exists = prev.indoorResources.includes(resource);
        let next: IndoorResource[];
        if (resource === 'none') {
          next = exists ? [] : ['none'];
        } else {
          const withoutNone = prev.indoorResources.filter((r) => r !== 'none');
          next = exists
            ? withoutNone.filter((r) => r !== resource)
            : [...withoutNone, resource];
        }
        return { ...prev, indoorResources: next };
      });
    },
    [onChangeValues],
  );

  const toggleSustainabilityGoal = useCallback(
    (goal: SustainabilityGoal) => {
      onChangeValues((prev) => {
        const exists = prev.sustainabilityGoals.includes(goal);
        const next = exists
          ? prev.sustainabilityGoals.filter((g) => g !== goal)
          : [...prev.sustainabilityGoals, goal];
        return { ...prev, sustainabilityGoals: next };
      });
    },
    [onChangeValues],
  );

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPresetNotice('');

    const payloadToValidate = {
      ...formValues,
      manualAqi: manualAqiText.trim() === '' ? null : manualAqiText.trim(),
      useLiveLookup,
    };

    const result = validateUserProfileInput(payloadToValidate);
    if (!result.valid || !result.sanitized) {
      shouldFocusErrorsRef.current = true;
      setClientErrors(result.errors);
      return;
    }

    shouldFocusErrorsRef.current = false;
    setClientErrors({});
    onSubmit(result.sanitized);
  };

  const handleCityAqiCheck = () => {
    const cityCheck = validateCityName(formValues.city);
    if (!cityCheck.valid) {
      shouldFocusErrorsRef.current = true;
      setClientErrors((prev) => ({
        ...prev,
        city: cityCheck.error || 'Enter a valid city or location name to check AQI.',
      }));
      return;
    }
    setClientErrors((prev) => ({ ...prev, city: undefined }));
    onCheckAqiOnly(cityCheck.city);
  };

  const handlePresetLoad = (presetId: string) => {
    const found = SCENARIO_PRESETS.find((p) => p.id === presetId);
    if (!found) {
      return;
    }
    shouldFocusErrorsRef.current = false;
    setClientErrors({});
    onChangeValues({ ...found.input, useLiveLookup });
    onChangeManualAqiText(found.input.manualAqi !== null ? String(found.input.manualAqi) : '');
    setPresetNotice(
      `Loaded "${found.label}" sample profile. Review or adjust any field, then select Generate Personalized Guidance.`,
    );
  };

  const handleResetClick = () => {
    shouldFocusErrorsRef.current = false;
    setClientErrors({});
    setPresetNotice('');
    onReset();
  };

  return (
    <section
      aria-labelledby="profile-form-heading"
      className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="border-b border-slate-200 pb-4">
        <h2 id="profile-form-heading" className="text-xl font-semibold text-slate-900">
          Household &amp; Location Profile
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Personalize recommendations to your city, pollution conditions, commute, and indoor setup. Only your location and routine preferences are needed.
        </p>
      </div>

      {/* Quick-fill sample profiles */}
      <div className="mt-4 border-b border-slate-100 pb-4">
        <p className="text-xs font-medium text-slate-700">
          Sample household scenarios (populates form for review):
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SCENARIO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetLoad(preset.id)}
              title={preset.description}
              className="inline-flex min-h-[36px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 whitespace-nowrap shrink-0"
            >
              {preset.label}
            </button>
          ))}
        </div>
        {presetNotice && (
          <p role="status" aria-live="polite" className="mt-2 text-xs font-medium text-teal-800">
            {presetNotice}
          </p>
        )}
      </div>

      {/* Validation Error Summary */}
      {errorEntries.length > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          aria-live="assertive"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 focus:outline-none"
        >
          <p className="font-semibold">Please fix the following before submitting:</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            {errorEntries.map(([field, message]) => {
              const targetId = FIELD_INPUT_IDS[field];
              return (
                <li key={field}>
                  {targetId ? (
                    <a
                      href={`#${targetId}`}
                      className="underline decoration-red-700/60 underline-offset-2 hover:text-red-950"
                    >
                      {message}
                    </a>
                  ) : (
                    message
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <form onSubmit={handleFormSubmit} noValidate className="mt-5 space-y-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextInputField
            id="city-input"
            name="city"
            label="City or location"
            labelBadge="(Required)"
            required
            inputRef={cityInputRef}
            maxLength={MAX_CITY_LENGTH}
            showCounter
            value={formValues.city}
            placeholder="e.g., Delhi, Salt Lake City, Milan"
            helpText="Used to contextualize regional air quality and seasonal inversion guidance."
            error={errors.city}
            onChange={handleCityChange}
            actionSlot={
              useLiveLookup ? (
                <button
                  type="button"
                  onClick={handleCityAqiCheck}
                  disabled={isCheckingAqi || isSubmitting}
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
                >
                  {isCheckingAqi ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Search className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>Check AQI</span>
                </button>
              ) : undefined
            }
          />

          <TextInputField
            id="manual-aqi-input"
            name="manualAqi"
            label="Manual US AQI reading"
            labelBadge="(Optional)"
            inputMode="numeric"
            maxLength={6}
            monospace
            value={manualAqiText}
            placeholder="0–500 (leave blank if unknown)"
            helpText="If you have a local neighborhood monitor or official station reading (0–500), enter it here to override modeled grid estimates."
            error={errors.manualAqi}
            onChange={handleManualAqiChange}
          />

          <SelectField
            id="season-mode-select"
            name="seasonMode"
            label="Pollution episode context"
            value={formValues.seasonMode}
            options={SEASON_MODES}
            labels={SEASON_MODE_LABELS}
            onChange={handleSeasonChange}
          />

          <SelectField
            id="commute-select"
            name="commuteMethod"
            label="Primary commute method"
            value={formValues.commuteMethod}
            options={COMMUTE_METHODS}
            labels={COMMUTE_METHOD_LABELS}
            onChange={handleCommuteChange}
          />

          <SelectField
            id="outdoor-habits-select"
            name="outdoorHabits"
            label="Daily outdoor activity habits"
            value={formValues.outdoorHabits}
            options={OUTDOOR_HABITS}
            labels={OUTDOOR_HABIT_LABELS}
            onChange={handleOutdoorChange}
          />

          <SelectField
            id="main-concern-select"
            name="mainConcern"
            label="Main concern"
            value={formValues.mainConcern}
            options={MAIN_CONCERNS}
            labels={MAIN_CONCERN_LABELS}
            onChange={handleConcernChange}
          />
        </div>

        <TextInputField
          id="household-context-input"
          name="householdContext"
          label="Household or lifestyle notes"
          labelBadge="(Optional)"
          maxLength={MAX_HOUSEHOLD_LENGTH}
          showCounter
          value={formValues.householdContext}
          placeholder="e.g., School-age kids, older parent, gas stove, ground-floor apartment near busy road"
          helpText="Optional general household context (avoid entering private names or medical records)."
          error={errors.householdContext}
          onChange={handleHouseholdChange}
        />

        {/* Optional Checkboxes: Indoor Resources & Sustainability Goals */}
        <div className="grid grid-cols-1 gap-5 pt-1 lg:grid-cols-2">
          <ChecklistFieldset
            legend="Available indoor air-quality resources"
            options={INDOOR_RESOURCES}
            labels={INDOOR_RESOURCE_LABELS}
            selected={formValues.indoorResources}
            columns={2}
            onToggle={toggleIndoorResource}
          />

          <ChecklistFieldset
            legend="Preferred sustainability goals"
            options={SUSTAINABILITY_GOALS}
            labels={SUSTAINABILITY_GOAL_LABELS}
            selected={formValues.sustainabilityGoals}
            columns={1}
            onToggle={toggleSustainabilityGoal}
          />
        </div>

        {/* Form Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={handleResetClick}
            disabled={isSubmitting}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Reset Form</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            <span>{isSubmitting ? 'Generating Guidance...' : 'Generate Personalized Guidance'}</span>
          </button>
        </div>
      </form>
    </section>
  );
});
