import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'trip-photos';

/**
 * Upload a photo to Supabase Storage and return its public URL.
 * Accepts either a base64 data URL or a File/Blob.
 */
export async function uploadPhoto(
  supabase: SupabaseClient,
  userId: string,
  tripId: number,
  photo: string | Blob,
  index: number,
): Promise<string | null> {
  const path = `${userId}/${tripId}/${Date.now()}-${index}.jpg`;

  let blob: Blob;
  if (typeof photo === 'string') {
    // Convert base64 data URL to Blob
    blob = dataUrlToBlob(photo);
  } else {
    blob = photo;
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

  if (error) {
    console.error('[Stampomad] Photo upload error:', error.message);
    return null;
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}

/**
 * Delete a photo from Supabase Storage by its URL.
 */
export async function deletePhotoFromStorage(
  supabase: SupabaseClient,
  photoUrl: string,
): Promise<void> {
  // Extract the path from the URL (everything after /trip-photos/)
  const match = photoUrl.match(/\/trip-photos\/(.+)$/);
  if (!match) return;
  const path = match[1];
  await supabase.storage.from(BUCKET).remove([path]);
}

/**
 * Delete all photos for a trip from storage.
 */
export async function deleteAllTripPhotos(
  supabase: SupabaseClient,
  userId: string,
  tripId: number,
): Promise<void> {
  const folder = `${userId}/${tripId}`;
  const { data: files } = await supabase.storage.from(BUCKET).list(folder);
  if (files && files.length > 0) {
    const paths = files.map(f => `${folder}/${f.name}`);
    await supabase.storage.from(BUCKET).remove(paths);
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
