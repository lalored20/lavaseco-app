import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  scope: "/app",
  sw: "service-worker.js",
});

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['@e2b/code-interpreter'],
};

// export default nextConfig;
export default withPWA(nextConfig);
