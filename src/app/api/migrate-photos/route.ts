import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadPhoto } from '@/lib/supabase/storage';

/**
 * POST /api/migrate-photos
 * One-time migration: converts base64 photo_data rows to Storage URLs.
 * Only migrates photos for the authenticated user.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Find all rows with base64 data but no URL
  const { data: rows, error } = await supabase
    .from('trip_photos')
    .select('id, trip_id, photo_data, position')
    .eq('user_id', user.id)
    .is('photo_url', null)
    .not('photo_data', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows || rows.length === 0) return NextResponse.json({ migrated: 0, message: 'No legacy photos to migrate' });

  let migrated = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const url = await uploadPhoto(supabase, user.id, row.trip_id, row.photo_data, row.position || 0);
      if (url) {
        // Update the row: set photo_url, clear photo_data to free space
        await supabase.from('trip_photos').update({
          photo_url: url,
          photo_data: null,
        }).eq('id', row.id);
        migrated++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`[Stampomad] Migration failed for photo ${row.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({
    migrated,
    failed,
    total: rows.length,
    message: `Migrated ${migrated}/${rows.length} photos to Storage`,
  });
}
