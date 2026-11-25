import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_USER_INPUT, type AiGuidanceResponse } from '../src/shared/airQualitySchema.ts';
import { fetchLiveAqi, requestAirQualityGuidance } from '../src/utils/apiClient.ts';

function buildValidGuidance(): AiGuidanceResponse {
  const item = {
    title: 'Use kitchen exhaust while cooking',
    action: 'Run an externally vented range hood before and during stove use.',
    reason: 'Combustion and cooking aerosols add directly to indoor PM2.5.',
    impact: 'Reduces indoor particle accumulation during winter inversion episodes.',
    priority: 'high' as const,
    practicality: 'No extra gear needed · Immediate habit',
  };
  return {
    summary: 'Winter inversion guidance tailored to your household.',
    pollution_context: 'Calm cold air traps fine particles near ground level.',
    morning_actions: [item],
    midday_actions: [item],
    evening_actions: [item],
    indoor_air_quality: [item],
    sustainable_alternatives: [item],
    environmental_impact: [item],
    safety_notes: ['Seek medical care for wheezing or shortness of breath.'],
    data_limitations: ['Regional estimates may differ from roadside monitors.'],
  };
}

test('fetchLiveAqi handles valid responses, malformed payloads, and non-JSON HTTP errors', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          reading: {
            status: 'available',
            source: 'Open-Meteo',
            resolvedLocation: 'Milan, Italy',
            usAqi: 88,
            pm25: 29.4,
            pm10: 41.2,
            observedAt: '2026-11-25T18:00 UTC',
            unitLabel: 'US AQI',
            note: 'Regional estimate.',
          },
        }),
        { status: 200 },
      )) as typeof fetch;

    const okOutcome = await fetchLiveAqi('Milan', true);
    assert.equal(okOutcome.ok, true);
    if (okOutcome.ok) {
      assert.equal(okOutcome.data.usAqi, 88);
      assert.equal(okOutcome.data.resolvedLocation, 'Milan, Italy');
    }

    // Non-JSON 502 HTML gateway page
    globalThis.fetch = (async () =>
      new Response('<html><body>502 Bad Gateway</body></html>', { status: 502 })) as typeof fetch;
    const htmlErrOutcome = await fetchLiveAqi('Milan', true);
    assert.equal(htmlErrOutcome.ok, false);
    if (!htmlErrOutcome.ok) {
      assert.ok(htmlErrOutcome.error.length > 0);
    }

    // Invalid reading payload on HTTP 200
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ reading: { status: 'corrupt' } }), { status: 200 })) as typeof fetch;
    const badShapeOutcome = await fetchLiveAqi('Milan', true);
    assert.equal(badShapeOutcome.ok, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('requestAirQualityGuidance validates responses, sanitizes fieldErrors, and guards generatedAt', async () => {
  const originalFetch = globalThis.fetch;
  try {
    // 1. Valid payload with invalid generatedAt falls back safely to valid ISO timestamp
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          guidance: buildValidGuidance(),
          liveAqi: { status: 'unavailable', note: 'Offline' },
          effectiveAqi: 165,
          aqiSourceType: 'manual',
          generatedAt: 'not-a-valid-date',
        }),
        { status: 200 },
      )) as typeof fetch;

    const okRes = await requestAirQualityGuidance({ ...DEFAULT_USER_INPUT, city: 'Lahore' });
    assert.equal(okRes.ok, true);
    if (okRes.ok) {
      assert.equal(okRes.data.effectiveAqi, 165);
      assert.equal(okRes.data.aqiSourceType, 'manual');
      assert.equal(Number.isNaN(Date.parse(okRes.data.generatedAt)), false);
    }

    // 2. 400 validation error filters unknown/prototype keys out of fieldErrors
    const badPayload = JSON.parse(
      '{"error":"Check fields","fieldErrors":{"city":"City required","unknownField":"ignore","constructor":"ignore"}}',
    );
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(badPayload), { status: 400 })) as typeof fetch;

    const errRes = await requestAirQualityGuidance(DEFAULT_USER_INPUT);
    assert.equal(errRes.ok, false);
    if (!errRes.ok) {
      assert.equal(errRes.error, 'Check fields');
      assert.equal(errRes.fieldErrors?.city, 'City required');
      assert.equal(Object.hasOwn(errRes.fieldErrors ?? {}, 'unknownField'), false);
      assert.equal(Object.hasOwn(errRes.fieldErrors ?? {}, 'constructor'), false);
    }

    // 3. Incomplete AI payload on HTTP 200 is rejected cleanly
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ guidance: { summary: 'Only summary' } }), {
        status: 200,
      })) as typeof fetch;

    const invalidAiRes = await requestAirQualityGuidance({ ...DEFAULT_USER_INPUT, city: 'Delhi' });
    assert.equal(invalidAiRes.ok, false);

    // 4. Empty 504 response does not throw JSON parse errors
    globalThis.fetch = (async () => new Response('', { status: 504 })) as typeof fetch;
    const timeoutRes = await requestAirQualityGuidance({ ...DEFAULT_USER_INPUT, city: 'Delhi' });
    assert.equal(timeoutRes.ok, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
