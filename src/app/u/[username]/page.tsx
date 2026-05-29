import { createClient } from '@/lib/supabase/server';
import { loadPublicProfile, loadPublicTrips, loadPublicRoutes, loadPublicPhotos, loadPublicStats } from '@/lib/supabase/data';
import { countryFlag, fmtDate } from '@/lib/countries';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ShareProfileButton } from '@/components/public/share-profile-button';
import { PersonJsonLd, BreadcrumbJsonLd } from '@/components/seo/json-ld';

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
      {/* Header */}
      <header className="border-b border-white/[0.08] bg-bg/95 backdrop-blur-[10px]">
        <div className="max-w-[900px] mx-auto px-6 py-8">
          <div className="flex items-start gap-5">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-full border-2 border-gold object-cover shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gold text-bg flex items-center justify-center text-3xl font-semibold shrink-0">
                {(profile.displayName || profile.username).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-[family-name:var(--font-playfair)] text-3xl text-text">
                {profile.displayName || profile.username}
              </h1>
              <div className="text-sm text-text-muted mt-1">@{profile.username}</div>
              {profile.bio && <p className="text-sm text-text-muted mt-2 leading-relaxed">{profile.bio}</p>}
              {profile.homebase && (
                <div className="text-sm text-text-muted mt-2">
                  📍 {profile.homebase.flag} {profile.homebase.city}
                </div>
              )}
            </div>
          </div>

          {/* Share */}
          <ShareProfileButton
            username={username}
            displayName={profile.displayName || profile.username}
            countries={globalStats.countries}
            trips={realTrips.length}
          />

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Countries', value: globalStats.countries, icon: '🌍' },
              { label: 'Trips', value: realTrips.length, icon: '✈️' },
              { label: 'Days abroad', value: realTrips.reduce((a, t) => a + t.days, 0), icon: '📅' },
              { label: 'Journal entries', value: realTrips.reduce((a, t) => a + (t.journal?.length || 0), 0), icon: '📝' },
            ].map(s => (
              <div key={s.label} className="bg-bg3 border border-white/[0.08] rounded-xl px-4 py-3 text-center">
                <div className="text-lg font-[family-name:var(--font-playfair)] text-gold">{s.value}</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider">{s.icon} {s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Trips */}
      <main className="max-w-[900px] mx-auto px-6 py-8">
        {realTrips.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <div className="text-4xl mb-3">🌍</div>
            <div className="text-lg">No published trips yet</div>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl text-text-muted">Trips</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {realTrips.map(trip => {
                const tripPhotos = photos[trip.id] || [];
                const route = routes[trip.id];
                const wpCount = route?.waypoints?.filter(w => w.type === 'waypoint').length || 0;
                return (
                  <Link
                    key={trip.id}
                    href={`/u/${username}/trip/${trip.id}`}
                    className="bg-bg3 border border-white/[0.08] rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:border-gold hover:shadow-[0_8px_32px_rgba(201,169,110,0.15)] block"
                  >
                    <div className="w-full h-36 flex items-center justify-center text-[48px] bg-bg4 relative overflow-hidden">
                      {tripPhotos.length > 0 ? (
                        <img src={tripPhotos[0]} alt="" className="w-full h-full object-cover absolute inset-0" />
                      ) : (
                        <span>{trip.emoji}</span>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="text-[11px] text-gold uppercase tracking-wider mb-1">
                        {countryFlag(trip.code)} {trip.code}
                        {trip.continent ? ` · ${trip.continent}` : ''}
                      </div>
                      <div className="font-[family-name:var(--font-playfair)] text-lg mb-1.5">{trip.name}</div>
                      <div className="flex gap-2 text-xs text-text-muted flex-wrap">
                        <span>{fmtDate(trip.start)} → {fmtDate(trip.end)}</span>
                        <span className="bg-teal/10 text-teal px-2 py-0.5 rounded-[10px] text-[11px]">
                          {trip.days} day{trip.days !== 1 ? 's' : ''}
                        </span>
                        {trip.journal.length > 0 && (
                          <span className="text-text-muted">{trip.journal.length} entries</span>
                        )}
                        {wpCount > 0 && (
                          <span className="text-text-muted">{wpCount} waypoints</span>
                        )}
                      </div>
                      {trip.cities && <div className="text-[13px] text-text-muted mt-2">📍 {trip.cities}</div>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-6 text-center text-[12px] text-text-muted">
        Powered by <span className="font-[family-name:var(--font-playfair)] text-gold">Stampo<span className="text-text">mad</span></span>
      </footer>
    </div>
  );
}
