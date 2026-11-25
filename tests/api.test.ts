import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { createApiApp, type ServerDependencies } from '../src/server/app.ts';
import { clearAqiCache, fetchLiveAqiForCity } from '../src/server/aqiService.ts';
import { buildPromptPayload, GeminiServiceError } from '../src/server/geminiService.ts';
import {
  DEFAULT_USER_INPUT,
  type AiGuidanceResponse,
  type LiveAqiReading,
} from '../src/shared/airQualitySchema.ts';

function buildStubGuidance(): AiGuidanceResponse {
  const item = {
    title: 'Seal drafty window frames',
    action: 'Apply removable weatherstripping around bedroom windows before evening cooling.',
    reason: 'Reduces outdoor winter smog infiltration during overnight temperature inversions.',
    impact: 'Lowers indoor particle buildup without requiring additional energy use.',
    priority: 'high' as const,
    practicality: 'Low cost · 20 minute setup',
  };
  return {
    summary: 'Tailored guidance for severe winter smog.',
    pollution_context: 'Cold stagnant air slows vertical dispersion.',
    morning_actions: [item],
    midday_actions: [item],
    evening_actions: [item],
    indoor_air_quality: [item],
    sustainable_alternatives: [item],
    environmental_impact: [item],
    safety_notes: ['This tool does not replace professional medical advice.'],
    data_limitations: ['Regional grid estimates may differ from roadside monitors.'],
  };
}

function buildAvailableLiveAqi(): LiveAqiReading {
  return {
    status: 'available',
    source: 'Open-Meteo Air Quality API (modeled regional grid)',
    resolvedLocation: 'Salt Lake City, Utah, United States',
    usAqi: 138,
    pm25: 50.4,
    pm10: 68.2,
    observedAt: '2026-11-25T18:00 UTC',
    unitLabel: 'US AQI · PM in µg/m³',
    note: 'Modeled regional estimate.',
  };
}

function buildUnavailableLiveAqi(): LiveAqiReading {
  return {
    status: 'unavailable',
    source: null,
    resolvedLocation: null,
    usAqi: null,
    pm25: null,
    pm10: null,
    observedAt: null,
    unitLabel: null,
    note: 'Live data unavailable.',
  };
}

async function withServer(
  deps: Partial<ServerDependencies>,
  fn: (baseUrl: string) => Promise<void>,
) {
  const app = createApiApp(deps);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Could not bind test server');
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

test('GET /api/health returns 200 and hardened security headers without X-Powered-By', async () => {
  await withServer({}, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(res.headers.get('x-dns-prefetch-control'), 'off');
    assert.equal(res.headers.get('x-permitted-cross-domain-policies'), 'none');
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(res.headers.get('x-powered-by'), null);
    const body = (await res.json()) as { status: string };
    assert.equal(body.status, 'ok');
  });
});

test('GET /api/aqi validates city input, handles disabled flag, and catches provider errors', async () => {
  await withServer(
    {
      lookupAqi: async (city, enabled) =>
        enabled === false
          ? { ...buildUnavailableLiveAqi(), status: 'disabled' }
          : { ...buildAvailableLiveAqi(), resolvedLocation: city },
    },
    async (baseUrl) => {
      const okRes = await fetch(`${baseUrl}/api/aqi?city=Lahore`);
      assert.equal(okRes.status, 200);
      const okBody = (await okRes.json()) as { reading: LiveAqiReading };
      assert.equal(okBody.reading.status, 'available');

      const disabledRes = await fetch(`${baseUrl}/api/aqi?city=Lahore&enabled=false`);
      assert.equal(disabledRes.status, 200);
      const disabledBody = (await disabledRes.json()) as { reading: LiveAqiReading };
      assert.equal(disabledBody.reading.status, 'disabled');

      const badRes = await fetch(`${baseUrl}/api/aqi?city=1`);
      assert.equal(badRes.status, 400);
    },
  );

  await withServer(
    {
      lookupAqi: async () => {
        throw new Error('Unexpected lookup crash');
      },
    },
    async (baseUrl) => {
      const errRes = await fetch(`${baseUrl}/api/aqi?city=Lahore`);
      assert.equal(errRes.status, 502);
      const body = (await errRes.json()) as { code: string };
      assert.equal(body.code, 'AQI_LOOKUP_ERROR');
    },
  );
});

