import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';

export async function generateMetadata(): Promise<Metadata> {
  // Fetch live stats for the OG image
  let countries = '0', trips = '0', travelers = '0';
  try {
    const supabase = createAdminClient();
    const [{ count: tripCount }, { count: travelerCount }] = await Promise.all([
      supabase.from('trips').select('*', { count: 'exact', head: true }).eq('published', true),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    ]);
    const { data: codes } = await supabase.from('trips').select('code').eq('published', true);
    const uniqueCodes = new Set((codes || []).map(t => t.code));
    countries = String(uniqueCodes.size);
    trips = String(tripCount || 0);
    travelers = String(travelerCount || 0);
  } catch {}

  const ogParams = new URLSearchParams({
    type: 'explore',
    countries,
    trips,
    travelers,
  });

  return {
    title: 'Explore — Stampomad',
    description: `Discover travel adventures from ${travelers} travelers across ${countries} countries. Browse trips, routes, and stories from the Stampomad community.`,
    openGraph: {
      title: 'Explore — Stampomad',
      description: `Discover travel adventures from ${travelers} travelers across ${countries} countries.`,
      images: [{ url: `/api/og?${ogParams.toString()}`, width: 1200, height: 630 }],
      siteName: 'Stampomad',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Explore — Stampomad',
      description: `Discover travel adventures from ${travelers} travelers across ${countries} countries.`,
      images: [`/api/og?${ogParams.toString()}`],
    },
  };
}

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
