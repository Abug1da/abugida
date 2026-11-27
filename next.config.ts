import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off for now: /lessons reads the session outside <Suspense> so logged-out
  // visitors get a real 307. Turning it on means moving that check into proxy.ts first.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
