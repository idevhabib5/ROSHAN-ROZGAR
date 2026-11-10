import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  // Hide the floating Next.js “Issues / N” badge that feels like a cursor hint in demos.
  // Production builds never show it; this keeps local UI closer to production.
  devIndicators: false,
  eslint: {
    // Hackathon demo: allow img warnings; prefer-const errors are fixed in source
    ignoreDuringBuilds: false,
  },
}

export default nextConfig
