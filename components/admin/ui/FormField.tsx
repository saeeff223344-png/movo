"use client";

import type { ReactNode } from "react";

export function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-secondary">{label}</span>
      {children}
    </label>
  );
}

const inputClasses =
  "w-full rounded-xl border border-border-subtle bg-base px-3.5 py-2.5 text-sm text-primary placeholder-muted outline-none transition-colors focus:border-brand-400/60";

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  dir,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  dir?: "rtl" | "ltr";
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      dir={dir}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${inputClasses} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`${inputClasses} ${suffix ? "pe-14" : ""}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
  dir,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  dir?: "rtl" | "ltr";
}) {
  return (
    <textarea
      value={value}
      dir={dir}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${inputClasses} resize-none`}
    />
  );
}

export function SelectField<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={inputClasses}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
