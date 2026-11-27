import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (and partialPrefetching, which builds on it) are off: OpenNext warns they are
  // not fully supported on Cloudflare yet (opennextjs-cloudflare PR #1318). Revisit when it lands.
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

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
