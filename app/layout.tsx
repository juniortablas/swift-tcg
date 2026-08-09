import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteName = "Swift TCG";
const siteTitle =
  "Swift TCG | Japanese Pokémon & One Piece Trading Cards";
const siteDescription =
  "Shop authentic Japanese Pokémon and One Piece trading cards. Factory sealed booster boxes, premium collections, weekly imports, and official products shipped from the USA.";

export const metadata: Metadata = {
  metadataBase: new URL("https://swifttcg.com"),
  title: siteTitle,
  description: siteDescription,
  applicationName: siteName,
  category: "ecommerce",
  keywords: [
    "Japanese Pokémon cards",
    "One Piece TCG",
    "Japanese trading cards",
    "Pokémon TCG Japan",
    "One Piece Card Game",
    "factory sealed booster boxes",
    "Japanese TCG imports",
    "Swift TCG",
  ],
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName,
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
