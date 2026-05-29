/**
 * Offline sync engine — flushes the pending operations queue.
 * Called when the app comes back online.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAllOps, removeOp, type PendingOp } from './offline-queue';
import { saveTripToSupabase, deleteJournalEntryFromSupabase } from './supabase/data';
import type { Trip } from '@/types';

export async function flushOfflineQueue(
  supabase: SupabaseClient,
  userId: string,
  getTrip: (tripId: number) => Trip | undefined,
): Promise<{ synced: number; failed: number }> {
  const ops = await getAllOps();
  if (ops.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  console.log(`[Stampomad] Syncing ${ops.length} offline operations...`);

  for (const op of ops) {
    try {
      switch (op.type) {
        case 'journal_add':
        case 'journal_update':
        case 'trip_update': {
          // These all save the full trip (which includes journal entries)
          const trip = getTrip(op.tripId);
          if (trip) {
            await saveTripToSupabase(supabase, userId, trip);
          }
          break;
        }
        case 'journal_delete': {
          const { entryId } = op.payload as { entryId: number };
          await deleteJournalEntryFromSupabase(supabase, userId, entryId);
          break;
        }
        case 'photo_add': {
          // Photos are handled separately — the photo data is in the payload
          const { savePhotosToSupabase } = await import('./supabase/data');
          const { photos } = op.payload as { photos: string[] };
          await savePhotosToSupabase(supabase, userId, op.tripId, photos);
          break;
        }
      }
      await removeOp(op.id!);
      synced++;
    } catch (err) {
      console.error(`[Stampomad] Sync failed for op ${op.id} (${op.type}):`, err);
      failed++;
    }
  }

  console.log(`[Stampomad] Sync complete: ${synced} synced, ${failed} failed`);
  return { synced, failed };
}
