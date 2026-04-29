import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/dashboard',
          '/donors',
          '/requests',
          '/organizations',
          '/leaderboard',
          '/camps',
        ],
        disallow: [
          '/admin',
          '/org-admin',
          '/profile',
          '/notifications',
          '/history',
          '/register',
          '/login',
          '/requests/new',
        ],
      },
    ],
    sitemap: 'https://bloodhood.pro.bd/sitemap.xml',
    host: 'https://bloodhood.pro.bd',
  }
}
