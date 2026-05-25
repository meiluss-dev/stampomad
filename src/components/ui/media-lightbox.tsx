'use client';

import { useState, useEffect, useCallback } from 'react';

export interface MediaItem {
  type: 'image' | 'video';
  src: string;
  embed?: string;
}

function getVideoEmbed(url: string): string | null {
  let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1`;
  m = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}?autoplay=1`;
  return null;
}

function getVideoThumb(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (m) return `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`;
  return null;
}

export function buildMediaItems(images: string[], videos: string[]): MediaItem[] {
  const items: MediaItem[] = images.map(src => ({ type: 'image', src }));
  videos.forEach(url => {
    const embed = getVideoEmbed(url);
    const thumb = getVideoThumb(url);
    if (embed) items.push({ type: 'video', src: thumb || '', embed });
  });
  return items;
}

export function MediaThumbnailGrid({ items, onOpen }: { items: MediaItem[]; onOpen: (index: number) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="flex gap-2 flex-wrap">
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => onOpen(i)}
          className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/[0.08] cursor-pointer group shrink-0"
        >
          {item.type === 'image' ? (
            <img src={item.src} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
          ) : (
            <>
              {item.src ? (
                <img src={item.src} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
              ) : (
                <div className="w-full h-full bg-white/[0.04] flex items-center justify-center">
                  <span className="text-text-muted text-xs">Video</span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center">
                  <span className="text-white text-sm ml-0.5">&#9654;</span>
                </div>
              </div>
            </>
          )}
        </button>
      ))}
    </div>
  );
}

export function MediaLightbox({ items, index, onClose }: { items: MediaItem[]; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index);
  const item = items[current];

  const prev = useCallback(() => setCurrent(c => (c > 0 ? c - 1 : items.length - 1)), [items.length]);
  const next = useCallback(() => setCurrent(c => (c < items.length - 1 ? c + 1 : 0)), [items.length]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, prev, next]);

  useEffect(() => { setCurrent(index); }, [index]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
      >
        x
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm z-10">
        {current + 1} / {items.length}
      </div>

      {/* Prev */}
      {items.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); prev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 text-white text-2xl flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
        >
          &#8249;
        </button>
      )}

      {/* Next */}
      {items.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); next(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 text-white text-2xl flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
        >
          &#8250;
        </button>
      )}

      {/* Content */}
      <div className="relative max-w-[90vw] max-h-[85vh] z-10" onClick={e => e.stopPropagation()}>
        {item.type === 'image' ? (
          <img
            src={item.src}
            alt=""
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
          />
        ) : item.embed ? (
          <div className="w-[85vw] max-w-[960px] aspect-video rounded-lg overflow-hidden">
            <iframe
              src={item.embed}
              className="w-full h-full"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
            />
          </div>
        ) : null}
      </div>

      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 max-w-[90vw] overflow-x-auto px-2 py-1">
          {items.map((it, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setCurrent(i); }}
              className={`w-12 h-12 rounded-md overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${
                i === current ? 'border-gold opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              {it.type === 'image' ? (
                <img src={it.src} alt="" className="w-full h-full object-cover" />
              ) : it.src ? (
                <div className="relative w-full h-full">
                  <img src={it.src} alt="" className="w-full h-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center text-white text-xs">&#9654;</span>
                </div>
              ) : (
                <div className="w-full h-full bg-white/10 flex items-center justify-center text-white text-xs">&#9654;</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
