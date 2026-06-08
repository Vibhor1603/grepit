export default function manifest() {
  return {
    name: 'grepit',
    short_name: 'grepit',
    description: 'Understand any codebase in minutes with AI-powered architecture maps and code intelligence.',
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
