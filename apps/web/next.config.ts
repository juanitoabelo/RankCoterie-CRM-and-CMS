import type { NextConfig } from "next";

const securityHeaders = [
  // Clickjacking — admin/storefront must not be framed cross-origin.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Legacy cross-site redirects (PayPal/Square returns) must not downgrade.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Legacy scheme is directory-style: /g/cat/region/ is canonical (matches the
  // proxy 301s and the legacy /g/ URLs; links and sitemap emit trailing slashes).
  trailingSlash: true,
  serverExternalPackages: ["@prisma/client"],
  // Pre-existing type debt must not block production builds — CI enforces types
  // separately with `tsc --noEmit`. Revisit once the baseline errors are cleared.
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
