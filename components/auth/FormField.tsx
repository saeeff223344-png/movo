"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  icon: ReactNode;
  name?: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  autoComplete?: string;
};

export function FormField({
  label,
  icon,
  name,
  type = "text",
  placeholder,
  autoComplete,
}: FormFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (visible ? "text" : "password") : type;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-secondary">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute right-3.5 top-1/2 flex -translate-y-1/2 text-muted [&>svg]:size-4.5">
          {icon}
        </span>
        <input
          id={id}
          name={name}
          type={resolvedType}
          required
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-border-subtle bg-surface py-3 pe-11 ps-11 text-sm text-primary placeholder-muted outline-none transition-colors focus:border-brand-400/60 focus:bg-surface-hover"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
            aria-label={visible ? "hide password" : "show password"}
          >
            {visible ? (
              <EyeOff className="size-4.5" />
            ) : (
              <Eye className="size-4.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
