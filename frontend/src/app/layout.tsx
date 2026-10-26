import "@/styles.css";
import { Inter } from "next/font/google";
import QueryProviders from "@/providers/QueryProvider";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import { Metadata } from "next";

const inter = Inter({ weight: ["300", "400", "500", "600", "700", "800", "900"], subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "OneArena",
    template: "%s | OneArena",
  },
  description: "Football Turf Booking Platform",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className={inter.className}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
                  (function() {
                    try {
                      const saved = localStorage.getItem('onearena-theme');
                      const mode = saved === 'light' || saved === 'dark'
                        ? saved
                        : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
                      const root = document.documentElement;
                      root.classList.remove('light', 'dark', 'light-theme', 'dark-theme');
                      root.classList.add(mode, mode + '-theme');
                      root.style.colorScheme = mode;
                    } catch (e) {}
                  })();
                `,
          }}
        />
        <QueryProviders>
          <ThemeProvider>
            {children}
            <Toaster position="top-right" richColors />
          </ThemeProvider>
        </QueryProviders>
      </body>
    </html>
  );
}