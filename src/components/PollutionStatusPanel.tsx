import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Info,
  ShieldAlert,
} from 'lucide-react';
import {
  classifyAqiBand,
  type LiveAqiReading,
} from '../shared/airQualitySchema.ts';

interface PollutionStatusPanelProps {
  city: string;
  manualAqi: number | null;
  liveAqi: LiveAqiReading | null;
  effectiveAqi: number | null;
  aqiSourceType: 'live' | 'manual' | 'none';
  generatedAt: string | null;
}

function renderBandIcon(severity: ReturnType<typeof classifyAqiBand>['severity']) {
  switch (severity) {
    case 'good':
      return <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />;
    case 'moderate':
      return <Info className="h-5 w-5 shrink-0" aria-hidden="true" />;
    case 'sensitive':
    case 'unhealthy':
      return <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />;
    case 'very_unhealthy':
    case 'hazardous':
      return <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />;
    default:
      return <CloudOff className="h-5 w-5 shrink-0" aria-hidden="true" />;
  }
}

export function PollutionStatusPanel({
  city,
  manualAqi,
  liveAqi,
  effectiveAqi,
  aqiSourceType,
  generatedAt,
}: PollutionStatusPanelProps) {
  const band = classifyAqiBand(effectiveAqi);

  return (
    <aside
      aria-labelledby="pollution-status-heading"
      className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 id="pollution-status-heading" className="text-lg font-semibold text-slate-900">
            Air-Quality Data &amp; Availability
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            {city ? `Selected location: ${city}` : 'No location submitted yet'}
          </p>
        </div>
      </div>

      {/* Primary AQI Band Display */}
      <div
        className={`mt-4 rounded-lg border p-4 ${band.surfaceClass} ${band.borderClass} ${band.textClass}`}
      >
        <div className="flex items-start gap-3">
          {renderBandIcon(band.severity)}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-base font-semibold">{band.label}</span>
              <span className="font-mono text-lg font-bold tabular-nums">
                {effectiveAqi !== null ? `${effectiveAqi} US AQI` : 'No reading'}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium opacity-90">{band.range}</p>
            <p className="mt-2 text-sm leading-relaxed">{band.guidanceCue}</p>
          </div>
        </div>
      </div>

      {/* Provenance & Measurement Breakdown */}
      <dl className="mt-4 divide-y divide-slate-100 text-sm">
        <div className="flex items-baseline justify-between gap-3 py-2.5">
          <dt className="text-slate-600">Active data basis</dt>
          <dd className="text-right font-medium text-slate-900">
            {aqiSourceType === 'manual' && 'User-entered manual AQI'}
            {aqiSourceType === 'live' && 'Live regional API reading'}
            {aqiSourceType === 'none' && 'Live data unavailable · Precautionary'}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-3 py-2.5">
          <dt className="text-slate-600">Live provider status</dt>
          <dd className="text-right font-medium text-slate-900">
            {!liveAqi && 'Not checked yet'}
            {liveAqi?.status === 'available' && 'Available'}
            {liveAqi?.status === 'unavailable' && 'Unavailable'}
            {liveAqi?.status === 'disabled' && 'Paused in settings'}
            {liveAqi?.status === 'error' && 'Lookup failed / timed out'}
          </dd>
        </div>

        {liveAqi?.status === 'available' && (
          <>
            <div className="flex items-baseline justify-between gap-3 py-2.5">
              <dt className="text-slate-600">Source</dt>
              <dd className="text-right text-xs font-medium text-slate-800">
                {liveAqi.source}
              </dd>
            </div>

            {liveAqi.resolvedLocation && (
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-slate-600">Matched coordinates</dt>
                <dd className="text-right text-xs font-medium text-slate-800">
                  {liveAqi.resolvedLocation}
                </dd>
              </div>
            )}

            <div className="flex items-baseline justify-between gap-3 py-2.5">
              <dt className="text-slate-600">Particulate matter</dt>
              <dd className="text-right font-mono text-xs tabular-nums text-slate-900">
                {liveAqi.pm25 !== null ? `PM2.5: ${liveAqi.pm25} µg/m³` : 'PM2.5: —'}
                {' · '}
                {liveAqi.pm10 !== null ? `PM10: ${liveAqi.pm10} µg/m³` : 'PM10: —'}
              </dd>
            </div>

            {liveAqi.observedAt && (
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-slate-600">Observation time</dt>
                <dd className="text-right font-mono text-xs tabular-nums text-slate-800">
                  {liveAqi.observedAt}
                </dd>
              </div>
            )}
          </>
        )}

        {manualAqi !== null && (
          <div className="flex items-baseline justify-between gap-3 py-2.5">
            <dt className="text-slate-600">Manual AQI entered</dt>
            <dd className="text-right font-mono text-xs font-semibold tabular-nums text-slate-900">
              {manualAqi} US AQI (unverified user input)
            </dd>
          </div>
        )}

        {generatedAt && (
          <div className="flex items-baseline justify-between gap-3 py-2.5">
            <dt className="text-slate-600">Plan generated</dt>
            <dd className="text-right font-mono text-xs tabular-nums text-slate-700">
              {new Date(generatedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </dd>
          </div>
        )}
      </dl>

      {liveAqi?.note && (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          {liveAqi.note}
        </p>
      )}

      {/* Regional AQI & Winter Inversion Note */}
      <div className="mt-4 border-t border-slate-200 pt-4">
        <h3 className="text-xs font-semibold text-slate-900">
          Why readings vary across neighborhoods
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Different countries report AQI on different scales (for example US EPA vs. EU CAQI or India NAQI). During cold winter thermal inversions, calm air traps wood smoke, heating exhaust, and traffic particles near street level, so busy corridors often experience sharper peaks than regional city averages show.
        </p>
      </div>
    </aside>
  );
}
