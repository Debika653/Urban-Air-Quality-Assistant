export const MAX_CITY_LENGTH = 80;
export const MAX_HOUSEHOLD_LENGTH = 160;
export const MIN_AQI = 0;
export const MAX_AQI = 500;

export const COMMUTE_METHODS = [
  'public_transit',
  'car_solo',
  'carpool',
  'cycling',
  'walking',
  'work_from_home',
  'mixed',
] as const;

export type CommuteMethod = (typeof COMMUTE_METHODS)[number];

export const COMMUTE_METHOD_LABELS: Record<CommuteMethod, string> = {
  public_transit: 'Public transit (bus, metro, rail)',
  car_solo: 'Solo private car',
  carpool: 'Shared carpool or rideshare',
  cycling: 'Bicycle or e-bike',
  walking: 'Walking',
  work_from_home: 'Remote / minimal daily commute',
  mixed: 'Mixed transit & driving',
};

export const OUTDOOR_HABITS = [
  'minimal',
  'short_errands',
  'daily_exercise',
  'outdoor_work',
] as const;

export type OutdoorHabit = (typeof OUTDOOR_HABITS)[number];

export const OUTDOOR_HABIT_LABELS: Record<OutdoorHabit, string> = {
  minimal: 'Mostly indoors (essential trips only)',
  short_errands: 'Short daily errands or school runs',
  daily_exercise: 'Regular outdoor exercise or walks',
  outdoor_work: 'Extended outdoor work or transit',
};

export const MAIN_CONCERNS = [
  'winter_smog',
  'child_elderly_safety',
  'commute_exposure',
  'indoor_air',
  'lowering_emissions',
] as const;

export type MainConcern = (typeof MAIN_CONCERNS)[number];

export const MAIN_CONCERN_LABELS: Record<MainConcern, string> = {
  winter_smog: 'Severe winter smog & thermal inversions',
  child_elderly_safety: 'Protecting children & older adults',
  commute_exposure: 'Reducing daily commute exposure',
  indoor_air: 'Improving indoor air quality',
  lowering_emissions: 'Lowering household & travel emissions',
};

export const INDOOR_RESOURCES = [
  'hepa_purifier',
  'merv_hvac',
  'exhaust_fans',
  'air_monitor',
  'window_seals',
  'none',
] as const;

export type IndoorResource = (typeof INDOOR_RESOURCES)[number];

export const INDOOR_RESOURCE_LABELS: Record<IndoorResource, string> = {
  hepa_purifier: 'Portable HEPA purifier',
  merv_hvac: 'HVAC with MERV-13+ filter',
  exhaust_fans: 'Kitchen / bath exhaust fans',
  air_monitor: 'Indoor PM2.5 / CO2 monitor',
  window_seals: 'Weatherstripping / window seals',
  none: 'No dedicated filtration gear yet',
};

export const SUSTAINABILITY_GOALS = [
  'reduce_car_trips',
  'energy_saving',
  'clean_heating_cooking',
  'community_carpool',
] as const;

export type SustainabilityGoal = (typeof SUSTAINABILITY_GOALS)[number];

export const SUSTAINABILITY_GOAL_LABELS: Record<SustainabilityGoal, string> = {
  reduce_car_trips: 'Consolidate or replace solo car trips',
  energy_saving: 'Lower winter heating & electricity demand',
  clean_heating_cooking: 'Minimize indoor combustion & smoke',
  community_carpool: 'Coordinate neighborhood or school carpools',
};

export const SEASON_MODES = ['severe_winter_smog', 'general_urban_haze'] as const;
export type SeasonMode = (typeof SEASON_MODES)[number];

export const SEASON_MODE_LABELS: Record<SeasonMode, string> = {
  severe_winter_smog: 'Severe winter smog episode',
  general_urban_haze: 'General urban air pollution',
};

export interface UserProfileInput {
  city: string;
  manualAqi: number | null;
  commuteMethod: CommuteMethod;
  householdContext: string;
  outdoorHabits: OutdoorHabit;
  mainConcern: MainConcern;
  indoorResources: IndoorResource[];
  sustainabilityGoals: SustainabilityGoal[];
  seasonMode: SeasonMode;
  useLiveLookup?: boolean;
}

