import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  scope: "/app",
  sw: "service-worker.js",
});

const nextConfig: NextConfig = {
  output: 'standalone', // Required for Cloud Run
  serverExternalPackages: ['@e2b/code-interpreter'],
  typescript: {
    ignoreBuildErrors: true, // Bypass TypeScript errors to deploy faster
  },
};

// export default nextConfig;
export default withPWA(nextConfig);
