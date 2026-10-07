'use client';

import Link from 'next/link';
import { useLang } from '@/components/language-provider';
import { ShareProfileButton } from '@/components/public/share-profile-button';
import { ProfileTripCard } from '@/components/public/profile-trip-card';

interface ProfileData {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  homebase: { flag: string; city: string } | null;
}

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
  coverUrl?: string;
  rating?: number;
  journal: { id: number }[];
}

interface Props {
  profile: ProfileData;
  trips: TripData[];
  stats: { countries: number };
  routes: Record<number, { waypoints?: { type: string }[] }>;
  photos: Record<number, string[]>;
}

export function ProfileContent({ profile, trips, stats, routes, photos }: Props) {
  const { t } = useLang();
  const displayName = profile.displayName || profile.username;

  return (
    <>
      {/* Nav */}
      <nav className="border-b border-white/[0.08] bg-bg/95 backdrop-blur-[10px]">
        <div className="max-w-[900px] mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/" className="font-[family-name:var(--font-playfair)] text-lg text-gold hover:text-text transition-colors">
            Stampo<span className="text-text">mad</span>
          </Link>
          <Link href="/explore" className="text-sm text-text-muted hover:text-gold transition-colors">
            {t('profile_explore')}
          </Link>
        </div>
      </nav>

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
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-[family-name:var(--font-playfair)] text-3xl text-text">
                {displayName}
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

          <ShareProfileButton
            username={profile.username}
            displayName={displayName}
            countries={stats.countries}
            trips={trips.length}
          />

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: t('profile_countries'), value: stats.countries, icon: '🌍' },
              { label: t('profile_public_trips'), value: trips.length, icon: '✈️' },
              { label: t('profile_days_abroad'), value: trips.reduce((a, tr) => a + tr.days, 0), icon: '📅' },
              { label: t('profile_journal_entries'), value: trips.reduce((a, tr) => a + (tr.journal?.length || 0), 0), icon: '📝' },
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
        {trips.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <div className="text-4xl mb-3">🌍</div>
            <div className="text-lg">{t('profile_no_trips')}</div>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl text-text-muted">{t('profile_trips')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {trips.map(trip => {
                const tripPhotos = photos[trip.id] || [];
                const route = routes[trip.id];
                const wpCount = route?.waypoints?.filter(w => w.type === 'waypoint').length || 0;
                return (
                  <ProfileTripCard
                    key={trip.id}
                    username={profile.username}
                    trip={trip}
                    photos={tripPhotos}
                    waypointCount={wpCount}
                  />
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-6 text-center text-[12px] text-text-muted">
        {t('profile_powered_by')} <span className="font-[family-name:var(--font-playfair)] text-gold">Stampo<span className="text-text">mad</span></span>
      </footer>
    </>
  );
}
