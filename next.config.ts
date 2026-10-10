import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const TURNSTILE = "https://challenges.cloudflare.com";

/**
 * Allowlist CSP without nonces (nonces would force every page to render
 * dynamically): scripts, styles, fonts, frames and connections only from us and
 * the few services we use. Clinic themes load Google Fonts; the booking form
 * may load Cloudflare Turnstile.
 */
function csp(frameAncestors: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${TURNSTILE}${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' ${TURNSTILE}${isDev ? " ws: wss:" : ""}`,
    `frame-src ${TURNSTILE}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const securityHeaders = [
  // Nothing but the embed may be framed (clickjacking on the dashboard).
  { key: "Content-Security-Policy", value: csp("'none'") },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // PGlite ships WASM + data files that must be loaded from node_modules at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Later rules win for the same key: the widget is meant to be framed by any clinic site.
      { source: "/embed/:path*", headers: [{ key: "Content-Security-Policy", value: csp("*") }] },
      // Loaded on every page of every clinic site: cache it, but let updates through within the hour.
      { source: "/embed.js", headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }] },
    ];
  },
};

export default nextConfig;
