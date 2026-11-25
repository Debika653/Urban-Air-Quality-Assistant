import { CalendarClock, Home, Leaf, ShieldCheck } from 'lucide-react';

interface EmptyGuidanceStateProps {
  onFocusForm: () => void;
}

export function EmptyGuidanceState({ onFocusForm }: EmptyGuidanceStateProps) {
  return (
    <section
      aria-labelledby="empty-state-heading"
      className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8"
    >
      <div className="max-w-3xl">
        <h2 id="empty-state-heading" className="text-xl font-semibold text-slate-900">
          Your personalized air-quality action plan will appear here
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Enter your city, optional local AQI reading, commute method, and household setup above, then select{' '}
          <span className="font-semibold text-slate-800">Generate Personalized Guidance</span>. You can also load one of the sample household profiles to preview how recommendations adapt.
        </p>

        <button
          type="button"
          onClick={onFocusForm}
          className="mt-4 inline-flex min-h-[40px] items-center rounded-lg border border-teal-700 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-900 transition-colors hover:bg-teal-100"
        >
          Start with City &amp; Profile Form
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarClock className="h-4 w-4 text-teal-700" aria-hidden="true" />
            <span>Timed Daily Routines</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            Morning, midday, and evening adjustments aligned with winter inversion windows and commute peaks.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Home className="h-4 w-4 text-teal-700" aria-hidden="true" />
            <span>Indoor Air Hacks</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            Filtration, smoke reduction, and safe ventilation timing matched to your actual home equipment.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Leaf className="h-4 w-4 text-teal-700" aria-hidden="true" />
            <span>Sustainable Alternatives</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            Lower-emission travel and heating choices with honest impact explanations and exposure safeguards.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-teal-700" aria-hidden="true" />
            <span>Family Safety Notes</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            Non-diagnostic guidance for children, older adults, and sensitive groups with clear medical boundaries.
          </p>
        </div>
      </div>
    </section>
  );
}
