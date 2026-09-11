"use client";

import { Search } from "lucide-react";

export function SearchBox({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border-subtle bg-surface py-2.5 pe-4 ps-9 text-sm text-primary placeholder-muted outline-none transition-colors focus:border-brand-400/60"
      />
    </div>
  );
}
