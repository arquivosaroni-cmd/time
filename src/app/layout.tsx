import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { FirebaseClientProvider } from "@/firebase";
import { PWAInstallProvider } from "@/hooks/use-pwa-install";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Time",
  description: "Gerenciamento de serviços em tempo real para grupos de trabalho.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Time",
  },
};

export const viewport: Viewport = {
  themeColor: "#14171a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {/* Fallback theme-color meta for older browsers */}
        <meta name="theme-color" content="#14171a" />
      </head>
      <body className={cn("min-h-screen bg-background font-body antialiased flex flex-col", fontSans.variable)}>
        <FirebaseClientProvider>
          <PWAInstallProvider>
            <div className="flex-1 flex flex-col">
              {children}
            </div>
          </PWAInstallProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
