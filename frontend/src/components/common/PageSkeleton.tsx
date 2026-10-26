import { Skeleton } from "@/components/ui/skeleton";

type PageSkeletonProps = {
  variant?: "page" | "dashboard";
};

export default function PageSkeleton({ variant = "page" }: PageSkeletonProps) {
  const isDashboard = variant === "dashboard";

  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading page">
      <div className="flex min-h-screen">
        {isDashboard && (
          <aside className="hidden w-[240px] shrink-0 border-r border-border/60 bg-sidebar p-5 lg:block">
            <Skeleton className="h-10 w-36 rounded-xl" />
            <div className="mt-10 space-y-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          </aside>
        )}

        <div className="flex-1">
          {isDashboard && (
            <div className="h-16 border-b border-border/60 bg-background/80 px-6 flex items-center gap-3">
              <Skeleton className="h-8 w-48 rounded-md" />
              <Skeleton className="h-8 w-12 rounded-full" />
            </div>
          )}

          <main
            className={`mx-auto w-full ${isDashboard ? "max-w-(--breakpoint-2xl) p-4 md:p-6" : "max-w-7xl p-4 py-10 sm:px-6"}`}
          >
            {/* Title + subtitle */}
            <div className="space-y-4">
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="h-4 w-64 max-w-full rounded-md" />
              <Skeleton className="h-3 w-96 max-w-full rounded-md" />
            </div>

            {/* Meta row */}
            <div className="mt-6 flex gap-4 flex-wrap">
              <Skeleton className="h-10 w-40 rounded-lg" />
              <Skeleton className="h-10 w-40 rounded-lg" />
              <Skeleton className="h-10 w-40 rounded-lg" />
            </div>

            {/* Card section */}
            <div className="mt-8 space-y-6">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>

            {/* Table section */}
            <div className="mt-8 space-y-6">
              <TableSkeleton />
            </div>

            {/* Bottom cards */}
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <CardSkeleton className="h-48" />
              <CardSkeleton className="h-48" />
              <CardSkeleton className="h-48" />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className="rounded-xl border border-border/60 bg-card p-6 shadow-sm space-y-4"
    >
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/3 rounded-md" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border border-border/40 bg-muted/40 p-4">
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="mt-2 h-3 w-3/4 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              {[...Array(6)].map((_, i) => (
                <th key={i} className="px-4 py-3 text-left font-medium text-muted-foreground">
                  <Skeleton className="h-3 w-20 rounded-md" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, rowIdx) => (
              <tr key={`row-${rowIdx}`} className="border-b border-border/40">
                {[...Array(6)].map((_, cellIdx) => (
                  <td key={`${rowIdx}-${cellIdx}`} className="px-4 py-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24 rounded-md" />
                      <Skeleton className="h-3 w-32 rounded-md" />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
