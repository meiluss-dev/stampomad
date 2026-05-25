'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import type { ClockEntry } from '@/types';

const ALL_TIMEZONES: ClockEntry[] = [
  { tz: 'Pacific/Honolulu', label: 'Honolulu', city: 'Hawaii, US' },
  { tz: 'America/Los_Angeles', label: 'Los Angeles', city: 'California, US' },
  { tz: 'America/New_York', label: 'New York', city: 'United States' },
  { tz: 'America/Sao_Paulo', label: 'São Paulo', city: 'Brazil' },
  { tz: 'UTC', label: 'UTC', city: 'Universal' },
  { tz: 'Europe/London', label: 'London', city: 'United Kingdom' },
  { tz: 'Europe/Paris', label: 'Paris', city: 'France' },
  { tz: 'Europe/Berlin', label: 'Berlin', city: 'Germany' },
  { tz: 'Europe/Istanbul', label: 'Istanbul', city: 'Turkey' },
  { tz: 'Europe/Moscow', label: 'Moscow', city: 'Russia' },
  { tz: 'Asia/Dubai', label: 'Dubai', city: 'UAE' },
  { tz: 'Asia/Kolkata', label: 'Mumbai / Delhi', city: 'India' },
  { tz: 'Asia/Bangkok', label: 'Bangkok', city: 'Thailand' },
  { tz: 'Asia/Singapore', label: 'Singapore', city: 'Singapore' },
  { tz: 'Asia/Tokyo', label: 'Tokyo', city: 'Japan' },
  { tz: 'Australia/Sydney', label: 'Sydney', city: 'Australia' },
  { tz: 'Pacific/Auckland', label: 'Auckland', city: 'New Zealand' },
];

export function WorldClockWidget() {
  const { clocks, setClocks } = useStore();
  const [now, setNow] = useState(new Date());
  const [adding, setAdding] = useState(false);
  const [selectedTz, setSelectedTz] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function addClock() {
    if (!selectedTz) return;
    const found = ALL_TIMEZONES.find(t => t.tz === selectedTz);
    if (!found || clocks.find(c => c.tz === selectedTz)) return;
    await setClocks([...clocks, found]);
    setAdding(false);
    setSelectedTz('');
  }

  async function removeClock(i: number) {
    const next = [...clocks];
    next.splice(i, 1);
    await setClocks(next);
  }

  return (
    <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
      <div className="flex justify-between items-center mb-3.5">
        <span className="text-xs text-text-muted uppercase tracking-wider">🕐 World Clock</span>
        <button
          onClick={() => setAdding(!adding)}
          className="w-[26px] h-[26px] rounded-md bg-bg4 border border-white/[0.08] text-text flex items-center justify-center cursor-pointer hover:bg-gold hover:text-bg hover:border-gold transition-all text-sm"
        >
          +
        </button>
      </div>
      <div>
        {clocks.map((c, i) => {
          const ts = now.toLocaleTimeString('en-GB', { timeZone: c.tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
          const [hh, mm, ss] = ts.split(':');
          const ds = now.toLocaleDateString('en-GB', { timeZone: c.tz, weekday: 'short', day: 'numeric', month: 'short' });
          return (
            <div key={c.tz + i} className="flex justify-between items-center py-2 border-b border-white/[0.08] last:border-b-0 group">
              <div>
                <div className="text-[13px]">{c.label}</div>
                <div className="text-[11px] text-text-muted mt-0.5">{c.city} · {ds}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="font-[family-name:var(--font-playfair)] text-xl tracking-wider">
                  {hh}:{mm}<span className="text-[10px] text-text-muted ml-0.5">{ss}</span>
                </div>
                <button
                  onClick={() => removeClock(i)}
                  className="text-transparent group-hover:text-text-muted hover:!text-stamp-red text-[13px] cursor-pointer transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {adding && (
        <div className="mt-2.5">
          <select
            value={selectedTz}
            onChange={e => setSelectedTz(e.target.value)}
            className="w-full bg-bg4 border border-white/[0.08] rounded-lg py-[7px] px-2.5 text-text text-[13px] outline-none"
          >
            <option value="">Select timezone...</option>
            {ALL_TIMEZONES.map(t => (
              <option key={t.tz} value={t.tz}>{t.label} — {t.city}</option>
            ))}
          </select>
          <div className="flex gap-1.5 mt-1.5">
            <button onClick={addClock} className="flex-1 py-[7px] bg-gold text-bg rounded-lg text-xs font-medium cursor-pointer">Add</button>
            <button onClick={() => { setAdding(false); setSelectedTz(''); }} className="flex-1 py-[7px] bg-bg4 text-text-muted rounded-lg text-xs border border-white/[0.08] cursor-pointer">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
