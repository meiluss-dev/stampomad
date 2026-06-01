import { SupabaseClient } from '@supabase/supabase-js';

export interface Notification {
  id: number;
  type: string;
  tripId: number | null;
  actorId: string | null;
  actorName?: string;
  actorAvatar?: string | null;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export async function loadNotifications(supabase: SupabaseClient, userId: string, limit = 30): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:user_profiles!notifications_actor_id_profiles_fkey(display_name, avatar_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('[Notifications] load error:', error); return []; }
  return (data || []).map((n: any) => ({
    id: n.id,
    type: n.type,
    tripId: n.trip_id,
    actorId: n.actor_id,
    actorName: n.actor?.display_name || 'Someone',
    actorAvatar: n.actor?.avatar_url || null,
    message: n.message,
    metadata: n.metadata || {},
    read: n.read,
    createdAt: n.created_at,
  }));
}

export async function countUnread(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  return count || 0;
}

export async function markRead(supabase: SupabaseClient, notificationId: number) {
  await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
}

export async function markAllRead(supabase: SupabaseClient, userId: string) {
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
}

// ── Send notifications to trip members ──

export async function notifyTripMembers(
  supabase: SupabaseClient,
  tripId: number,
  actorId: string,
  type: string,
  message: string,
  metadata: Record<string, unknown> = {},
) {
  // Get all accepted members + trip owner
  const { data: members } = await supabase
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .eq('status', 'accepted');

  const { data: trip } = await supabase
    .from('trips')
    .select('user_id')
    .eq('id', tripId)
    .single();

  const recipientIds = new Set<string>();
  (members || []).forEach(m => recipientIds.add(m.user_id));
  if (trip) recipientIds.add(trip.user_id);
  recipientIds.delete(actorId); // Don't notify the actor

  if (recipientIds.size === 0) return;

  const rows = [...recipientIds].map(uid => ({
    user_id: uid,
    type,
    trip_id: tripId,
    actor_id: actorId,
    message,
    metadata,
  }));

  await supabase.from('notifications').insert(rows);
}

// Convenience helpers
export async function notifyExpenseAdded(supabase: SupabaseClient, tripId: number, actorId: string, amount: number, currency: string, description: string) {
  await notifyTripMembers(supabase, tripId, actorId, 'expense_added',
    `added an expense: ${currency} ${amount.toFixed(2)}${description ? ` — ${description}` : ''}`,
    { amount, currency, description }
  );
}

export async function notifyMemberJoined(supabase: SupabaseClient, tripId: number, actorId: string, tripName: string) {
  await notifyTripMembers(supabase, tripId, actorId, 'member_joined',
    `joined ${tripName}`,
    { tripName }
  );
}

export async function notifyItemAdded(supabase: SupabaseClient, tripId: number, actorId: string, itemText: string) {
  await notifyTripMembers(supabase, tripId, actorId, 'item_added',
    `added "${itemText}" to the shared list`,
    { itemText }
  );
}

export async function notifyItemClaimed(supabase: SupabaseClient, tripId: number, actorId: string, itemText: string) {
  await notifyTripMembers(supabase, tripId, actorId, 'item_claimed',
    `will bring "${itemText}"`,
    { itemText }
  );
}

export async function notifyMessage(supabase: SupabaseClient, tripId: number, actorId: string, message: string, tripName: string) {
  const preview = message.length > 60 ? message.slice(0, 60) + '…' : message;
  await notifyTripMembers(supabase, tripId, actorId, 'chat_message',
    `sent a message in ${tripName}: "${preview}"`,
    { tripName, message: preview }
  );
}
