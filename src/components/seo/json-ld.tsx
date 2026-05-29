/**
 * JSON-LD structured data components for SEO.
 * These render <script type="application/ld+json"> tags.
 */

interface WebAppLD {
  name: string;
  description: string;
  url: string;
  applicationCategory: string;
  operatingSystem: string;
  offers?: { price: string; priceCurrency: string };
}

export function WebAppJsonLd({ data }: { data: WebAppLD }) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: data.name,
    description: data.description,
    url: data.url,
    applicationCategory: data.applicationCategory,
    operatingSystem: data.operatingSystem,
    offers: data.offers ? {
      '@type': 'Offer',
      price: data.offers.price,
      priceCurrency: data.offers.priceCurrency,
    } : undefined,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />;
}

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQJsonLd({ items }: { items: FAQItem[] }) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(i => ({
      '@type': 'Question',
      name: i.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: i.answer,
      },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />;
}

interface PersonLD {
  name: string;
  url: string;
  image?: string;
  description?: string;
}

export function PersonJsonLd({ data }: { data: PersonLD }) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: data.name,
    url: data.url,
    image: data.image || undefined,
    description: data.description || undefined,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />;
}

interface TripLD {
  name: string;
  description: string;
  url: string;
  startDate?: string;
  endDate?: string;
  location: string;
  author: { name: string; url: string };
  image?: string;
}

export function TripJsonLd({ data }: { data: TripLD }) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'TravelAction',
    name: data.name,
    description: data.description,
    url: data.url,
    startTime: data.startDate || undefined,
    endTime: data.endDate || undefined,
    toLocation: {
      '@type': 'Place',
      name: data.location,
    },
    agent: {
      '@type': 'Person',
      name: data.author.name,
      url: data.author.url,
    },
    image: data.image || undefined,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />;
}
