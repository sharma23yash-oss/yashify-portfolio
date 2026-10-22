import type { NextConfig } from "next";

// The e-mail box of the Newsletters tab posts to NEXT_PUBLIC_NEWSLETTER_ENDPOINT (see app/page.tsx).
// Only that address may be reached by fetch(); without the variable nothing is added to the policy.
// A Google Apps Script web app answers from script.googleusercontent.com after a redirect, so that
// host is allowed alongside script.google.com.
function newsletterOrigins(): string[] {
  const raw = process.env.NEXT_PUBLIC_NEWSLETTER_ENDPOINT;
  if (!raw) return [];
  try {
    const url = new URL(raw);
    const onThisComputer = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && onThisComputer)) return [];
    const origins = [url.origin];
    if (url.hostname === "script.google.com") origins.push("https://script.googleusercontent.com");
    return origins;
  } catch {
    return [];
  }
}

const connectSrc = ["'self'", ...newsletterOrigins()].join(" ");

// This Content Security Policy blocks unauthorized scripts and external assets.
// Allowed on top of 'self': the visitor badge, YouTube thumbnails (i.ytimg.com), and YouTube
// players (youtube-nocookie.com) which the YouTube tab only loads after a click.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://visitor-badge.laobi.icu https://i.ytimg.com;
  font-src 'self';
  connect-src ${connectSrc};
  frame-src https://www.youtube-nocookie.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

const nextConfig: NextConfig = {
  // Tailwind CSS v4 on Turbopack. Without this rule none of the Tailwind classes are generated
  // and the page loads completely unstyled.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\n/g, ""),
          },
          {
            key: "X-Frame-Options",
            value: "DENY", // Prevents clickjacking by blocking other sites from embedding yours
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload", // Forces HTTPS globally
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()", // Blocks unauthorized hardware access
          },
        ],
      },
    ];
  },
};

export default nextConfig;