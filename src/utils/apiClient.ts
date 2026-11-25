import {
  validateAiGuidanceResponse,
  validateLiveAqiReading,
  type GuidanceApiResult,
  type LiveAqiReading,
  type UserProfileInput,
  type ValidationErrors,
} from '../shared/airQualitySchema.ts';

interface ApiErrorBody {
  error?: unknown;
  fieldErrors?: unknown;
}

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

function extractFieldErrors(raw: unknown): ValidationErrors | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const result: ValidationErrors = {};
  const source = raw as Record<string, unknown>;
  const keys: Array<keyof ValidationErrors> = [
    'city',
    'manualAqi',
    'commuteMethod',
    'householdContext',
    'outdoorHabits',
    'mainConcern',
    'seasonMode',
    'general',
  ];
  for (const key of keys) {
    if (typeof source[key] === 'string' && source[key].trim()) {
      result[key] = source[key].trim();
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
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;

  if (!response.ok) {
    const message =
      record && typeof record.error === 'string'
        ? record.error
        : 'Could not check live AQI for that location.';
    return { ok: false, error: message };
  }

  const reading = validateLiveAqiReading(record?.reading);
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
  const record =
    body && typeof body === 'object' ? (body as Record<string, unknown> & ApiErrorBody) : null;

  if (!response.ok) {
    const message =
      record && typeof record.error === 'string'
        ? record.error
        : 'Guidance could not be generated right now. Your inputs are preserved so you can retry.';
    return {
      ok: false,
      error: message,
      fieldErrors: extractFieldErrors(record?.fieldErrors),
    };
  }

  if (!record) {
    return {
      ok: false,
      error: 'The guidance service returned an empty or invalid response. Please try again.',
    };
  }

  const verifiedGuidance = validateAiGuidanceResponse(record.guidance);
  if (!verifiedGuidance.valid || !verifiedGuidance.data) {
    return {
      ok: false,
      error: 'The response from the guidance service was incomplete. Please try again.',
    };
  }

  const validatedLiveAqi = validateLiveAqiReading(record.liveAqi) ?? {
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

  const sourceType =
    record.aqiSourceType === 'live' ||
    record.aqiSourceType === 'manual' ||
    record.aqiSourceType === 'none'
      ? record.aqiSourceType
      : 'none';

  return {
    ok: true,
    data: {
      guidance: verifiedGuidance.data,
      liveAqi: validatedLiveAqi,
      effectiveAqi:
        typeof record.effectiveAqi === 'number' && Number.isFinite(record.effectiveAqi)
          ? record.effectiveAqi
          : null,
      aqiSourceType: sourceType,
      generatedAt:
        typeof record.generatedAt === 'string' ? record.generatedAt : new Date().toISOString(),
    },
  };
}