export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface RecommendationItem {
  title: string;
  action: string;
  reason: string;
  impact: string;
  priority: RecommendationPriority;
  practicality: string;
  limitation?: string;
}

export interface AiGuidanceResponse {
  summary: string;
  pollution_context: string;
  morning_actions: RecommendationItem[];
  midday_actions: RecommendationItem[];
  evening_actions: RecommendationItem[];
  indoor_air_quality: RecommendationItem[];
  sustainable_alternatives: RecommendationItem[];
  environmental_impact: RecommendationItem[];
  safety_notes: string[];
  data_limitations: string[];
}

export interface LiveAqiReading {
  status: 'available' | 'unavailable' | 'disabled' | 'error';
  source: string | null;
  resolvedLocation: string | null;
  usAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  observedAt: string | null;
  unitLabel: string | null;
  note: string;
}

export interface GuidanceApiResult {
  guidance: AiGuidanceResponse;
  liveAqi: LiveAqiReading;
  effectiveAqi: number | null;
  aqiSourceType: 'live' | 'manual' | 'none';
  generatedAt: string;
}

export interface ValidationErrors {
  city?: string;
  manualAqi?: string;
  commuteMethod?: string;
  householdContext?: string;
  outdoorHabits?: string;
  mainConcern?: string;
  seasonMode?: string;
  general?: string;
}

export interface InputValidationResult {
  valid: boolean;
  sanitized?: UserProfileInput;
  errors: ValidationErrors;
}

export const DEFAULT_USER_INPUT: UserProfileInput = {
  city: '',
  manualAqi: null,
  commuteMethod: 'public_transit',
  householdContext: '',
  outdoorHabits: 'short_errands',
  mainConcern: 'winter_smog',
  indoorResources: ['exhaust_fans'],
  sustainabilityGoals: ['reduce_car_trips', 'clean_heating_cooking'],
  seasonMode: 'severe_winter_smog',
  useLiveLookup: true,
};

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Strips control characters, invisible bidi/zero-width spoofing characters,
 * HTML/XML angle brackets, and normalizes whitespace.
 */
export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }
  const withoutControls = value.replace(
    /[\u0000-\u001F\u007F\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069<>]/g,
    ' ',
  );
  const normalized = withoutControls.replace(/\s+/g, ' ').trim();
  return normalized.slice(0, maxLength);
}

export function validateCityName(raw: unknown): {
  valid: boolean;
  city: string;
  error?: string;
} {
  if (typeof raw !== 'string') {
    return { valid: false, city: '', error: 'Please enter a city or neighborhood name.' };
  }
  const rawTrimmed = raw.trim();
  if (rawTrimmed.length > MAX_CITY_LENGTH) {
    return {
      valid: false,
      city: '',
      error: `City name must be ${MAX_CITY_LENGTH} characters or fewer.`,
    };
  }
  const cleanCity = sanitizeText(rawTrimmed, MAX_CITY_LENGTH);
  const hasLetter = /\p{L}/u.test(cleanCity);
  if (cleanCity.length < 2 || !hasLetter) {
    return {
      valid: false,
      city: '',
      error: 'Enter a valid city or location name (at least 2 letters).',
    };
  }
  return { valid: true, city: cleanCity };
}

export function parseManualAqiInput(raw: unknown): {
  valid: boolean;
  value: number | null;
  error?: string;
} {
  if (raw === undefined || raw === null || raw === '') {
    return { valid: true, value: null };
  }

  const numeric =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && /^-?\d+(\.\d+)?$/.test(raw.trim())
        ? Number(raw.trim())
        : Number.NaN;

  if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
    return {
      valid: false,
      value: null,
      error: 'Manual AQI must be a whole number between 0 and 500.',
    };
  }
  if (numeric < MIN_AQI || numeric > MAX_AQI) {
    return {
      valid: false,
      value: null,
      error: `Manual AQI must be between ${MIN_AQI} and ${MAX_AQI}.`,
    };
  }
  return { valid: true, value: numeric };
}

