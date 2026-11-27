import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off for now: /lessons reads the session outside <Suspense> so logged-out
  // visitors get a real 307. Turning it on means moving that check into proxy.ts first.
  // One canonical host: Better Auth only accepts its BETTER_AUTH_URL origin, so www must not serve the app.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.theabugida.org" }],
        destination: "https://theabugida.org/:path*",
        permanent: true,
      },
    ];
  },
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
