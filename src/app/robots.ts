import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard', '/trips', '/journal', '/stats', '/auth', '/(app)/'],
      },
    ],
    sitemap: 'https://www.stampomad.com/sitemap.xml',
  };
}
