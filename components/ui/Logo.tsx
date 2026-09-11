import Link from "next/link";
import { Clapperboard } from "lucide-react";

export function Logo({
  className = "",
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-accent-500 text-white shadow-lg shadow-brand-600/30">
        <Clapperboard className="size-5" strokeWidth={2.5} />
      </span>
      <span className="text-lg font-extrabold tracking-tight text-primary">
        MOVO
      </span>
    </Link>
  );
}
