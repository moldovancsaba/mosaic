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
            // Use credentialless to allow loading from CDN (unpkg.com)
            // require-corp would block external resources
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ]
  },
  // Webpack config for production builds
  webpack: (config, { isServer }) => {
    // Don't bundle ffmpeg.wasm - it's loaded dynamically from CDN
    if (!isServer) {
      config.externals = config.externals || {}
      config.externals['@ffmpeg/ffmpeg'] = '@ffmpeg/ffmpeg'
      config.externals['@ffmpeg/util'] = '@ffmpeg/util'
    }
    return config
  },
  // Turbopack config for development
  turbopack: {
    // Tell Turbopack to treat ffmpeg packages as external
    resolveAlias: {
      '@ffmpeg/ffmpeg': '@ffmpeg/ffmpeg',
      '@ffmpeg/util': '@ffmpeg/util',
    },
  },
}

module.exports = nextConfig
