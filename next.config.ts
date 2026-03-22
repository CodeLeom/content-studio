import type { NextConfig } from "next";

/**
 * Do not set `"type": "module"` in package.json. It can make the production server
 * bundle resolve chunks as `./331.js` instead of `./chunks/331.js` → runtime crash.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
