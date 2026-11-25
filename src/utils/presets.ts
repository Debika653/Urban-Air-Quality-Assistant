import type { UserProfileInput } from '../shared/airQualitySchema.ts';

export interface ScenarioPreset {
  id: string;
  label: string;
  description: string;
  input: UserProfileInput;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'winter-smog-family',
    label: 'Winter Smog · Family Transit',
    description: 'High winter inversion episode with school-age child and older adult.',
    input: {
      city: 'Lahore',
      manualAqi: 215,
      commuteMethod: 'public_transit',
      householdContext: 'Household with a 7-year-old child and an older grandparent',
      outdoorHabits: 'short_errands',
      mainConcern: 'winter_smog',
      indoorResources: ['exhaust_fans', 'window_seals'],
      sustainabilityGoals: ['reduce_car_trips', 'clean_heating_cooking'],
      seasonMode: 'severe_winter_smog',
      useLiveLookup: true,
    },
  },
  {
    id: 'urban-commute-emissions',
    label: 'Urban Haze · Solo Commuter',
    description: 'Testing live lookup and shifting away from solo driving.',
    input: {
      city: 'Mexico City',
      manualAqi: null,
      commuteMethod: 'car_solo',
      householdContext: 'Two working adults in a fourth-floor apartment near an arterial road',
      outdoorHabits: 'daily_exercise',
      mainConcern: 'lowering_emissions',
      indoorResources: ['hepa_purifier', 'exhaust_fans'],
      sustainabilityGoals: ['reduce_car_trips', 'community_carpool', 'energy_saving'],
      seasonMode: 'general_urban_haze',
      useLiveLookup: true,
    },
  },
  {
    id: 'valley-inversion-indoor',
    label: 'Valley Inversion · Indoor Care',
    description: 'Cold valley smog trapping PM2.5 with sensitive household members.',
    input: {
      city: 'Salt Lake City',
      manualAqi: 142,
      commuteMethod: 'mixed',
      householdContext: 'Family working from home part-time with mild seasonal breathing sensitivity',
      outdoorHabits: 'minimal',
      mainConcern: 'indoor_air',
      indoorResources: ['merv_hvac', 'air_monitor'],
      sustainabilityGoals: ['energy_saving', 'clean_heating_cooking'],
      seasonMode: 'severe_winter_smog',
      useLiveLookup: true,
    },
  },
];
