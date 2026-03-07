interface CheckboxOption {
  id: string;
  label: string;
  description?: string;
}

interface CheckboxGroupProps {
  label?: string;
  hint?: string;
  options: CheckboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
  columns?: 1 | 2;
}

export default function CheckboxGroup({
  label,
  hint,
  options,
  value,
  onChange,
  columns = 2,
}: CheckboxGroupProps) {
  function toggle(id: string) {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id]
    );
  }

  return (
    <div className="w-full">
      {label && (
        <p className="block text-xs font-medium text-neutral-500 uppercase tracking-widest mb-2">
          {label}
        </p>
      )}
      <div
        className={`grid gap-1.5 ${
          columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {options.map((opt) => {
          const checked = value.includes(opt.id);
          return (
            <label
              key={opt.id}
              className={`flex items-start gap-2.5 px-3 py-2.5 rounded border cursor-pointer transition select-none ${
                checked
                  ? "border-neutral-400 bg-neutral-50"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(opt.id)}
                className="mt-0.5 accent-neutral-900 shrink-0"
              />
              <div>
                <p className={`text-sm ${checked ? "text-neutral-900 font-medium" : "text-neutral-700"}`}>
                  {opt.label}
                </p>
                {opt.description && (
                  <p className="text-xs text-neutral-400 mt-0.5">{opt.description}</p>
                )}
              </div>
            </label>
          );
        })}
      </div>
      {hint && (
        <p className="mt-1.5 text-xs text-neutral-400">{hint}</p>
      )}
    </div>
  );
}
