import {
  hasOwn,
  isPlainObject,
  validateAiGuidanceResponse,
  validateLiveAqiReading,
  type GuidanceApiResult,
  type LiveAqiReading,
  type UserProfileInput,
  type ValidationErrors,
} from '../shared/airQualitySchema.ts';

export type ApiOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: ValidationErrors };

async function safeParseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

const ALLOWED_ERROR_KEYS: ReadonlyArray<keyof ValidationErrors> = [
  'city',
  'manualAqi',
  'commuteMethod',
  'householdContext',
  'outdoorHabits',
  'mainConcern',
  'seasonMode',
  'general',
];

function extractFieldErrors(raw: unknown): ValidationErrors | undefined {
  if (!isPlainObject(raw)) {
    return undefined;
  }
  const result: ValidationErrors = {};
  for (const key of ALLOWED_ERROR_KEYS) {
    if (hasOwn(raw, key) && typeof raw[key] === 'string' && raw[key].trim()) {
      result[key] = raw[key].trim();
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export async function fetchLiveAqi(
  city: string,
  enabled: boolean,
  signal?: AbortSignal,
): Promise<ApiOutcome<LiveAqiReading>> {
  const params = new URLSearchParams({
    city,
    enabled: String(enabled),
  });

  const response = await fetch(`/api/aqi?${params.toString()}`, {
    method: 'GET',
    signal,
  });

  const body = await safeParseJson(response);
  const record = isPlainObject(body) ? body : null;

  if (!response.ok) {
    const message =
      record && hasOwn(record, 'error') && typeof record.error === 'string'
        ? record.error
        : 'Could not check live AQI for that location.';
    return { ok: false, error: message };
  }

  const reading = validateLiveAqiReading(record && hasOwn(record, 'reading') ? record.reading : null);
  if (!reading) {
    return {
      ok: false,
      error: 'Live AQI service returned an unexpected response format.',
    };
  }

  return { ok: true, data: reading };
}

export async function requestAirQualityGuidance(
  input: UserProfileInput,
  signal?: AbortSignal,
): Promise<ApiOutcome<GuidanceApiResult>> {
  const response = await fetch('/api/guidance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  });

  const body = await safeParseJson(response);
  const record = isPlainObject(body) ? body : null;

  if (!response.ok) {
    const message =
      record && hasOwn(record, 'error') && typeof record.error === 'string'
        ? record.error
        : 'Guidance could not be generated right now. Your inputs are preserved so you can retry.';
    return {
      ok: false,
      error: message,
      fieldErrors: extractFieldErrors(record && hasOwn(record, 'fieldErrors') ? record.fieldErrors : null),
    };
  }

  if (!record) {
    return {
      ok: false,
      error: 'The guidance service returned an empty or invalid response. Please try again.',
    };
  }

  const verifiedGuidance = validateAiGuidanceResponse(
    hasOwn(record, 'guidance') ? record.guidance : null,
  );
  if (!verifiedGuidance.valid || !verifiedGuidance.data) {
    return {
      ok: false,
      error: 'The response from the guidance service was incomplete. Please try again.',
    };
  }

  const validatedLiveAqi = validateLiveAqiReading(
    hasOwn(record, 'liveAqi') ? record.liveAqi : null,
  ) ?? {
    status: 'unavailable',
    source: null,
    resolvedLocation: null,
    usAqi: null,
    pm25: null,
    pm10: null,
    observedAt: null,
    unitLabel: null,
    note: 'Live air-quality data status could not be confirmed.',
  };

  const rawSourceType = hasOwn(record, 'aqiSourceType') ? record.aqiSourceType : undefined;
  const sourceType =
    rawSourceType === 'live' || rawSourceType === 'manual' || rawSourceType === 'none'
      ? rawSourceType
      : 'none';

  const rawGeneratedAt = hasOwn(record, 'generatedAt') ? record.generatedAt : undefined;
  const generatedAt =
    typeof rawGeneratedAt === 'string' &&
    rawGeneratedAt.length <= 40 &&
    !Number.isNaN(Date.parse(rawGeneratedAt))
      ? rawGeneratedAt
      : new Date().toISOString();

  const rawEffectiveAqi = hasOwn(record, 'effectiveAqi') ? record.effectiveAqi : undefined;

  return {
    ok: true,
    data: {
      guidance: verifiedGuidance.data,
      liveAqi: validatedLiveAqi,
      effectiveAqi:
        typeof rawEffectiveAqi === 'number' && Number.isFinite(rawEffectiveAqi)
          ? rawEffectiveAqi
          : null,
      aqiSourceType: sourceType,
      generatedAt,
    },
  };
}
