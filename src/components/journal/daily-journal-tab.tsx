'use client';

import { useState } from 'react';
import { useDailyJournal } from '@/hooks/use-daily-journal';
import { DailyEntryModal } from '@/components/journal/daily-entry-modal';
import { fmtDate } from '@/lib/countries';
import type { DailyEntry } from '@/types';

function groupByMonth(entries: DailyEntry[]): Record<string, DailyEntry[]> {
  const groups: Record<string, DailyEntry[]> = {};
  for (const e of entries) {
    const key = e.date.slice(0, 7);
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return groups;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return new Date(+y, +m - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function DailyJournalTab() {
  const { entries, loading, addEntry, updateEntry, removeEntry } = useDailyJournal();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DailyEntry | null>(null);

  async function handleSave(data: Omit<DailyEntry, 'id'> | DailyEntry) {
    if ('id' in data && data.id) {
      await updateEntry(data as DailyEntry);
    } else {
      await addEntry(data);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-4xl animate-pulse">📝</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-text-muted">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="bg-gold text-bg px-5 py-2.5 rounded-[20px] font-medium text-sm cursor-pointer hover:opacity-85 transition-all"
        >
          + New Entry
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">📝</div>
          <div className="font-[family-name:var(--font-playfair)] text-[22px] text-text mb-2">Your daily journal</div>
          <div className="text-sm text-text-muted max-w-md mx-auto">
            A private space for your everyday thoughts, reflections, and ideas — no trip required.
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.keys(groupByMonth(entries)).sort().reverse().map(ym => {
            const group = groupByMonth(entries)[ym];
            return (
              <div key={ym}>
                <div className="text-[11px] text-gold uppercase tracking-wider mb-3 font-medium">
                  {monthLabel(ym)} · {group.length} {group.length === 1 ? 'entry' : 'entries'}
                </div>
                <div className="space-y-3">
                  {group.map(e => (
                    <div
                      key={e.id}
                      className="bg-bg3 border border-white/[0.08] rounded-2xl p-5 group hover:border-gold/20 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {e.mood && <span className="text-lg">{e.mood}</span>}
                          <div className="text-xs text-gold">{fmtDate(e.date)}</div>
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => { setEditing(e); setModalOpen(true); }}
                            className="text-[11px] text-text-muted hover:text-gold px-2 py-1 rounded-lg border border-white/[0.08] hover:border-gold/30 cursor-pointer transition-all bg-transparent"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => { if (confirm('Delete this entry?')) removeEntry(e.id); }}
                            className="text-[11px] text-text-muted hover:text-stamp-red px-2 py-1 rounded-lg border border-white/[0.08] hover:border-stamp-red/30 cursor-pointer transition-all bg-transparent"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      {e.title && (
                        <div className="font-[family-name:var(--font-playfair)] text-base mb-1.5">{e.title}</div>
                      )}
                      <div className="text-sm leading-[1.75] text-text/80 whitespace-pre-wrap">{e.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DailyEntryModal
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) setEditing(null); }}
        entry={editing}
        onSave={handleSave}
      />
    </div>
  );
}
