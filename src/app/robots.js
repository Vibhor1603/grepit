export default function robots() {
  const isProduction = process.env.VERCEL_ENV === 'production';
  const baseUrl = 'https://grepit.co';

  if (!isProduction) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/profile/',
          '/sign-in/',
          '/sign-up/',
          '/sso-callback/',
          '/internal-admin/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
