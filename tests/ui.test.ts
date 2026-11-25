import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../src/App.tsx';
import { AirQualityForm } from '../src/components/AirQualityForm.tsx';
import { DashboardSkeleton } from '../src/components/DashboardSkeleton.tsx';
import { GuidanceResults } from '../src/components/GuidanceResults.tsx';
import { PollutionStatusPanel } from '../src/components/PollutionStatusPanel.tsx';
import { PreferencesPanel } from '../src/components/PreferencesPanel.tsx';
import {
  DEFAULT_USER_INPUT,
  validateAiGuidanceResponse,
  type AiGuidanceResponse,
} from '../src/shared/airQualitySchema.ts';
import { DEFAULT_PREFERENCES } from '../src/utils/preferences.ts';

function buildSampleGuidance(): AiGuidanceResponse {
  const item = {
    title: 'Seal windows during overnight inversion',
    action: 'Keep exterior windows closed after dusk and use kitchen exhaust when cooking.',
    reason: 'Winter thermal inversions trap particulates near ground level overnight.',
    impact: 'Reduces indoor PM2.5 infiltration without extra electricity demand.',
    priority: 'high' as const,
    practicality: 'No cost · 5 minutes',
    limitation: 'Ensure exhaust fans vent outdoors rather than recirculating.',
  };
  return {
    summary: 'Severe winter smog plan for a transit-commuting family.',
    pollution_context: 'Cold stagnant valley air slows pollutant dispersion.',
    morning_actions: [item],
    midday_actions: [{ ...item, title: 'Midday brief indoor air check', priority: 'medium' }],
    evening_actions: [{ ...item, title: 'Evening transit return precautions', priority: 'low' }],
    indoor_air_quality: [{ ...item, title: 'Damp-dust surfaces instead of dry sweeping' }],
    sustainable_alternatives: [{ ...item, title: 'Use electric rail transit over solo driving' }],
    environmental_impact: [{ ...item, title: 'Transit vs. solo car tailpipe comparison' }],
    safety_notes: ['Children and older adults should avoid prolonged outdoor exertion.'],
    data_limitations: ['Regional grid estimates do not capture street-level traffic spikes.'],
  };
}

test('App renders semantic landmarks, skip link, title, empty state, and responsive grid', () => {
  const html = renderToStaticMarkup(createElement(App));

  assert.ok(html.includes('href="#main-content"'));
  assert.ok(html.includes('<header'));
  assert.ok(html.includes('<nav'));
  assert.ok(html.includes('<main id="main-content"'));
  assert.ok(html.includes('<footer'));
  assert.ok(html.includes('<h1'));
  assert.ok(html.includes('CleanAir Companion'));
  assert.ok(html.includes('Your personalized air-quality action plan will appear here'));
  assert.ok(html.includes('min-h-[44px]'));
  assert.ok(html.includes('xl:grid-cols-12'));
});

test('AirQualityForm renders accessible labels, valid aria-describedby references, and error summary', () => {
  const htmlNoErrors = renderToStaticMarkup(
    createElement(AirQualityForm, {
      formValues: DEFAULT_USER_INPUT,
      manualAqiText: '',
      serverErrors: {},
      isSubmitting: false,
      isCheckingAqi: false,
      useLiveLookup: true,
      cityInputRef: { current: null },
      onChangeValues: () => {},
      onChangeManualAqiText: () => {},
      onSubmit: () => {},
      onCheckAqiOnly: () => {},
      onReset: () => {},
    }),
  );

  // Verify every aria-describedby reference resolves to an existing id in the rendered markup
  const describedByMatches = [...htmlNoErrors.matchAll(/aria-describedby="([^"]+)"/g)];
  assert.ok(describedByMatches.length >= 3);
  for (const match of describedByMatches) {
    const ids = match[1].split(/\s+/);
    for (const id of ids) {
      assert.ok(
        htmlNoErrors.includes(`id="${id}"`),
        `Referenced aria-describedby id "${id}" not found in form HTML`,
      );
    }
  }

  assert.ok(htmlNoErrors.includes('aria-required="true"'));
  assert.ok(htmlNoErrors.includes('Reset Form'));
  assert.ok(htmlNoErrors.includes('Generate Personalized Guidance'));

  const htmlWithErrors = renderToStaticMarkup(
    createElement(AirQualityForm, {
      formValues: DEFAULT_USER_INPUT,
      manualAqiText: '999',
      serverErrors: {
        city: 'Enter a valid city or location name (at least 2 letters).',
        manualAqi: 'Manual AQI must be between 0 and 500.',
      },
      isSubmitting: false,
      isCheckingAqi: false,
      useLiveLookup: true,
      cityInputRef: { current: null },
      onChangeValues: () => {},
      onChangeManualAqiText: () => {},
      onSubmit: () => {},
      onCheckAqiOnly: () => {},
      onReset: () => {},
    }),
  );

  assert.ok(htmlWithErrors.includes('role="alert"'));
  assert.ok(htmlWithErrors.includes('id="city-error"'));
  assert.ok(htmlWithErrors.includes('id="manual-aqi-error"'));
});

