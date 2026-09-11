import { AlertCircle } from "lucide-react";

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-red-400">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
