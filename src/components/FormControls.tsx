interface SelectFieldProps<T extends string> {
  id: string;
  name: string;
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
}

export function SelectField<T extends string>({
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

interface ChecklistFieldsetProps<T extends string> {
  legend: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: readonly T[];
  columns?: 1 | 2;
  onToggle: (option: T) => void;
}

export function ChecklistFieldset<T extends string>({
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
