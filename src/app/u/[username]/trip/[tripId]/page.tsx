import { createClient } from '@/lib/supabase/server';
import { loadPublicProfile, loadPublicTrips, loadPublicRoutes, loadPublicPhotos, loadPublicMapboxToken } from '@/lib/supabase/data';
import { countryNames, fmtDate } from '@/lib/countries';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { RouteWaypoint } from '@/types';
import { TripJsonLd, BreadcrumbJsonLd } from '@/components/seo/json-ld';
import { TripDetailContent } from '@/components/public/trip-detail-content';

interface Props {
  params: Promise<{ username: string; tripId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, tripId } = await params;
  const supabase = await createClient();
  const profile = await loadPublicProfile(supabase, username);
  if (!profile) return { title: 'Not Found — Stampomad' };
  const trips = await loadPublicTrips(supabase, profile.userId);
  const trip = trips.find(t => t.id === Number(tripId));
  if (!trip) return { title: 'Not Found — Stampomad' };

  const [routes, photos] = await Promise.all([
    loadPublicRoutes(supabase, profile.userId, [trip.id]),
    loadPublicPhotos(supabase, profile.userId, [trip.id]),
  ]);
  const route = routes[trip.id];
  const tripPhotos = photos[trip.id] || [];
  const wpCount = route?.waypoints?.filter((w: { type: string }) => w.type === 'waypoint').length || 0;
  const displayName = profile.displayName || profile.username;
  const desc = `${trip.emoji} ${trip.name} · ${fmtDate(trip.start)} – ${trip.end ? fmtDate(trip.end) : 'Ongoing'} · ${trip.days} days`;

  const ogParams = new URLSearchParams({
    type: 'trip',
    name: trip.name,
    emoji: trip.emoji,
    country: countryNames[trip.code.toUpperCase()] || trip.code,
    days: String(trip.days),
    cities: trip.cities || '',
    author: displayName,
    waypoints: String(wpCount),
    rating: String(trip.rating || 0),
    journals: String(trip.journal?.length || 0),
    dates: `${fmtDate(trip.start)} – ${trip.end ? fmtDate(trip.end) : 'Ongoing'}`,
    ...(tripPhotos[0] ? { photo: tripPhotos[0] } : {}),
    ...(profile.avatarUrl ? { avatar: profile.avatarUrl } : {}),
  });

  const ogImage = `/api/og?${ogParams.toString()}`;

  return {
    title: `${trip.name} — ${displayName} — Stampomad`,
    description: desc,
    openGraph: {
      title: `${trip.name} — ${displayName} — Stampomad`,
      description: desc,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      siteName: 'Stampomad',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${trip.name} — ${displayName}`,
      description: desc,
      images: [ogImage],
    },
  };
}

export default async function PublicTripPage({ params }: Props) {
  const { username, tripId } = await params;
  const supabase = await createClient();
  const profile = await loadPublicProfile(supabase, username);
  if (!profile) notFound();

  const trips = await loadPublicTrips(supabase, profile.userId);
  const trip = trips.find(t => t.id === Number(tripId));
  if (!trip) notFound();

  const [routes, photos, mapboxToken, { data: { user: currentUser } }] = await Promise.all([
    loadPublicRoutes(supabase, profile.userId, [trip.id]),
    loadPublicPhotos(supabase, profile.userId, [trip.id]),
    loadPublicMapboxToken(supabase, profile.userId),
    supabase.auth.getUser(),
  ]);

  const route = routes[trip.id];
  const tripPhotos = photos[trip.id] || [];
  const waypoints = (route?.waypoints || []) as RouteWaypoint[];
  const displayName = profile.displayName || profile.username;

  return (
    <div className="min-h-screen bg-bg text-text">
      <TripJsonLd data={{
        name: trip.name,
        description: `${trip.emoji} ${trip.name} · ${fmtDate(trip.start)} – ${trip.end ? fmtDate(trip.end) : 'Ongoing'} · ${trip.days} days in ${countryNames[trip.code.toUpperCase()] || trip.code}`,
        url: `https://www.stampomad.com/u/${username}/trip/${tripId}`,
        startDate: trip.start,
        endDate: trip.end || undefined,
        location: countryNames[trip.code.toUpperCase()] || trip.code,
        author: {
          name: displayName,
          url: `https://www.stampomad.com/u/${username}`,
        },
      }} />
      <BreadcrumbJsonLd items={[
        { name: 'Stampomad', url: 'https://www.stampomad.com' },
        { name: displayName, url: `https://www.stampomad.com/u/${username}` },
        { name: trip.name, url: `https://www.stampomad.com/u/${username}/trip/${tripId}` },
      ]} />
      <TripDetailContent
        username={username}
        displayName={displayName}
        trip={trip}
        waypoints={waypoints}
        photos={tripPhotos}
        mapboxToken={mapboxToken}
        currentUserId={currentUser?.id}
      />
    </div>
  );
}
