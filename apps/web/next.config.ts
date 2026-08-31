import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Legacy scheme is directory-style: /g/cat/region/ is canonical (matches the
  // proxy 301s and the legacy /g/ URLs; links and sitemap emit trailing slashes).
  trailingSlash: true,
  transpilePackages: ["@prisma/client"],
};

export default nextConfig;
