import { createClient } from '@/lib/supabase/server';
import { loadPublicProfile, loadPublicTrips, loadPublicRoutes, loadPublicPhotos, loadPublicStats } from '@/lib/supabase/data';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PersonJsonLd, BreadcrumbJsonLd } from '@/components/seo/json-ld';
import { ProfileContent } from '@/components/public/profile-content';

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const profile = await loadPublicProfile(supabase, username);
  if (!profile) return { title: 'Not Found — Stampomad' };

  const stats = await loadPublicStats(supabase, profile.userId);
  const trips = await loadPublicTrips(supabase, profile.userId);
  const realTrips = trips.filter(t => !t.quickPin);
  const continents = new Set(realTrips.map(t => t.continent).filter(Boolean)).size;
  const displayName = profile.displayName || profile.username;
  const desc = profile.bio || `${displayName} has explored ${stats.countries} countries across ${continents} continents`;

  const ogParams = new URLSearchParams({
    name: displayName,
    bio: profile.bio || '',
    countries: String(stats.countries),
    trips: String(realTrips.length),
    continents: String(continents),
    ...(profile.avatarUrl ? { avatar: profile.avatarUrl } : {}),
  });

  const ogImage = `/api/og?${ogParams.toString()}`;

  return {
    title: `${displayName} — Stampomad`,
    description: desc,
    openGraph: {
      title: `${displayName} — Stampomad`,
      description: desc,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: 'profile',
      siteName: 'Stampomad',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${displayName} — Stampomad`,
      description: desc,
      images: [ogImage],
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();
  const profile = await loadPublicProfile(supabase, username);
  if (!profile) notFound();

  const [trips, globalStats] = await Promise.all([
    loadPublicTrips(supabase, profile.userId),
    loadPublicStats(supabase, profile.userId),
  ]);
  const realTrips = trips.filter(t => !t.quickPin);
  const tripIds = realTrips.map(t => t.id);
  const [routes, photos] = await Promise.all([
    loadPublicRoutes(supabase, profile.userId, tripIds),
    loadPublicPhotos(supabase, profile.userId, tripIds),
  ]);

  return (
    <div className="min-h-screen bg-bg text-text">
      <PersonJsonLd data={{
        name: profile.displayName || profile.username,
        url: `https://www.stampomad.com/u/${username}`,
        description: profile.bio || `${profile.displayName || profile.username} has explored ${globalStats.countries} countries`,
        image: profile.avatarUrl || undefined,
      }} />
      <BreadcrumbJsonLd items={[
        { name: 'Stampomad', url: 'https://www.stampomad.com' },
        { name: 'Explore', url: 'https://www.stampomad.com/explore' },
        { name: profile.displayName || profile.username, url: `https://www.stampomad.com/u/${username}` },
      ]} />
      <ProfileContent
        profile={{
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          bio: profile.bio,
          homebase: profile.homebase,
        }}
        trips={realTrips}
        stats={{ countries: globalStats.countries }}
        routes={routes}
        photos={photos}
      />
    </div>
  );
}
