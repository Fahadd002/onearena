"use client";

import {
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

import { getFileUrl } from "@/lib/utils";
import type { ContentStudioData } from "../_types";

export function LandingPreview({
  data,
  ownerName,
  companyName,
  businessLogo,
  isVerified,
}: {
  data: ContentStudioData;
  ownerName: string;
  companyName: string | null;
  businessLogo: string | null;
  isVerified: boolean;
}) {
  const { hero, about, contact, faqs, gallery, blogs, announcements, social } =
    data;

  const activeAnnouncements = announcements.filter((a) => a.isActive);
  const pinned = activeAnnouncements.find((a) => a.pinned);
  const activeGallery = gallery.filter((g) => g.active);
  const publishedBlogs = blogs.filter((b) => b.published);
  const activeFaqs = faqs.filter((f) => f.isActive);
  const activeSocial = social.filter((s) => s.isActive);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
      {/* ─── Pinned banner ─── */}
      {pinned && (
        <div
          className={`px-4 py-2 text-center text-xs font-medium ${
            pinned.type === "WARNING"
              ? "bg-destructive/10 text-destructive"
              : pinned.type === "PROMO"
                ? "bg-primary/10 text-primary"
                : "bg-secondary text-secondary-foreground"
          }`}
        >
          <span className="font-semibold">{pinned.title}</span>
          <span className="mx-2 opacity-60">·</span>
          {pinned.message}
        </div>
      )}

      {/* ─── HERO ─── */}
      <section
        className="relative flex min-h-[320px] items-center justify-center overflow-hidden"
        style={{
          backgroundImage: hero?.coverImage
            ? `url(${getFileUrl(hero.coverImage)})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {!hero?.coverImage && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-background" />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: `rgba(0,0,0,${(hero?.overlayOpacity ?? 40) / 100})`,
          }}
        />
        <div
          className={`relative z-10 max-w-xl px-6 py-10 ${
            hero?.textAlign === "LEFT"
              ? "mr-auto text-left"
              : hero?.textAlign === "RIGHT"
                ? "ml-auto text-right"
                : "text-center"
          }`}
        >
          {isVerified && (
            <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
              ✓ Verified
            </span>
          )}
          <h1 className="text-2xl font-bold text-white drop-shadow sm:text-3xl">
            {hero?.headline || "Your headline goes here"}
          </h1>
          {hero?.subheadline && (
            <p className="mt-2 text-sm text-white/85">{hero.subheadline}</p>
          )}
        </div>
      </section>

      {/* ─── ABOUT ─── */}
      {about?.isVisible && (
        <section className="grid gap-6 p-6 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-xl font-bold">{about.heading}</h2>
            <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground">
              {about.body || "Your story appears here."}
            </p>
          </div>
          {about.imageUrl && (
            <div className="overflow-hidden rounded-xl border border-border">
              <img
                src={getFileUrl(about.imageUrl) ?? ""}
                alt={about.heading}
                className="h-40 w-full object-cover"
              />
            </div>
          )}
        </section>
      )}

      {/* ─── GALLERY ─── */}
      {activeGallery.length > 0 && (
        <section className="border-t border-border p-6">
          <h2 className="text-lg font-bold">Gallery</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {activeGallery.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="aspect-square overflow-hidden rounded-lg bg-muted"
              >
                <img
                  src={getFileUrl(item.imageUrl) ?? ""}
                  alt={item.title ?? ""}
                  className="size-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── STORIES ─── */}
      {publishedBlogs.length > 0 && (
        <section className="border-t border-border p-6">
          <h2 className="text-lg font-bold">Latest Stories</h2>
          <div className="mt-3 space-y-3">
            {publishedBlogs.slice(0, 3).map((blog) => (
              <div
                key={blog.id}
                className="flex gap-3 rounded-lg border border-border p-3"
              >
                {blog.coverImage && (
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <img
                      src={getFileUrl(blog.coverImage) ?? ""}
                      alt=""
                      className="size-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{blog.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {blog.content.slice(0, 100)}…
                  </p>
                  {blog.readMinutes && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      <Clock className="mr-1 inline size-2.5" />
                      {blog.readMinutes} min read
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── FAQ ─── */}
      {activeFaqs.length > 0 && (
        <section className="border-t border-border p-6">
          <h2 className="text-lg font-bold">Frequently Asked</h2>
          <div className="mt-3 space-y-2">
            {activeFaqs.slice(0, 4).map((faq) => (
              <details
                key={faq.id}
                className="rounded-lg border border-border bg-card p-3"
              >
                <summary className="cursor-pointer text-xs font-semibold">
                  {faq.question}
                </summary>
                <p className="mt-2 text-xs text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* ─── CONTACT ─── */}
      {contact?.isVisible && (
        <section className="border-t border-border bg-muted/30 p-6">
          <h2 className="text-lg font-bold">{contact.heading}</h2>
          <div className="mt-3 grid gap-2 text-xs">
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="size-3.5 text-primary" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail className="size-3.5 text-primary" />
                <span>{contact.email}</span>
              </div>
            )}
            {contact.address && (
              <div className="flex items-center gap-2">
                <MapPin className="size-3.5 text-primary" />
                <span>{contact.address}</span>
              </div>
            )}
            {contact.openingHours && (
              <div className="flex items-center gap-2">
                <Clock className="size-3.5 text-primary" />
                <span>{contact.openingHours}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── ANNOUNCEMENTS (non-pinned) ─── */}
      {activeAnnouncements.filter((a) => !a.pinned).length > 0 && (
        <section className="border-t border-border p-6">
          <h2 className="text-lg font-bold">Notices</h2>
          <div className="mt-3 space-y-2">
            {activeAnnouncements
              .filter((a) => !a.pinned)
              .map((a) => (
                <div
                  key={a.id}
                  className={`rounded-lg border p-3 text-xs ${
                    a.type === "WARNING"
                      ? "border-destructive/30 bg-destructive/5"
                      : a.type === "PROMO"
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-card"
                  }`}
                >
                  <p className="font-semibold">{a.title}</p>
                  <p className="mt-0.5 text-muted-foreground">{a.message}</p>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* ─── SOCIAL ─── */}
      {activeSocial.length > 0 && (
        <section className="border-t border-border p-4">
          <div className="flex flex-wrap justify-center gap-2">
            {activeSocial.map((s) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-[10px] font-medium capitalize transition-colors hover:bg-muted"
              >
                <ExternalLink className="size-2.5" />
                {s.platform}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border bg-muted/50 p-4 text-center text-[10px] text-muted-foreground">
        {businessLogo && (
          <img
            src={getFileUrl(businessLogo) ?? ""}
            alt=""
            className="mx-auto mb-2 size-8 rounded object-cover"
          />
        )}
        <p className="font-semibold">{companyName ?? ownerName}</p>
        <p className="mt-0.5">Powered by Turf Platform</p>
      </footer>
    </div>
  );
}