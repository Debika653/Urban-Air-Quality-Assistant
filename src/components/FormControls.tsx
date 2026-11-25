import { memo, type ReactNode, type RefObject } from 'react';

interface TextInputFieldProps {
  id: string;
  name: string;
  label: string;
  labelBadge?: string;
  required?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  type?: 'text';
  inputMode?: 'text' | 'numeric';
  maxLength: number;
  showCounter?: boolean;
  value: string;
  placeholder: string;
  helpText: string;
  error?: string;
  monospace?: boolean;
  actionSlot?: ReactNode;
  onChange: (value: string) => void;
}

function TextInputFieldImpl({
  id,
  name,
  label,
  labelBadge,
  required = false,
  inputRef,
  type = 'text',
  inputMode,
  maxLength,
  showCounter = false,
  value,
  placeholder,
  helpText,
  error,
  monospace = false,
  actionSlot,
  onChange,
}: TextInputFieldProps) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-slate-900">
          {label}{' '}
          {labelBadge && (
            <span className={required ? 'text-teal-800' : 'font-normal text-slate-600'}>
              {labelBadge}
            </span>
          )}
        </label>
        {showCounter && (
          <span className="font-mono text-xs tabular-nums text-slate-600">
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      <div className={actionSlot ? 'mt-1.5 flex gap-2' : 'mt-1.5'}>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={type}
          inputMode={inputMode}
          required={required}
          aria-required={required ? 'true' : undefined}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${helpId} ${errorId}` : helpId}
          className={`block min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 ${
            monospace ? 'font-mono tabular-nums placeholder:font-sans' : ''
          } ${error ? 'border-red-500 bg-red-50/40' : 'border-slate-300 bg-white'}`}
        />
        {actionSlot}
      </div>

      <p id={helpId} className="mt-1 text-xs text-slate-600">
        {helpText}
      </p>
      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export const TextInputField = memo(TextInputFieldImpl);

interface SelectFieldProps<T extends string> {
  id: string;
  name: string;
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
}

function SelectFieldImpl<T extends string>({
  id,
  name,
  label,
  value,
  options,
  labels,
  onChange,
}: SelectFieldProps<T>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-900">
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="mt-1.5 block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </div>
  );
}

export const SelectField = memo(SelectFieldImpl) as typeof SelectFieldImpl;

interface ChecklistFieldsetProps<T extends string> {
  legend: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: readonly T[];
  columns?: 1 | 2;
  onToggle: (option: T) => void;
}

function ChecklistFieldsetImpl<T extends string>({
  legend,
  options,
  labels,
  selected,
  columns = 1,
  onToggle,
}: ChecklistFieldsetProps<T>) {
  return (
    <fieldset className="rounded-lg border border-slate-200 p-4">
      <legend className="px-1 text-sm font-medium text-slate-900">
        {legend} <span className="font-normal text-slate-600">(Optional)</span>
      </legend>
      <div
        className={`mt-2 grid grid-cols-1 gap-2 ${
          columns === 2 ? 'sm:grid-cols-2' : ''
        }`}
      >
        {options.map((option) => {
          const checked = selected.includes(option);
          return (
            <label
              key={option}
              className="flex min-h-[40px] cursor-pointer items-center gap-2.5 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(option)}
                className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
              />
              <span>{labels[option]}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export const ChecklistFieldset = memo(ChecklistFieldsetImpl) as typeof ChecklistFieldsetImpl;
