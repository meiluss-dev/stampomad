'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useLang } from '@/components/language-provider';
import { computeBadges, type EarnedBadge, type LockedBadge } from '@/lib/badges';

export function BadgesPanel() {
  const { trips, visitedCountries, homebase, livedPlaces } = useStore();
  const { t } = useLang();
  const [showAll, setShowAll] = useState(false);

  const badges = computeBadges(trips, visitedCountries, homebase, livedPlaces);
  const earned = badges.filter((b): b is EarnedBadge => b.earned);
  const locked = badges.filter((b): b is LockedBadge => !b.earned);

  // Show next 3 locked badges as "coming soon"
  const nextUp = locked.slice(0, 3);
  const displayBadges = showAll ? badges : [...earned, ...nextUp];

  if (earned.length === 0 && !showAll) {
    // Show first 3 locked ones as goals
    return (
      <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-3">{t('badges_to_earn')}</h3>
        <div className="grid grid-cols-3 gap-3">
          {locked.slice(0, 6).map(b => (
            <div key={b.id} className="flex flex-col items-center gap-1.5 bg-bg4 rounded-xl p-3 opacity-50">
              <span className="text-2xl grayscale">{b.icon}</span>
              <span className="text-[11px] text-text-muted text-center leading-tight">{b.name}</span>
              {b.progress && <span className="text-[10px] text-text-muted">{b.progress}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs text-text-muted uppercase tracking-wider">
          {t('badges_earned')} · {earned.length}/{badges.length}
        </h3>
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[11px] text-gold cursor-pointer bg-transparent border-none hover:underline"
        >
          {showAll ? 'Show less' : 'Show all'}
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
        {displayBadges.map(b => (
          <div
            key={b.id}
            className={`flex flex-col items-center gap-1 rounded-xl p-2.5 transition-all ${
              b.earned
                ? 'bg-gold/8 border border-gold/20'
                : 'bg-bg4 border border-white/[0.04] opacity-40'
            }`}
            title={b.description}
          >
            <span className={`text-2xl ${!b.earned ? 'grayscale' : ''}`}>{b.icon}</span>
            <span className="text-[11px] text-center leading-tight font-medium">{b.name}</span>
            {!b.earned && (b as LockedBadge).progress && (
              <span className="text-[10px] text-text-muted">{(b as LockedBadge).progress}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