const VALID_AQI_STATUSES = ['available', 'unavailable', 'disabled', 'error'] as const;

export function validateLiveAqiReading(raw: unknown): LiveAqiReading | null {
  if (!isPlainObject(raw)) {
    return null;
  }
  const status = hasOwn(raw, 'status') ? raw.status : undefined;
  if (
    typeof status !== 'string' ||
    !(VALID_AQI_STATUSES as readonly string[]).includes(status)
  ) {
    return null;
  }
  const usAqi =
    typeof raw.usAqi === 'number' && Number.isFinite(raw.usAqi)
      ? Math.max(MIN_AQI, Math.min(MAX_AQI, Math.round(raw.usAqi)))
      : null;
  const pm25 =
    typeof raw.pm25 === 'number' && Number.isFinite(raw.pm25) ? raw.pm25 : null;
  const pm10 =
    typeof raw.pm10 === 'number' && Number.isFinite(raw.pm10) ? raw.pm10 : null;

  return {
    status: status as LiveAqiReading['status'],
    source: typeof raw.source === 'string' ? sanitizeText(raw.source, 120) : null,
    resolvedLocation:
      typeof raw.resolvedLocation === 'string'
        ? sanitizeText(raw.resolvedLocation, 140)
        : null,
    usAqi,
    pm25,
    pm10,
    observedAt:
      typeof raw.observedAt === 'string' ? sanitizeText(raw.observedAt, 60) : null,
    unitLabel:
      typeof raw.unitLabel === 'string' ? sanitizeText(raw.unitLabel, 60) : null,
    note: sanitizeText(raw.note, 320),
  };
}

function validateEnumValue<T extends string>(
  rawValue: unknown,
  allowed: readonly T[],
): T | null {
  return typeof rawValue === 'string' && (allowed as readonly string[]).includes(rawValue)
    ? (rawValue as T)
    : null;
}

function validateEnumArray<T extends string>(
  rawValue: unknown,
  allowed: readonly T[],
): T[] {
  if (!Array.isArray(rawValue)) {
    return [];
  }
  return Array.from(
    new Set(
      rawValue.filter(
        (item): item is T =>
          typeof item === 'string' && (allowed as readonly string[]).includes(item),
      ),
    ),
  );
}

export function validateUserProfileInput(raw: unknown): InputValidationResult {
  const errors: ValidationErrors = {};

  if (!isPlainObject(raw)) {
    return {
      valid: false,
      errors: { general: 'Request payload must be a valid object.' },
    };
  }

  const cityCheck = validateCityName(hasOwn(raw, 'city') ? raw.city : undefined);
  if (!cityCheck.valid) {
    errors.city = cityCheck.error;
  }

  const aqiCheck = parseManualAqiInput(hasOwn(raw, 'manualAqi') ? raw.manualAqi : undefined);
  if (!aqiCheck.valid) {
    errors.manualAqi = aqiCheck.error;
  }

  const commuteMethod = validateEnumValue(
    hasOwn(raw, 'commuteMethod') ? raw.commuteMethod : undefined,
    COMMUTE_METHODS,
  );
  if (!commuteMethod) {
    errors.commuteMethod = 'Please select a valid commute method.';
  }

  const outdoorHabits = validateEnumValue(
    hasOwn(raw, 'outdoorHabits') ? raw.outdoorHabits : undefined,
    OUTDOOR_HABITS,
  );
  if (!outdoorHabits) {
    errors.outdoorHabits = 'Please select an outdoor activity pattern.';
  }

  const mainConcern = validateEnumValue(
    hasOwn(raw, 'mainConcern') ? raw.mainConcern : undefined,
    MAIN_CONCERNS,
  );
  if (!mainConcern) {
    errors.mainConcern = 'Please select a primary concern.';
  }

  const rawSeason = hasOwn(raw, 'seasonMode') ? raw.seasonMode : 'severe_winter_smog';
  const seasonMode = validateEnumValue(rawSeason ?? 'severe_winter_smog', SEASON_MODES);
  if (!seasonMode) {
    errors.seasonMode = 'Please select an air-quality context mode.';
  }

  let cleanHousehold = '';
  const rawHousehold = hasOwn(raw, 'householdContext') ? raw.householdContext : undefined;
  if (rawHousehold !== undefined && rawHousehold !== null) {
    if (typeof rawHousehold !== 'string') {
      errors.householdContext = 'Household notes must be plain text.';
    } else if (rawHousehold.trim().length > MAX_HOUSEHOLD_LENGTH) {
      errors.householdContext = `Household notes must be ${MAX_HOUSEHOLD_LENGTH} characters or fewer.`;
    } else {
      cleanHousehold = sanitizeText(rawHousehold, MAX_HOUSEHOLD_LENGTH);
    }
  }

  const indoorResources = validateEnumArray(
    hasOwn(raw, 'indoorResources') ? raw.indoorResources : undefined,
    INDOOR_RESOURCES,
  );
  const sustainabilityGoals = validateEnumArray(
    hasOwn(raw, 'sustainabilityGoals') ? raw.sustainabilityGoals : undefined,
    SUSTAINABILITY_GOALS,
  );
  const useLiveLookup =
    hasOwn(raw, 'useLiveLookup') && typeof raw.useLiveLookup === 'boolean'
      ? raw.useLiveLookup
      : true;

  if (
    Object.keys(errors).length > 0 ||
    !commuteMethod ||
    !outdoorHabits ||
    !mainConcern ||
    !seasonMode
  ) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    sanitized: {
      city: cityCheck.city,
      manualAqi: aqiCheck.value,
      commuteMethod,
      householdContext: cleanHousehold,
      outdoorHabits,
      mainConcern,
      indoorResources,
      sustainabilityGoals,
      seasonMode,
      useLiveLookup,
    },
  };
}

