import { Loader2, RotateCcw, Search } from 'lucide-react';
import { type FormEvent, type RefObject, useState } from 'react';
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
  type IndoorResource,
  type SustainabilityGoal,
  type UserProfileInput,
  type ValidationErrors,
} from '../shared/airQualitySchema.ts';
import { SCENARIO_PRESETS } from '../utils/presets.ts';
import { ChecklistFieldset, SelectField } from './FormControls.tsx';

interface AirQualityFormProps {
  formValues: UserProfileInput;
  manualAqiText: string;
  serverErrors: ValidationErrors;
  isSubmitting: boolean;
  isCheckingAqi: boolean;
  useLiveLookup: boolean;
  cityInputRef: RefObject<HTMLInputElement | null>;
  onChangeValues: (next: UserProfileInput) => void;
  onChangeManualAqiText: (text: string) => void;
  onSubmit: (validatedInput: UserProfileInput) => void;
  onCheckAqiOnly: (city: string) => void;
  onReset: () => void;
}

export function AirQualityForm({
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

  const errors: ValidationErrors = { ...clientErrors, ...serverErrors };
  const errorEntries = Object.entries(errors).filter(([, msg]) => Boolean(msg));

  const toggleIndoorResource = (resource: IndoorResource) => {
    const exists = formValues.indoorResources.includes(resource);
    let next: IndoorResource[];
    if (resource === 'none') {
      next = exists ? [] : ['none'];
    } else {
      const withoutNone = formValues.indoorResources.filter((r) => r !== 'none');
      next = exists
        ? withoutNone.filter((r) => r !== resource)
        : [...withoutNone, resource];
    }
    onChangeValues({ ...formValues, indoorResources: next });
  };

  const toggleSustainabilityGoal = (goal: SustainabilityGoal) => {
    const exists = formValues.sustainabilityGoals.includes(goal);
    const next = exists
      ? formValues.sustainabilityGoals.filter((g) => g !== goal)
      : [...formValues.sustainabilityGoals, goal];
    onChangeValues({ ...formValues, sustainabilityGoals: next });
  };

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
      setClientErrors(result.errors);
      return;
    }

    setClientErrors({});
    onSubmit(result.sanitized);
  };

  const handleCityAqiCheck = () => {
    const cityCheck = validateCityName(formValues.city);
    if (!cityCheck.valid) {
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
    setClientErrors({});
    onChangeValues({ ...found.input, useLiveLookup });
    onChangeManualAqiText(found.input.manualAqi !== null ? String(found.input.manualAqi) : '');
    setPresetNotice(
      `Loaded "${found.label}" sample profile. Review or adjust any field, then select Generate Personalized Guidance.`,
    );
  };

  const handleResetClick = () => {
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
          role="alert"
          aria-live="assertive"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          <p className="font-semibold">Please fix the following before submitting:</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            {errorEntries.map(([field, message]) => (
              <li key={field}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleFormSubmit} noValidate className="mt-5 space-y-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* City / Location */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="city-input" className="text-sm font-medium text-slate-900">
                City or location <span className="text-teal-800">(Required)</span>
              </label>
              <span className="font-mono text-xs tabular-nums text-slate-600">
                {formValues.city.length}/{MAX_CITY_LENGTH}
              </span>
            </div>
            <div className="mt-1.5 flex gap-2">
              <input
                ref={cityInputRef}
                id="city-input"
                name="city"
                type="text"
                required
                aria-required="true"
                maxLength={MAX_CITY_LENGTH}
                value={formValues.city}
                onChange={(e) => {
                  onChangeValues({ ...formValues, city: e.target.value });
                  if (clientErrors.city) {
                    setClientErrors((prev) => ({ ...prev, city: undefined }));
                  }
                }}
                placeholder="e.g., Delhi, Salt Lake City, Milan"
                aria-invalid={Boolean(errors.city)}
                aria-describedby={errors.city ? 'city-help city-error' : 'city-help'}
                className={`block min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 ${
                  errors.city ? 'border-red-500 bg-red-50/40' : 'border-slate-300 bg-white'
                }`}
              />
              {useLiveLookup && (
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
              )}
            </div>
            <p id="city-help" className="mt-1 text-xs text-slate-600">
              Used to contextualize regional air quality and seasonal inversion guidance.
            </p>
            {errors.city && (
              <p id="city-error" className="mt-1 text-xs font-medium text-red-700">
                {errors.city}
              </p>
            )}
          </div>

          {/* Manual AQI Input */}
          <div>
            <label htmlFor="manual-aqi-input" className="block text-sm font-medium text-slate-900">
              Manual US AQI reading <span className="font-normal text-slate-600">(Optional)</span>
            </label>
            <input
              id="manual-aqi-input"
              name="manualAqi"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={manualAqiText}
              onChange={(e) => {
                onChangeManualAqiText(e.target.value);
                if (clientErrors.manualAqi) {
                  setClientErrors((prev) => ({ ...prev, manualAqi: undefined }));
                }
              }}
              placeholder="0–500 (leave blank if unknown)"
              aria-invalid={Boolean(errors.manualAqi)}
              aria-describedby={
                errors.manualAqi ? 'manual-aqi-help manual-aqi-error' : 'manual-aqi-help'
              }
              className={`mt-1.5 block min-h-[44px] w-full rounded-lg border px-3 py-2 font-mono text-sm tabular-nums text-slate-900 placeholder:font-sans placeholder:text-slate-400 ${
                errors.manualAqi ? 'border-red-500 bg-red-50/40' : 'border-slate-300 bg-white'
              }`}
            />
            <p id="manual-aqi-help" className="mt-1 text-xs text-slate-600">
              If you have a local neighborhood monitor or official station reading (0–500), enter it here to override modeled grid estimates.
            </p>
            {errors.manualAqi && (
              <p id="manual-aqi-error" className="mt-1 text-xs font-medium text-red-700">
                {errors.manualAqi}
              </p>
            )}
          </div>

          <SelectField
            id="season-mode-select"
            name="seasonMode"
            label="Pollution episode context"
            value={formValues.seasonMode}
            options={SEASON_MODES}
            labels={SEASON_MODE_LABELS}
            onChange={(seasonMode) => onChangeValues({ ...formValues, seasonMode })}
          />

          <SelectField
            id="commute-select"
            name="commuteMethod"
            label="Primary commute method"
            value={formValues.commuteMethod}
            options={COMMUTE_METHODS}
            labels={COMMUTE_METHOD_LABELS}
            onChange={(commuteMethod) => onChangeValues({ ...formValues, commuteMethod })}
          />

          <SelectField
            id="outdoor-habits-select"
            name="outdoorHabits"
            label="Daily outdoor activity habits"
            value={formValues.outdoorHabits}
            options={OUTDOOR_HABITS}
            labels={OUTDOOR_HABIT_LABELS}
            onChange={(outdoorHabits) => onChangeValues({ ...formValues, outdoorHabits })}
          />

          <SelectField
            id="main-concern-select"
            name="mainConcern"
            label="Main concern"
            value={formValues.mainConcern}
            options={MAIN_CONCERNS}
            labels={MAIN_CONCERN_LABELS}
            onChange={(mainConcern) => onChangeValues({ ...formValues, mainConcern })}
          />
        </div>

        {/* Household Context (Optional) */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="household-context-input" className="text-sm font-medium text-slate-900">
              Household or lifestyle notes <span className="font-normal text-slate-600">(Optional)</span>
            </label>
            <span className="font-mono text-xs tabular-nums text-slate-600">
              {formValues.householdContext.length}/{MAX_HOUSEHOLD_LENGTH}
            </span>
          </div>
          <input
            id="household-context-input"
            name="householdContext"
            type="text"
            maxLength={MAX_HOUSEHOLD_LENGTH}
            value={formValues.householdContext}
            onChange={(e) => {
              onChangeValues({ ...formValues, householdContext: e.target.value });
              if (clientErrors.householdContext) {
                setClientErrors((prev) => ({ ...prev, householdContext: undefined }));
              }
            }}
            placeholder="e.g., School-age kids, older parent, gas stove, ground-floor apartment near busy road"
            aria-invalid={Boolean(errors.householdContext)}
            aria-describedby={
              errors.householdContext ? 'household-help household-error' : 'household-help'
            }
            className={`mt-1.5 block min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 ${
              errors.householdContext ? 'border-red-500 bg-red-50/40' : 'border-slate-300 bg-white'
            }`}
          />
          <p id="household-help" className="mt-1 text-xs text-slate-600">
            Optional general household context (avoid entering private names or medical records).
          </p>
          {errors.householdContext && (
            <p id="household-error" className="mt-1 text-xs font-medium text-red-700">
              {errors.householdContext}
            </p>
          )}
        </div>

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
}
