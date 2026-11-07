import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import FestiveLayer from "@/components/festive/FestiveLayer";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";

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
 * SITE_URL (lib/site.ts) is the address the share tags, the preview image and the canonical
 * tag point to. The canonical tag tells Google that yashify.tech is the real address, so the
 * same site on yashify-portfolio.vercel.app is not counted as a duplicate. A page with its own
 * address (such as /newsletters) sets its own canonical.
 */

const TITLE = "Yash Sharma | Equity Research & Financial Modeling";
// Keep it under about 155 characters; apps cut longer text.
const DESCRIPTION =
  "Builds 3-statement and DCF models in Excel; writes a 1,000+ subscriber research newsletter on Indian markets. MBA 2027 (Finance & Marketing), MANIT Bhopal.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
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

/**
 * Structured data (schema.org Person): tells Google and AI search who this site is about, so a
 * search for the name can show the right profile and links. Keep it to facts that are on the page.
 */
const PERSON_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Yash Sharma",
  url: SITE_URL,
  image: `${SITE_URL}/image.png`,
  email: "mailto:sharma23yash@gmail.com",
  description:
    "MBA (Finance & Marketing) student at MANIT Bhopal, graduating 2027, focused on equity research and financial modeling.",
  affiliation: { "@type": "CollegeOrUniversity", name: "Maulana Azad National Institute of Technology (MANIT), Bhopal" },
  alumniOf: [
    { "@type": "CollegeOrUniversity", name: "University Institute of Technology, RGPV" },
    { "@type": "CollegeOrUniversity", name: "Makhanlal Chaturvedi National University (MCU), Bhopal" },
  ],
  knowsAbout: [
    "Equity research",
    "Financial modeling",
    "DCF valuation",
    "Three-statement modeling",
    "Portfolio optimization",
    "Excel",
    "Python",
    "SQL",
    "Power BI",
  ],
  sameAs: [
    "https://www.linkedin.com/in/yaashify",
    "https://github.com/sharma23yash-oss",
    "https://youtube.com/@YASHifyfinance",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          // `<` is escaped so the data can never close the script tag early.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(PERSON_JSON_LD).replace(/</g, "\\u003c") }}
        />
        {children}
        {/* Diwali effects: client-only, loaded after the page, switch themselves off after FESTIVE_END_DATE. */}
        <FestiveLayer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
