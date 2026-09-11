import { Skeleton } from "@/components/ui/Skeleton";

// Renders immediately on navigation while the Server Component page fetches
// its data — Next.js swaps this in automatically at the route boundary, so
// the click feels instant instead of waiting on Supabase before painting
// anything (see docs note on navigation performance).
export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full rounded-3xl" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
