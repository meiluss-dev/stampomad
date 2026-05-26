'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { fmtDate, countryFlag } from '@/lib/countries';
import { TripModal } from '@/components/trips/trip-modal';
import { useLang } from '@/components/language-provider';

function useNow(intervalMs: number) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function UpcomingTripsBar() {
  const { trips } = useStore();
  const { t } = useLang();
  const [showAddTrip, setShowAddTrip] = useState(false);
  const now = useNow(1000);
  const today = now.toISOString().split('T')[0];

  const upcoming = trips
    .filter(t => !t.quickPin && t.start && t.start > today)
    .sort((a, b) => a.start.localeCompare(b.start));

  const current = trips.find(t =>
    !t.quickPin && t.start && t.end && t.start <= today && t.end >= today
  );

  if (!current && upcoming.length === 0) return null;

  const next = upcoming[0];

  // ─── Currently traveling ───
  if (current) {
    const endDate = new Date(current.end + 'T23:59:59');
    const msLeft = Math.max(0, endDate.getTime() - now.getTime());
    const daysLeft = Math.ceil(msLeft / 86400000);
    const hoursLeft = Math.floor((msLeft % 86400000) / 3600000);
    const pct = Math.min(100, Math.round(((current.days - daysLeft) / Math.max(current.days, 1)) * 100));

    return (
      <div className="mb-7 rounded-2xl border-2 border-stamp-green/40 bg-gradient-to-r from-stamp-green/[0.06] via-stamp-green/[0.03] to-stamp-green/[0.06] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Left: status + trip info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stamp-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-stamp-green" />
            </span>
            <span className="text-xs text-stamp-green uppercase tracking-wider font-medium shrink-0">{t('currently_traveling')}</span>
            <span className="text-2xl shrink-0">{current.emoji}</span>
            <div className="min-w-0">
              <Link href={`/trips?highlight=${current.id}`} className="font-[family-name:var(--font-playfair)] text-lg hover:text-gold transition-colors truncate block">
                {current.name}
              </Link>
              <div className="text-[11px] text-text-muted">{countryFlag(current.code)} {current.code} · {fmtDate(current.start)} — {fmtDate(current.end)}</div>
            </div>
          </div>

          {/* Right: countdown + progress */}
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-[family-name:var(--font-playfair)] text-3xl text-stamp-green tabular-nums">{daysLeft}</span>
              <span className="text-xs text-text-muted">day{daysLeft !== 1 ? 's' : ''}</span>
              <span className="font-[family-name:var(--font-playfair)] text-xl text-stamp-green/70 tabular-nums">{hoursLeft}h</span>
              <span className="text-xs text-text-muted">{t('remaining')}</span>
            </div>
            <div className="w-24 hidden md:block">
              <div className="h-1.5 bg-bg4 rounded-full overflow-hidden">
                <div className="h-full bg-stamp-green rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[9px] text-text-muted mt-0.5 text-center">Day {Math.max(1, current.days - daysLeft)} of {current.days}</div>
            </div>
          </div>
        </div>

        {/* Next up preview */}
        {next && (
          <div className="mt-3 pt-3 border-t border-stamp-green/15 flex items-center gap-2 text-[12px] text-text-muted">
            <span>{t('next_up')}:</span>
            <span>{next.emoji} {next.name}</span>
            <span className="text-gold">({fmtDate(next.start)})</span>
          </div>
        )}
      </div>
    );
  }

  // ─── Upcoming trip(s) ───
  const startDate = new Date(next.start + 'T00:00:00');
  const msUntil = Math.max(0, startDate.getTime() - now.getTime());
  const daysUntil = Math.floor(msUntil / 86400000);
  const hoursUntil = Math.floor((msUntil % 86400000) / 3600000);
  const minsUntil = Math.floor((msUntil % 3600000) / 60000);
  const secsUntil = Math.floor((msUntil % 60000) / 1000);
  const multipleUpcoming = upcoming.length > 1;

  return (
    <>
      <div className="mb-7 rounded-2xl border-2 border-gold/30 bg-gradient-to-r from-gold/[0.06] via-gold/[0.03] to-gold/[0.06] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Left: title + trip info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-2xl shrink-0">{next.emoji}</span>
            <div className="min-w-0">
              <div className="text-[10px] text-gold uppercase tracking-widest font-medium mb-0.5">
                {multipleUpcoming ? `${t('upcoming_trips')} (${upcoming.length})` : t('upcoming_trip')}
              </div>
              <Link href={`/trips?highlight=${next.id}`} className="font-[family-name:var(--font-playfair)] text-lg hover:text-gold transition-colors truncate block">
                {next.name}
              </Link>
              <div className="text-[11px] text-text-muted">
                {countryFlag(next.code)} {next.code} · {next.days} day{next.days !== 1 ? 's' : ''} · {fmtDate(next.start)} — {fmtDate(next.end)}
              </div>
            </div>
          </div>

          {/* Right: live countdown */}
          <div className="flex gap-2 shrink-0">
            {[
              { val: daysUntil, label: 'days' },
              { val: hoursUntil, label: 'hrs' },
              { val: minsUntil, label: 'min' },
              { val: secsUntil, label: 'sec' },
            ].map(({ val, label }) => (
              <div key={label} className="bg-bg3/80 border border-gold/15 rounded-lg px-2.5 py-1.5 text-center min-w-[48px]">
                <div className="font-[family-name:var(--font-playfair)] text-xl text-gold tabular-nums">
                  {String(val).padStart(2, '0')}
                </div>
                <div className="text-[8px] text-text-muted uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional upcoming trips */}
        {multipleUpcoming && (
          <div className="mt-3 pt-3 border-t border-gold/15 flex flex-wrap gap-x-5 gap-y-1.5">
            {upcoming.slice(1, 4).map(trip => {
              const d = Math.ceil((new Date(trip.start + 'T00:00:00').getTime() - now.getTime()) / 86400000);
              return (
                <Link key={trip.id} href={`/trips?highlight=${trip.id}`} className="flex items-center gap-1.5 text-[12px] text-text-muted hover:text-gold transition-colors">
                  <span>{trip.emoji} {trip.name}</span>
                  <span className="text-gold font-medium">{d}d</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <TripModal open={showAddTrip} onOpenChange={setShowAddTrip} trip={null} />
    </>
  );
}
