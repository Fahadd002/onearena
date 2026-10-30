import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface/40">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <p className="font-medium">© 2026 OneArena. All rights reserved.</p>
        <p className="font-medium">
          Developed and maintained by{" "}
          <Link
            href="https://onersystems.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Oner Systems Ltd.
          </Link>
        </p>
      </div>
    </footer>
  );
}