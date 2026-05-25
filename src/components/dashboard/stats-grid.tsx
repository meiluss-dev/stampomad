'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { haversine, getCountryCenter } from '@/lib/countries';
import { useLang } from '@/components/language-provider';

function calcTotalDistance(trips: ReturnType<typeof useStore>['trips'], routes: ReturnType<typeof useStore>['routes'], homebase: ReturnType<typeof useStore>['homebase']) {
  let totalKm = 0;
  const homeCenter = homebase?.code ? getCountryCenter(homebase.code) : null;

  for (const trip of trips) {
    if (trip.quickPin) continue;
    const route = routes[trip.id];
    const wps = route?.waypoints?.filter(w => w.type === 'waypoint') || [];

    if (wps.length >= 2) {
      for (let i = 1; i < wps.length; i++) {
        totalKm += haversine(wps[i - 1].lat, wps[i - 1].lng, wps[i].lat, wps[i].lng);
      }
    } else if (homeCenter) {
      const dest = getCountryCenter(trip.code);
      totalKm += haversine(homeCenter[1], homeCenter[0], dest[1], dest[0]) * 2;
    }
  }
  return totalKm;
}

export function StatsGrid() {
  const { trips, visitedCountries, routes, homebase } = useStore();
  const [unit, setUnit] = useState<'km' | 'mi'>('km');

  useEffect(() => {
    const saved = localStorage.getItem('stampomad-distance-unit');
    if (saved === 'mi' || saved === 'km') setUnit(saved);
  }, []);

  const realTrips = trips.filter(t => !t.quickPin);
  const codes = new Set([...visitedCountries, ...realTrips.map(t => t.code)]);
  const days = realTrips.reduce((a, t) => a + t.days, 0);
  const entries = realTrips.reduce((a, t) => a + (t.journal?.length || 0), 0);

  const totalKm = calcTotalDistance(trips, routes, homebase);
  const displayDist = unit === 'mi' ? Math.round(totalKm * 0.621371) : Math.round(totalKm);

  function toggleUnit() {
    const next = unit === 'km' ? 'mi' : 'km';
    setUnit(next);
    localStorage.setItem('stampomad-distance-unit', next);
  }

  const { t } = useLang();

  const stats = [
    { label: t('stat_countries'), value: codes.size, sub: t('stat_sub_countries'), icon: '🌍', color: 'gold' },
    {
      label: t('stat_distance'),
      value: displayDist.toLocaleString(),
      sub: <span onClick={toggleUnit} className="cursor-pointer hover:text-gold transition-colors">{unit} · click to switch</span>,
      icon: '✈️',
      color: 'teal',
    },
    { label: t('stat_days'), value: days, sub: t('stat_sub_days'), icon: '📅', color: 'stamp-red' },
    { label: t('stat_entries'), value: entries, sub: t('stat_sub_entries'), icon: '📝', color: 'stamp-green' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map(s => (
        <div key={s.label} className="bg-bg3 border border-white/[0.08] rounded-2xl p-4 sm:p-6 relative overflow-hidden">
          <div className={`absolute top-0 left-0 right-0 h-[3px]`}
               style={{ background: `linear-gradient(90deg, var(--color-${s.color}), var(--color-${s.color}-light, var(--color-${s.color})))` }} />
          <div className="absolute right-3 sm:right-5 top-3 sm:top-5 text-[24px] sm:text-[28px] opacity-30">{s.icon}</div>
          <div className="text-[11px] sm:text-[12px] text-text-muted uppercase tracking-wider mb-1.5 sm:mb-2">{s.label}</div>
          <div className="font-[family-name:var(--font-playfair)] text-2xl sm:text-4xl text-text">{s.value}</div>
          <div className="text-[11px] sm:text-[12px] text-text-muted mt-1">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}
