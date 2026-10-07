'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { countryFlag, fmtDate } from '@/lib/countries';
import { useLang } from '@/components/language-provider';

interface Props {
  username: string;
  trip: {
    id: number;
    code: string;
    continent: string;
    emoji: string;
    name: string;
    start: string;
    end: string;
    days: number;
    cities: string;
    coverUrl?: string;
    rating?: number;
    journal: { id: number }[];
  };
  photos: string[];
  waypointCount: number;
}

export function ProfileTripCard({ username, trip, photos, waypointCount }: Props) {
  const { t } = useLang();
  const images = photos.length > 0 ? photos : trip.coverUrl ? [trip.coverUrl] : [];
  const [photoIdx, setPhotoIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCycle = useCallback(() => {
    if (images.length <= 1) return;
    intervalRef.current = setInterval(() => setPhotoIdx(p => (p + 1) % images.length), 600);
  }, [images.length]);

  const stopCycle = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setPhotoIdx(0);
  }, []);

  const [today, setToday] = useState('');
  useEffect(() => { setToday(new Date().toISOString().slice(0, 10)); }, []);
  const isUpcoming = today && trip.start && trip.start > today;
  const isActive = today && trip.start && trip.start <= today && (!trip.end || trip.end >= today);
  const isPast = today && trip.end && trip.end < today;
  const stampLabel = isActive ? t('profile_traveling_now') : isUpcoming ? t('profile_upcoming') : (isPast && (trip.rating || 0) > 0) ? '★'.repeat(trip.rating || 0) : null;
  const stampColor = isActive ? 'stamp-green' : isUpcoming ? 'teal' : 'gold';

  return (
    <Link
      href={`/u/${username}/trip/${trip.id}`}
      className="bg-bg3 border border-white/[0.08] rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:border-gold hover:shadow-[0_8px_32px_rgba(201,169,110,0.15)] block"
      onMouseEnter={startCycle}
      onMouseLeave={stopCycle}
    >
      <div className="w-full aspect-[4/3] flex items-center justify-center text-[48px] bg-bg4 relative overflow-hidden">
        {images.length > 0 ? (
          <>
            {images.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={i === 0 ? trip.name : ''}
                className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-300 ${i === photoIdx ? 'opacity-100' : 'opacity-0'}`}
              />
            ))}
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-[2]">
                {images.slice(0, 6).map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === photoIdx % images.length ? 'bg-white' : 'bg-white/40'}`} />
                ))}
                {images.length > 6 && <div className="text-white/50 text-[9px] ml-0.5">+{images.length - 6}</div>}
              </div>
            )}
          </>
        ) : (
          <span>{trip.emoji}</span>
        )}
        {stampLabel && (
          <div className={`absolute bottom-3 left-3 -rotate-12 border-2 border-${stampColor} text-${stampColor} rounded-sm px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider opacity-80 z-[3]`}>
            {stampLabel}
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="text-[11px] text-gold uppercase tracking-wider mb-1">
          {countryFlag(trip.code)} {trip.code}
          {trip.continent ? ` · ${trip.continent}` : ''}
        </div>
        <div className="font-[family-name:var(--font-playfair)] text-lg mb-1.5">{trip.name}</div>
        <div className="flex gap-2 text-xs text-text-muted flex-wrap">
          <span>{fmtDate(trip.start)} → {trip.end ? fmtDate(trip.end) : isActive ? <em className="text-gold">{t('profile_ongoing')}</em> : <em className="text-text-muted">{t('profile_open_end')}</em>}</span>
          {trip.end && (
            <span className="bg-teal/10 text-teal px-2 py-0.5 rounded-[10px] text-[11px]">
              {trip.days} {trip.days !== 1 ? t('profile_days') : t('profile_day')}
            </span>
          )}
          {trip.journal.length > 0 && (
            <span className="text-text-muted">{trip.journal.length} {t('profile_entries')}</span>
          )}
          {waypointCount > 0 && (
            <span className="text-text-muted">{waypointCount} {t('profile_waypoints')}</span>
          )}
        </div>
        {trip.cities && <div className="text-[13px] text-text-muted mt-2">📍 {trip.cities}</div>}
      </div>
    </Link>
  );
}
