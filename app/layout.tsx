import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const siteDescription =
  "Side-by-side benchmark UI for comparing open models on Fireworks and Together AI with streaming outputs, latency metrics, and throughput summaries.";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  
  metadataBase: new URL("https://provider-benchmark.vercel.app/"),
  title: {
    default: "Provider Benchmark",
    template: "%s | Provider Benchmark",
  },
  description: siteDescription,
  applicationName: "Provider Benchmark",
  keywords: [
    "LLM benchmark",
    "Fireworks AI",
    "Together AI",
    "open models",
    "TTFT",
    "tokens per second",
    "latency benchmark",
  ],
  authors: [{ name: "Provider Benchmark" }],
  creator: "Provider Benchmark",
  publisher: "Provider Benchmark",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "Provider Benchmark",
    description: siteDescription,
    siteName: "Provider Benchmark",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Provider Benchmark side-by-side LLM latency comparison dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Provider Benchmark",
    description: siteDescription,
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#7C3AED",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
