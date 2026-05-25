'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { countryFlag, fmtDate } from '@/lib/countries';
import type { Trip } from '@/types';

export function TripCard({ trip: t, onEdit, onRoute }: { trip: Trip; onEdit: () => void; onRoute: () => void }) {
  const { deleteTrip, tripPhotos, toggleTripPublished, profile } = useStore();
  const { toast } = useToast();
  const photos = tripPhotos[t.id] || [];
  const hasPhotos = photos.length > 0;
  const [photoIdx, setPhotoIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-rotate photos
  useEffect(() => {
    if (photos.length <= 1) return;
    intervalRef.current = setInterval(() => setPhotoIdx(p => (p + 1) % photos.length), 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [photos.length]);

  async function handleDelete() {
    if (!confirm('Delete this trip and all its journal entries?')) return;
    await deleteTrip(t.id);
    toast('Trip deleted');
  }

  return (
    <div className="bg-bg3 border border-white/[0.08] rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:border-gold hover:shadow-[0_8px_32px_rgba(201,169,110,0.15)]">
      <div className="w-full h-40 flex items-center justify-center text-[52px] bg-bg4 relative overflow-hidden group">
        {hasPhotos && (
          <>
            <img src={photos[photoIdx] || photos[0]} alt="" className="w-full h-full object-cover absolute inset-0 transition-opacity duration-500" />
            {photos.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setPhotoIdx(p => (p - 1 + photos.length) % photos.length); }}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none text-sm"
                >‹</button>
                <button
                  onClick={e => { e.stopPropagation(); setPhotoIdx(p => (p + 1) % photos.length); }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none text-sm"
                >›</button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {photos.slice(0, 6).map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === photoIdx % photos.length ? 'bg-white scale-125' : 'bg-white/50'}`} />
                  ))}
                  {photos.length > 6 && <div className="text-white/60 text-[9px] ml-0.5">+{photos.length - 6}</div>}
                </div>
              </>
            )}
          </>
        )}
        {!hasPhotos && <span>{t.emoji}</span>}
      </div>
      <div className="p-4">
        <div className="text-[11px] text-gold uppercase tracking-wider mb-1">
          {t.fromCode ? `${countryFlag(t.fromCode)} → ` : ''}
          {countryFlag(t.code)} {t.code}
          {t.continent ? ` · ${t.continent}` : ''}
        </div>
        <div className="font-[family-name:var(--font-playfair)] text-lg mb-2">{t.name}</div>
        <div className="flex gap-2.5 text-xs text-text-muted flex-wrap">
          <span>{fmtDate(t.start)}</span>
          <span>→</span>
          <span>{fmtDate(t.end)}</span>
          <span className="bg-teal/10 text-teal px-2 py-0.5 rounded-[10px] text-[11px]">
            {t.days} day{t.days !== 1 ? 's' : ''}
          </span>
        </div>
        {t.cities && <div className="text-[13px] text-text-muted mt-2 leading-snug">📍 {t.cities}</div>}
        {t.notes && <div className="text-[13px] text-text-muted mt-2 leading-snug">{t.notes.substring(0, 100)}{t.notes.length > 100 ? '…' : ''}</div>}
        <div className="flex gap-2 mt-3 flex-wrap">
          <Link
            href={`/journal?trip=${t.id}`}
            className="py-[5px] px-3 rounded-lg bg-teal/10 text-teal text-xs cursor-pointer"
          >
            📖 Journal
          </Link>
          <button onClick={onRoute} className="py-[5px] px-3 rounded-lg bg-teal/10 text-teal text-xs cursor-pointer">
            🗺️ Route
          </button>
          <button onClick={onEdit} className="py-[5px] px-3 rounded-lg bg-gold/10 text-gold text-xs cursor-pointer">
            ✏️ Edit
          </button>
          {profile?.username && (
            <button
              onClick={() => toggleTripPublished(t.id, !t.published)}
              className={`py-[5px] px-3 rounded-lg text-xs cursor-pointer border transition-colors ${
                t.published
                  ? 'bg-teal/15 text-teal border-teal/30'
                  : 'bg-white/[0.03] text-text-muted border-white/[0.08] hover:border-teal/30 hover:text-teal'
              }`}
            >
              {t.published ? '🌐 Public' : '🔒 Private'}
            </button>
          )}
          <button onClick={handleDelete} className="py-[5px] px-3 rounded-lg bg-stamp-red/10 text-stamp-red border border-stamp-red/20 text-xs cursor-pointer">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
