import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['/', '/auth', '/book', '/ride/live', '/history', '/wallet', '/promotions', '/support', '/account', '/scheduled'];
  return routes.map((route) => ({ url: `https://drive.example.com${route}`, lastModified: new Date(), changeFrequency: 'weekly', priority: route === '/' ? 1 : 0.7 }));
}
