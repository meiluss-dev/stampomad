'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { countryFlag, fmtDate } from '@/lib/countries';
import { InviteModal } from '@/components/group/invite-modal';
import { GroupTripPanel } from '@/components/group/group-trip-panel';
import type { Trip } from '@/types';

const MAX_PHOTOS = 8;
const MAX_SIZE_MB = 2;

function resizeImage(file: File, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function TripCard({ trip: t, onEdit, onRoute, onPacking }: { trip: Trip; onEdit: () => void; onRoute: () => void; onPacking: () => void }) {
  const { deleteTrip, tripPhotos, saveTripPhotos, toggleTripPublished, profile, packingLists } = useStore();
  const { toast } = useToast();
  const photos = tripPhotos[t.id] || [];
  const hasPhotos = photos.length > 0;
  const [photoIdx, setPhotoIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-rotate photos
  useEffect(() => {
    if (photos.length <= 1) return;
    intervalRef.current = setInterval(() => setPhotoIdx(p => (p + 1) % photos.length), 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [photos.length]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast(`Maximum ${MAX_PHOTOS} photos per trip`, 'error');
      return;
    }

    setUploading(true);
    const newPhotos: string[] = [];

    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast(`${file.name} is too large (max ${MAX_SIZE_MB}MB) — resizing...`);
      }
      try {
        const dataUrl = await resizeImage(file);
        newPhotos.push(dataUrl);
      } catch {
        toast(`Failed to process ${file.name}`, 'error');
      }
    }

    if (newPhotos.length > 0) {
      const updated = [...photos, ...newPhotos];
      await saveTripPhotos(t.id, updated);
      toast(`${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''} added!`);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function removePhoto(index: number) {
    const updated = photos.filter((_, i) => i !== index);
    await saveTripPhotos(t.id, updated);
    setPhotoIdx(0);
    toast('Photo removed');
    if (updated.length === 0) setShowManage(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this trip and all its journal entries?')) return;
    await deleteTrip(t.id);
    toast('Trip deleted');
  }

  return (
    <div className="bg-bg3 border border-white/[0.08] rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:border-gold hover:shadow-[0_8px_32px_rgba(201,169,110,0.15)]">
      {/* Photo area */}
      <div className="w-full h-40 flex items-center justify-center text-[52px] bg-bg4 relative overflow-hidden group">
        {hasPhotos ? (
          <>
            <img src={photos[photoIdx] || photos[0]} alt="" className="w-full h-full object-cover absolute inset-0 transition-opacity duration-500" />
            {photos.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setPhotoIdx(p => (p - 1 + photos.length) % photos.length); }}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none text-sm"
                >&#8249;</button>
                <button
                  onClick={e => { e.stopPropagation(); setPhotoIdx(p => (p + 1) % photos.length); }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none text-sm"
                >&#8250;</button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {photos.slice(0, 6).map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === photoIdx % photos.length ? 'bg-white scale-125' : 'bg-white/50'}`} />
                  ))}
                  {photos.length > 6 && <div className="text-white/60 text-[9px] ml-0.5">+{photos.length - 6}</div>}
                </div>
              </>
            )}
            {/* Add more / manage photos buttons */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {photos.length < MAX_PHOTOS && (
                <button
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer border-none text-sm hover:bg-black/80 transition-colors"
                  title="Add photos"
                >+</button>
              )}
              <button
                onClick={e => { e.stopPropagation(); setShowManage(!showManage); }}
                className="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer border-none text-xs hover:bg-black/80 transition-colors"
                title="Manage photos"
              >&#9881;</button>
            </div>
          </>
        ) : (
          /* Empty state — upload prompt */
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-transparent border-none group/upload"
          >
            <span className="text-[42px] group-hover/upload:scale-110 transition-transform">{t.emoji}</span>
            <span className="text-[11px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 px-2.5 py-1 rounded-lg">
              {uploading ? 'Uploading...' : '📷 Add photos'}
            </span>
          </button>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />

        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-sm animate-pulse">Uploading...</div>
          </div>
        )}
      </div>

      {/* Photo management strip */}
      {showManage && hasPhotos && (
        <div className="bg-bg4 border-b border-white/[0.06] p-2.5 flex gap-2 overflow-x-auto">
          {photos.map((photo, i) => (
            <div key={i} className="relative shrink-0 group/thumb">
              <img src={photo} alt="" className="w-14 h-14 object-cover rounded-lg border border-white/[0.08]" />
              <button
                onClick={() => removePhoto(i)}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-stamp-red text-white text-[10px] flex items-center justify-center cursor-pointer border-none opacity-0 group-hover/thumb:opacity-100 transition-opacity"
              >×</button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-14 h-14 rounded-lg border border-dashed border-white/[0.15] flex items-center justify-center text-text-muted hover:text-gold hover:border-gold/40 cursor-pointer bg-transparent transition-colors shrink-0 text-lg"
            >+</button>
          )}
        </div>
      )}

      {/* Card content */}
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
        {t.notes && <div className="text-[13px] text-text-muted mt-2 leading-snug">{t.notes.substring(0, 100)}{t.notes.length > 100 ? '...' : ''}</div>}
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
          <button onClick={onPacking} className="py-[5px] px-3 rounded-lg bg-teal/10 text-teal text-xs cursor-pointer">
            🧳 Pack{packingLists[t.id]?.items?.length ? ` (${packingLists[t.id].items.filter(i => i.checked).length}/${packingLists[t.id].items.length})` : ''}
          </button>
          <button onClick={() => setInviteOpen(true)} className="py-[5px] px-3 rounded-lg bg-teal/10 text-teal text-xs cursor-pointer">
            👥 Invite
          </button>
          {t.isGroup && (
            <button onClick={() => setGroupOpen(true)} className="py-[5px] px-3 rounded-lg bg-gold/10 text-gold text-xs cursor-pointer">
              👥 Group
            </button>
          )}
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

      <InviteModal open={inviteOpen} onOpenChange={setInviteOpen} trip={t} />
      {groupOpen && <GroupTripPanel trip={t} onClose={() => setGroupOpen(false)} />}
    </div>
  );
}
