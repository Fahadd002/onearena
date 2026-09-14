import "@/styles.css";
import { Manrope } from "next/font/google";
import QueryProviders from "@/providers/QueryProvider";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "@/components/ui/sonner";

const manrope = Manrope({ weight: ["300", "400", "500", "600", "700", "800"], subsets: ["latin"], display: "swap" });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={manrope.className}>
      <body>
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
