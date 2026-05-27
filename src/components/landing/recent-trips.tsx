'use client';

import { useEffect, useState, useRef } from 'react';
import { countryNames } from '@/lib/countries';

interface PublicTrip {
  id: number;
  name: string;
  code: string;
  continent: string;
  emoji: string;
  start: string | null;
  end: string | null;
  days: number;
  cities: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

function fmtShortDate(d: string | null): string {
  if (!d) return '';
  return new Date(d + 'T12:00').toLocaleDateString('en-GB', {
    month: 'short', year: 'numeric',
  });
}

function TripCard({ trip }: { trip: PublicTrip }) {
  const country = countryNames[trip.code] || trip.code;
  const dateStr = trip.start ? fmtShortDate(trip.start) + (trip.end ? ' – ' + fmtShortDate(trip.end) : '') : '';
  const cities = trip.cities ? trip.cities.split(',').map(c => c.trim()).filter(Boolean).slice(0, 3) : [];

  const href = trip.username ? `/u/${trip.username}` : '#';

  return (
    <a
      href={href}
      className="group flex-shrink-0 w-[280px] md:w-auto bg-bg2 border border-white/[0.06] rounded-2xl overflow-hidden hover:border-gold/30 transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
    >
      {/* Gradient header */}
      <div className="h-[140px] relative overflow-hidden">
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${
              trip.continent === 'Europe' ? '#1e3a5f, #2d5a87' :
              trip.continent === 'Asia' ? '#5f1e3a, #872d5a' :
              trip.continent === 'Africa' ? '#3a5f1e, #5a872d' :
              trip.continent === 'Americas' ? '#1e5f5f, #2d8787' :
              '#3a3a1e, #87872d'
            })`,
          }}
        >
          <span className="text-5xl opacity-80 group-hover:scale-110 transition-transform">{trip.emoji}</span>
        </div>
        {/* Country badge */}
        <div className="absolute top-3 left-3 bg-bg/80 backdrop-blur-sm border border-white/[0.1] rounded-lg px-2.5 py-1 text-[11px] font-medium">
          {trip.emoji} {country}
        </div>
        {/* Days badge */}
        {trip.days > 0 && (
          <div className="absolute top-3 right-3 bg-gold/90 text-bg rounded-lg px-2 py-1 text-[11px] font-semibold">
            {trip.days}d
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-[15px] mb-1 truncate group-hover:text-gold transition-colors">{trip.name}</h3>
        {dateStr && (
          <div className="text-[12px] text-text-muted mb-2">{dateStr}</div>
        )}
        {cities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {cities.map(city => (
              <span key={city} className="bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-0.5 text-[11px] text-text-muted">
                {city}
              </span>
            ))}
          </div>
        )}

        {/* Author */}
        {trip.username && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
            {trip.avatarUrl ? (
              <img src={trip.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center text-[10px] text-gold font-semibold">
                {(trip.displayName || trip.username).charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[12px] text-text-muted">
              {trip.displayName || trip.username}
            </span>
          </div>
        )}
      </div>
    </a>
  );
}

export function RecentTrips() {
  const [trips, setTrips] = useState<PublicTrip[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/public-stats')
      .then(r => r.json())
      .then(data => {
        if (data.recentTrips?.length) setTrips(data.recentTrips);
      })
      .catch(() => {});
  }, []);

  if (trips.length === 0) return null;

  return (
    <section className="py-16 md:py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10">
          <div className="text-xs text-text-muted uppercase tracking-[3px] mb-3">From our travelers</div>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl">
            Recent <span className="text-gold">adventures</span>
          </h2>
        </div>

        {/* Scrollable on mobile, grid on desktop */}
        <div
          ref={scrollRef}
          className="flex md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 overflow-x-auto md:overflow-visible pb-4 md:pb-0 snap-x snap-mandatory md:snap-none scrollbar-hide"
        >
          {trips.map(trip => (
            <div key={trip.id} className="snap-start">
              <TripCard trip={trip} />
            </div>
          ))}
        </div>

        {/* Scroll hint on mobile */}
        <div className="flex md:hidden justify-center mt-4 gap-1.5">
          {trips.map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/[0.15]" />
          ))}
        </div>
      </div>
    </section>
  );
}
