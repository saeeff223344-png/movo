"use client";

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors disabled:opacity-40 ${
        checked ? "justify-end bg-brand-500" : "justify-start bg-surface-hover"
      }`}
    >
      <span className="size-4.5 rounded-full bg-white shadow transition-transform" />
    </button>
  );
}
