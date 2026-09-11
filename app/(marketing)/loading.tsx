import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-5 py-20 sm:px-8">
      <Skeleton className="mx-auto h-10 w-2/3 rounded-xl" />
      <Skeleton className="mx-auto h-4 w-1/2 rounded-lg" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="aspect-[4/5] rounded-2xl" />
        <Skeleton className="aspect-[4/5] rounded-2xl" />
        <Skeleton className="hidden aspect-[4/5] rounded-2xl lg:block" />
      </div>
    </div>
  );
}
