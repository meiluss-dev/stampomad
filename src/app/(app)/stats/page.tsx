'use client';

import { useStore } from '@/lib/store';
import { getContinent, countryNames, countryFlag, haversine, getCountryCenter, CONT_TOTALS } from '@/lib/countries';
import { computeBadges } from '@/lib/badges';
import { ShareStatsCard } from '@/components/stats/share-card';

export default function StatsPage() {
  const { trips, visitedCountries, homebase, livedPlaces, routes } = useStore();

  const real = trips.filter(t => !t.quickPin);
  const allCodes = new Set([...visitedCountries, ...real.map(t => t.code)]);
  const totalCountries = allCodes.size;
  const totalTrips = real.length;
  const totalDays = real.reduce((a, t) => a + t.days, 0);
  const totalEntries = real.reduce((a, t) => a + (t.journal?.length || 0), 0);
  const continents = new Set([...allCodes].map(c => getContinent(c)).filter(c => c !== 'Other'));
  const pctWorld = Math.round((totalCountries / 195) * 100);

  // Distance calc
  const homeCenter = homebase?.code ? getCountryCenter(homebase.code) : null;
  let totalKm = 0;
  for (const trip of real) {
    const route = routes[trip.id];
    const wps = route?.waypoints?.filter(w => w.type === 'waypoint') || [];
    if (wps.length >= 2) {
      for (let i = 1; i < wps.length; i++) totalKm += haversine(wps[i - 1].lat, wps[i - 1].lng, wps[i].lat, wps[i].lng);
    } else if (homeCenter) {
      const dest = getCountryCenter(trip.code);
      totalKm += haversine(homeCenter[1], homeCenter[0], dest[1], dest[0]) * 2;
    }
  }

  // Furthest from home
  let furthest = { name: '', dist: 0 };
  if (homeCenter) {
    for (const code of allCodes) {
      const center = getCountryCenter(code);
      const d = haversine(homeCenter[1], homeCenter[0], center[1], center[0]);
      if (d > furthest.dist) furthest = { name: countryNames[code] || code, dist: d };
    }
  }

  // Most visited continent
  const contCounts: Record<string, number> = {};
  real.forEach(t => { const c = t.continent || getContinent(t.code); contCounts[c] = (contCounts[c] || 0) + 1; });
  const topCont = Object.entries(contCounts).sort((a, b) => b[1] - a[1])[0];

  // Longest trip
  const longest = real.reduce((a, t) => t.days > a.days ? t : a, { days: 0, name: 'N/A', emoji: '', code: '' } as any);

  // First trip
  const sorted = [...real].filter(t => t.start).sort((a, b) => a.start.localeCompare(b.start));
  const firstTrip = sorted[0];

  // Year breakdown
  const byYear: Record<string, number> = {};
  real.filter(t => t.start).forEach(t => { const y = t.start.slice(0, 4); byYear[y] = (byYear[y] || 0) + 1; });
  const years = Object.entries(byYear).sort((a, b) => +b[0] - +a[0]);
  const busiestYear = years.reduce((a, [y, c]) => c > a[1] ? [y, c] : a, ['', 0] as [string, number]);

  // Badges
  const badges = computeBadges(trips, visitedCountries, homebase, livedPlaces);
  const earned = badges.filter(b => b.earned);

  // Continent progress
  const visitedPerCont: Record<string, number> = {};
  allCodes.forEach(code => { const c = getContinent(code); visitedPerCont[c] = (visitedPerCont[c] || 0) + 1; });

  // Average trip length
  const avgDays = totalTrips ? Math.round(totalDays / totalTrips) : 0;

  // Earth circumferences
  const circumferences = totalKm / 40075;

  if (totalTrips === 0 && totalCountries === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">📊</div>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl mb-3">Your Travel Stats</h1>
        <p className="text-text-muted">Start adding trips and pinning countries to see your stats here!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="text-xs text-text-muted uppercase tracking-[2px] mb-1">Your numbers</div>
          <h1 className="text-[28px] sm:text-[38px]">Travel Stats</h1>
        </div>
        <ShareStatsCard />
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Countries', value: totalCountries, sub: `${pctWorld}% of the world`, icon: '🌍', color: 'gold' },
          { label: 'Trips logged', value: totalTrips, sub: `${avgDays}d average`, icon: '✈️', color: 'teal' },
          { label: 'Days abroad', value: totalDays, sub: 'total travel days', icon: '📅', color: 'stamp-red' },
          { label: 'Badges earned', value: `${earned.length}/${badges.length}`, sub: 'achievements', icon: '🏅', color: 'stamp-blue' },
        ].map(s => (
          <div key={s.label} className="bg-bg3 border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-[3px]`} style={{ background: `var(--color-${s.color})` }} />
            <div className="absolute right-3 sm:right-4 top-3 sm:top-4 text-[22px] sm:text-[28px] opacity-25">{s.icon}</div>
            <div className="text-[10px] sm:text-[11px] text-text-muted uppercase tracking-wider mb-1.5">{s.label}</div>
            <div className="font-[family-name:var(--font-playfair)] text-2xl sm:text-3xl">{s.value}</div>
            <div className="text-[10px] sm:text-[11px] text-text-muted mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Fun facts */}
      <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-6 mb-7">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Highlights</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {totalKm > 0 && (
            <div className="flex items-start gap-3 bg-bg4 rounded-xl p-4">
              <span className="text-2xl">🌐</span>
              <div>
                <div className="text-sm font-medium">{Math.round(totalKm).toLocaleString()} km traveled</div>
                <div className="text-xs text-text-muted mt-0.5">
                  That&apos;s {circumferences >= 1 ? `${circumferences.toFixed(1)}× around the Earth` : `${Math.round(circumferences * 100)}% of Earth's circumference`}
                </div>
              </div>
            </div>
          )}
          {furthest.dist > 0 && (
            <div className="flex items-start gap-3 bg-bg4 rounded-xl p-4">
              <span className="text-2xl">🏔️</span>
              <div>
                <div className="text-sm font-medium">Furthest from home</div>
                <div className="text-xs text-text-muted mt-0.5">{furthest.name} — {Math.round(furthest.dist).toLocaleString()} km away</div>
              </div>
            </div>
          )}
          {topCont && (
            <div className="flex items-start gap-3 bg-bg4 rounded-xl p-4">
              <span className="text-2xl">❤️</span>
              <div>
                <div className="text-sm font-medium">Favourite region</div>
                <div className="text-xs text-text-muted mt-0.5">{topCont[0]} with {topCont[1]} trip{topCont[1] !== 1 ? 's' : ''}</div>
              </div>
            </div>
          )}
          {longest.days > 0 && (
            <div className="flex items-start gap-3 bg-bg4 rounded-xl p-4">
              <span className="text-2xl">🏆</span>
              <div>
                <div className="text-sm font-medium">Longest trip</div>
                <div className="text-xs text-text-muted mt-0.5">{longest.emoji} {longest.name} — {longest.days} days</div>
              </div>
            </div>
          )}
          {firstTrip && (
            <div className="flex items-start gap-3 bg-bg4 rounded-xl p-4">
              <span className="text-2xl">🚀</span>
              <div>
                <div className="text-sm font-medium">First trip logged</div>
                <div className="text-xs text-text-muted mt-0.5">{firstTrip.emoji} {firstTrip.name} ({firstTrip.start?.slice(0, 4)})</div>
              </div>
            </div>
          )}
          {busiestYear[1] > 0 && (
            <div className="flex items-start gap-3 bg-bg4 rounded-xl p-4">
              <span className="text-2xl">📈</span>
              <div>
                <div className="text-sm font-medium">Busiest year</div>
                <div className="text-xs text-text-muted mt-0.5">{busiestYear[0]} with {busiestYear[1]} trip{busiestYear[1] !== 1 ? 's' : ''}</div>
              </div>
            </div>
          )}
          {continents.size > 0 && (
            <div className="flex items-start gap-3 bg-bg4 rounded-xl p-4">
              <span className="text-2xl">🧭</span>
              <div>
                <div className="text-sm font-medium">{continents.size} continent{continents.size !== 1 ? 's' : ''} explored</div>
                <div className="text-xs text-text-muted mt-0.5">{[...continents].join(', ')}</div>
              </div>
            </div>
          )}
          {totalEntries > 0 && (
            <div className="flex items-start gap-3 bg-bg4 rounded-xl p-4">
              <span className="text-2xl">📝</span>
              <div>
                <div className="text-sm font-medium">{totalEntries} journal entries</div>
                <div className="text-xs text-text-muted mt-0.5">{(totalEntries / Math.max(totalTrips, 1)).toFixed(1)} entries per trip on average</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Continent progress */}
      <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-6 mb-7">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">World coverage</h3>
        <div className="space-y-3">
          {Object.entries(CONT_TOTALS).map(([cont, total]) => {
            const visited = visitedPerCont[cont] || 0;
            const pct = Math.round((visited / total) * 100);
            return (
              <div key={cont}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-muted">{cont}</span>
                  <span className="text-gold">{visited}/{total} <span className="text-text-muted">({pct}%)</span></span>
                </div>
                <div className="h-2 bg-bg4 rounded-full overflow-hidden">
                  <div className="h-full bg-gold rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Year breakdown */}
      {years.length > 0 && (
        <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-6 mb-7">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Trips by year</h3>
          <div className="flex items-end gap-2 h-32">
            {years.map(([year, count]) => {
              const maxCount = Math.max(...years.map(([, c]) => c));
              const pct = (count / maxCount) * 100;
              return (
                <div key={year} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[11px] text-gold font-medium">{count}</span>
                  <div className="w-full bg-gold/20 rounded-t-md relative" style={{ height: `${Math.max(pct, 8)}%` }}>
                    <div className="absolute inset-0 bg-gold rounded-t-md" style={{ height: '100%', opacity: 0.7 }} />
                  </div>
                  <span className="text-[10px] text-text-muted">{year}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Badges grid */}
      <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-6">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">
          All badges · {earned.length}/{badges.length} earned
        </h3>
        <div className="grid grid-cols-3 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {badges.map(b => (
            <div
              key={b.id}
              className={`flex flex-col items-center gap-1 rounded-xl p-3 transition-all ${
                b.earned ? 'bg-gold/8 border border-gold/20' : 'bg-bg4 border border-white/[0.04] opacity-35'
              }`}
              title={b.description}
            >
              <span className={`text-2xl ${!b.earned ? 'grayscale' : ''}`}>{b.icon}</span>
              <span className="text-[10px] text-center leading-tight font-medium">{b.name}</span>
              {!b.earned && 'progress' in b && b.progress && (
                <span className="text-[9px] text-text-muted">{b.progress}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
