import { AlertTriangle, Check, CheckCircle2, Info } from 'lucide-react';
import { memo } from 'react';
import type { RecommendationItem, RecommendationPriority } from '../shared/airQualitySchema.ts';

interface RecommendationCardProps {
  item: RecommendationItem;
  itemKey?: string;
  categoryLabel?: string;
  headingLevel?: 'h3' | 'h4';
  conciseMode?: boolean;
  completed?: boolean;
  onToggleCompleted?: (key: string) => void;
}

function getPriorityPresentation(priority: RecommendationPriority) {
  switch (priority) {
    case 'high':
      return {
        label: 'High priority',
        textClass: 'text-amber-900',
        icon: <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />,
      };
    case 'low':
      return {
        label: 'Low priority',
        textClass: 'text-slate-700',
        icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden="true" />,
      };
    case 'medium':
    default:
      return {
        label: 'Medium priority',
        textClass: 'text-teal-800',
        icon: <Info className="h-3.5 w-3.5 shrink-0 text-teal-700" aria-hidden="true" />,
      };
  }
}

export const RecommendationCard = memo(function RecommendationCard({
  item,
  itemKey,
  categoryLabel,
  headingLevel = 'h3',
  conciseMode = false,
  completed = false,
  onToggleCompleted,
}: RecommendationCardProps) {
  const priorityMeta = getPriorityPresentation(item.priority);
  const HeadingTag = headingLevel;

  return (
    <article
      className={`flex flex-col justify-between rounded-xl border p-5 transition-colors ${
        completed
          ? 'border-teal-200 bg-teal-50/40'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div>
        {/* Quiet unboxed metadata line */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className={`inline-flex items-center gap-1.5 font-semibold ${priorityMeta.textClass}`}>
            {priorityMeta.icon}
            <span>{priorityMeta.label}</span>
            {categoryLabel && (
              <>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="font-medium text-slate-700">{categoryLabel}</span>
              </>
            )}
          </div>
          <span className="text-slate-600">{item.practicality}</span>
        </div>

        <HeadingTag className="mt-2.5 text-base font-semibold text-slate-900">
          {item.title}
        </HeadingTag>

        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-800">
          {item.action}
        </p>

        {!conciseMode && (
          <dl className="mt-4 space-y-2.5 border-t border-slate-100 pt-3 text-sm">
            <div>
              <dt className="text-xs font-semibold text-slate-600">Why it matters</dt>
              <dd className="mt-0.5 leading-relaxed text-slate-700">{item.reason}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-600">
                Environmental &amp; exposure benefit
              </dt>
              <dd className="mt-0.5 leading-relaxed text-slate-700">{item.impact}</dd>
            </div>
            {item.limitation && (
              <div>
                <dt className="text-xs font-semibold text-slate-600">Limitation / safety note</dt>
                <dd className="mt-0.5 leading-relaxed text-slate-600">{item.limitation}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {onToggleCompleted && itemKey && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => onToggleCompleted(itemKey)}
            aria-pressed={completed}
            aria-label={`${completed ? 'Mark as not done' : 'Mark as done today'}: ${item.title}`}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              completed
                ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{completed ? 'Completed today' : 'Mark as done today'}</span>
          </button>
        </div>
      )}
    </article>
  );
});