test('POST /api/guidance succeeds with live AQI and respects manual AQI override', async () => {
  await withServer(
    {
      lookupAqi: async () => buildAvailableLiveAqi(),
      generateGuidance: async () => buildStubGuidance(),
    },
    async (baseUrl) => {
      const liveRes = await fetch(`${baseUrl}/api/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'Salt Lake City',
          commuteMethod: 'public_transit',
          outdoorHabits: 'short_errands',
          mainConcern: 'winter_smog',
        }),
      });
      assert.equal(liveRes.status, 200);
      const liveBody = (await liveRes.json()) as {
        effectiveAqi: number | null;
        aqiSourceType: string;
      };
      assert.equal(liveBody.effectiveAqi, 138);
      assert.equal(liveBody.aqiSourceType, 'live');

      const manualRes = await fetch(`${baseUrl}/api/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'Salt Lake City',
          manualAqi: 210,
          commuteMethod: 'public_transit',
          outdoorHabits: 'short_errands',
          mainConcern: 'winter_smog',
        }),
      });
      assert.equal(manualRes.status, 200);
      const manualBody = (await manualRes.json()) as {
        effectiveAqi: number | null;
        aqiSourceType: string;
      };
      assert.equal(manualBody.effectiveAqi, 210);
      assert.equal(manualBody.aqiSourceType, 'manual');
    },
  );
});

test('POST /api/guidance falls back transparently when live AQI is unavailable', async () => {
  await withServer(
    {
      lookupAqi: async () => buildUnavailableLiveAqi(),
      generateGuidance: async () => buildStubGuidance(),
    },
    async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'Unknown Town',
          commuteMethod: 'car_solo',
          outdoorHabits: 'minimal',
          mainConcern: 'indoor_air',
        }),
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        effectiveAqi: number | null;
        aqiSourceType: string;
      };
      assert.equal(body.effectiveAqi, null);
      assert.equal(body.aqiSourceType, 'none');
    },
  );
});

