import { Skeleton } from "@/components/ui/skeleton";

export function ContactSkeleton() {
  return (
    <main className="pb-20 pt-24" aria-busy="true" aria-label="Loading contact page">
      <header className="relative overflow-hidden border-b border-border bg-surface/40">
        <div className="absolute inset-0 bg-flood" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-10 w-3/4 max-w-xl sm:h-12" />
          <Skeleton className="mt-4 h-4 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-4 w-2/3 max-w-xl" />
          <Skeleton className="mt-8 h-14 w-full max-w-md rounded-2xl" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="surface-card rounded-2xl p-5">
              <Skeleton className="size-5 rounded-md" />
              <Skeleton className="mt-4 h-5 w-28" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-4/5" />
              <Skeleton className="mt-4 h-4 w-40" />
            </div>
          ))}
        </section>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="surface-card rounded-2xl p-6">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="mt-3 h-3 w-full" />
            <div className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-9 rounded-md" />
                <Skeleton className="h-9 rounded-md" />
              </div>
              <Skeleton className="h-9 rounded-md" />
              <Skeleton className="h-32 rounded-md" />
              <Skeleton className="h-11 w-40 rounded-lg" />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="surface-card rounded-2xl p-6">
              <Skeleton className="h-6 w-36" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-full" />
                ))}
              </div>
            </div>
            <div className="surface-card rounded-2xl p-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="mt-4 h-3 w-full" />
              <div className="mt-4 flex gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-28 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}