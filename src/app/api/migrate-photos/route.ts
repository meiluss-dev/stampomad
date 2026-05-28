import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadPhoto } from '@/lib/supabase/storage';

/**
 * POST /api/migrate-photos
 * One-time migration: converts base64 photo_data rows to Storage URLs.
 * Processes one photo at a time to avoid query timeouts.
 * Call multiple times if needed — it picks up where it left off.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Step 1: Get just the IDs (no blob data — fast query)
  const { data: ids, error } = await supabase
    .from('trip_photos')
    .select('id')
    .eq('user_id', user.id)
    .is('photo_url', null)
    .not('photo_data', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!ids || ids.length === 0) return NextResponse.json({ migrated: 0, message: 'No legacy photos to migrate' });

  let migrated = 0;
  let failed = 0;

  // Step 2: Process one photo at a time
  for (const { id } of ids) {
    try {
      // Fetch single row with blob data
      const { data: row } = await supabase
        .from('trip_photos')
        .select('id, trip_id, photo_data, position')
        .eq('id', id)
        .single();

      if (!row || !row.photo_data) { failed++; continue; }

      const url = await uploadPhoto(supabase, user.id, row.trip_id, row.photo_data, row.position || 0);
      if (url) {
        await supabase.from('trip_photos').update({
          photo_url: url,
          photo_data: null,
        }).eq('id', row.id);
        migrated++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`[Stampomad] Migration failed for photo ${id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({
    migrated,
    failed,
    total: ids.length,
    message: `Migrated ${migrated}/${ids.length} photos to Storage`,
  });
}