test('POST /api/guidance rejects invalid input, malformed JSON, and oversized bodies', async () => {
  await withServer({}, async (baseUrl) => {
    const malformedJsonRes = await fetch(`${baseUrl}/api/guidance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"city": "Delhi", broken',
    });
    assert.equal(malformedJsonRes.status, 400);
    const malformedBody = (await malformedJsonRes.json()) as { code: string };
    assert.equal(malformedBody.code, 'INVALID_JSON');

    const badInputRes = await fetch(`${baseUrl}/api/guidance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: '   ',
        manualAqi: 900,
        commuteMethod: 'invalid_mode',
      }),
    });
    assert.equal(badInputRes.status, 400);
    const badBody = (await badInputRes.json()) as {
      code: string;
      fieldErrors: Record<string, string>;
    };
    assert.equal(badBody.code, 'VALIDATION_ERROR');
    assert.ok(badBody.fieldErrors.city);
    assert.ok(badBody.fieldErrors.manualAqi);

    const oversizedRes = await fetch(`${baseUrl}/api/guidance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: 'X'.repeat(25000) }),
    });
    assert.equal(oversizedRes.status, 413);
  });
});

test('POST /api/guidance maps AI errors and unexpected exceptions without leaking internals', async () => {
  const errorCases = [
    { err: new GeminiServiceError('AI request timed out', 504, 'AI_TIMEOUT'), status: 504 },
    { err: new GeminiServiceError('Malformed AI JSON', 502, 'MALFORMED_AI_JSON'), status: 502 },
    { err: new GeminiServiceError('Rate limit reached', 429, 'RATE_LIMITED'), status: 429 },
    { err: new GeminiServiceError('API key missing', 503, 'API_KEY_MISSING'), status: 503 },
    { err: new Error('Internal secret GEMINI_API_KEY=AIzaFakeSecret stack'), status: 500 },
  ];

  for (const testCase of errorCases) {
    await withServer(
      {
        lookupAqi: async () => buildUnavailableLiveAqi(),
        generateGuidance: async () => {
          throw testCase.err;
        },
      },
      async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/guidance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: 'Delhi',
            commuteMethod: 'public_transit',
            outdoorHabits: 'short_errands',
            mainConcern: 'winter_smog',
          }),
        });
        assert.equal(res.status, testCase.status);
        const text = await res.text();
        assert.equal(text.includes('AIzaFakeSecret'), false);
        assert.equal(text.includes('GEMINI_API_KEY'), false);
      },
    );
  }
});

test('API rate limiter returns 429 with Retry-After header when request cap is exceeded', async () => {
  await withServer(
    {
      lookupAqi: async () => buildUnavailableLiveAqi(),
      rateLimit: { aqiMax: 2, guidanceMax: 2, windowMs: 30_000 },
    },
    async (baseUrl) => {
      const r1 = await fetch(`${baseUrl}/api/aqi?city=Delhi`);
      const r2 = await fetch(`${baseUrl}/api/aqi?city=Milan`);
      const r3 = await fetch(`${baseUrl}/api/aqi?city=Lahore`);

      assert.equal(r1.status, 200);
      assert.equal(r2.status, 200);
      assert.equal(r3.status, 429);
      assert.ok(Number(r3.headers.get('retry-after')) >= 1);
      const body = (await r3.json()) as { code: string };
      assert.equal(body.code, 'RATE_LIMITED');
    },
  );
});

test('fetchLiveAqiForCity handles success, caching, concurrent deduplication, errors, and disabled state', async () => {
  clearAqiCache();
  const disabledResult = await fetchLiveAqiForCity('Delhi', false);
  assert.equal(disabledResult.status, 'disabled');
  assert.equal(disabledResult.usAqi, null);

  const originalFetch = globalThis.fetch;
  try {
    // 1. Success response + cache hit + concurrent deduplication
    let callCount = 0;
    globalThis.fetch = (async () => {
      callCount += 1;
      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            results: [
              {
                name: 'Milan',
                admin1: 'Lombardy',
                country: 'Italy',
                latitude: 45.46,
                longitude: 9.19,
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          current: {
            time: '2026-11-25T18:00',
            us_aqi: 94.6,
            pm2_5: 32.14,
            pm10: 45.78,
          },
          current_units: { pm2_5: 'µg/m³' },
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const [first, concurrent] = await Promise.all([
      fetchLiveAqiForCity('Milan', true),
      fetchLiveAqiForCity('milan', true),
    ]);
    assert.equal(first.status, 'available');
    assert.equal(first.usAqi, 95);
    assert.equal(first.pm25, 32.1);
    assert.equal(first.pm10, 45.8);
    assert.equal(first.resolvedLocation, 'Milan, Lombardy, Italy');
    assert.equal(concurrent.usAqi, 95);
    assert.equal(callCount, 2, 'Concurrent lookups should share 1 geocoding + 1 AQ fetch');

    // Subsequent lookup within TTL hits cache without calling fetch again
    const cachedHit = await fetchLiveAqiForCity('Milan', true);
    assert.equal(cachedHit.usAqi, 95);
    assert.equal(callCount, 2);

    // 2. Empty geocoding results
    clearAqiCache();
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ results: [] }), { status: 200 })) as typeof fetch;
    const notFoundResult = await fetchLiveAqiForCity('Nowhereville', true);
    assert.equal(notFoundResult.status, 'unavailable');
    assert.equal(notFoundResult.usAqi, null);

    // 3. Provider HTTP 500
    clearAqiCache();
    globalThis.fetch = (async () =>
      new Response('Server Error', { status: 500 })) as typeof fetch;
    const serverErrResult = await fetchLiveAqiForCity('Milan', true);
    assert.equal(serverErrResult.status, 'unavailable');

    // 4. Network rejection (not cached so retry makes a new request)
    clearAqiCache();
    let errorFetchCount = 0;
    globalThis.fetch = (async () => {
      errorFetchCount += 1;
      throw new Error('Network timeout');
    }) as typeof fetch;
    const networkErrResult = await fetchLiveAqiForCity('Milan', true);
    assert.equal(networkErrResult.status, 'error');
    assert.equal(networkErrResult.usAqi, null);
    await fetchLiveAqiForCity('Milan', true);
    assert.equal(errorFetchCount, 2);
  } finally {
    clearAqiCache();
    globalThis.fetch = originalFetch;
  }
});

test('buildPromptPayload serializes compact JSON inside XML boundary tags', () => {
  const prompt = buildPromptPayload(
    { ...DEFAULT_USER_INPUT, city: 'Salt Lake City', householdContext: 'Kids at home' },
    buildAvailableLiveAqi(),
    138,
    'live',
  );
  assert.ok(prompt.includes('<user_profile_data>'));
  assert.ok(prompt.includes('</user_profile_data>'));
  assert.ok(prompt.includes('"location":"Salt Lake City"'));
  assert.equal(prompt.includes('\n  "location"'), false);
});
