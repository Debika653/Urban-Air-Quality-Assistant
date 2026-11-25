import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyAqiBand,
  MAX_CITY_LENGTH,
  MAX_HOUSEHOLD_LENGTH,
  sanitizeText,
  validateAiGuidanceResponse,
  validateUserProfileInput,
} from '../src/shared/airQualitySchema.ts';

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

test('validateUserProfileInput rejects empty and whitespace-only city', () => {
  const emptyRes = validateUserProfileInput({
    city: '',
    commuteMethod: 'public_transit',
    outdoorHabits: 'short_errands',
    mainConcern: 'winter_smog',
  });
  assert.equal(emptyRes.valid, false);
  assert.ok(emptyRes.errors.city);

  const spaceRes = validateUserProfileInput({
    city: '    ',
    commuteMethod: 'public_transit',
    outdoorHabits: 'short_errands',
    mainConcern: 'winter_smog',
  });
  assert.equal(spaceRes.valid, false);
  assert.ok(spaceRes.errors.city);
});

test('validateUserProfileInput enforces maximum lengths on city and household notes', () => {
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
});

test('validateUserProfileInput validates manual AQI bounds and rejects non-integers', () => {
  for (const invalidAqi of [-1, 501, 12.5, 'abc', '999']) {
    const res = validateUserProfileInput({
      city: 'Delhi',
      manualAqi: invalidAqi,
      commuteMethod: 'public_transit',
      outdoorHabits: 'short_errands',
      mainConcern: 'winter_smog',
    });
    assert.equal(res.valid, false, `Expected ${String(invalidAqi)} to be rejected`);
    assert.ok(res.errors.manualAqi);
  }

  for (const validAqi of [0, 500, '185', '']) {
    const res = validateUserProfileInput({
      city: 'Delhi',
      manualAqi: validAqi,
      commuteMethod: 'public_transit',
      outdoorHabits: 'short_errands',
      mainConcern: 'winter_smog',
    });
    assert.equal(res.valid, true, `Expected ${String(validAqi)} to be accepted`);
  }
});

test('sanitizeText strips HTML angle brackets and control characters', () => {
  const dirty = '<script>alert(1)</script>Salt Lake\u0000\nCity';
  const cleaned = sanitizeText(dirty, 80);
  assert.equal(cleaned.includes('<'), false);
  assert.equal(cleaned.includes('>'), false);
  assert.equal(cleaned.includes('\u0000'), false);
  assert.ok(cleaned.includes('Salt Lake City'));
});

test('validateAiGuidanceResponse accepts valid structured JSON and rejects missing sections', () => {
  const validPayload = buildValidAiPayload();
  const validRes = validateAiGuidanceResponse(validPayload);
  assert.equal(validRes.valid, true);
  assert.ok(validRes.data);

  const missingSection = { ...validPayload, indoor_air_quality: [] };
  const invalidRes = validateAiGuidanceResponse(missingSection);
  assert.equal(invalidRes.valid, false);
  assert.ok(invalidRes.error);

  assert.equal(validateAiGuidanceResponse(null).valid, false);
  assert.equal(validateAiGuidanceResponse('plain text').valid, false);
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
