import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't let `next dev` write an AGENTS.md file into the repo.
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
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
