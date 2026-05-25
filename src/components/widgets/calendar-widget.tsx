'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useLang } from '@/components/language-provider';

export function CalendarWidget() {
  const { trips } = useStore();
  const { t } = useLang();
  const [calDate, setCalDate] = useState(new Date());

  const year = calDate.getFullYear();
  const month = calDate.getMonth();

  const tripDates = useMemo(() => {
    const dates = new Set<string>();
    trips.forEach(t => {
      if (!t.start || !t.end) return;
      const cur = new Date(t.start + 'T12:00');
      const end = new Date(t.end + 'T12:00');
      while (cur <= end) {
        dates.add(cur.toDateString());
        cur.setDate(cur.getDate() + 1);
      }
    });
    return dates;
  }, [trips]);

  const days = useMemo(() => {
    const today = new Date();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startPad = (firstDay.getDay() + 6) % 7;
    const result: { date: Date; curr: boolean }[] = [];

    for (let i = startPad; i > 0; i--) result.push({ date: new Date(year, month, 1 - i), curr: false });
    for (let d = 1; d <= lastDay.getDate(); d++) result.push({ date: new Date(year, month, d), curr: true });
    const endPad = 7 - (result.length % 7 === 0 ? 7 : result.length % 7);
    for (let i = 1; i <= endPad; i++) result.push({ date: new Date(year, month + 1, i), curr: false });

    return result.map(({ date, curr }) => ({
      day: date.getDate(),
      curr,
      isToday: date.toDateString() === today.toDateString(),
      hasTrip: tripDates.has(date.toDateString()),
    }));
  }, [year, month, tripDates]);

  function nav(dir: number) {
    setCalDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + dir);
      return d;
    });
  }

  return (
    <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
      <div className="flex justify-between items-center mb-3.5">
        <span className="text-xs text-text-muted uppercase tracking-wider">📅 {t('widget_calendar')}</span>
        <div className="flex items-center gap-1.5 text-[13px] text-text">
          <button onClick={() => nav(-1)} className="w-[26px] h-[26px] rounded-md bg-bg4 border border-white/[0.08] text-text flex items-center justify-center cursor-pointer hover:bg-gold hover:text-bg hover:border-gold transition-all text-sm">‹</button>
          <span>{calDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => nav(1)} className="w-[26px] h-[26px] rounded-md bg-bg4 border border-white/[0.08] text-text flex items-center justify-center cursor-pointer hover:bg-gold hover:text-bg hover:border-gold transition-all text-sm">›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center mb-1">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
          <span key={d} className="text-[11px] text-text-muted py-0.5">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d, i) => (
          <div
            key={i}
            className={`aspect-square flex items-center justify-center rounded-md text-xs ${
              !d.curr ? 'text-text-muted/30' :
              d.isToday ? 'bg-gold text-bg font-semibold rounded-full' :
              d.hasTrip ? 'bg-teal/15 text-teal font-medium' :
              'hover:bg-bg4'
            }`}
          >
            {d.day}
          </div>
        ))}
      </div>
    </div>
  );
}
