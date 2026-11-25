import type { LiveAqiReading } from '../shared/airQualitySchema.ts';
import { sanitizeText } from '../shared/airQualitySchema.ts';

const ALLOWED_GEOCODING_HOST = 'geocoding-api.open-meteo.com';
const ALLOWED_AIR_QUALITY_HOST = 'air-quality-api.open-meteo.com';
const REQUEST_TIMEOUT_MS = 4500;

interface GeocodingApiResult {
  results?: Array<{
    name?: unknown;
    admin1?: unknown;
    country?: unknown;
    latitude?: unknown;
    longitude?: unknown;
  }>;
}

interface AirQualityApiResult {
  current?: {
    time?: unknown;
    us_aqi?: unknown;
    pm2_5?: unknown;
    pm10?: unknown;
  };
  current_units?: {
    pm2_5?: unknown;
    pm10?: unknown;
  };
}

function buildUnavailableReading(
  status: 'unavailable' | 'disabled' | 'error',
  note: string,
): LiveAqiReading {
  return {
    status,
    source: null,
    resolvedLocation: null,
    usAqi: null,
    pm25: null,
    pm10: null,
    observedAt: null,
    unitLabel: null,
    note,
  };
}

export async function fetchLiveAqiForCity(
  city: string,
  enabled = true,
): Promise<LiveAqiReading> {
  if (!enabled) {
    return buildUnavailableReading(
      'disabled',
      'Live AQI lookup is disabled in your preferences. Enter a manual AQI reading or rely on precautionary guidance.',
    );
  }

  const cleanCity = sanitizeText(city, 80);
  if (!cleanCity) {
    return buildUnavailableReading(
      'unavailable',
      'No city was provided for live air-quality lookup.',
    );
  }

  try {
    const geoUrl = new URL(`https://${ALLOWED_GEOCODING_HOST}/v1/search`);
    geoUrl.searchParams.set('name', cleanCity);
    geoUrl.searchParams.set('count', '1');
    geoUrl.searchParams.set('language', 'en');
    geoUrl.searchParams.set('format', 'json');

    if (geoUrl.hostname !== ALLOWED_GEOCODING_HOST) {
      throw new Error('Disallowed geocoding host');
    }

    const geoResponse = await fetch(geoUrl.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!geoResponse.ok) {
      return buildUnavailableReading(
        'unavailable',
        'Live air-quality location lookup is currently unavailable. You can enter a manual AQI reading instead.',
      );
    }

    const geoData = (await geoResponse.json()) as GeocodingApiResult;
    const match = Array.isArray(geoData.results) ? geoData.results[0] : undefined;

    if (
      !match ||
      typeof match.latitude !== 'number' ||
      typeof match.longitude !== 'number' ||
      !Number.isFinite(match.latitude) ||
      !Number.isFinite(match.longitude)
    ) {
      return buildUnavailableReading(
        'unavailable',
        `No matching monitoring coordinates were found for "${cleanCity}". Enter a manual AQI value if you have a local reading.`,
      );
    }

    const aqUrl = new URL(`https://${ALLOWED_AIR_QUALITY_HOST}/v1/air-quality`);
    aqUrl.searchParams.set('latitude', String(match.latitude));
    aqUrl.searchParams.set('longitude', String(match.longitude));
    aqUrl.searchParams.set('current', 'us_aqi,pm2_5,pm10');
    aqUrl.searchParams.set('timezone', 'UTC');

    if (aqUrl.hostname !== ALLOWED_AIR_QUALITY_HOST) {
      throw new Error('Disallowed air-quality host');
    }

    const aqResponse = await fetch(aqUrl.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!aqResponse.ok) {
      return buildUnavailableReading(
        'unavailable',
        'Live air-quality service did not return a reading. Guidance will use manual AQI or precautionary rules.',
      );
    }

    const aqData = (await aqResponse.json()) as AirQualityApiResult;
    const current = aqData.current;
    if (!current || typeof current.us_aqi !== 'number' || !Number.isFinite(current.us_aqi)) {
      return buildUnavailableReading(
        'unavailable',
        'Current US AQI data was unavailable from the provider for this location.',
      );
    }

    const locationParts = [match.name, match.admin1, match.country]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
      .map((part) => sanitizeText(part, 40));

    const usAqi = Math.max(0, Math.min(500, Math.round(current.us_aqi)));
    const pm25 =
      typeof current.pm2_5 === 'number' && Number.isFinite(current.pm2_5)
        ? Math.round(current.pm2_5 * 10) / 10
        : null;
    const pm10 =
      typeof current.pm10 === 'number' && Number.isFinite(current.pm10)
        ? Math.round(current.pm10 * 10) / 10
        : null;
    const observedAt =
      typeof current.time === 'string' ? sanitizeText(current.time, 40) : null;
    const pmUnit =
      typeof aqData.current_units?.pm2_5 === 'string'
        ? sanitizeText(aqData.current_units.pm2_5, 16)
        : 'µg/m³';

    return {
      status: 'available',
      source: 'Open-Meteo Air Quality API (modeled regional grid)',
      resolvedLocation: locationParts.join(', ') || cleanCity,
      usAqi,
      pm25,
      pm10,
      observedAt: observedAt ? `${observedAt} UTC` : null,
      unitLabel: `US AQI · PM in ${pmUnit}`,
      note: 'Regional modeled air-quality estimate; street-level traffic corridors or winter inversion pockets may read higher than city-grid averages.',
    };
  } catch {
    return buildUnavailableReading(
      'error',
      'Live air-quality lookup timed out or could not be reached. No simulated reading was generated; enter a manual AQI if available.',
    );
  }
}
