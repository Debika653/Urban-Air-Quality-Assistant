import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyAqiBand,
  MAX_CITY_LENGTH,
  MAX_HOUSEHOLD_LENGTH,
  parseManualAqiInput,
  sanitizeText,
  validateAiGuidanceResponse,
  validateCityName,
  validateLiveAqiReading,
  validateUserProfileInput,
} from '../src/shared/airQualitySchema.ts';
import { DEFAULT_PREFERENCES, loadPreferences } from '../src/utils/preferences.ts';

function buildValidAiPayload() {
  const sampleItem = {
    title: 'Shift outdoor errands to early afternoon',
    action: 'Run grocery and pharmacy errands between 13:00 and 15:00 when inversion mixing is higher.',
    reason: 'Cold morning and evening air traps vehicle and heating particulates near street level.',
    impact: 'Reduces peak PM2.5 inhalation exposure without increasing vehicle mileage.',
    priority: 'high',
    practicality: 'Schedule adjustment · No cost',
  };
  return {
    summary: 'Severe winter smog requires minimizing outdoor exertion and keeping indoor air sealed.',
    pollution_context: 'Winter inversions hold particulate matter near the ground during calm nights.',
    morning_actions: [sampleItem],
    midday_actions: [sampleItem],
    evening_actions: [sampleItem],
    indoor_air_quality: [sampleItem],
    sustainable_alternatives: [sampleItem],
    environmental_impact: [sampleItem],
    safety_notes: ['Monitor children and older adults for coughing or shortness of breath.'],
    data_limitations: ['General precautionary guidance does not replace local station alerts.'],
  };
}

test('validateUserProfileInput accepts valid minimal input with missing optional fields', () => {
  const result = validateUserProfileInput({
    city: 'Lahore',
    commuteMethod: 'public_transit',
    outdoorHabits: 'short_errands',
    mainConcern: 'winter_smog',
  });

  assert.equal(result.valid, true);
  assert.ok(result.sanitized);
  assert.equal(result.sanitized.city, 'Lahore');
  assert.equal(result.sanitized.manualAqi, null);
  assert.equal(result.sanitized.householdContext, '');
  assert.deepEqual(result.sanitized.indoorResources, []);
  assert.deepEqual(result.sanitized.sustainabilityGoals, []);
});

test('validateUserProfileInput rejects empty, whitespace-only, and unexpected types', () => {
  for (const badPayload of [null, undefined, 'string', [], 42]) {
    const res = validateUserProfileInput(badPayload);
    assert.equal(res.valid, false);
    assert.ok(res.errors.general);
  }

  for (const badCity of ['', '    ', '12345', '!!!', null, 999, ['Delhi']]) {
    const res = validateUserProfileInput({
      city: badCity,
      commuteMethod: 'public_transit',
      outdoorHabits: 'short_errands',
      mainConcern: 'winter_smog',
    });
    assert.equal(res.valid, false);
    assert.ok(res.errors.city);
  }
});

test('validateUserProfileInput enforces maximum lengths and deduplicates optional checklists', () => {
  const longCity = 'A'.repeat(MAX_CITY_LENGTH + 1);
  const resCity = validateUserProfileInput({
    city: longCity,
    commuteMethod: 'public_transit',
    outdoorHabits: 'short_errands',
    mainConcern: 'winter_smog',
  });
  assert.equal(resCity.valid, false);
  assert.ok(resCity.errors.city);

  const longHousehold = 'B'.repeat(MAX_HOUSEHOLD_LENGTH + 1);
  const resHousehold = validateUserProfileInput({
    city: 'Milan',
    householdContext: longHousehold,
    commuteMethod: 'public_transit',
    outdoorHabits: 'short_errands',
    mainConcern: 'winter_smog',
  });
  assert.equal(resHousehold.valid, false);
  assert.ok(resHousehold.errors.householdContext);

  const validDedup = validateUserProfileInput({
    city: 'Milan',
    commuteMethod: 'public_transit',
    outdoorHabits: 'short_errands',
    mainConcern: 'winter_smog',
    indoorResources: ['hepa_purifier', 'hepa_purifier', 'invalid_item'],
    sustainabilityGoals: ['reduce_car_trips', 'reduce_car_trips', 123],
  });
  assert.equal(validDedup.valid, true);
  assert.deepEqual(validDedup.sanitized?.indoorResources, ['hepa_purifier']);
  assert.deepEqual(validDedup.sanitized?.sustainabilityGoals, ['reduce_car_trips']);
});

