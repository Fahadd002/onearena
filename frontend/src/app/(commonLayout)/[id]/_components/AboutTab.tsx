import Image from "next/image";
import { Sparkles } from "lucide-react";

import { getFileUrl } from "@/lib/utils";
import type { OwnerLandingPage } from "@/types/owner-landing.type";

function HighlightIcon({ icon }: { icon: string | null }) {
  if (!icon) return null;
  const resolved = getFileUrl(icon);
  if (resolved) {
    return (
      <img
        src={resolved}
        alt=""
        aria-hidden
        className="size-5 shrink-0 object-contain"
      />
    );
  }
  return (
    <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/15 text-[10px] font-black text-primary">
      {icon.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function AboutTab({ data }: { data: OwnerLandingPage }) {
  const about = data.about;
  const announcements = [
    ...(data.pinnedNotice ? [data.pinnedNotice] : []),
    ...data.notices,
  ];
  const pinned = data.pinnedNotice;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-7">
      {/* Ambient accent glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-amber-400/5 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {about?.heading || "About the Business"}
          </h2>
        </div>

        {about ? (
          <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,40%)] lg:items-start">
            <div>
              {/* Body */}
              <div>
                <p className="whitespace-pre-line text-base leading-8 text-foreground/90">
                  {about.body}
                </p>
              </div>

              {/* Highlights row */}
              {about.highlights?.length && (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {about.highlights.map((h, i) => (
                    <div
                      key={i}
                      className="group relative overflow-hidden rounded-xl border border-border/60 bg-muted/40 p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/10 transition-colors group-hover:bg-primary/15">
                          <HighlightIcon icon={h.icon} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black leading-tight text-foreground">
                            {h.value}
                          </p>
                          <p className="truncate text-[11px] font-medium text-muted-foreground">
                            {h.label}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Announcements feed */}
              {announcements.length > 0 && (
                <div className="mt-6 space-y-3">
                  {announcements.map((a) => {
                    const isPinned = a.id === pinned?.id;
                    return (
                      <div
                        key={a.id}
                        className="group relative overflow-hidden rounded-xl border-l-4 border-y border-border/60 bg-background/60 p-3.5 transition-all duration-300 hover:border-l-primary/70 hover:border-border hover:shadow-sm open:border-l-primary open:border-primary/25 open:bg-muted/20"
                        style={
                          isPinned
                            ? {
                                borderLeftColor: "hsl(var(--primary))",
                                borderLeftWidth: "4px",
                                background:
                                  "linear-gradient(90deg, hsl(var(--primary) / 0.12), hsl(var(--card)) 30%)",
                              }
                            : undefined
                        }
                      >
                        {isPinned && (
                          <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary-foreground">
                            Pinned
                          </span>
                        )}
                        <p className="pr-14 text-sm font-bold text-foreground">{a.title}</p>
                        <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                          {a.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {about.imageUrl && (
              <div className="relative overflow-hidden rounded-xl ring-1 ring-border/60">
                <div className="relative aspect-[4/3]">
                  <Image
                    src={getFileUrl(about.imageUrl) ?? ""}
                    alt={about.heading}
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover transition-transform duration-[900ms] ease-out hover:scale-[1.03]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            This owner has not added a business description yet.
          </p>
        )}
      </div>
    </div>
  );
}