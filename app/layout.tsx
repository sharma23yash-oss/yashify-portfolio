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

/**
 * What LinkedIn, WhatsApp, Slack, X and Google show when this site is shared or searched.
 * The preview picture is drawn by app/opengraph-image.tsx; Next.js adds its og:image and
 * twitter:image tags by itself.
 *
 * Next.js also copies a page's title and description into og:title, og:description,
 * twitter:title and twitter:description. So the portfolio gets the words below, and a page
 * with its own title and description (such as /news) gets those, with nothing else to set.
 *
 * SITE_URL is the address the share tags and the preview image point to: the one people
 * should land on when they open a shared link. Change this one line if the site moves.
 */
const SITE_URL = "https://yashify.tech";

const TITLE = "Yash Sharma | Equity Research & Financial Modeling";
// Keep it under about 155 characters; apps cut longer text.
const DESCRIPTION =
  "Builds 3-statement and DCF models in Excel; writes a 1,000+ subscriber research newsletter on Indian markets. MBA 2027 (Finance & Marketing), MANIT Bhopal.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  authors: [{ name: "Yash Sharma", url: "https://www.linkedin.com/in/yaashify" }],
  openGraph: {
    type: "website",
    siteName: "Yash Sharma · Portfolio",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
