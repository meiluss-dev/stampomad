'use client';

import { useState, useEffect } from 'react';
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

export function CountdownWidget() {
  const { trips } = useStore();
  const { t } = useLang();
  const [showAddTrip, setShowAddTrip] = useState(false);
  const now = useNow(1000); // tick every second
  const today = now.toISOString().split('T')[0];

  // Find upcoming trips (start date in the future)
  const upcoming = trips
    .filter(t => !t.quickPin && t.start && t.start > today)
    .sort((a, b) => a.start.localeCompare(b.start));

  // Find current trip (today is between start and end)
  const current = trips.find(t =>
    !t.quickPin && t.start && t.end && t.start <= today && t.end >= today
  );

  const next = upcoming[0];

  // ─── Empty state ───
  if (!next && !current) {
    return (
      <>
        <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">{t('next_trip')}</h3>
          <div className="text-center py-4">
            <div className="text-3xl mb-2">✈️</div>
            <div className="text-sm text-text-muted">{t('no_upcoming')}</div>
            <div className="text-[11px] text-text-muted mt-1 mb-3">{t('plan_adventure')}</div>
            <button
              onClick={() => setShowAddTrip(true)}
              className="px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold text-sm cursor-pointer hover:bg-gold/15 transition-all"
            >
              {t('add_upcoming_trip')}
            </button>
          </div>
        </div>
        <TripModal open={showAddTrip} onOpenChange={setShowAddTrip} trip={null} />
      </>
    );
  }

  // ─── Currently traveling ───
  if (current) {
    const endDate = new Date(current.end + 'T23:59:59');
    const msLeft = Math.max(0, endDate.getTime() - now.getTime());
    const daysLeft = Math.ceil(msLeft / 86400000);
    const hoursLeft = Math.floor((msLeft % 86400000) / 3600000);
    const pct = Math.min(100, Math.round(((current.days - daysLeft) / Math.max(current.days, 1)) * 100));

    return (
      <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stamp-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-stamp-green" />
          </span>
          <h3 className="text-xs text-stamp-green uppercase tracking-wider font-medium">{t('currently_traveling')}</h3>
        </div>
        <div className="bg-stamp-green/8 border border-stamp-green/20 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">{current.emoji}</div>
            <div>
              <div className="font-[family-name:var(--font-playfair)] text-lg">{current.name}</div>
              <div className="text-[12px] text-text-muted">{countryFlag(current.code)} {current.code}</div>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-[family-name:var(--font-playfair)] text-3xl text-stamp-green">{daysLeft}</span>
            <span className="text-sm text-text-muted">day{daysLeft !== 1 ? 's' : ''}</span>
            <span className="font-[family-name:var(--font-playfair)] text-xl text-stamp-green/70 ml-1">{hoursLeft}h</span>
            <span className="text-sm text-text-muted">{t('remaining')}</span>
          </div>
          <div className="text-[11px] text-text-muted mt-2">
            {fmtDate(current.start)} — {fmtDate(current.end)}
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-1.5 bg-bg4 rounded-full overflow-hidden">
              <div
                className="h-full bg-stamp-green rounded-full transition-all duration-1000"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-[10px] text-text-muted mt-1">
              Day {Math.max(1, current.days - daysLeft)} of {current.days}
            </div>
          </div>
        </div>
        {next && (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-text-muted">
            <span>{t('next_up')}:</span>
            <span>{next.emoji} {next.name}</span>
            <span className="text-gold">({fmtDate(next.start)})</span>
          </div>
        )}
      </div>
    );
  }

  // ─── Upcoming trip countdown with live clock ───
  const startDate = new Date(next.start + 'T00:00:00');
  const msUntil = Math.max(0, startDate.getTime() - now.getTime());
  const daysUntil = Math.floor(msUntil / 86400000);
  const hoursUntil = Math.floor((msUntil % 86400000) / 3600000);
  const minsUntil = Math.floor((msUntil % 3600000) / 60000);
  const secsUntil = Math.floor((msUntil % 60000) / 1000);

  return (
    <>
      <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs text-text-muted uppercase tracking-wider">{t('next_trip')}</h3>
          <button
            onClick={() => setShowAddTrip(true)}
            className="text-[11px] text-gold cursor-pointer hover:text-gold-light transition-colors bg-transparent border-none"
          >
            {t('add_trip')}
          </button>
        </div>
        <div className="bg-gold/5 border border-gold/15 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">{next.emoji}</div>
            <div>
              <div className="font-[family-name:var(--font-playfair)] text-lg">{next.name}</div>
              <div className="text-[12px] text-text-muted">{countryFlag(next.code)} {next.code} · {next.days} day{next.days !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {/* Live countdown clock */}
          <div className="flex gap-2 my-3">
            {[
              { val: daysUntil, label: 'days' },
              { val: hoursUntil, label: 'hrs' },
              { val: minsUntil, label: 'min' },
              { val: secsUntil, label: 'sec' },
            ].map(({ val, label }) => (
              <div key={label} className="flex-1 bg-bg3 border border-white/[0.06] rounded-lg py-2 text-center">
                <div className="font-[family-name:var(--font-playfair)] text-2xl text-gold tabular-nums">
                  {String(val).padStart(2, '0')}
                </div>
                <div className="text-[9px] text-text-muted uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-text-muted">
            {fmtDate(next.start)} — {fmtDate(next.end)}
          </div>
        </div>
        {upcoming.length > 1 && (
          <div className="mt-3 space-y-1.5">
            {upcoming.slice(1, 3).map(t => {
              const d = Math.ceil((new Date(t.start + 'T00:00:00').getTime() - now.getTime()) / 86400000);
              return (
                <div key={t.id} className="flex items-center justify-between text-[12px] text-text-muted">
                  <span>{t.emoji} {t.name}</span>
                  <span className="text-gold">{d}d</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <TripModal open={showAddTrip} onOpenChange={setShowAddTrip} trip={null} />
    </>
  );
}
