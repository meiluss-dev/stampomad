'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { countryNames, countryFlag } from '@/lib/countries';
import { Globe } from '@/components/landing/globe';

/* ── Types ── */
interface Trip {
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

interface LeaderboardEntry {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  countries: number;
  trips: number;
}

interface TopDestination {
  code: string;
  count: number;
}

interface ExploreData {
  trips: Trip[];
  total: number;
  page: number;
  totalPages: number;
  leaderboard: LeaderboardEntry[];
  topDestinations: TopDestination[];
  visitedCodes: string[];
  countryCounts: Record<string, number>;
  stats: { totalCountries: number; totalTrips: number; totalTravelers: number };
}

/* ── Helpers ── */
const CONTINENTS = ['All', 'Europe', 'Americas', 'Asia', 'Africa', 'Oceania'];
const SORTS = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'longest', label: 'Longest' },
];

const CONTINENT_GRADIENTS: Record<string, string> = {
  Europe: '#1e3a5f, #2d5a87',
  Asia: '#5f1e3a, #872d5a',
  Africa: '#3a5f1e, #5a872d',
  Americas: '#1e5f5f, #2d8787',
  Oceania: '#3a3a1e, #87872d',
};

function fmtShortDate(d: string | null): string {
  if (!d) return '';
  return new Date(d + 'T12:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

/* ── Trip Card ── */
function TripCard({ trip }: { trip: Trip }) {
  const country = countryNames[trip.code] || trip.code;
  const dateStr = trip.start ? fmtShortDate(trip.start) + (trip.end ? ' – ' + fmtShortDate(trip.end) : '') : '';
  const cities = trip.cities ? trip.cities.split(',').map(c => c.trim()).filter(Boolean).slice(0, 3) : [];
  const href = trip.username ? `/u/${trip.username}` : '#';

  return (
    <Link
      href={href}
      className="group bg-bg2 border border-white/[0.06] rounded-2xl overflow-hidden hover:border-gold/30 transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
    >
      {/* Gradient header */}
      <div className="h-[140px] relative overflow-hidden">
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${CONTINENT_GRADIENTS[trip.continent] || '#3a3a1e, #87872d'})`,
          }}
        >
          <span className="text-5xl opacity-80 group-hover:scale-110 transition-transform">{trip.emoji}</span>
        </div>
        <div className="absolute top-3 left-3 bg-bg/80 backdrop-blur-sm border border-white/[0.1] rounded-lg px-2.5 py-1 text-[11px] font-medium">
          {trip.emoji} {country}
        </div>
        {trip.days > 0 && (
          <div className="absolute top-3 right-3 bg-gold/90 text-bg rounded-lg px-2 py-1 text-[11px] font-semibold">
            {trip.days}d
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-medium text-[15px] mb-1 truncate group-hover:text-gold transition-colors">{trip.name}</h3>
        {dateStr && <div className="text-[12px] text-text-muted mb-2">{dateStr}</div>}
        {cities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {cities.map(city => (
              <span key={city} className="bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-0.5 text-[11px] text-text-muted">
                {city}
              </span>
            ))}
          </div>
        )}
        {trip.username && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
            {trip.avatarUrl ? (
              <img src={trip.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center text-[10px] text-gold font-semibold">
                {(trip.displayName || trip.username).charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[12px] text-text-muted">{trip.displayName || trip.username}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

/* ── Leaderboard Row ── */
function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <Link
      href={entry.username ? `/u/${entry.username}` : '#'}
      className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-white/[0.03] transition-colors group"
    >
      <div className="w-8 text-center">
        {rank <= 3 ? (
          <span className="text-lg">{medals[rank - 1]}</span>
        ) : (
          <span className="text-sm text-text-muted font-medium">#{rank}</span>
        )}
      </div>
      {entry.avatarUrl ? (
        <img src={entry.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center text-sm text-gold font-semibold">
          {(entry.displayName || entry.username || '?').charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate group-hover:text-gold transition-colors">
          {entry.displayName || entry.username}
        </div>
        <div className="text-[11px] text-text-muted">
          {entry.countries} countries &middot; {entry.trips} trips
        </div>
      </div>
      <div className="text-right">
        <div className="text-gold font-semibold text-sm">{entry.countries}</div>
        <div className="text-[10px] text-text-muted uppercase tracking-wider">countries</div>
      </div>
    </Link>
  );
}

/* ── Destination Pill ── */
function DestinationPill({ code, count }: { code: string; count: number }) {
  const name = countryNames[code] || code;
  const flag = countryFlag(code);
  return (
    <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 hover:border-gold/20 transition-colors">
      <span className="text-lg">{flag}</span>
      <div>
        <div className="text-sm font-medium">{name}</div>
        <div className="text-[11px] text-text-muted">{count} traveler{count !== 1 ? 's' : ''}</div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function ExplorePage() {
  const [data, setData] = useState<ExploreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [continent, setContinent] = useState('');
  const [sort, setSort] = useState('recent');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [tab, setTab] = useState<'trips' | 'map' | 'leaderboard' | 'destinations'>('trips');

  const fetchData = useCallback(async (pg = 1) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (continent) params.set('continent', continent);
    if (search) params.set('q', search);
    if (sort !== 'recent') params.set('sort', sort);
    if (pg > 1) params.set('page', String(pg));

    try {
      const r = await fetch(`/api/explore?${params}`);
      const d = await r.json();
      setData(d);
      setCurrentPage(pg);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [continent, search, sort]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  const handleSearch = () => {
    setSearch(searchInput);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/[0.08] bg-bg/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="font-[family-name:var(--font-playfair)] text-[22px] text-gold tracking-wide hover:opacity-80 transition-opacity">
          Stampo<span className="text-text font-normal">mad</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="px-5 py-2.5 bg-gold text-bg rounded-xl text-sm font-medium hover:opacity-90 transition-all">
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 text-center">
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl md:text-5xl mb-4">
            Explore the <span className="text-gold">World</span>
          </h1>
          <p className="text-text-muted text-lg max-w-xl mx-auto mb-8">
            Discover trips, find inspiration, and see where the Stampomad community has traveled.
          </p>

          {/* Stats */}
          {data?.stats && (
            <div className="flex items-center justify-center gap-8 md:gap-12 mb-8">
              {[
                { label: 'Countries', value: data.stats.totalCountries },
                { label: 'Trips', value: data.stats.totalTrips },
                { label: 'Travelers', value: data.stats.totalTravelers },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl md:text-3xl font-[family-name:var(--font-playfair)] text-gold">{s.value}</div>
                  <div className="text-[11px] text-text-muted uppercase tracking-[2px] mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Search bar */}
          <div className="max-w-md mx-auto relative">
            <input
              type="text"
              placeholder="Search trips, countries, cities..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full bg-bg2 border border-white/[0.08] rounded-xl px-4 py-3 pl-10 text-sm placeholder-text-muted/60 focus:outline-none focus:border-gold/40 transition-colors"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && (
              <button
                onClick={() => { setSearch(''); setSearchInput(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex gap-1 border-b border-white/[0.06] mt-6">
          {([
            { key: 'trips' as const, label: '✈️ Trip Feed', count: data?.total },
            { key: 'map' as const, label: '🗺️ Community Map' },
            { key: 'leaderboard' as const, label: '🏆 Leaderboard' },
            { key: 'destinations' as const, label: '🌍 Top Destinations' },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-gold text-gold'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1.5 bg-white/[0.06] rounded-full px-2 py-0.5 text-[11px]">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Trip Feed Tab */}
        {tab === 'trips' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {/* Continent filter */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                {CONTINENTS.map(c => (
                  <button
                    key={c}
                    onClick={() => { setContinent(c === 'All' ? '' : c); setCurrentPage(1); }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      (c === 'All' && !continent) || continent === c
                        ? 'bg-gold text-bg'
                        : 'bg-white/[0.04] text-text-muted hover:text-text hover:bg-white/[0.08] border border-white/[0.06]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="ml-auto">
                <select
                  value={sort}
                  onChange={e => { setSort(e.target.value); setCurrentPage(1); }}
                  className="bg-bg2 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-text-muted focus:outline-none focus:border-gold/40"
                >
                  {SORTS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Trip grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              </div>
            ) : data?.trips.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-4xl mb-4">🌎</div>
                <h3 className="text-lg font-medium mb-2">No trips found</h3>
                <p className="text-text-muted text-sm">
                  {search ? `No published trips matching "${search}"` : 'No published trips yet. Be the first to share your adventure!'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {data?.trips.map(trip => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      onClick={() => fetchData(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="px-3 py-1.5 rounded-lg text-sm border border-white/[0.08] text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-text-muted px-3">
                      Page {currentPage} of {data.totalPages}
                    </span>
                    <button
                      onClick={() => fetchData(currentPage + 1)}
                      disabled={currentPage >= data.totalPages}
                      className="px-3 py-1.5 rounded-lg text-sm border border-white/[0.08] text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Community Map Tab */}
        {tab === 'map' && (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="font-medium text-base mb-1">Community World Map</h2>
              <p className="text-[12px] text-text-muted">Every gold country has been visited by a Stampomad traveler. Drag to spin, hover to explore.</p>
            </div>
            <Globe
              visitedCodes={data?.visitedCodes || []}
              countryCounts={data?.countryCounts || {}}
            />
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-gold" />
                <span className="text-xs text-text-muted">Visited by community</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-white/[0.06] border border-white/[0.1]" />
                <span className="text-xs text-text-muted">Not yet explored</span>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {tab === 'leaderboard' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-bg2 border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h2 className="font-medium text-base">Top Travelers</h2>
                <p className="text-[12px] text-text-muted mt-0.5">Ranked by countries visited</p>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                </div>
              ) : data?.leaderboard.length === 0 ? (
                <div className="text-center py-12 text-text-muted text-sm">
                  No travelers with public profiles yet.
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {data?.leaderboard.map((entry, i) => (
                    <LeaderboardRow key={entry.username} entry={entry} rank={i + 1} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top Destinations Tab */}
        {tab === 'destinations' && (
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <h2 className="font-medium text-base mb-1">Most Visited Destinations</h2>
              <p className="text-[12px] text-text-muted">Countries our community loves the most</p>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data?.topDestinations.map((dest, i) => (
                  <div key={dest.code} className="flex items-center gap-3 bg-bg2 border border-white/[0.06] rounded-xl px-4 py-3 hover:border-gold/20 transition-colors">
                    <div className="w-7 text-center">
                      {i < 3 ? (
                        <span className="text-lg">{['🥇', '🥈', '🥉'][i]}</span>
                      ) : (
                        <span className="text-xs text-text-muted font-medium">#{i + 1}</span>
                      )}
                    </div>
                    <span className="text-2xl">{countryFlag(dest.code)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{countryNames[dest.code] || dest.code}</div>
                      <div className="text-[11px] text-text-muted">{dest.count} traveler{dest.count !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <section className="border-t border-white/[0.06] py-16 text-center">
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl md:text-3xl mb-4">
          Ready to share <span className="text-gold">your adventures</span>?
        </h2>
        <p className="text-text-muted text-sm mb-6 max-w-md mx-auto">
          Create your free account, log your trips, and join the community.
        </p>
        <Link
          href="/auth"
          className="inline-block px-8 py-3.5 bg-gold text-bg rounded-xl text-sm font-medium hover:opacity-90 transition-all hover:-translate-y-0.5"
        >
          Get started for free
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-text-muted">
          <Link href="/" className="font-[family-name:var(--font-playfair)] text-base text-gold hover:opacity-80 transition-opacity">
            Stampo<span className="text-text font-normal">mad</span>
          </Link>
          <div>&copy; {new Date().getFullYear()} Stampomad. Stamp the world.</div>
        </div>
      </footer>
    </div>
  );
}
