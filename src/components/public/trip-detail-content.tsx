'use client';

import Link from 'next/link';
import { useLang } from '@/components/language-provider';
import { PublicRouteMap } from '@/components/map/public-route-map';
import { countryFlag, fmtDate, haversine } from '@/lib/countries';
import type { RouteWaypoint } from '@/types';
import { TripPhotoGrid, WaypointMedia } from '@/components/public/trip-media';
import { TripReviews } from '@/components/public/trip-reviews';

const TRANSPORT_LABELS: Record<string, { emoji: string; key: string }> = {
  plane: { emoji: '✈️', key: 'Plane' },
  train: { emoji: '🚂', key: 'Train' },
  bus: { emoji: '🚌', key: 'Bus' },
  'sleeping-bus': { emoji: '🛏️', key: 'Sleeping Bus' },
  boat: { emoji: '⛵', key: 'Boat' },
  cycling: { emoji: '🚲', key: 'Cycling' },
  hiking: { emoji: '🥾', key: 'Hiking' },
  motorbike: { emoji: '🏍️', key: 'Motorbike' },
  hitchhiking: { emoji: '👍', key: 'Hitchhiking' },
  car: { emoji: '🚗', key: 'Car' },
  walking: { emoji: '🚶', key: 'Walking' },
};

interface TripData {
  id: number;
  code: string;
  continent: string;
  emoji: string;
  name: string;
  start: string;
  end: string;
  days: number;
  cities: string;
  notes?: string;
  rating?: number;
  journal: { id: number; date: string; time: string; title: string; text: string }[];
}

interface Props {
  username: string;
  displayName: string;
  trip: TripData;
  waypoints: RouteWaypoint[];
  photos: string[];
  mapboxToken: string | null;
  currentUserId?: string;
}

export function TripDetailContent({ username, displayName, trip, waypoints, photos, mapboxToken, currentUserId }: Props) {
  const { t } = useLang();

  const wps = waypoints.filter(w => w.type === 'waypoint');
  const highlights = waypoints.filter(w => w.type === 'highlight');

  let totalDist = 0;
  for (let i = 1; i < wps.length; i++) {
    totalDist += haversine(wps[i - 1].lat, wps[i - 1].lng, wps[i].lat, wps[i].lng);
  }

  const transportModes = [...new Set(wps.map(w => w.transport).filter(Boolean))] as string[];
  const sortedJournal = [...trip.journal].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  return (
    <>
      {/* Header */}
      <header className="border-b border-white/[0.08] bg-bg/95 backdrop-blur-[10px]">
        <div className="max-w-[800px] mx-auto px-6 py-6">
          <Link href={`/u/${username}`} className="text-sm text-teal hover:underline mb-3 inline-block">
            ← {t('trip_back_to')} {displayName}
          </Link>

          <div className="flex items-start gap-4 mt-2">
            <div className="text-5xl">{trip.emoji}</div>
            <div className="flex-1">
              <h1 className="font-[family-name:var(--font-playfair)] text-3xl">{trip.name}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-text-muted flex-wrap">
                <span>{countryFlag(trip.code)} {trip.code}</span>
                <span>{fmtDate(trip.start)} → {trip.end ? fmtDate(trip.end) : <em className="text-gold">{t('trip_ongoing')}</em>}</span>
                <span className="bg-teal/10 text-teal px-2 py-0.5 rounded-[10px] text-[11px]">
                  {trip.days} {trip.days !== 1 ? t('profile_days') : t('profile_day')}
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
                <div className="text-[10px] text-text-muted uppercase">{t('trip_waypoints')}</div>
              </div>
              <div className="bg-bg3 border border-white/[0.08] rounded-xl px-3 py-2 text-center">
                <div className="text-lg font-[family-name:var(--font-playfair)] text-gold">{highlights.length}</div>
                <div className="text-[10px] text-text-muted uppercase">{t('trip_highlights')}</div>
              </div>
              <div className="bg-bg3 border border-white/[0.08] rounded-xl px-3 py-2 text-center">
                <div className="text-lg font-[family-name:var(--font-playfair)] text-gold">{Math.round(totalDist)} km</div>
                <div className="text-[10px] text-text-muted uppercase">{t('trip_distance')}</div>
              </div>
              <div className="bg-bg3 border border-white/[0.08] rounded-xl px-3 py-2 text-center">
                <div className="text-lg font-[family-name:var(--font-playfair)] text-gold">{trip.journal.length}</div>
                <div className="text-[10px] text-text-muted uppercase">{t('trip_entries')}</div>
              </div>
            </div>
          )}

          {/* Transport modes */}
          {transportModes.length > 0 && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {transportModes.map(mode => {
                const tl = TRANSPORT_LABELS[mode];
                return tl ? (
                  <span key={mode} className="bg-bg3 border border-white/[0.08] rounded-lg px-2.5 py-1 text-[12px] text-text-muted">
                    {tl.emoji} {tl.key}
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
        {photos.length > 0 && (
          <section>
            <h2 className="font-[family-name:var(--font-playfair)] text-xl text-text-muted mb-4">{t('trip_photos')}</h2>
            <TripPhotoGrid photos={photos} />
          </section>
        )}

        {/* Route / Waypoints */}
        {waypoints.length > 0 && (
          <section>
            <h2 className="font-[family-name:var(--font-playfair)] text-xl text-text-muted mb-4">{t('trip_route')}</h2>
            <div className="space-y-1">
              {(() => {
                let wpNum = 0;
                return waypoints.map((w) => {
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
                          <div className="font-medium">{w.name || (isH ? t('trip_highlight') : `${t('trip_waypoint')} ${n}`)}</div>
                          {w.transport && TRANSPORT_LABELS[w.transport] && !isH && n > 1 && (
                            <div className="text-[12px] text-text-muted mt-0.5">
                              {TRANSPORT_LABELS[w.transport].emoji} {t('trip_traveled_by')} {TRANSPORT_LABELS[w.transport].key}
                            </div>
                          )}
                          {w.note && <p className="text-sm text-text-muted mt-2 leading-relaxed whitespace-pre-wrap">{w.note}</p>}
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
            <h2 className="font-[family-name:var(--font-playfair)] text-xl text-text-muted mb-4">{t('trip_journal')}</h2>
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
            <h2 className="font-[family-name:var(--font-playfair)] text-xl text-text-muted mb-4">{t('trip_notes')}</h2>
            <div className="bg-bg3 border border-white/[0.08] rounded-xl p-5 text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
              {trip.notes}
            </div>
          </section>
        )}

        {/* Reviews */}
        <TripReviews tripId={trip.id} currentUserId={currentUserId} />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-6 text-center text-[12px] text-text-muted">
        {t('trip_powered_by')} <span className="font-[family-name:var(--font-playfair)] text-gold">Stampo<span className="text-text">mad</span></span>
      </footer>
    </>
  );
}
