import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Providers from "@/components/common/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: "BuzzCards — Viral News Aggregator",
  description:
    "Stay on top of trending news with AI-powered summaries, emoji reactions, quizzes, and more.",
  applicationName: "BuzzCards",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BuzzCards",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
