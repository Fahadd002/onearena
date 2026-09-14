'use client';

import QueryProviders from "@/providers/QueryProvider";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/context/ThemeContext";

export default function RootLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
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