function validateRecommendationItem(raw: unknown): RecommendationItem | null {
  if (!isPlainObject(raw)) {
    return null;
  }
  const title = sanitizeText(raw.title, 120);
  const action = sanitizeText(raw.action, 360);
  const reason = sanitizeText(raw.reason, 420);
  const impact = sanitizeText(raw.impact, 360);
  const practicality = sanitizeText(raw.practicality, 140) || 'Practical daily step';
  const limitation = sanitizeText(raw.limitation, 280);

  if (!title || !action || !reason || !impact) {
    return null;
  }

  const rawPriority = typeof raw.priority === 'string' ? raw.priority.toLowerCase().trim() : 'medium';
  const priority: RecommendationPriority =
    rawPriority === 'high' || rawPriority === 'medium' || rawPriority === 'low'
      ? rawPriority
      : 'medium';

  const item: RecommendationItem = {
    title,
    action,
    reason,
    impact,
    priority,
    practicality,
  };

  if (limitation) {
    item.limitation = limitation;
  }

  return item;
}

function validateRecommendationArray(raw: unknown, maxItems = 5): RecommendationItem[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const validated: RecommendationItem[] = [];
  for (const entry of raw.slice(0, maxItems)) {
    const parsed = validateRecommendationItem(entry);
    if (parsed) {
      validated.push(parsed);
    }
  }
  return validated.length > 0 ? validated : null;
}

function validateStringArray(raw: unknown, maxItems = 8): string[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const cleaned = raw
    .slice(0, maxItems)
    .map((item) => sanitizeText(item, 320))
    .filter((item) => item.length > 0);
  return cleaned.length > 0 ? cleaned : null;
}

export interface AiValidationResult {
  valid: boolean;
  data?: AiGuidanceResponse;
  error?: string;
}