test('GuidanceResults renders sequential heading levels, all required sections, and escapes untrusted HTML', () => {
  const rawAdverse = {
    ...buildSampleGuidance(),
    summary: '<script>alert("xss")</script>Winter smog overview',
  };
  const validated = validateAiGuidanceResponse(rawAdverse);
  assert.ok(validated.valid && validated.data);

  const html = renderToStaticMarkup(
    createElement(GuidanceResults, {
      guidance: validated.data,
      conciseMode: false,
    }),
  );

  // Verify no raw script tags appear
  assert.equal(html.includes('<script>'), false);
  assert.ok(html.includes('Winter smog overview'));

  // Verify sequential heading hierarchy (no h2 -> h4 jump)
  const headingLevels = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  assert.ok(headingLevels.length > 0);
  for (let i = 1; i < headingLevels.length; i += 1) {
    const prev = headingLevels[i - 1];
    const curr = headingLevels[i];
    assert.ok(
      curr - prev <= 1,
      `Skipped heading level detected: h${prev} followed by h${curr}`,
    );
  }

  // Verify core sections & non-color priority text
  assert.ok(html.includes('Low-Emission Daily Action Plan'));
  assert.ok(html.includes('Indoor Air-Quality Improvement'));
  assert.ok(html.includes('Sustainable Mobility'));
  assert.ok(html.includes('Environmental Impact'));
  assert.ok(html.includes('Safety Guidance'));
  assert.ok(html.includes('Medical disclaimer:'));
  assert.ok(html.includes('High priority'));
  assert.ok(html.includes('Medium priority'));
  assert.ok(html.includes('Low priority'));
});

test('PollutionStatusPanel distinguishes live, manual, and unavailable AQI states honestly', () => {
  const unavailableHtml = renderToStaticMarkup(
    createElement(PollutionStatusPanel, {
      city: 'Unknown City',
      manualAqi: null,
      liveAqi: {
        status: 'unavailable',
        source: null,
        resolvedLocation: null,
        usAqi: null,
        pm25: null,
        pm10: null,
        observedAt: null,
        unitLabel: null,
        note: 'Live air-quality data unavailable.',
      },
      effectiveAqi: null,
      aqiSourceType: 'none',
      generatedAt: null,
    }),
  );

  assert.ok(unavailableHtml.includes('AQI Not Specified'));
  assert.ok(unavailableHtml.includes('Live data unavailable · Precautionary'));

  const liveHtml = renderToStaticMarkup(
    createElement(PollutionStatusPanel, {
      city: 'Lahore',
      manualAqi: null,
      liveAqi: {
        status: 'available',
        source: 'Open-Meteo Air Quality API',
        resolvedLocation: 'Lahore, Punjab, Pakistan',
        usAqi: 235,
        pm25: 225.4,
        pm10: 227.2,
        observedAt: '2026-11-25T20:00 UTC',
        unitLabel: 'US AQI',
        note: 'Regional estimate.',
      },
      effectiveAqi: 235,
      aqiSourceType: 'live',
      generatedAt: '2026-11-25T20:05:00.000Z',
    }),
  );

  assert.ok(liveHtml.includes('235 US AQI'));
  assert.ok(liveHtml.includes('Very Unhealthy'));
  assert.ok(liveHtml.includes('Open-Meteo Air Quality API'));
  assert.ok(liveHtml.includes('PM2.5: 225.4 µg/m³'));
});

test('DashboardSkeleton and PreferencesPanel render accessible loading and switch attributes', () => {
  const skeletonHtml = renderToStaticMarkup(createElement(DashboardSkeleton));
  assert.ok(skeletonHtml.includes('role="status"'));
  assert.ok(skeletonHtml.includes('aria-busy="true"'));

  const prefsHtml = renderToStaticMarkup(
    createElement(PreferencesPanel, {
      preferences: DEFAULT_PREFERENCES,
      onChangePreferences: () => {},
      onResetPreferences: () => {},
    }),
  );

  assert.ok(prefsHtml.includes('role="switch"'));
  assert.ok(prefsHtml.includes('aria-checked="true"'));
  assert.ok(prefsHtml.includes('id="pref-live-aqi-label"'));
  assert.ok(prefsHtml.includes('aria-labelledby="pref-live-aqi-label"'));
  assert.ok(prefsHtml.includes('id="pref-live-aqi-desc"'));
  assert.ok(prefsHtml.includes('aria-describedby="pref-live-aqi-desc"'));
});
