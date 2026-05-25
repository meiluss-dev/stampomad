'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { fmtDate, countryNames } from '@/lib/countries';
import { JournalEntryModal } from '@/components/journal/journal-entry-modal';
import { AISummary } from '@/components/journal/ai-summary';

export default function JournalPage() {
  const { trips, loading } = useStore();
  const searchParams = useSearchParams();
  const tripParam = searchParams.get('trip');
  const [selectedId, setSelectedId] = useState<number | null>(tripParam ? +tripParam : null);
  const [entryModalOpen, setEntryModalOpen] = useState(false);

  useEffect(() => {
    if (tripParam) setSelectedId(+tripParam);
  }, [tripParam]);

  const selectedTrip = trips.find(t => t.id === selectedId);
  const entries = [...(selectedTrip?.journal || [])].sort(
    (a, b) => new Date(a.date + ' ' + (a.time || '00:00')).getTime() - new Date(b.date + ' ' + (b.time || '00:00')).getTime()
  );

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="text-text-muted text-lg">Loading...</div></div>;
  }

  return (
    <div>
      <div className="mb-6">
        <div className="text-xs text-text-muted uppercase tracking-[2px] mb-1">Travel memories</div>
        <h1 className="text-[32px]">Trip Journal</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 sm:gap-6">
        {/* Sidebar */}
        <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-4 max-h-[40vh] md:max-h-[70vh] overflow-y-auto">
          <div className="text-[11px] text-text-muted uppercase tracking-wider mb-3">Select a trip</div>
          {trips.filter(t => !t.quickPin).length === 0 ? (
            <div className="text-[13px] text-text-muted">Add trips first</div>
          ) : (
            trips.filter(t => !t.quickPin).map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left p-2.5 px-3 rounded-[10px] mb-1.5 transition-all border-l-2 ${
                  selectedId === t.id
                    ? 'bg-gold/12 border-l-gold'
                    : 'border-l-transparent hover:bg-white/[0.04]'
                }`}
              >
                <div className="text-sm font-medium">{t.emoji} {t.name}</div>
                <div className="text-[11px] text-text-muted mt-0.5">
                  {t.code} · {t.days}d · {(t.journal?.length || 0)} entries
                </div>
              </button>
            ))
          )}
        </div>

        {/* Main */}
        <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-6 max-h-[70vh] overflow-y-auto">
          {!selectedTrip ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📖</div>
              <div className="font-[family-name:var(--font-playfair)] text-[22px] text-text mb-2">Select a trip</div>
              <div className="text-sm text-text-muted">Choose a trip from the sidebar to view or add journal entries</div>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-6">
                <div>
                  <div className="text-[11px] text-gold uppercase tracking-wider">
                    {selectedTrip.code} · {selectedTrip.continent}
                  </div>
                  <h2 className="text-xl sm:text-2xl my-1">{selectedTrip.emoji} {selectedTrip.name}</h2>
                  <div className="text-[12px] sm:text-[13px] text-text-muted">
                    {fmtDate(selectedTrip.start)} – {fmtDate(selectedTrip.end)} · {selectedTrip.days} day{selectedTrip.days !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {entries.length > 0 && <AISummary trip={selectedTrip} />}
                  <button
                    onClick={() => setEntryModalOpen(true)}
                    className="bg-gold text-bg px-4 py-2 rounded-[20px] font-medium text-sm cursor-pointer hover:opacity-85 transition-all"
                  >
                    + Add Entry
                  </button>
                </div>
              </div>

              {!entries.length && (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">✏️</div>
                  <div className="font-[family-name:var(--font-playfair)] text-[22px] text-text mb-2">No entries yet</div>
                  <div className="text-sm text-text-muted">Start writing your memories from this trip</div>
                </div>
              )}

              {entries.map(e => (
                <div key={e.id} className="border-l-2 border-white/[0.08] pl-5 mb-7 relative">
                  <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-gold" />
                  <div className="mb-1.5">
                    <div className="text-xs text-gold">{fmtDate(e.date)}{e.time ? ` · ${e.time}` : ''}</div>
                    {e.title && <div className="font-[family-name:var(--font-playfair)] text-base mt-0.5">{e.title}</div>}
                  </div>
                  <div className="text-sm leading-[1.75] text-text/80 whitespace-pre-wrap">{e.text}</div>
                </div>
              ))}

              <JournalEntryModal
                open={entryModalOpen}
                onOpenChange={setEntryModalOpen}
                tripId={selectedTrip.id}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
