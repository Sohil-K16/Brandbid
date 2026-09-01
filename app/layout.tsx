import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BrandBid.me — How High Can Your Brand Climb?",
  description:
    "A public leaderboard where brands and startups compete for ranking based on how much they pay. The higher you bid, the higher you rank.",
  keywords: [
    "BrandBid",
    "startup leaderboard",
    "brand rankings",
    "indie hackers",
    "public advertising",
    "brand marketing",
  ],
  authors: [{ name: "BrandBid" }],
  openGraph: {
    title: "BrandBid.me — How High Can Your Brand Climb?",
    description:
      "The public leaderboard where websites compete for ranking. The higher you bid, the higher you rank.",
    url: "https://brandbid.me",
    siteName: "BrandBid.me",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BrandBid.me — How High Can Your Brand Climb?",
    description: "The higher you bid, the higher you rank.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground selection:bg-black selection:text-white">
        <Header />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
