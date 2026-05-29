import { createClient } from '@/lib/supabase/server';
import { loadPublicProfile, loadPublicTrips, loadPublicRoutes, loadPublicPhotos, loadPublicMapboxToken } from '@/lib/supabase/data';
import { PublicRouteMap } from '@/components/map/public-route-map';
import { countryFlag, countryNames, fmtDate, haversine } from '@/lib/countries';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { RouteWaypoint } from '@/types';
import { TripPhotoGrid, WaypointMedia } from '@/components/public/trip-media';
import { TripJsonLd, BreadcrumbJsonLd } from '@/components/seo/json-ld';

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

  const routes = await loadPublicRoutes(supabase, profile.userId, [trip.id]);
  const route = routes[trip.id];
  const wpCount = route?.waypoints?.filter((w: { type: string }) => w.type === 'waypoint').length || 0;
  const displayName = profile.displayName || profile.username;
  const desc = `${trip.emoji} ${trip.name} · ${fmtDate(trip.start)} – ${fmtDate(trip.end)} · ${trip.days} days`;

  const ogParams = new URLSearchParams({
    type: 'trip',
    name: trip.name,
    emoji: trip.emoji,
    country: countryNames[trip.code.toUpperCase()] || trip.code,
    days: String(trip.days),
    cities: trip.cities || '',
    author: displayName,
    waypoints: String(wpCount),
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

const TRANSPORT_LABELS: Record<string, { emoji: string; label: string }> = {
  plane: { emoji: '✈️', label: 'Plane' },
  train: { emoji: '🚂', label: 'Train' },
  bus: { emoji: '🚌', label: 'Bus' },
  'sleeping-bus': { emoji: '🛏️', label: 'Sleeping Bus' },
  boat: { emoji: '⛵', label: 'Boat' },
  cycling: { emoji: '🚲', label: 'Cycling' },
  hiking: { emoji: '🥾', label: 'Hiking' },
  motorbike: { emoji: '🏍️', label: 'Motorbike' },
  hitchhiking: { emoji: '👍', label: 'Hitchhiking' },
  car: { emoji: '🚗', label: 'Car' },
  walking: { emoji: '🚶', label: 'Walking' },
};


export default async function PublicTripPage({ params }: Props) {
  const { username, tripId } = await params;
  const supabase = await createClient();
  const profile = await loadPublicProfile(supabase, username);
  if (!profile) notFound();

  const trips = await loadPublicTrips(supabase, profile.userId);
  const trip = trips.find(t => t.id === Number(tripId));
  if (!trip) notFound();

  const [routes, photos, mapboxToken] = await Promise.all([
    loadPublicRoutes(supabase, profile.userId, [trip.id]),
    loadPublicPhotos(supabase, profile.userId, [trip.id]),
    loadPublicMapboxToken(supabase, profile.userId),
  ]);

  const route = routes[trip.id];
  const tripPhotos = photos[trip.id] || [];
  const waypoints = (route?.waypoints || []) as RouteWaypoint[];
  const wps = waypoints.filter(w => w.type === 'waypoint');
  const highlights = waypoints.filter(w => w.type === 'highlight');

  let totalDist = 0;
  for (let i = 1; i < wps.length; i++) {
    totalDist += haversine(wps[i - 1].lat, wps[i - 1].lng, wps[i].lat, wps[i].lng);
  }

  const transportModes = [...new Set(wps.map(w => w.transport).filter(Boolean))] as string[];
  const sortedJournal = [...trip.journal].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  return (
    <div className="min-h-screen bg-bg text-text">
      <TripJsonLd data={{
        name: trip.name,
        description: `${trip.emoji} ${trip.name} · ${fmtDate(trip.start)} – ${fmtDate(trip.end)} · ${trip.days} days in ${countryNames[trip.code.toUpperCase()] || trip.code}`,
        url: `https://www.stampomad.com/u/${username}/trip/${tripId}`,
        startDate: trip.start,
        endDate: trip.end,
        location: countryNames[trip.code.toUpperCase()] || trip.code,
        author: {
          name: profile.displayName || profile.username,
          url: `https://www.stampomad.com/u/${username}`,
        },
      }} />
      <BreadcrumbJsonLd items={[
        { name: 'Stampomad', url: 'https://www.stampomad.com' },
        { name: profile.displayName || profile.username, url: `https://www.stampomad.com/u/${username}` },
        { name: trip.name, url: `https://www.stampomad.com/u/${username}/trip/${tripId}` },
      ]} />
      {/* Header */}
      <header className="border-b border-white/[0.08] bg-bg/95 backdrop-blur-[10px]">
        <div className="max-w-[800px] mx-auto px-6 py-6">
          <Link href={`/u/${username}`} className="text-sm text-teal hover:underline mb-3 inline-block">
            ← Back to {profile.displayName || `@${username}`}
          </Link>

          <div className="flex items-start gap-4 mt-2">
            <div className="text-5xl">{trip.emoji}</div>
            <div className="flex-1">
              <h1 className="font-[family-name:var(--font-playfair)] text-3xl">{trip.name}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-text-muted flex-wrap">
                <span>{countryFlag(trip.code)} {trip.code}</span>
                <span>{fmtDate(trip.start)} → {fmtDate(trip.end)}</span>
                <span className="bg-teal/10 text-teal px-2 py-0.5 rounded-[10px] text-[11px]">
                  {trip.days} day{trip.days !== 1 ? 's' : ''}
                </span>
              </div>
              {trip.cities && <div className="text-sm text-text-muted mt-2">📍 {trip.cities}</div>}
            </div>
          </div>

          {/* Route stats */}
          {wps.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <div className="bg-bg3 border border-white/[0.08] rounded-xl px-3 py-2 text-center">
                <div className="text-lg font-[family-name:var(--font-playfair)] text-gold">{wps.length}</div>
                <div className="text-[10px] text-text-muted uppercase">Waypoints</div>
              </div>
              <div className="bg-bg3 border border-white/[0.08] rounded-xl px-3 py-2 text-center">
                <div className="text-lg font-[family-name:var(--font-playfair)] text-gold">{highlights.length}</div>
                <div className="text-[10px] text-text-muted uppercase">Highlights</div>
              </div>
              <div className="bg-bg3 border border-white/[0.08] rounded-xl px-3 py-2 text-center">
                <div className="text-lg font-[family-name:var(--font-playfair)] text-gold">{Math.round(totalDist)} km</div>
                <div className="text-[10px] text-text-muted uppercase">Distance</div>
              </div>
              <div className="bg-bg3 border border-white/[0.08] rounded-xl px-3 py-2 text-center">
                <div className="text-lg font-[family-name:var(--font-playfair)] text-gold">{trip.journal.length}</div>
                <div className="text-[10px] text-text-muted uppercase">Entries</div>
              </div>
            </div>
          )}

          {/* Transport modes used */}
          {transportModes.length > 0 && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {transportModes.map(mode => {
                const t = TRANSPORT_LABELS[mode];
                return t ? (
                  <span key={mode} className="bg-bg3 border border-white/[0.08] rounded-lg px-2.5 py-1 text-[12px] text-text-muted">
                    {t.emoji} {t.label}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
      </header>

      {/* Map */}
      {waypoints.length > 0 && mapboxToken && (
        <div className="max-w-[800px] mx-auto px-6 pt-8">
          <PublicRouteMap waypoints={waypoints} mapboxToken={mapboxToken} countryCode={trip.code} />
        </div>
      )}

      <main className="max-w-[800px] mx-auto px-6 py-8 space-y-10">
        {/* Photos */}
        {tripPhotos.length > 0 && (
          <section>
            <h2 className="font-[family-name:var(--font-playfair)] text-xl text-text-muted mb-4">Photos</h2>
            <TripPhotoGrid photos={tripPhotos} />
          </section>
        )}

        {/* Route / Waypoints */}
        {waypoints.length > 0 && (
          <section>
            <h2 className="font-[family-name:var(--font-playfair)] text-xl text-text-muted mb-4">Route</h2>
            <div className="space-y-1">
              {(() => {
                let wpNum = 0;
                return waypoints.map((w, i) => {
                  const isH = w.type === 'highlight';
                  if (!isH) wpNum++;
                  const n = wpNum;
                  const allImages = w.images?.length ? w.images : (w.imageData ? [w.imageData] : []);
                  const allVideos = w.videos || [];

                  return (
                    <div key={w.id} className="bg-bg3 border border-white/[0.08] rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0 ${isH ? 'bg-teal text-bg' : 'bg-gold text-bg'}`}>
                          {isH ? '⭐' : n}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{w.name || (isH ? 'Highlight' : `Waypoint ${n}`)}</div>
                          {w.transport && TRANSPORT_LABELS[w.transport] && !isH && n > 1 && (
                            <div className="text-[12px] text-text-muted mt-0.5">
                              {TRANSPORT_LABELS[w.transport].emoji} Traveled by {TRANSPORT_LABELS[w.transport].label}
                            </div>
                          )}
                          {w.note && <p className="text-sm text-text-muted mt-2 leading-relaxed whitespace-pre-wrap">{w.note}</p>}

                          {/* Waypoint media (images + videos) */}
                          <WaypointMedia images={allImages} videos={allVideos} />
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </section>
        )}

        {/* Journal */}
        {sortedJournal.length > 0 && (
          <section>
            <h2 className="font-[family-name:var(--font-playfair)] text-xl text-text-muted mb-4">Journal</h2>
            <div className="space-y-4">
              {sortedJournal.map(entry => (
                <article key={entry.id} className="bg-bg3 border border-white/[0.08] rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <time className="text-[12px] text-gold font-medium">{fmtDate(entry.date)}</time>
                    {entry.time && <span className="text-[12px] text-text-muted">{entry.time}</span>}
                  </div>
                  <h3 className="font-[family-name:var(--font-playfair)] text-lg mb-2">{entry.title}</h3>
                  <div className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">{entry.text}</div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Trip notes */}
        {trip.notes && (
          <section>
            <h2 className="font-[family-name:var(--font-playfair)] text-xl text-text-muted mb-4">Notes</h2>
            <div className="bg-bg3 border border-white/[0.08] rounded-xl p-5 text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
              {trip.notes}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-6 text-center text-[12px] text-text-muted">
        Powered by <span className="font-[family-name:var(--font-playfair)] text-gold">Stampo<span className="text-text">mad</span></span>
      </footer>
    </div>
  );
}
