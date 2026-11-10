import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  eslint: {
    // Hackathon demo: allow img warnings; prefer-const errors are fixed in source
    ignoreDuringBuilds: false,
  },
}

export default nextConfig
