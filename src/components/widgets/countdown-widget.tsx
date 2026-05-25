'use client';

import { useStore } from '@/lib/store';
import { fmtDate, countryFlag } from '@/lib/countries';

export function CountdownWidget() {
  const { trips } = useStore();
  const now = new Date();
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

  if (!next && !current) {
    return (
      <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Next trip</h3>
        <div className="text-center py-4">
          <div className="text-3xl mb-2">✈️</div>
          <div className="text-sm text-text-muted">No upcoming trips</div>
          <div className="text-[11px] text-text-muted mt-1">Add a future trip to see the countdown!</div>
        </div>
      </div>
    );
  }

  if (current) {
    const endDate = new Date(current.end + 'T23:59:59');
    const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000));
    return (
      <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Currently traveling</h3>
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
            <span className="text-sm text-text-muted">day{daysLeft !== 1 ? 's' : ''} remaining</span>
          </div>
          <div className="text-[11px] text-text-muted mt-2">
            {fmtDate(current.start)} — {fmtDate(current.end)}
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-1.5 bg-bg4 rounded-full overflow-hidden">
              <div
                className="h-full bg-stamp-green rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round(((current.days - daysLeft) / Math.max(current.days, 1)) * 100))}%` }}
              />
            </div>
            <div className="text-[10px] text-text-muted mt-1">
              Day {current.days - daysLeft} of {current.days}
            </div>
          </div>
        </div>
        {next && (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-text-muted">
            <span>Next up:</span>
            <span>{next.emoji} {next.name}</span>
            <span className="text-gold">({fmtDate(next.start)})</span>
          </div>
        )}
      </div>
    );
  }

  // Upcoming trip countdown
  const startDate = new Date(next.start + 'T00:00:00');
  const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / 86400000);
  const weeks = Math.floor(daysUntil / 7);
  const remainDays = daysUntil % 7;

  return (
    <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
      <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Next trip</h3>
      <div className="bg-gold/5 border border-gold/15 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-3xl">{next.emoji}</div>
          <div>
            <div className="font-[family-name:var(--font-playfair)] text-lg">{next.name}</div>
            <div className="text-[12px] text-text-muted">{countryFlag(next.code)} {next.code} · {next.days} day{next.days !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-[family-name:var(--font-playfair)] text-4xl text-gold">{daysUntil}</span>
          <span className="text-sm text-text-muted">day{daysUntil !== 1 ? 's' : ''} to go</span>
        </div>
        {weeks > 0 && (
          <div className="text-[11px] text-text-muted mt-1">
            ({weeks} week{weeks !== 1 ? 's' : ''}{remainDays > 0 ? ` ${remainDays} day${remainDays !== 1 ? 's' : ''}` : ''})
          </div>
        )}
        <div className="text-[11px] text-text-muted mt-2">
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
  );
}
