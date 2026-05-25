'use client';

import { useStore } from '@/lib/store';
import { getContinent, CONT_TOTALS, CONT_COLORS, fmtDate } from '@/lib/countries';

export function EnhancedStats() {
  const { trips, visitedCountries } = useStore();
  if (!trips.length) return null;

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <TravelPersonality />
        <YearStats />
        <Records />
      </div>
      <ContinentProgress />
      <TripTimeline />
    </div>
  );
}

function TravelPersonality() {
  const { trips: allTrips } = useStore();
  const trips = allTrips.filter(t => !t.quickPin);
  const codes = [...new Set(trips.map(t => t.code))];
  const count = codes.length;
  const continents = new Set(trips.map(t => t.continent || 'Other')).size;
  const avgDays = trips.length ? Math.round(trips.reduce((a, t) => a + t.days, 0) / trips.length) : 0;
  const entries = trips.reduce((a, t) => a + (t.journal?.length || 0), 0);

  let badge: string, title: string, desc: string;
  if (count >= 50) { badge = '🌐'; title = 'Global Nomad'; desc = "You've seen it all — a true citizen of the world"; }
  else if (count >= 30) { badge = '🗺️'; title = 'World Explorer'; desc = 'Few corners of the globe remain unvisited'; }
  else if (count >= 20) { badge = '✈️'; title = 'Seasoned Traveler'; desc = 'The world is your second home'; }
  else if (count >= 10) { badge = '🧳'; title = 'Adventurer'; desc = 'Always planning the next escape'; }
  else if (count >= 5) { badge = '🌍'; title = 'Explorer'; desc = 'The travel bug has bitten — hard'; }
  else { badge = '🌱'; title = 'Wanderer'; desc = 'Every great journey starts with a single step'; }

  const contCounts: Record<string, number> = {};
  trips.forEach(t => { const c = t.continent || 'Other'; contCounts[c] = (contCounts[c] || 0) + 1; });
  const topCont = Object.entries(contCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
      <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Travel personality</h3>
      <div className="flex items-center gap-3 bg-bg4 rounded-xl p-3 mb-2.5">
        <div className="text-[32px]">{badge}</div>
        <div>
          <div className="font-[family-name:var(--font-playfair)] text-base text-gold">{title}</div>
          <div className="text-xs text-text-muted mt-0.5 leading-snug">{desc}</div>
          {topCont && <div className="text-[11px] text-teal mt-1">🎯 Specialises in {topCont[0]}</div>}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {entries > 0 && <div className="bg-teal/10 text-teal px-2.5 py-0.5 rounded-lg text-[11px]">📝 {entries} journal entries</div>}
        {continents > 1 && <div className="bg-gold/10 text-gold px-2.5 py-0.5 rounded-lg text-[11px]">🌍 {continents} continents</div>}
        {avgDays > 0 && <div className="bg-stamp-blue/10 text-stamp-blue px-2.5 py-0.5 rounded-lg text-[11px]">⏱ {avgDays}d avg trip</div>}
      </div>
    </div>
  );
}

