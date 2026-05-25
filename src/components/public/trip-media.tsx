'use client';

import { useState } from 'react';
import { MediaLightbox, buildMediaItems, type MediaItem } from '@/components/ui/media-lightbox';

export function TripPhotoGrid({ photos }: { photos: string[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const items: MediaItem[] = photos.map(src => ({ type: 'image', src }));

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {photos.map((src, i) => (
          <button
            key={i}
            onClick={() => setLightboxIdx(i)}
            className="aspect-square rounded-xl overflow-hidden border border-white/[0.08] cursor-pointer group"
          >
            <img src={src} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
          </button>
        ))}
      </div>
      {lightboxIdx !== null && (
        <MediaLightbox items={items} index={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </>
  );
}

export function WaypointMedia({ images, videos }: { images: string[]; videos: string[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const items = buildMediaItems(images, videos);

  if (items.length === 0) return null;

  return (
    <>
      <div className="flex gap-2 flex-wrap mt-3">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => setLightboxIdx(i)}
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
      {lightboxIdx !== null && (
        <MediaLightbox items={items} index={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </>
  );
}
