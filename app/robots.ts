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
    sitemap: 'https://blood-hood-f4e66.web.app/sitemap.xml',
    host: 'https://blood-hood-f4e66.web.app',
  }
}
