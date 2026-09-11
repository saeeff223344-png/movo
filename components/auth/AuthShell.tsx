import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-16">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
      <div className="pointer-events-none absolute -top-32 right-1/2 h-96 w-96 translate-x-1/2 rounded-full bg-brand-600/25 blur-[120px]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo className="justify-center" />
        </div>

        <div className="rounded-3xl border border-border-subtle bg-elevated/80 p-8 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-10">
          <div className="text-center">
            <span className="text-xs font-bold text-brand-400">{eyebrow}</span>
            <h1 className="mt-2 text-2xl font-extrabold text-primary">{title}</h1>
            <p className="mt-2 text-sm text-muted">{description}</p>
          </div>

          <div className="mt-8">{children}</div>
        </div>

        {footer && <p className="mt-6 text-center text-sm text-muted">{footer}</p>}
      </div>
    </div>
  );
}