test('parseManualAqiInput validates bounds and rejects non-integers and special types', () => {
  for (const invalidAqi of [-1, 501, 12.5, 'abc', '999', Number.NaN, Number.POSITIVE_INFINITY]) {
    const res = parseManualAqiInput(invalidAqi);
    assert.equal(res.valid, false, `Expected ${String(invalidAqi)} to be rejected`);
    assert.ok(res.error);
  }

  for (const [input, expected] of [
    [0, 0],
    [500, 500],
    ['185', 185],
    ['', null],
    [null, null],
    [undefined, null],
  ] as const) {
    const res = parseManualAqiInput(input);
    assert.equal(res.valid, true);
    assert.equal(res.value, expected);
  }
});

test('sanitizeText strips HTML angle brackets, control characters, and invisible bidi/zero-width chars', () => {
  const dirty = '<script>alert(1)</script>Salt\u202E Lake\u200B\u0000\nCity';
  const cleaned = sanitizeText(dirty, 80);
  assert.equal(cleaned.includes('<'), false);
  assert.equal(cleaned.includes('>'), false);
  assert.equal(cleaned.includes('\u0000'), false);
  assert.equal(cleaned.includes('\u202E'), false);
  assert.equal(cleaned.includes('\u200B'), false);
  assert.ok(cleaned.includes('Salt Lake City'));
});

test('validateCityName validates city boundaries consistently', () => {
  assert.equal(validateCityName('São Paulo').valid, true);
  assert.equal(validateCityName('a').valid, false);
  assert.equal(validateCityName('1234').valid, false);
});

test('validateAiGuidanceResponse accepts valid JSON, sanitizes angle brackets, and rejects malformed payloads', () => {
  const validPayload = buildValidAiPayload();
  const validRes = validateAiGuidanceResponse(validPayload);
  assert.equal(validRes.valid, true);
  assert.ok(validRes.data);

  const htmlPayload = {
    ...validPayload,
    summary: '<b>Stay indoors</b> during winter smog.',
  };
  const sanitizedRes = validateAiGuidanceResponse(htmlPayload);
  assert.equal(sanitizedRes.valid, true);
  assert.equal(sanitizedRes.data?.summary.includes('<'), false);

  const missingSection = { ...validPayload, indoor_air_quality: [] };
  assert.equal(validateAiGuidanceResponse(missingSection).valid, false);
  assert.equal(validateAiGuidanceResponse(null).valid, false);
  assert.equal(validateAiGuidanceResponse('plain text').valid, false);
});

test('validateLiveAqiReading validates provider status and clamps AQI', () => {
  assert.equal(validateLiveAqiReading(null), null);
  assert.equal(validateLiveAqiReading({ status: 'unknown_status' }), null);

  const valid = validateLiveAqiReading({
    status: 'available',
    source: 'Open-Meteo',
    resolvedLocation: 'Delhi, India',
    usAqi: 750,
    pm25: 92.4,
    pm10: 110.1,
    observedAt: '2026-11-25T12:00 UTC',
    unitLabel: 'US AQI',
    note: 'Grid model',
  });
  assert.ok(valid);
  assert.equal(valid.usAqi, 500);
});

test('classifyAqiBand maps all EPA ranges and unknown state accurately', () => {
  assert.equal(classifyAqiBand(null).severity, 'unknown');
  assert.equal(classifyAqiBand(30).severity, 'good');
  assert.equal(classifyAqiBand(75).severity, 'moderate');
  assert.equal(classifyAqiBand(125).severity, 'sensitive');
  assert.equal(classifyAqiBand(175).severity, 'unhealthy');
  assert.equal(classifyAqiBand(250).severity, 'very_unhealthy');
  assert.equal(classifyAqiBand(350).severity, 'hazardous');
});

test('loadPreferences returns defaults safely in non-browser environment', () => {
  assert.deepEqual(loadPreferences(), DEFAULT_PREFERENCES);
});
