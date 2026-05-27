'use client';

import { useEffect, useState } from 'react';
import { Globe } from './globe';

interface PublicStats {
  visitedCodes: string[];
  countryCounts: Record<string, number>;
  totalCountries: number;
  totalTrips: number;
  totalUsers: number;
}

export function GlobeSection() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetch('/api/public-stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <div className="relative">
      <Globe
        visitedCodes={stats?.visitedCodes || []}
        countryCounts={stats?.countryCounts || {}}
      />
      {/* Mini stats under globe on mobile, beside on desktop */}
      {stats && stats.totalCountries > 0 && (
        <div className="flex items-center justify-center gap-6 mt-2">
          <div className="text-center">
            <div className="font-[family-name:var(--font-playfair)] text-xl md:text-2xl text-gold">{stats.totalCountries}</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Countries stamped</div>
          </div>
          <div className="w-px h-8 bg-white/[0.08]" />
          <div className="text-center">
            <div className="font-[family-name:var(--font-playfair)] text-xl md:text-2xl text-teal">{stats.totalTrips}</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Trips logged</div>
          </div>
          <div className="w-px h-8 bg-white/[0.08]" />
          <div className="text-center">
            <div className="font-[family-name:var(--font-playfair)] text-xl md:text-2xl text-stamp-red">{stats.totalUsers}</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Travelers</div>
          </div>
        </div>
      )}
    </div>
  );
}