function YearStats() {
  const { trips } = useStore();
  const year = new Date().getFullYear();
  const thisYear = trips.filter(t => !t.quickPin && t.start?.startsWith(String(year)));
  const thisYearCountries = new Set(thisYear.map(t => t.code)).size;
  const thisYearDays = thisYear.reduce((a, t) => a + t.days, 0);
  const thisYearEntries = thisYear.reduce((a, t) => a + (t.journal?.length || 0), 0);
  const daysLeft = Math.round((new Date(year, 11, 31).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const rows = [
    { label: `Trips in ${year}`, value: thisYear.length },
    { label: 'Countries this year', value: thisYearCountries },
    { label: 'Days abroad', value: thisYearDays },
    { label: 'Journal entries', value: thisYearEntries },
    { label: `Days left in ${year}`, value: daysLeft, accent: true },
  ];

  return (
    <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
      <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">This year</h3>
      {rows.map(r => (
        <div key={r.label} className="flex justify-between items-center py-[7px] border-b border-white/[0.08] last:border-b-0">
          <span className="text-xs text-text-muted">{r.label}</span>
          <span className={`text-sm font-medium ${r.accent ? 'text-gold' : 'text-text'}`}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function Records() {
  const { trips: allTrips } = useStore();
  const trips = allTrips.filter(t => !t.quickPin);
  const longest = trips.length ? trips.reduce((a, t) => t.days > a.days ? t : a, { days: 0, name: '' } as any) : { days: 0, name: '' };
  const contCounts: Record<string, number> = {};
  trips.forEach(t => { const c = t.continent || 'Other'; contCounts[c] = (contCounts[c] || 0) + 1; });
  const topCont = Object.entries(contCounts).sort((a, b) => b[1] - a[1])[0];
  const sorted = [...trips].filter(t => t.start).sort((a, b) => a.start.localeCompare(b.start));
  const first = sorted[0];
  const mostJournaled = trips.length ? trips.reduce((a, t) => (t.journal?.length || 0) > (a.journal?.length || 0) ? t : a, trips[0]) : null;

  const rows = [
    longest.days > 0 ? { label: '🏆 Longest trip', value: `${longest.name} (${longest.days}d)` } : null,
    topCont ? { label: '🌍 Favourite region', value: `${topCont[0]} (${topCont[1]} trips)` } : null,
    first ? { label: '🚀 First trip', value: first.name } : null,
    mostJournaled && (mostJournaled.journal?.length || 0) > 0 ? { label: '📝 Most journaled', value: `${mostJournaled.name} (${mostJournaled.journal!.length})` } : null,
    { label: '📍 Total trips', value: String(trips.length) },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
      <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Records</h3>
      {rows.map(r => (
        <div key={r.label} className="flex justify-between items-center py-[7px] border-b border-white/[0.08] last:border-b-0">
          <span className="text-xs text-text-muted">{r.label}</span>
          <span className="text-[13px] font-medium text-gold">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function ContinentProgress() {
  const { trips, visitedCountries } = useStore();
  const allVisited = new Set([...visitedCountries, ...trips.filter(t => !t.quickPin).map(t => t.code)]);
  const visitedPerCont: Record<string, Set<string>> = {};
  allVisited.forEach(code => {
    const c = getContinent(code) || 'Other';
    if (!visitedPerCont[c]) visitedPerCont[c] = new Set();
    visitedPerCont[c].add(code);
  });

  return (
    <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
      <h3 className="text-xs text-text-muted uppercase tracking-wider mb-3">World coverage</h3>
      {Object.entries(CONT_TOTALS).map(([cont, total]) => {
        const visited = visitedPerCont[cont]?.size || 0;
        const pct = Math.round(visited / total * 100);
        const color = CONT_COLORS[cont] || '#c9a96e';
        return (
          <div key={cont} className="mb-3.5">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[13px] font-medium">{cont}</span>
              <span className="text-xs text-text-muted">{visited} / {total} countries · {pct}%</span>
            </div>
            <div className="h-2 bg-bg4 rounded overflow-hidden">
              <div className="h-full rounded transition-[width] duration-700" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TripTimeline() {
  const { trips } = useStore();
  const byYear: Record<string, typeof trips> = {};
  trips.filter(t => t.start && !t.quickPin).forEach(t => {
    const y = t.start.slice(0, 4);
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(t);
  });

  const years = Object.keys(byYear).sort((a, b) => +b - +a);
  if (!years.length) return null;

  return (
    <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
      <h3 className="text-xs text-text-muted uppercase tracking-wider mb-3">Trip timeline</h3>
      {years.map(year => (
        <div key={year} className="mb-4">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-2">
            {year} · {byYear[year].length} trip{byYear[year].length !== 1 ? 's' : ''}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {byYear[year].sort((a, b) => a.start.localeCompare(b.start)).map(t => (
              <div
                key={t.id}
                className="bg-bg4 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs cursor-pointer hover:border-gold hover:text-gold transition-all"
                title={fmtDate(t.start)}
              >
                {t.emoji} {t.name}
                <span className="text-text-muted text-[10px] ml-1">{t.days}d</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
