/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use remotePatterns instead of deprecated domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        pathname: '/**',
      },
    ],
  },
  // Security headers for SharedArrayBuffer (required for ffmpeg.wasm)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ]
  },
  // Empty turbopack config to silence Next.js 16 warning
  // (No custom webpack config needed - Web Workers not used)
  turbopack: {},
}

module.exports = nextConfig
