import { LoaderCircle } from "lucide-react";

type PageLoaderProps = { label?: string };

export default function PageLoader({ label = "Loading OneArena..." }: PageLoaderProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground" aria-live="polite">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LoaderCircle className="h-7 w-7 animate-spin" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
    </main>
  );
}
