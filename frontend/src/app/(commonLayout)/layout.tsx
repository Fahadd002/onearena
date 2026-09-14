import { SiteFooter } from "@/layout/site-footer";
import { SiteHeader } from "@/layout/site-header";


export default function CommonLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="bg-background">{children}</main>
      <SiteFooter />
    </div>
  );
}
