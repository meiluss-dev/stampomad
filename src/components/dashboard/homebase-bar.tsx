'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { HomebaseModal } from '@/components/settings/homebase-modal';
import { LivedModal } from '@/components/settings/lived-modal';

function livedDuration(from: string, to: string | null): string {
  if (!from) return '';
  const start = new Date(from);
  const end = to ? new Date(to) : new Date();
  const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.5));
  const isCurrent = !to;
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ${isCurrent ? '(current)' : ''}`;
  const yrs = (months / 12).toFixed(1).replace(/\.0$/, '');
  return `${yrs} year${parseFloat(yrs) !== 1 ? 's' : ''} ${isCurrent ? '(current)' : ''}`;
}

export function HomebaseBar() {
  const { homebase, livedPlaces, removeLivedPlace } = useStore();
  const [hbOpen, setHbOpen] = useState(false);
  const [livedOpen, setLivedOpen] = useState(false);

  return (
    <>
      <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-4 px-5 mb-7">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center text-xl shrink-0">
              🏠
            </div>
            <div>
              <div className="text-[11px] text-text-muted uppercase tracking-wider mb-0.5">Home base</div>
              {homebase ? (
                <>
                  <div className="text-[15px] font-medium">{homebase.flag} {homebase.city || homebase.code}</div>
                  <div className="text-xs text-text-muted">{homebase.code} · {homebase.continent}</div>
                </>
              ) : (
                <div className="text-[15px] text-text-muted font-normal">Not set</div>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setHbOpen(true)}
              className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] text-text-muted text-xs cursor-pointer hover:border-gold hover:text-gold transition-all"
            >
              {homebase ? 'Change' : 'Set home base'}
            </button>
            <button
              onClick={() => setLivedOpen(true)}
              className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] text-text-muted text-xs cursor-pointer hover:border-gold hover:text-gold transition-all"
            >
              + Place I&apos;ve lived
            </button>
          </div>
        </div>

        {livedPlaces.length > 0 && (
          <div className="border-t border-white/[0.08] mt-3.5 pt-3.5">
            <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2.5">
              Places I&apos;ve lived
            </div>
            <div className="flex flex-wrap gap-2">
              {livedPlaces.map(l => (
                <div key={l.id} className="flex items-center gap-2 bg-bg4 border border-white/[0.08] rounded-[10px] py-2 px-3 hover:border-teal/40 transition-colors">
                  <span className="text-lg">{l.flag || '🏳'}</span>
                  <div className="leading-tight">
                    <div className="text-[13px] font-medium">{l.city || l.code}</div>
                    <div className="text-[11px] text-text-muted">{livedDuration(l.from, l.to)}</div>
                  </div>
                  <button
                    onClick={() => { if (confirm('Remove this place?')) removeLivedPlace(l.id); }}
                    className="text-text-muted text-sm hover:text-stamp-red transition-colors ml-1 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <HomebaseModal open={hbOpen} onOpenChange={setHbOpen} />
      <LivedModal open={livedOpen} onOpenChange={setLivedOpen} />
    </>
  );
}
