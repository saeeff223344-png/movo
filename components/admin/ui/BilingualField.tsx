"use client";

import { TextArea, TextInput } from "@/components/admin/ui/FormField";

export function BilingualField({
  label,
  valueAr,
  valueEn,
  onChangeAr,
  onChangeEn,
  multiline = false,
}: {
  label: string;
  valueAr: string;
  valueEn: string;
  onChangeAr: (value: string) => void;
  onChangeEn: (value: string) => void;
  multiline?: boolean;
}) {
  const Field = multiline ? TextArea : TextInput;

  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-secondary">{label}</span>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className="mb-1 inline-block rounded bg-surface-hover px-1.5 py-0.5 text-[10px] font-bold text-muted">
            AR
          </span>
          <Field value={valueAr} onChange={onChangeAr} dir="rtl" />
        </div>
        <div>
          <span className="mb-1 inline-block rounded bg-surface-hover px-1.5 py-0.5 text-[10px] font-bold text-muted">
            EN
          </span>
          <Field value={valueEn} onChange={onChangeEn} dir="ltr" />
        </div>
      </div>
    </div>
  );
}
