/**
 * Small, accessible form controls used across the app.
 *
 * Each one is a native element underneath (radio group, range input, checkbox) so keyboard
 * support, screen-reader labels and large touch targets come for free.
 */
import type { ReactNode } from 'react';

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  className = '',
}: {
  label: string;
  value: T;
  options: Array<{ id: T; label: string; description?: string }>;
  onChange: (value: T) => void;
  hint?: string;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="mb-1.5 text-sm font-semibold text-ink">{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={option.description}
              onClick={() => onChange(option.id)}
              className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                active
                  ? 'border-transparent bg-brand text-[color:var(--sb-brand-ink)]'
                  : 'border-line bg-surface text-ink-soft hover:bg-surface-2'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
    </fieldset>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  hint,
  id,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  hint?: string;
  id?: string;
}) {
  const inputId = id ?? `range-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-semibold text-ink">
          {label}
        </label>
        <output htmlFor={inputId} className="text-xs font-semibold text-ink-soft tabular-nums">
          {format ? format(value) : value}
        </output>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 h-11 w-full accent-[var(--sb-brand)]"
      />
      {hint ? <p className="text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
  description?: string;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2">
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint ? <span className="block text-xs text-ink-soft">{description ?? hint}</span> : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-line transition-colors checked:bg-brand relative before:absolute before:top-0.5 before:left-0.5 before:h-5 before:w-5 before:rounded-full before:bg-surface before:transition-transform checked:before:translate-x-5"
      />
    </label>
  );
}

export function Fieldset({
  legend,
  children,
  hint,
}: {
  legend: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <section className="card-flat">
      <h2 className="text-base font-bold text-ink">{legend}</h2>
      {hint ? <p className="mt-1 mb-3 text-sm text-ink-soft">{hint}</p> : <div className="mt-3" />}
      <div className="space-y-3">{children}</div>
    </section>
  );
}
