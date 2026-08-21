import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product photos live in Vercel Blob (public access). Each store gets a
    // random `<id>.public.blob.vercel-storage.com` host, so this is wide
    // enough to survive re-provisioning the store without a config change.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
