"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, CalendarDays, Mail, MapPin, Phone, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { httpClient } from "@/lib/axios/httpClient";

type OwnerLanding = {
  id: string;
  name: string;
  image?: string | null;
  ownerProfile?: { companyName?: string | null; address?: string | null; businessLogo?: string | null; bussinessEmail?: string | null; contactNumber?: string | null } | null;
  ownedTurfs: Array<{
    id: string;
    name: string;
    address: string;
    description?: string | null;
    basePrice: string | number;
    category: { id: string; name: string };
    images: Array<{ url: string; altText?: string | null }>;
    facilities: Array<{ facility: { id: string; name: string } }>;
    reviews: Array<{ id: string; rating: number; comment: string; user: { name: string; image?: string | null } }>;
  }>;
  ownerGallery: Array<{ id: string; title?: string | null; description?: string | null; imageUrl: string }>;
  ownerBlogs: Array<{ id: string; title: string; excerpt?: string | null; content: string; coverImage?: string | null; publishedAt?: string | null }>;
};

function averageRating(turfs: OwnerLanding["ownedTurfs"]) {
  const reviews = turfs.flatMap((turf) => turf.reviews);
  return reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
}

export default function OwnerLandingPage() {
  const params = useParams<{ ownerId: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["owner-landing", params.ownerId],
    enabled: Boolean(params.ownerId),
    queryFn: async () => {
      const response = await httpClient.get<OwnerLanding>(`/owners/${params.ownerId}/landing`);
      return response.data;
    },
  });

  if (isLoading) return <div className="grid min-h-[70vh] place-items-center text-muted-foreground">Loading venue collection...</div>;
  if (isError || !data) return <div className="grid min-h-[70vh] place-items-center text-muted-foreground">This owner page is unavailable.</div>;

  const profile = data.ownerProfile;
  const rating = averageRating(data.ownedTurfs);
  const heroImage = data.ownerGallery[0]?.imageUrl || data.ownedTurfs[0]?.images[0]?.url;
  const reviewCount = data.ownedTurfs.reduce((count, turf) => count + turf.reviews.length, 0);

  return (
    <div className="min-h-screen bg-background mt-24">
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,hsl(var(--primary)/.18),transparent_36%),linear-gradient(120deg,hsl(var(--background)),hsl(var(--secondary)/.7))]" />
        <div className="relative mx-auto max-w-7xl px-5 pb-14 sm:px-8 lg:px-10 ">
          <div className="grid items-end gap-10 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              {/* <div className="mb-5 flex items-center gap-4">
                <div className="grid size-16 place-items-center overflow-hidden rounded-2xl border border-primary/30 bg-primary/10 text-2xl font-bold text-primary">
                  {(profile?.businessLogo || data.image) ? <img src={profile?.businessLogo || data.image || ""} alt={data.name} className="size-full object-cover" /> : data.name.slice(0, 1)}
                </div>
                <div><p className="text-xs font-semibold uppercase tracking-[.22em] text-primary">Verified venue partner</p><p className="mt-1 text-sm text-muted-foreground">{data.ownedTurfs.length} active venues across the city</p></div>
              </div> */}
              <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">{profile?.companyName || data.name}</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">A complete sports experience by {data.name}. Discover well-kept pitches, flexible slots, and a team that cares about your game.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button variant="hero" size="lg" asChild><a href="#venues">Explore venues <ArrowUpRight className="size-4" /></a></Button>
                <Button variant="outline" size="lg" asChild><a href="#contact">Contact owner</a></Button>
              </div>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-white/10 bg-muted shadow-2xl">
              {heroImage ? <img src={heroImage} alt={`${profile?.companyName || data.name} venue`} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-6xl font-bold text-primary/40">{data.name[0]}</div>}
              <div className="absolute inset-x-4 bottom-4 rounded-xl border border-white/15 bg-black/45 p-4 text-white backdrop-blur-md"><p className="text-xs uppercase tracking-[.18em] text-primary">The home ground</p><p className="mt-1 font-display text-2xl">Made for your next match</p></div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-20 px-5 py-16 sm:px-8 lg:px-10">
        <section id="venues" className="scroll-mt-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.22em] text-primary">The collection</p><h2 className="mt-2 text-4xl font-bold">Choose your ground</h2></div><p className="max-w-md text-sm leading-6 text-muted-foreground">Every active turf, one place. Open a venue to see availability and reserve a slot in a few clicks.</p></div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.ownedTurfs.map((turf) => (
              <article key={turf.id} className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow">
                <Link href={`/turfs/${turf.id}`} className="block"><div className="relative aspect-[4/3] overflow-hidden bg-muted">{turf.images[0]?.url ? <img src={turf.images[0].url} alt={turf.images[0].altText || turf.name} className="size-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid size-full place-items-center text-4xl font-bold text-primary/40">{turf.name[0]}</div>}<Badge className="absolute left-3 top-3 bg-background/85 text-foreground">{turf.category.name}</Badge></div><div className="space-y-3 p-5"><div className="flex items-start justify-between gap-4"><h3 className="text-2xl font-semibold group-hover:text-primary">{turf.name}</h3><span className="flex items-center gap-1 text-sm text-accent"><Star className="size-4 fill-current" />{turf.reviews.length ? (turf.reviews.reduce((sum, review) => sum + review.rating, 0) / turf.reviews.length).toFixed(1) : "New"}</span></div><p className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4" />{turf.address}</p><div className="flex items-center justify-between border-t border-border pt-4"><span className="text-xl font-semibold text-primary">৳{Number(turf.basePrice).toLocaleString()}<small className="ml-1 text-xs font-normal text-muted-foreground">/ hour</small></span><Button size="sm" variant="hero">Book now</Button></div></div></Link>
              </article>
            ))}
          </div>
        </section>

        {data.ownerGallery.length > 0 && <section><div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[.22em] text-primary">Inside the experience</p><h2 className="mt-2 text-4xl font-bold">Gallery</h2></div><div className="grid auto-rows-[180px] grid-cols-2 gap-3 sm:grid-cols-4">{data.ownerGallery.map((item, index) => <figure key={item.id} className={`group relative overflow-hidden rounded-xl ${index === 0 ? "col-span-2 row-span-2" : ""}`}><img src={item.imageUrl} alt={item.title || "Owner gallery"} className="size-full object-cover transition duration-500 group-hover:scale-105" /><figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10 text-sm text-white">{item.title}</figcaption></figure>)}</div></section>}

        {data.ownerBlogs.length > 0 && <section><div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[.22em] text-primary">From the owner</p><h2 className="mt-2 text-4xl font-bold">Stories from the ground</h2></div><div className="grid gap-5 md:grid-cols-3">{data.ownerBlogs.map((blog) => <article key={blog.id} className="overflow-hidden rounded-2xl border border-border bg-card">{blog.coverImage && <img src={blog.coverImage} alt="" className="aspect-[16/9] w-full object-cover" />}<div className="p-5"><p className="text-xs text-muted-foreground">{blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : "OneArena journal"}</p><h3 className="mt-2 text-xl font-semibold">{blog.title}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{blog.excerpt || blog.content}</p></div></article>)}</div></section>}

        <section id="contact" className="grid gap-10 border-t border-border pt-12 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-xs font-semibold uppercase tracking-[.22em] text-primary">Owner notes</p><h2 className="mt-2 text-4xl font-bold">A better match day starts here.</h2><p className="mt-4 leading-7 text-muted-foreground">Questions about a venue, a package, or a recurring booking? Reach the team directly.</p><div className="mt-6 space-y-3 text-sm text-muted-foreground">{profile?.address && <p className="flex items-center gap-2"><MapPin className="size-4 text-primary" />{profile.address}</p>}{profile?.bussinessEmail && <p className="flex items-center gap-2"><Mail className="size-4 text-primary" />{profile.bussinessEmail}</p>}{profile?.contactNumber && <p className="flex items-center gap-2"><Phone className="size-4 text-primary" />{profile.contactNumber}</p>}</div></div><div className="rounded-2xl border border-primary/20 bg-primary/5 p-8"><CalendarDays className="size-8 text-primary" /><h3 className="mt-5 text-2xl font-semibold">Ready to play?</h3><p className="mt-2 text-muted-foreground">Pick a turf above and secure your preferred time before it is gone.</p><Button className="mt-6" variant="hero" asChild><a href="#venues">Find a slot</a></Button></div></section>
      </main>
    </div>
  );
}
