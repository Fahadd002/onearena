import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const columns = [
  {
    title: "Play",
    links: ["Football turfs", "Cricket turfs", "Nearby venues", "Popular in Dhaka"],
  },
  {
    title: "Owners",
    links: ["List your turf", "Owner dashboard", "Commission & payouts", "Owner support"],
  },
  {
    title: "Company",
    links: ["About OneArena", "Careers", "Contact", "Blog"],
  },
  {
    title: "Legal",
    links: ["Terms of service", "Privacy policy", "Cancellation policy", "Refund policy"],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface/40">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
                <ShieldCheck className="size-5" />
              </span>
              <span className="font-display text-2xl">OneArena</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Bangladesh&apos;s turf booking marketplace. Find, book and play — with instant
              confirmation and fair pricing.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="font-display text-lg tracking-wide text-foreground">{column.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link}>
                    <span className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-primary">
                      {link}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} OneArena. All rights reserved.</p>
          <p>Prices shown in Bangladeshi Taka (৳). Advance payment secured.</p>
        </div>
      </div>
    </footer>
  );
}
