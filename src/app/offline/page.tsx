'use client';

import { useState, useEffect } from 'react';
import { countryFlag, fmtDate } from '@/lib/countries';

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
  const [stats, setStats] = useState<OfflineStats | null>(null);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('stampomad_offline_trips');
      if (cached) setTrips(JSON.parse(cached));
      const cachedStats = localStorage.getItem('stampomad_offline_stats');
      if (cachedStats) setStats(JSON.parse(cachedStats));
    } catch {}

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

        {/* Trip list */}
        {trips.length > 0 ? (
          <>
            <h2 className="text-sm text-text-muted uppercase tracking-wider mb-4">Your trips (read-only)</h2>
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
        ) : (
          <div className="text-center text-text-muted py-8">
            <p className="text-sm">No cached trip data yet. Visit your trips page while online to enable offline viewing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
