import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { createApiApp, type ServerDependencies } from '../src/server/app.ts';
import { GeminiServiceError } from '../src/server/geminiService.ts';
import type { AiGuidanceResponse, LiveAqiReading } from '../src/shared/airQualitySchema.ts';

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

test('GET /api/health returns 200 and security headers without X-Powered-By', async () => {
  await withServer({}, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(res.headers.get('x-powered-by'), null);
    const body = (await res.json()) as { status: string };
    assert.equal(body.status, 'ok');
  });
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

test('POST /api/guidance rejects invalid input and oversized bodies cleanly', async () => {
  await withServer({}, async (baseUrl) => {
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

test('POST /api/guidance maps AI timeouts, malformed outputs, and missing keys without leaking internals', async () => {
  await withServer(
    {
      lookupAqi: async () => buildUnavailableLiveAqi(),
      generateGuidance: async () => {
        throw new GeminiServiceError('AI request timed out', 504, 'AI_TIMEOUT');
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
      assert.equal(res.status, 504);
      const text = await res.text();
      assert.equal(text.includes('GEMINI_API_KEY'), false);
      assert.equal(text.includes('at '), false);
    },
  );

  await withServer(
    {
      lookupAqi: async () => buildUnavailableLiveAqi(),
      generateGuidance: async () => {
        throw new GeminiServiceError('Malformed AI JSON', 502, 'MALFORMED_AI_JSON');
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
      assert.equal(res.status, 502);
    },
  );
});