export function validateAiGuidanceResponse(raw: unknown): AiValidationResult {
  if (!isPlainObject(raw)) {
    return { valid: false, error: 'AI response was not a structured JSON object.' };
  }

  const summary = sanitizeText(raw.summary, 600);
  const pollution_context = sanitizeText(raw.pollution_context, 700);
  const morning_actions = validateRecommendationArray(raw.morning_actions);
  const midday_actions = validateRecommendationArray(raw.midday_actions);
  const evening_actions = validateRecommendationArray(raw.evening_actions);
  const indoor_air_quality = validateRecommendationArray(raw.indoor_air_quality);
  const sustainable_alternatives = validateRecommendationArray(raw.sustainable_alternatives);
  const environmental_impact = validateRecommendationArray(raw.environmental_impact);
  const safety_notes = validateStringArray(raw.safety_notes);
  const data_limitations = validateStringArray(raw.data_limitations);

  if (
    !summary ||
    !pollution_context ||
    !morning_actions ||
    !midday_actions ||
    !evening_actions ||
    !indoor_air_quality ||
    !sustainable_alternatives ||
    !environmental_impact ||
    !safety_notes ||
    !data_limitations
  ) {
    return {
      valid: false,
      error: 'AI response was missing one or more required guidance sections.',
    };
  }

  return {
    valid: true,
    data: {
      summary,
      pollution_context,
      morning_actions,
      midday_actions,
      evening_actions,
      indoor_air_quality,
      sustainable_alternatives,
      environmental_impact,
      safety_notes,
      data_limitations,
    },
  };
}

export interface AqiBandInfo {
  label: string;
  range: string;
  severity: 'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous' | 'unknown';
  guidanceCue: string;
  textClass: string;
  surfaceClass: string;
  borderClass: string;
}

export function classifyAqiBand(aqi: number | null): AqiBandInfo {
  if (aqi === null || !Number.isFinite(aqi)) {
    return {
      label: 'AQI Not Specified',
      range: 'No numeric reading',
      severity: 'unknown',
      guidanceCue: 'Guidance follows precautionary winter smog & urban air practices.',
      textClass: 'text-slate-700',
      surfaceClass: 'bg-slate-100',
      borderClass: 'border-slate-300',
    };
  }

  if (aqi <= 50) {
    return {
      label: 'Good',
      range: '0–50 US AQI',
      severity: 'good',
      guidanceCue: 'Air quality poses minimal risk; normal outdoor and ventilation routines apply.',
      textClass: 'text-emerald-800',
      surfaceClass: 'bg-emerald-50',
      borderClass: 'border-emerald-200',
    };
  }
  if (aqi <= 100) {
    return {
      label: 'Moderate',
      range: '51–100 US AQI',
      severity: 'moderate',
      guidanceCue: 'Unusually sensitive individuals should monitor symptoms during prolonged exertion.',
      textClass: 'text-teal-800',
      surfaceClass: 'bg-teal-50',
      borderClass: 'border-teal-200',
    };
  }
  if (aqi <= 150) {
    return {
      label: 'Unhealthy for Sensitive Groups',
      range: '101–150 US AQI',
      severity: 'sensitive',
      guidanceCue: 'Children, older adults, and people with respiratory or heart conditions should limit prolonged outdoor exertion.',
      textClass: 'text-amber-900',
      surfaceClass: 'bg-amber-50',
      borderClass: 'border-amber-200',
    };
  }
  if (aqi <= 200) {
    return {
      label: 'Unhealthy',
      range: '151–200 US AQI',
      severity: 'unhealthy',
      guidanceCue: 'Everyone may begin to experience irritation; move exercise indoors and keep windows sealed.',
      textClass: 'text-orange-900',
      surfaceClass: 'bg-orange-50',
      borderClass: 'border-orange-200',
    };
  }
  if (aqi <= 300) {
    return {
      label: 'Very Unhealthy',
      range: '201–300 US AQI',
      severity: 'very_unhealthy',
      guidanceCue: 'Health alert: avoid outdoor exertion, prioritize indoor air filtration, and monitor vulnerable family members.',
      textClass: 'text-rose-900',
      surfaceClass: 'bg-rose-50',
      borderClass: 'border-rose-200',
    };
  }
  return {
    label: 'Hazardous',
    range: '301–500 US AQI',
    severity: 'hazardous',
    guidanceCue: 'Severe pollution conditions: stay indoors with filtered air, avoid outdoor travel unless essential, and seek medical advice for symptoms.',
    textClass: 'text-red-950',
    surfaceClass: 'bg-red-100',
    borderClass: 'border-red-300',
  };
}
