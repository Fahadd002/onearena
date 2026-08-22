import type { Metadata } from "next";

import "../src/styles.css";

export const metadata: Metadata = {
  title: "OneArena - Turf Booking Marketplace",
  description:
    "OneArena is a multi-vendor marketplace for booking football and cricket turfs in Bangladesh.",
  authors: [{ name: "OneArena" }],
  openGraph: {
    title: "OneArena - Turf Booking Marketplace",
    description:
      "OneArena is a multi-vendor marketplace for booking football and cricket turfs in Bangladesh.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
