import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: "CacheFirst" as const,
      options: {
        cacheName: "static-images",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: "CacheFirst" as const,
      options: {
        cacheName: "next-static",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /\/api\/articles\??.*/i,
      handler: "StaleWhileRevalidate" as const,
      options: {
        cacheName: "article-api",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // next-pwa v5 uses webpack plugins; opt into webpack for production builds
  // where service worker generation is needed. Turbopack is used in dev.
  turbopack: {},
};

export default withPWA(nextConfig);
