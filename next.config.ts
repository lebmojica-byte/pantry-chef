import type { NextConfig } from "next";

// Static export for GitHub Pages (https://lebmojica-byte.github.io/pantry-chef/).
// No server: auth runs in the browser, recipes come from the Supabase Edge Function,
// and the CSP is a <meta> tag added after the build by scripts/csp.mjs.
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NODE_ENV === "production" ? "/pantry-chef" : "",
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
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
