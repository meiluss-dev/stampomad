'use client';

import { useStore } from '@/lib/store';

export function MonthChart() {
  const { trips } = useStore();
  const counts = Array(12).fill(0);
  trips.forEach(t => {
    if (t.start) {
      const m = new Date(t.start + 'T12:00').getMonth();
      counts[m]++;
    }
  });
  const max = Math.max(...counts, 1);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
      <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Trips by month</h3>
      {months.map((m, i) => (
        <div key={m} className="flex items-center gap-2.5 mb-1.5">
          <div className="text-xs text-text-muted w-7 text-right">{m}</div>
          <div className="flex-1 bg-bg4 rounded h-[18px] overflow-hidden">
            <div
              className="h-full bg-gold rounded transition-[width] duration-500"
              style={{ width: `${Math.round(counts[i] / max * 100)}%`, opacity: counts[i] > 0 ? 1 : 0.25 }}
            />
          </div>
          <div className="text-[11px] text-text-muted w-5">{counts[i] || ''}</div>
        </div>
      ))}
    </div>
  );
}

export function ContinentGrid() {
  const { trips } = useStore();
  const cont: Record<string, number> = {};
  trips.forEach(t => { const c = t.continent || 'Other'; cont[c] = (cont[c] || 0) + 1; });

  return (
    <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
      <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Continents explored</h3>
      <div className="grid grid-cols-2 gap-2">
        {['Europe', 'Americas', 'Asia', 'Africa', 'Oceania'].map(c => (
          <div key={c} className="bg-bg4 rounded-[10px] py-2.5 px-3.5 flex justify-between items-center">
            <span className="text-[13px]">{c}</span>
            <span className="text-xs text-gold font-medium">{cont[c] || '–'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
