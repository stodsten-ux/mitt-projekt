const { withSentryConfig } = require('@sentry/nextjs')

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /\/api\/shopping/,
      handler: 'NetworkFirst',
      options: { cacheName: 'shopping-cache', expiration: { maxEntries: 10, maxAgeSeconds: 86400 } }
    },
    {
      urlPattern: /\/api\/recipes/,
      handler: 'NetworkFirst',
      options: { cacheName: 'recipes-cache', expiration: { maxEntries: 50, maxAgeSeconds: 86400 } }
    },
    {
      urlPattern: /\/shopping\/active/,
      handler: 'NetworkFirst',
      options: { cacheName: 'shopping-active-cache', expiration: { maxEntries: 5, maxAgeSeconds: 3600 } }
    },
  ]
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_SITE_URL || 'https://mitt-projekt-one.vercel.app' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}

module.exports = withSentryConfig(
  withPWA(nextConfig),
  {
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    disableLogger: true,
    tunnelRoute: '/monitoring',
  }
)
