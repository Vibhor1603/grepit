export default async function sitemap() {
  const baseUrl = 'https://grepit.co';
  const lastModified = new Date();

  const routes = [
    '',
    '/faq',
    '/terms',
    '/privacy',
    '/refund',
    '/blog',
    '/docs',
    '/ai-code-review',
    '/github-repository-analyzer',
    '/dependency-graph-generator',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : 0.8,
  }));

  return routes;
}
