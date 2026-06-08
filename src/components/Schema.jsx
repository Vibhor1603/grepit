export default function Schema({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "grepit",
    "url": "https://grepit.co",
    "logo": "https://grepit.co/logo.svg",
    "sameAs": [
      "https://twitter.com/grepit",
      "https://github.com/grepit"
    ],
    "description": "AI-powered codebase intelligence platform for developers."
  };
  return <Schema data={data} />;
}

export function SoftwareAppSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "grepit",
    "operatingSystem": "Web",
    "applicationCategory": "DeveloperApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };
  return <Schema data={data} />;
}

export function BreadcrumbSchema({ items }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `https://grepit.co${item.path}`
    }))
  };
  return <Schema data={data} />;
}
