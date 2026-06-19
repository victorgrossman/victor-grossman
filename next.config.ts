import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // Domain redirects (apex → www) are handled in Vercel Domains settings.
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.imagekit.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "victorgrossmansberlinbulletin.wordpress.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.wordpress.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "bilder.deutschlandfunk.de",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
