'use client';

import { useState, useEffect } from 'react';
import { countryFlag, fmtDate } from '@/lib/countries';
import { getAllOfflineTrips, type OfflineTripPack } from '@/lib/offline-trips';

interface OfflineTrip {
  id: number;
  name: string;
  code: string;
  continent: string;
  emoji: string;
  start: string;
  end: string;
  days: number;
  cities: string;
  travelStyle?: string;
  rating?: number;
}

interface OfflineStats {
  countries: number;
  trips: number;
  days: number;
}

export default function OfflinePage() {
  const [trips, setTrips] = useState<OfflineTrip[]>([]);
  const [downloadedTrips, setDownloadedTrips] = useState<OfflineTripPack[]>([]);
  const [stats, setStats] = useState<OfflineStats | null>(null);
  const [online, setOnline] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<OfflineTripPack | null>(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('stampomad_offline_trips');
      if (cached) setTrips(JSON.parse(cached));
      const cachedStats = localStorage.getItem('stampomad_offline_stats');
      if (cachedStats) setStats(JSON.parse(cachedStats));
    } catch {}

    // Load downloaded trip packs from IndexedDB
    getAllOfflineTrips().then(setDownloadedTrips).catch(() => {});

    const handleOnline = () => setOnline(true);
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Auto-redirect when back online
  useEffect(() => {
    if (online) {
      window.location.href = '/dashboard';
    }
  }, [online]);

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-4 sm:px-8 py-4">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="font-[family-name:var(--font-playfair)] text-xl text-gold">Stampomad</div>
          <div className="flex items-center gap-2 text-sm text-stamp-red">
            <span className="w-2 h-2 rounded-full bg-stamp-red animate-pulse" />
            Offline
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {/* Offline banner */}
        <div className="bg-gold/10 border border-gold/20 rounded-2xl p-6 mb-8 text-center">
          <div className="text-4xl mb-3">✈️</div>
          <h1 className="font-[family-name:var(--font-playfair)] text-2xl text-gold mb-2">
            You&apos;re offline
          </h1>
          <p className="text-text-muted text-sm leading-relaxed max-w-md mx-auto">
            No internet connection. Here&apos;s a snapshot of your trips from your last visit.
            Reconnect to see everything and make changes.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-5 py-2.5 rounded-xl bg-gold text-bg font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            Try again
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-bg3 border border-white/[0.06] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gold">{stats.countries}</div>
              <div className="text-xs text-text-muted mt-1">Countries</div>
            </div>
            <div className="bg-bg3 border border-white/[0.06] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-teal">{stats.trips}</div>
              <div className="text-xs text-text-muted mt-1">Trips</div>
            </div>
            <div className="bg-bg3 border border-white/[0.06] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-text">{stats.days}</div>
              <div className="text-xs text-text-muted mt-1">Days abroad</div>
            </div>
          </div>
        )}

        {/* Downloaded trip packs — full offline access */}
        {downloadedTrips.length > 0 && (
          <>
            <h2 className="text-sm text-teal uppercase tracking-wider mb-4">
              📥 Downloaded for offline ({downloadedTrips.length})
            </h2>
            {selectedTrip ? (
              <div className="bg-bg3 border border-teal/20 rounded-2xl p-6 mb-8">
                <button onClick={() => setSelectedTrip(null)} className="text-xs text-text-muted hover:text-gold mb-4 cursor-pointer bg-transparent border-none">
                  ← Back to trips
                </button>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{selectedTrip.trip.emoji}</span>
                  <div>
                    <div className="font-[family-name:var(--font-playfair)] text-xl">{selectedTrip.trip.name}</div>
                    <div className="text-xs text-gold">{countryFlag(selectedTrip.trip.code)} {selectedTrip.trip.code} · {fmtDate(selectedTrip.trip.start)} – {fmtDate(selectedTrip.trip.end)}</div>
                  </div>
                </div>
                {selectedTrip.trip.cities && <div className="text-sm text-text-muted mb-4">📍 {selectedTrip.trip.cities}</div>}

                {/* Offline photos */}
                {selectedTrip.photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto mb-4 pb-2">
                    {selectedTrip.photos.map((photo, i) => (
                      <img key={i} src={photo} alt="" className="w-20 h-20 object-cover rounded-lg shrink-0" />
                    ))}
                  </div>
                )}

                {/* Offline journal */}
                {selectedTrip.trip.journal.length > 0 ? (
                  <div>
                    <h3 className="text-sm text-gold uppercase tracking-wider mb-3">Journal ({selectedTrip.trip.journal.length} entries)</h3>
                    {[...selectedTrip.trip.journal].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(e => (
                      <div key={e.id} className="border-l-2 border-white/[0.08] pl-4 mb-5">
                        <div className="text-xs text-gold">{fmtDate(e.date)}{e.time ? ` · ${e.time}` : ''}</div>
                        {e.title && <div className="font-[family-name:var(--font-playfair)] text-sm mt-0.5">{e.title}</div>}
                        <div className="text-sm text-text/80 mt-1 whitespace-pre-wrap">{e.text}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-text-muted">No journal entries for this trip</div>
                )}

                {/* Route info */}
                {selectedTrip.route && selectedTrip.route.waypoints.length > 0 && (
                  <div className="mt-4 text-xs text-text-muted">
                    🗺️ Route: {selectedTrip.route.waypoints.length} waypoints saved
                    {selectedTrip.route.notes && <span> · {selectedTrip.route.notes}</span>}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {downloadedTrips.map(pack => (
                  <button
                    key={pack.id}
                    onClick={() => setSelectedTrip(pack)}
                    className="bg-bg3 border border-teal/20 rounded-xl p-4 text-left cursor-pointer hover:border-teal/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{pack.trip.emoji}</span>
                      <div>
                        <div className="font-[family-name:var(--font-playfair)] text-base">{pack.trip.name}</div>
                        <div className="text-[11px] text-gold">{countryFlag(pack.trip.code)} {pack.trip.code}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 text-[11px] text-text-muted flex-wrap">
                      <span>{pack.trip.journal.length} entries</span>
                      <span>·</span>
                      <span>{pack.photos.length} photos</span>
                      {pack.route && <><span>·</span><span>{pack.route.waypoints.length} waypoints</span></>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Trip list — basic cached data */}
        {trips.length > 0 && !selectedTrip ? (
          <>
            <h2 className="text-sm text-text-muted uppercase tracking-wider mb-4">All trips (summary)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trips.map(t => (
                <div key={t.id} className="bg-bg3 border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{t.emoji}</span>
                    <div>
                      <div className="font-[family-name:var(--font-playfair)] text-base">{t.name}</div>
                      <div className="text-[11px] text-gold">
                        {countryFlag(t.code)} {t.code}
                        {t.continent ? ` · ${t.continent}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs text-text-muted flex-wrap">
                    <span>{fmtDate(t.start)}</span>
                    <span>&rarr;</span>
                    <span>{fmtDate(t.end)}</span>
                    <span className="bg-teal/10 text-teal px-2 py-0.5 rounded-[10px] text-[11px]">
                      {t.days} day{t.days !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {t.cities && (
                    <div className="text-[12px] text-text-muted mt-2 truncate">
                      📍 {t.cities}
                    </div>
                  )}
                  {t.rating ? (
                    <div className="mt-2 text-xs">
                      {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : downloadedTrips.length === 0 ? (
          <div className="text-center text-text-muted py-8">
            <p className="text-sm">No cached trip data yet. Visit your trips page while online to enable offline viewing.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
