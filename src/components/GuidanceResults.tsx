import {
  AlertCircle,
  Bike,
  CalendarClock,
  Home,
  Leaf,
  ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  AiGuidanceResponse,
  RecommendationItem,
  RecommendationPriority,
} from '../shared/airQualitySchema.ts';
import { RecommendationCard } from './RecommendationCard.tsx';

interface GuidanceResultsProps {
  guidance: AiGuidanceResponse;
  conciseMode: boolean;
}

type DayPeriodFilter = 'all' | 'morning' | 'midday' | 'evening';
type PriorityFilter = 'all' | RecommendationPriority;

interface TaggedDailyItem {
  key: string;
  period: 'morning' | 'midday' | 'evening';
  periodLabel: string;
  item: RecommendationItem;
}

export function GuidanceResults({ guidance, conciseMode }: GuidanceResultsProps) {
  const [periodFilter, setPeriodFilter] = useState<DayPeriodFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});

  const allDailyItems = useMemo<TaggedDailyItem[]>(() => {
    return [
      ...guidance.morning_actions.map((item, idx) => ({
        key: `morning-${idx}-${item.title}`,
        period: 'morning' as const,
        periodLabel: 'Morning',
        item,
      })),
      ...guidance.midday_actions.map((item, idx) => ({
        key: `midday-${idx}-${item.title}`,
        period: 'midday' as const,
        periodLabel: 'Midday',
        item,
      })),
      ...guidance.evening_actions.map((item, idx) => ({
        key: `evening-${idx}-${item.title}`,
        period: 'evening' as const,
        periodLabel: 'Evening',
        item,
      })),
    ];
  }, [guidance]);

  const filteredDailyItems = useMemo(() => {
    return allDailyItems.filter((entry) => {
      if (periodFilter !== 'all' && entry.period !== periodFilter) {
        return false;
      }
      if (priorityFilter !== 'all' && entry.item.priority !== priorityFilter) {
        return false;
      }
      return true;
    });
  }, [allDailyItems, periodFilter, priorityFilter]);

  const completedCount = useMemo(() => {
    return allDailyItems.filter((entry) => completedMap[entry.key]).length;
  }, [allDailyItems, completedMap]);

  const toggleItemCompleted = (key: string) => {
    setCompletedMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-10">
      {/* Section 2: Air-Quality Guidance Overview */}
      <section
        id="air-quality-guidance"
        aria-labelledby="guidance-summary-heading"
        className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <h2 id="guidance-summary-heading" className="text-xl font-semibold text-slate-900">
          Personalized Air-Quality Guidance
        </h2>
        <p className="mt-3 text-base leading-relaxed text-slate-800">{guidance.summary}</p>

        <div className="mt-5 grid grid-cols-1 gap-5 border-t border-slate-200 pt-5 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Local Pollution &amp; Winter Smog Context
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
              {guidance.pollution_context}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Data Scope &amp; Measurement Limitations
            </h3>
            <ul className="mt-1.5 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
              {guidance.data_limitations.map((note, idx) => (
                <li key={`limitation-${idx}-${note.slice(0, 24)}`}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Section 3: Daily Action Plan */}
      <section id="daily-plan" aria-labelledby="daily-plan-heading" className="scroll-mt-20">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-teal-700" aria-hidden="true" />
              <h2 id="daily-plan-heading" className="text-xl font-semibold text-slate-900">
                Low-Emission Daily Action Plan
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Timed guidance across morning, midday, and evening to reduce exposure and household emissions.
            </p>
          </div>
          <p
            role="status"
            aria-live="polite"
            className="font-mono text-xs font-medium tabular-nums text-slate-700"
          >
            Showing {filteredDailyItems.length} of {allDailyItems.length} actions · {completedCount} completed today
          </p>
        </div>

        {/* Interactive Filter Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Filter daily actions by time of day"
            className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1"
          >
            {(
              [
                ['all', 'All Periods'],
                ['morning', 'Morning'],
                ['midday', 'Midday'],
                ['evening', 'Evening'],
              ] as const
            ).map(([value, label]) => {
              const active = periodFilter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriodFilter(value)}
                  aria-pressed={active}
                  className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div
            role="group"
            aria-label="Filter daily actions by priority"
            className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1"
          >
            {(
              [
                ['all', 'All Priorities'],
                ['high', 'High'],
                ['medium', 'Medium'],
                ['low', 'Low'],
              ] as const
            ).map(([value, label]) => {
              const active = priorityFilter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPriorityFilter(value)}
                  aria-pressed={active}
                  className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {filteredDailyItems.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-sm text-slate-600">
              No daily actions match the selected time and priority filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setPeriodFilter('all');
                setPriorityFilter('all');
              }}
              className="mt-3 inline-flex min-h-[40px] items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Show All Daily Actions
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDailyItems.map((entry) => (
              <RecommendationCard
                key={entry.key}
                item={entry.item}
                categoryLabel={entry.periodLabel}
                headingLevel="h3"
                conciseMode={conciseMode}
                completed={Boolean(completedMap[entry.key])}
                onToggleCompleted={() => toggleItemCompleted(entry.key)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Section 4: Indoor Air-Quality Improvement */}
      <section id="indoor-air" aria-labelledby="indoor-air-heading" className="scroll-mt-20">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
          <Home className="h-5 w-5 text-teal-700" aria-hidden="true" />
          <div>
            <h2 id="indoor-air-heading" className="text-xl font-semibold text-slate-900">
              Indoor Air-Quality Improvement
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Practical filtration, source-reduction, and dust-control strategies tailored to your indoor setup.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {guidance.indoor_air_quality.map((item, idx) => (
            <RecommendationCard
              key={`indoor-${idx}-${item.title}`}
              item={item}
              categoryLabel="Indoor air"
              headingLevel="h3"
              conciseMode={conciseMode}
            />
          ))}
        </div>
      </section>

      {/* Section 5 & 6: Sustainable Mobility & Environmental Impact */}
      <section id="mobility-impact" aria-labelledby="mobility-heading" className="scroll-mt-20 space-y-8">
        <div>
          <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
            <Bike className="h-5 w-5 text-teal-700" aria-hidden="true" />
            <div>
              <h2 id="mobility-heading" className="text-xl font-semibold text-slate-900">
                Sustainable Mobility &amp; Lifestyle Alternatives
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">
                Lower-emission choices where safety and exposure protection always come first.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {guidance.sustainable_alternatives.map((item, idx) => (
              <RecommendationCard
                key={`sustain-${idx}-${item.title}`}
                item={item}
                categoryLabel="Sustainable choice"
                headingLevel="h3"
                conciseMode={conciseMode}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
            <Leaf className="h-5 w-5 text-teal-700" aria-hidden="true" />
            <div>
              <h3 className="text-xl font-semibold text-slate-900">
                Environmental Impact &amp; Choice Trade-offs
              </h3>
              <p className="mt-0.5 text-sm text-slate-600">
                How your travel, heating, and household decisions influence local emissions and personal exposure.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {guidance.environmental_impact.map((item, idx) => (
              <RecommendationCard
                key={`impact-${idx}-${item.title}`}
                item={item}
                categoryLabel="Impact mechanism"
                headingLevel="h4"
                conciseMode={conciseMode}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Section 7: Responsible Safety Guidance */}
      <section
        aria-labelledby="safety-guidance-heading"
        className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
          <ShieldCheck className="h-5 w-5 text-teal-700" aria-hidden="true" />
          <div>
            <h2 id="safety-guidance-heading" className="text-xl font-semibold text-slate-900">
              Safety Guidance &amp; Health Precautions
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              General pollution precaution guidance for families, children, and older adults.
            </p>
          </div>
        </div>

        <ul className="mt-4 space-y-3">
          {guidance.safety_notes.map((note, idx) => (
            <li
              key={`safety-${idx}-${note.slice(0, 24)}`}
              className="flex items-start gap-3 text-sm leading-relaxed text-slate-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
              <span>{note}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
          <strong className="font-semibold text-slate-900">Medical disclaimer:</strong>{' '}
          CleanAir Companion provides general environmental guidance and does not diagnose medical conditions or replace professional medical advice. If anyone in your household experiences persistent coughing, wheezing, shortness of breath, dizziness, or chest discomfort, seek prompt care from a qualified healthcare professional.
        </div>
      </section>
    </div>
  );
}
