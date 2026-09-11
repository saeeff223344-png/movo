import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const VARIANT_CLASSES = {
  primary:
    "bg-gradient-to-l from-brand-500 to-accent-500 text-white shadow-lg shadow-brand-600/30 hover:shadow-brand-500/50 hover:brightness-110",
  outline:
    "border border-border-strong text-primary hover:bg-surface-hover",
  ghost: "text-secondary hover:text-primary hover:bg-surface-hover",
  dark: "bg-inverse text-on-inverse hover:brightness-110",
  light: "bg-white text-brand-700 shadow-xl shadow-black/20 hover:bg-white/90",
  danger: "bg-red-500 text-white shadow-lg shadow-red-600/30 hover:brightness-110",
} as const;

const SIZE_CLASSES = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-[15px]",
  lg: "px-8 py-4 text-base",
} as const;

type ButtonOwnProps = {
  variant?: keyof typeof VARIANT_CLASSES;
  size?: keyof typeof SIZE_CLASSES;
  href?: string;
  children: ReactNode;
  className?: string;
};

type ButtonProps = ButtonOwnProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof ButtonOwnProps>;

export function Button({
  variant = "primary",
  size = "md",
  href,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none disabled:active:scale-100 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
