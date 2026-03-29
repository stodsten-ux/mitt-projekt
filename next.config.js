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
}

module.exports = withPWA(nextConfig)
